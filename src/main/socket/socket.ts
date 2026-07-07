import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export class SocketServer {
  private io: SocketIOServer;

  constructor(server?: any) {
    // Start a Socket.IO server listening on port 4000
    this.io = new SocketIOServer(4000, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    console.log("Server Started");
    logger.info("Server Started");

    this.init();
  }

  private init(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log("Client Connected:");
      console.log(socket.id);
      logger.info(`Client Connected:\n${socket.id}`);

      // Send server:welcome to that client
      socket.emit('server:welcome');

      socket.on('client:register', (data: any) => {
        console.log("Client Registered:");
        console.log(data);
      });
    });
  }

  // Define broadcast to keep compatibility with any potential external caller if they require it
  public broadcast(payload: any): void {
    this.io.emit('broadcast', payload);
  }

  public broadcastToStation(pcId: string, payload: any): boolean {
    return false;
  }
}
