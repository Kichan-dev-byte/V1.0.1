import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import { ComputerService, ChatService, BillingService } from '../services/services';

const pcService = new ComputerService();
const chatService = new ChatService();
const billingService = new BillingService();

interface ConnectedClient {
  pcId: string;
  ws: WebSocket;
  isAlive: boolean;
}

export class SocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server });
    this.init();
  }

  private init(): void {
    if (!this.wss) return;

    logger.info("Initializing WebSocket Server...");

    this.wss.on('connection', (ws: WebSocket) => {
      logger.info("New socket connection established.");
      let currentPcId = '';

      ws.on('message', (message: string) => {
        try {
          const payload = JSON.parse(message);
          const { type, pcId, data } = payload;
          
          if (!pcId) return;
          currentPcId = pcId;

          switch (type) {
            case 'register':
              logger.info(`Registering client PC station: ${pcId}`);
              this.clients.set(pcId, { pcId, ws, isAlive: true });
              ws.send(JSON.stringify({ type: 'registered', pcId, success: true }));
              this.broadcast({ type: 'client_connected', pcId });
              break;

            case 'heartbeat':
              const client = this.clients.get(pcId);
              if (client) {
                client.isAlive = true;
              }
              break;

            case 'chat':
              if (data && data.text && data.sender) {
                const chatMsg = chatService.sendMessage(data.sender, pcId, data.text);
                this.broadcastToStation(pcId, { type: 'chat_msg', message: chatMsg });
                this.broadcast({ type: 'admin_chat_update', pcId, message: chatMsg });
              }
              break;

            case 'order':
              if (data && data.items) {
                const order = billingService.placeOrder(pcId, data.items);
                if (order) {
                  ws.send(JSON.stringify({ type: 'order_success', order }));
                  this.broadcast({ type: 'admin_order_placed', order });
                } else {
                  ws.send(JSON.stringify({ type: 'order_failed', error: 'Order placement rejected' }));
                }
              }
              break;

            default:
              logger.warn(`Unknown websocket event: ${type}`);
          }
        } catch (err: any) {
          logger.error(`Error processing socket message: ${err.message}`);
        }
      });

      ws.on('close', () => {
        if (currentPcId) {
          logger.warn(`Client PC station disconnected: ${currentPcId}`);
          this.clients.delete(currentPcId);
          this.broadcast({ type: 'client_disconnected', pcId: currentPcId });
        }
      });

      ws.on('error', (err) => {
        logger.error(`Socket error on client ${currentPcId}: ${err.message}`);
      });
    });

    // Setup heartbeat checking interval
    setInterval(() => {
      this.clients.forEach((client, pcId) => {
        if (!client.isAlive) {
          logger.warn(`Client PC station ${pcId} is dead. Terminating socket...`);
          client.ws.terminate();
          this.clients.delete(pcId);
          return;
        }
        client.isAlive = false;
        client.ws.send(JSON.stringify({ type: 'ping' }));
      });
    }, 15000);
  }

  /**
   * Broadcast message to all connected screens
   */
  public broadcast(payload: any): void {
    const data = JSON.stringify(payload);
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  /**
   * Sends targeted messages to a specific computer station
   */
  public broadcastToStation(pcId: string, payload: any): boolean {
    const client = this.clients.get(pcId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }
}
