import { 
  ComputerRepository, 
  PlayerRepository, 
  ProductRepository, 
  OrderRepository, 
  TransactionRepository, 
  ChatRepository,
  SettingsRepository,
  SocketEventRepository,
  TimerRepository,
  Timer
} from '../repositories/repositories';
import { Computer, Player, POSProduct, Order, TransactionLog, ChatMessage, SocketEvent } from '../types/types';
import { logger } from '../utils/logger';
import { db } from '../database/db';

// ==========================================
// 1. Player Service
// ==========================================
export class PlayerService {
  constructor(
    private playerRepo = new PlayerRepository(),
    private txRepo = new TransactionRepository()
  ) {}

  public findAll(): Player[] {
    return this.playerRepo.findAll();
  }

  public findById(id: string): Player | undefined {
    return this.playerRepo.findById(id);
  }

  public findByUsername(username: string): Player | undefined {
    return this.playerRepo.findByUsername(username);
  }

  public createPlayer(
    username: string, 
    fullName: string, 
    balance: number, 
    membershipType: 'Regular' | 'VIP' = 'Regular'
  ): Player {
    const player: Player = {
      id: `P${String(this.playerRepo.findAll().length + 1).padStart(3, '0')}`,
      username,
      fullName,
      balance: Number(balance || 0),
      points: 0,
      status: 'Active',
      membershipType,
      timePlayedTotal: 0,
      createdDate: new Date().toISOString()
    };
    this.playerRepo.save(player);

    // Create a transaction log
    this.txRepo.create({
      id: `TX${Date.now()}`,
      type: 'Account Registration',
      pcId: null,
      username,
      amount: player.balance,
      details: `New account registered for '${fullName}' with initial deposit`,
      timestamp: new Date().toISOString()
    });

    return player;
  }

  public topupPlayer(username: string, amount: number): Player | undefined {
    const player = this.playerRepo.findByUsername(username);
    if (!player) return undefined;

    player.balance = parseFloat((player.balance + amount).toFixed(2));
    player.points += Math.floor(amount * 5); // top-up reward
    this.playerRepo.save(player);

    this.txRepo.create({
      id: `TX${Date.now()}`,
      type: 'Prepaid Topup',
      pcId: null,
      username,
      amount,
      details: `Credit added via Cashier Desk`,
      timestamp: new Date().toISOString()
    });

    return player;
  }

  public updatePlayer(id: string, updates: Partial<Player>): Player | undefined {
    return this.playerRepo.update(id, updates);
  }
}

// ==========================================
// 2. Timer Service
// ==========================================
export class TimerService {
  constructor(
    private timerRepo = new TimerRepository()
  ) {}

  public findAll(): Timer[] {
    return this.timerRepo.findAll();
  }

  public findById(id: string): Timer | undefined {
    return this.timerRepo.findById(id);
  }

  public createTimer(
    computerId: string, 
    playerId: string, 
    remainingSeconds: number, 
    rateId: string
  ): Timer {
    const timer: Timer = {
      id: `TMR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      computerId,
      playerId,
      startTime: new Date().toISOString(),
      remainingSeconds,
      paused: 0,
      rateId
    };
    this.timerRepo.save(timer);
    return timer;
  }

  public save(t: Timer): void {
    this.timerRepo.save(t);
  }

  public delete(id: string): void {
    this.timerRepo.delete(id);
  }

  public startTimer(id: string): void {
    const timer = this.timerRepo.findById(id);
    if (timer) {
      timer.paused = 0;
      timer.startTime = new Date().toISOString();
      this.timerRepo.save(timer);
    }
  }

  public pauseTimer(id: string): void {
    const timer = this.timerRepo.findById(id);
    if (timer) {
      timer.paused = 1;
      this.timerRepo.save(timer);
    }
  }

  public resumeTimer(id: string): void {
    const timer = this.timerRepo.findById(id);
    if (timer) {
      timer.paused = 0;
      timer.startTime = new Date().toISOString();
      this.timerRepo.save(timer);
    }
  }
}

// ==========================================
// 3. Computer Service
// ==========================================
export class ComputerService {
  constructor(
    private pcRepo = new ComputerRepository(),
    private playerRepo = new PlayerRepository(),
    private txRepo = new TransactionRepository(),
    private socketEventRepo = new SocketEventRepository()
  ) {}

  /**
   * Periodic ticking of all active computers to track elapsed/remaining time
   */
  public tickSessions(): void {
    const computers = this.pcRepo.findAll();

    computers.forEach(pc => {
      let changed = false;
      if (pc.status === 'ACTIVE_PREPAID') {
        pc.timeElapsed += 1;
        pc.timeRemaining = Math.max(0, pc.timeRemaining - 1);
        changed = true;
        
        // Check if prepaid time ran out
        if (pc.timeRemaining <= 0) {
          logger.info(`Session expired for prepaid computer ${pc.id} (${pc.currentUser})`);
          this.lockComputer(pc.id);
          changed = false; // lockComputer already saves
        }
      } else if (pc.status === 'ACTIVE_POSTPAID') {
        pc.timeElapsed += 1;
        pc.costAccumulated = (pc.timeElapsed / 3600) * pc.ratePerHour;
        changed = true;
      }
      
      if (pc.status !== 'OFFLINE' && pc.status !== 'MAINTENANCE') {
        pc.lastHeartbeat = new Date().toISOString();
        changed = true;
      }

      if (changed) {
        this.pcRepo.save(pc);
      }
    });
  }

  /**
   * Unlocks a computer for a player (Prepaid or Postpaid)
   */
  public unlockComputer(
    pcId: string, 
    mode: 'PREPAID' | 'POSTPAID', 
    username: string, 
    hoursPurchased = 0
  ): Computer | undefined {
    const pc = this.pcRepo.findById(pcId);
    if (!pc) return undefined;

    const player = this.playerRepo.findByUsername(username);
    const rate = pc.ratePerHour;

    pc.currentUser = username;
    pc.currentUserId = player ? player.id : `GUEST-${Math.floor(Math.random() * 1000)}`;
    pc.timeElapsed = 0;
    pc.costAccumulated = 0;

    if (mode === 'PREPAID') {
      pc.status = 'ACTIVE_PREPAID';
      pc.timeTotal = hoursPurchased * 3600;
      pc.timeRemaining = pc.timeTotal;
      
      // If VIP, deduct balance
      if (player) {
        const cost = hoursPurchased * rate;
        if (player.balance >= cost) {
          player.balance = parseFloat((player.balance - cost).toFixed(2));
          player.points += hoursPurchased * 50; // loyalty points
          this.playerRepo.save(player);

          // Log transaction
          this.txRepo.create({
            id: `TX${Date.now()}`,
            type: 'Session Checkout',
            pcId,
            username,
            amount: cost,
            details: `Unlocking ${pcId} for prepaid session of ${hoursPurchased} hrs`,
            timestamp: new Date().toISOString()
          });
        }
      }
    } else {
      pc.status = 'ACTIVE_POSTPAID';
      pc.timeTotal = 0;
      pc.timeRemaining = 0;
    }

    this.pcRepo.save(pc);

    // Create system socket event log
    this.socketEventRepo.create({
      id: `EV${Date.now()}`,
      pcId,
      type: 'unlock',
      message: `PC ${pcId} unlocked for user '${username}' (${mode})`,
      timestamp: new Date().toISOString()
    });

    return pc;
  }

  /**
   * Locks and ends the session of a computer
   */
  public lockComputer(pcId: string): Computer | undefined {
    const pc = this.pcRepo.findById(pcId);
    if (!pc) return undefined;

    const previousUser = pc.currentUser;
    const finalElapsed = pc.timeElapsed;
    const accruedCost = pc.costAccumulated;

    // Handle postpaid collection
    if (pc.status === 'ACTIVE_POSTPAID' && previousUser) {
      const player = this.playerRepo.findByUsername(previousUser);
      if (player) {
        if (player.balance >= accruedCost) {
          player.balance = parseFloat((player.balance - accruedCost).toFixed(2));
          this.playerRepo.save(player);
        }
      }

      // Record transaction
      this.txRepo.create({
        id: `TX${Date.now()}`,
        type: 'Session Checkout',
        pcId,
        username: previousUser,
        amount: accruedCost,
        details: `Postpaid session checkout of ${Math.ceil(finalElapsed / 60)} minutes`,
        timestamp: new Date().toISOString()
      });
    }

    // Reset station
    pc.status = 'LOCKED';
    pc.currentUser = null;
    pc.currentUserId = null;
    pc.timeTotal = 0;
    pc.timeElapsed = 0;
    pc.timeRemaining = 0;
    pc.costAccumulated = 0;
    
    this.pcRepo.save(pc);

    // Create system event
    this.socketEventRepo.create({
      id: `EV${Date.now()}`,
      pcId,
      type: 'lock',
      message: `PC ${pcId} session finished and locked`,
      timestamp: new Date().toISOString()
    });

    return pc;
  }

  /**
   * Places station in maintenance mode
   */
  public setMaintenance(pcId: string, status: boolean): Computer | undefined {
    const pc = this.pcRepo.findById(pcId);
    if (!pc) return undefined;

    pc.status = status ? 'MAINTENANCE' : 'LOCKED';
    this.pcRepo.save(pc);

    this.socketEventRepo.create({
      id: `EV${Date.now()}`,
      pcId,
      type: 'alert',
      message: `PC ${pcId} status toggled to: ${pc.status}`,
      timestamp: new Date().toISOString()
    });

    return pc;
  }
}

// ==========================================
// 4. Report Service
// ==========================================
export class ReportService {
  constructor(
    private txRepo = new TransactionRepository(),
    private pcRepo = new ComputerRepository(),
    private playerRepo = new PlayerRepository()
  ) {}

  public getDashboardStats(): {
    totalRevenue: number;
    activeSessionsCount: number;
    totalPlayersCount: number;
    occupancyRate: number;
  } {
    const txs = this.txRepo.findAll();
    const totalRevenue = parseFloat(txs.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2));

    const pcs = this.pcRepo.findAll();
    const activeSessionsCount = pcs.filter(pc => pc.status.startsWith('ACTIVE')).length;
    const totalPlayersCount = this.playerRepo.findAll().length;

    const onlineCount = pcs.filter(pc => pc.status !== 'OFFLINE' && pc.status !== 'MAINTENANCE').length;
    const occupancyRate = pcs.length > 0 ? parseFloat(((onlineCount / pcs.length) * 100).toFixed(1)) : 0;

    return {
      totalRevenue,
      activeSessionsCount,
      totalPlayersCount,
      occupancyRate
    };
  }

  public getTransactionHistory(): TransactionLog[] {
    return this.txRepo.findAll();
  }
}

// ==========================================
// 5. Sales Service
// ==========================================
export class SalesService {
  constructor(
    private productRepo = new ProductRepository(),
    private orderRepo = new OrderRepository(),
    private pcRepo = new ComputerRepository(),
    private settingsRepo = new SettingsRepository(),
    private socketEventRepo = new SocketEventRepository(),
    private playerRepo = new PlayerRepository(),
    private txRepo = new TransactionRepository()
  ) {}

  public getProducts(): POSProduct[] {
    return this.productRepo.findAll();
  }

  public createProduct(prod: POSProduct): void {
    this.productRepo.save(prod);
  }

  public getOrders(): Order[] {
    return this.orderRepo.findAll();
  }

  public placeOrder(pcId: string, items: Array<{ productId: string; quantity: number }>): Order | undefined {
    const pc = this.pcRepo.findById(pcId);
    if (!pc || !pc.currentUser) return undefined;

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const prod = this.productRepo.findById(item.productId);
      if (!prod || prod.stock < item.quantity) {
        logger.warn(`Insufficient stock or item not found: ${item.productId}`);
        return undefined;
      }

      orderItems.push({
        productId: prod.id,
        name: prod.name,
        price: prod.price,
        quantity: item.quantity
      });

      subtotal += prod.price * item.quantity;
      this.productRepo.updateStock(prod.id, -item.quantity);
    }

    const settings = this.settingsRepo.get();
    const finalPrice = parseFloat((subtotal * (1 + settings.taxRate)).toFixed(2));

    const order: Order = {
      id: `ORD-${Date.now()}`,
      pcId,
      username: pc.currentUser,
      items: orderItems,
      totalPrice: finalPrice,
      status: 'Pending',
      timestamp: new Date().toISOString()
    };

    this.orderRepo.create(order);

    this.socketEventRepo.create({
      id: `EV${Date.now()}`,
      pcId,
      type: 'order',
      message: `Order ${order.id} placed for $${finalPrice}`,
      timestamp: new Date().toISOString()
    });

    return order;
  }

  public settleOrder(orderId: string, status: 'Completed' | 'Cancelled'): Order | undefined {
    const order = this.orderRepo.findById(orderId);
    if (!order) return undefined;

    this.orderRepo.updateStatus(orderId, status);

    if (status === 'Completed') {
      this.txRepo.create({
        id: `TX${Date.now()}`,
        type: 'POS Purchase',
        pcId: order.pcId,
        username: order.username,
        amount: order.totalPrice,
        details: `POS Order ${order.id} fulfilled: ${order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}`,
        timestamp: new Date().toISOString()
      });
      
      const player = this.playerRepo.findByUsername(order.username);
      if (player) {
        player.points += Math.floor(order.totalPrice * 10);
        this.playerRepo.save(player);
      }
    } else if (status === 'Cancelled') {
      order.items.forEach(item => {
        this.productRepo.updateStock(item.productId, item.quantity);
      });
    }

    return order;
  }
}

// ==========================================
// 6. Settings Service
// ==========================================
export class SettingsService {
  constructor(
    private settingsRepo = new SettingsRepository(),
    private socketEventRepo = new SocketEventRepository()
  ) {}

  public getSettings() {
    return this.settingsRepo.get();
  }

  public updateSettings(updates: any) {
    return this.settingsRepo.update(1, updates);
  }

  public resetDatabase(): void {
    db.reset();
  }

  public getSocketEvents(): SocketEvent[] {
    return this.socketEventRepo.findAll();
  }

  public logSocketEvent(pcId: string, type: SocketEvent['type'], message: string): SocketEvent {
    const event: SocketEvent = {
      id: `EV${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      pcId,
      type,
      message,
      timestamp: new Date().toISOString()
    };
    this.socketEventRepo.create(event);
    return event;
  }
}

// ==========================================
// 7. Billing Service (Legacy compatibility wrapper)
// ==========================================
export class BillingService {
  constructor(
    private salesService = new SalesService(),
    private playerService = new PlayerService()
  ) {}

  public placeOrder(pcId: string, items: Array<{ productId: string; quantity: number }>): Order | undefined {
    return this.salesService.placeOrder(pcId, items);
  }

  public settleOrder(orderId: string, status: 'Completed' | 'Cancelled'): Order | undefined {
    return this.salesService.settleOrder(orderId, status);
  }

  public topupPlayer(username: string, amount: number): Player | undefined {
    return this.playerService.topupPlayer(username, amount);
  }
}

// ==========================================
// 8. Chat Service
// ==========================================
export class ChatService {
  constructor(
    private chatRepo = new ChatRepository(),
    private socketEventRepo = new SocketEventRepository()
  ) {}

  public sendMessage(sender: 'admin' | 'client', pcId: string, text: string): ChatMessage {
    const message: ChatMessage = {
      id: `MSG-${Date.now()}`,
      sender,
      pcId,
      text,
      timestamp: new Date().toISOString()
    };

    this.chatRepo.create(message);

    this.socketEventRepo.create({
      id: `EV${Date.now()}`,
      pcId,
      type: 'chat',
      message: `Chat message sent by ${sender} for PC ${pcId}`,
      timestamp: new Date().toISOString()
    });

    return message;
  }
}
