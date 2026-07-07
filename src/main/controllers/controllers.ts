import { Request, Response } from 'express';
import { 
  ComputerService, 
  PlayerService, 
  TimerService, 
  ReportService, 
  SalesService, 
  SettingsService,
  ChatService,
  BillingService,
  AuthService
} from '../services/services';
import { 
  ComputerRepository, 
  PlayerRepository, 
  ProductRepository, 
  OrderRepository, 
  TransactionRepository, 
  ChatRepository,
  SettingsRepository,
  SocketEventRepository
} from '../repositories/repositories';

const pcRepo = new ComputerRepository();
const playerRepo = new PlayerRepository();
const productRepo = new ProductRepository();
const orderRepo = new OrderRepository();
const txRepo = new TransactionRepository();
const chatRepo = new ChatRepository();

// ==========================================
// 1. Computer Controller
// ==========================================
export class ComputerController {
  constructor(
    private pcService = new ComputerService()
  ) {}

  public getAll(req: Request, res: Response): void {
    res.json(pcRepo.findAll());
  }

  public getById(req: Request, res: Response): void {
    const pc = pcRepo.findById(req.params.id);
    if (!pc) {
      res.status(404).json({ error: "Computer station not found" });
      return;
    }
    res.json(pc);
  }

  public unlock(req: Request, res: Response): void {
    const { mode, username, hoursPurchased } = req.body;
    const pcId = req.params.id;

    if (!username) {
      res.status(400).json({ error: "Username is required to unlock station" });
      return;
    }

    const pc = this.pcService.unlockComputer(pcId, mode || 'POSTPAID', username, Number(hoursPurchased || 0));
    if (!pc) {
      res.status(404).json({ error: `Station ${pcId} could not be unlocked` });
      return;
    }
    res.json({ success: true, computer: pc });
  }

  public lock(req: Request, res: Response): void {
    const pcId = req.params.id;
    const pc = this.pcService.lockComputer(pcId);
    if (!pc) {
      res.status(404).json({ error: `Station ${pcId} could not be locked` });
      return;
    }
    res.json({ success: true, computer: pc });
  }

  public setMaintenance(req: Request, res: Response): void {
    const pcId = req.params.id;
    const { status } = req.body;

    const pc = this.pcService.setMaintenance(pcId, !!status);
    if (!pc) {
      res.status(404).json({ error: `Station ${pcId} not found` });
      return;
    }
    res.json({ success: true, computer: pc });
  }
}

// ==========================================
// 2. Player Controller
// ==========================================
export class PlayerController {
  constructor(
    private playerService = new PlayerService()
  ) {}

  public getAll(req: Request, res: Response): void {
    res.json(this.playerService.findAll());
  }

  public getById(req: Request, res: Response): void {
    const player = this.playerService.findById(req.params.id);
    if (!player) {
      res.status(404).json({ error: "Player profile not found" });
      return;
    }
    res.json(player);
  }

  public create(req: Request, res: Response): void {
    const { username, fullName, membershipType, balance } = req.body;
    if (!username || !fullName) {
      res.status(400).json({ error: "Username and Full Name are required" });
      return;
    }

    const existing = this.playerService.findByUsername(username);
    if (existing) {
      res.status(400).json({ error: `Username @${username} is already registered` });
      return;
    }

    const player = this.playerService.createPlayer(
      username,
      fullName,
      Number(balance || 0),
      membershipType || 'Regular'
    );
    res.json({ success: true, player });
  }

  public topup(req: Request, res: Response): void {
    const { username, amount } = req.body;
    if (!username || amount === undefined || Number(amount) <= 0) {
      res.status(400).json({ error: "Valid username and positive topup amount are required" });
      return;
    }

    const player = this.playerService.topupPlayer(username, Number(amount));
    if (!player) {
      res.status(404).json({ error: "Player profile not found" });
      return;
    }
    res.json({ success: true, player });
  }
}

// ==========================================
// 3. Timer Controller
// ==========================================
export class TimerController {
  constructor(
    private timerService = new TimerService()
  ) {}

  public getAll(req: Request, res: Response): void {
    res.json(this.timerService.findAll());
  }

  public getById(req: Request, res: Response): void {
    const timer = this.timerService.findById(req.params.id);
    if (!timer) {
      res.status(404).json({ error: "Timer not found" });
      return;
    }
    res.json(timer);
  }

  public create(req: Request, res: Response): void {
    const { computerId, playerId, remainingSeconds, rateId } = req.body;
    if (!computerId || !playerId || remainingSeconds === undefined || !rateId) {
      res.status(400).json({ error: "computerId, playerId, remainingSeconds, and rateId are required" });
      return;
    }
    const timer = this.timerService.createTimer(
      computerId,
      playerId,
      Number(remainingSeconds),
      rateId
    );
    res.json({ success: true, timer });
  }

  public start(req: Request, res: Response): void {
    const id = req.params.id;
    const timer = this.timerService.findById(id);
    if (!timer) {
      res.status(404).json({ error: "Timer not found" });
      return;
    }
    this.timerService.startTimer(id);
    res.json({ success: true, timer: this.timerService.findById(id) });
  }

  public pause(req: Request, res: Response): void {
    const id = req.params.id;
    const timer = this.timerService.findById(id);
    if (!timer) {
      res.status(404).json({ error: "Timer not found" });
      return;
    }
    this.timerService.pauseTimer(id);
    res.json({ success: true, timer: this.timerService.findById(id) });
  }

  public resume(req: Request, res: Response): void {
    const id = req.params.id;
    const timer = this.timerService.findById(id);
    if (!timer) {
      res.status(404).json({ error: "Timer not found" });
      return;
    }
    this.timerService.resumeTimer(id);
    res.json({ success: true, timer: this.timerService.findById(id) });
  }

  public delete(req: Request, res: Response): void {
    const id = req.params.id;
    const timer = this.timerService.findById(id);
    if (!timer) {
      res.status(404).json({ error: "Timer not found" });
      return;
    }
    this.timerService.delete(id);
    res.json({ success: true, message: "Timer deleted successfully" });
  }
}

// ==========================================
// 4. Admin Controller
// ==========================================
export class AdminController {
  constructor(
    private reportService = new ReportService(),
    private salesService = new SalesService(),
    private settingsService = new SettingsService(),
    private chatService = new ChatService()
  ) {}

  public getStats(req: Request, res: Response): void {
    res.json(this.reportService.getDashboardStats());
  }

  public getTransactions(req: Request, res: Response): void {
    res.json(this.reportService.getTransactionHistory());
  }

  public getProducts(req: Request, res: Response): void {
    res.json(this.salesService.getProducts());
  }

  public createProduct(req: Request, res: Response): void {
    const { id, name, category, price, stock } = req.body;
    if (!id || !name || !category || price === undefined || stock === undefined) {
      res.status(400).json({ error: "Missing required fields for product" });
      return;
    }
    const product = { id, name, category, price: Number(price), stock: Number(stock) };
    this.salesService.createProduct(product);
    res.json({ success: true, product });
  }

  public getOrders(req: Request, res: Response): void {
    res.json(this.salesService.getOrders());
  }

  public placeOrder(req: Request, res: Response): void {
    const { pcId, items } = req.body;
    if (!pcId || !items || !Array.isArray(items)) {
      res.status(400).json({ error: "pcId and an array of items are required" });
      return;
    }

    const order = this.salesService.placeOrder(pcId, items);
    if (!order) {
      res.status(400).json({ error: "Could not place order (invalid items or insufficient stock)" });
      return;
    }
    res.json({ success: true, order });
  }

  public settleOrder(req: Request, res: Response): void {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status || (status !== 'Completed' && status !== 'Cancelled')) {
      res.status(400).json({ error: "Status must be 'Completed' or 'Cancelled'" });
      return;
    }

    const order = this.salesService.settleOrder(orderId, status);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ success: true, order });
  }

  public getSettings(req: Request, res: Response): void {
    res.json(this.settingsService.getSettings());
  }

  public updateSettings(req: Request, res: Response): void {
    const settings = this.settingsService.updateSettings(req.body);
    res.json({ success: true, settings });
  }

  public resetDatabase(req: Request, res: Response): void {
    this.settingsService.resetDatabase();
    res.json({ success: true, message: "Database re-initialized to default mock data" });
  }

  public getSocketEvents(req: Request, res: Response): void {
    res.json(this.settingsService.getSocketEvents());
  }

  public getChats(req: Request, res: Response): void {
    const pcId = req.query.pcId as string;
    if (pcId) {
      res.json(chatRepo.findByPCId(pcId));
    } else {
      res.json(chatRepo.findAll());
    }
  }

  public sendChat(req: Request, res: Response): void {
    const { sender, pcId, text } = req.body;
    if (!sender || !pcId || !text) {
      res.status(400).json({ error: "sender, pcId, and text are required fields" });
      return;
    }

    const message = this.chatService.sendMessage(sender, pcId, text);
    res.json({ success: true, message });
  }
}

// ==========================================
// Backward Compatibility / Legacy Controller aliases
// ==========================================
export class BillingController {
  constructor(
    private billingService = new BillingService()
  ) {}

  public getProducts(req: Request, res: Response): void {
    res.json(productRepo.findAll());
  }

  public createProduct(req: Request, res: Response): void {
    const { id, name, category, price, stock } = req.body;
    if (!id || !name || !category || price === undefined || stock === undefined) {
      res.status(400).json({ error: "Missing required fields for product" });
      return;
    }
    const product = { id, name, category, price: Number(price), stock: Number(stock) };
    productRepo.save(product);
    res.json({ success: true, product });
  }

  public getOrders(req: Request, res: Response): void {
    res.json(orderRepo.findAll());
  }

  public getTransactions(req: Request, res: Response): void {
    res.json(txRepo.findAll());
  }

  public placeOrder(req: Request, res: Response): void {
    const { pcId, items } = req.body;
    if (!pcId || !items || !Array.isArray(items)) {
      res.status(400).json({ error: "pcId and an array of items are required" });
      return;
    }

    const order = this.billingService.placeOrder(pcId, items);
    if (!order) {
      res.status(400).json({ error: "Could not place order (invalid items or insufficient stock)" });
      return;
    }
    res.json({ success: true, order });
  }

  public settleOrder(req: Request, res: Response): void {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status || (status !== 'Completed' && status !== 'Cancelled')) {
      res.status(400).json({ error: "Status must be 'Completed' or 'Cancelled'" });
      return;
    }

    const order = this.billingService.settleOrder(orderId, status);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ success: true, order });
  }

  public topupPlayer(req: Request, res: Response): void {
    const { username, amount } = req.body;
    if (!username || amount === undefined || Number(amount) <= 0) {
      res.status(400).json({ error: "Valid username and positive topup amount are required" });
      return;
    }

    const player = this.billingService.topupPlayer(username, Number(amount));
    if (!player) {
      res.status(404).json({ error: "Player profile not found" });
      return;
    }
    res.json({ success: true, player });
  }
}

export class ChatController {
  constructor(
    private chatService = new ChatService()
  ) {}

  public getHistory(req: Request, res: Response): void {
    const pcId = req.query.pcId as string;
    if (pcId) {
      res.json(chatRepo.findByPCId(pcId));
    } else {
      res.json(chatRepo.findAll());
    }
  }

  public send(req: Request, res: Response): void {
    const { sender, pcId, text } = req.body;
    if (!sender || !pcId || !text) {
      res.status(400).json({ error: "sender, pcId, and text are required fields" });
      return;
    }

    const message = this.chatService.sendMessage(sender, pcId, text);
    res.json({ success: true, message });
  }
}

export class SettingsController {
  constructor(
    private settingsService = new SettingsService()
  ) {}

  public get(req: Request, res: Response): void {
    res.json(this.settingsService.getSettings());
  }

  public update(req: Request, res: Response): void {
    const settings = this.settingsService.updateSettings(req.body);
    res.json({ success: true, settings });
  }

  public reset(req: Request, res: Response): void {
    this.settingsService.resetDatabase();
    res.json({ success: true, message: "Database re-initialized to default mock data" });
  }

  public getSocketEvents(req: Request, res: Response): void {
    res.json(this.settingsService.getSocketEvents());
  }
}

// ==========================================
// 5. Auth Controller
// ==========================================
export class AuthController {
  constructor(
    private authService = new AuthService()
  ) {}

  public async adminLogin(req: Request, res: Response): Promise<void> {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    try {
      const result = await this.authService.adminLogin(username, password);
      if (!result) {
        res.status(401).json({ error: "Invalid admin credentials" });
        return;
      }
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async playerLogin(req: Request, res: Response): Promise<void> {
    const { username, password, pcId } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    try {
      const result = await this.authService.playerLogin(username, password, pcId || null);
      if (!result) {
        res.status(401).json({ error: "Invalid member credentials" });
        return;
      }
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async guestLogin(req: Request, res: Response): Promise<void> {
    const { pcId } = req.body;
    try {
      const result = await this.authService.guestLogin(pcId || null);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async validateSession(req: Request, res: Response): Promise<void> {
    const { sessionId } = req.body;
    if (!sessionId) {
      res.status(400).json({ error: "Session ID is required" });
      return;
    }

    try {
      const session = await this.authService.validateSession(sessionId);
      if (!session) {
        res.status(401).json({ error: "Session is invalid or has expired" });
        return;
      }
      res.json({ success: true, session });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  public async logout(req: Request, res: Response): Promise<void> {
    const { sessionId } = req.body;
    if (!sessionId) {
      res.status(400).json({ error: "Session ID is required" });
      return;
    }

    try {
      const success = await this.authService.logout(sessionId);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
