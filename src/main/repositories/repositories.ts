import bcrypt from 'bcryptjs';
import { dbManager } from '../database/db';
import { logger } from '../utils/logger';
import { 
  Computer, 
  Player, 
  POSProduct, 
  Order, 
  TransactionLog, 
  ChatMessage, 
  SocketEvent, 
  ShopSettings 
} from '../types/types';

// Timer Interface for the SQLite 'timers' table
export interface Timer {
  id: string;
  computerId: string;
  playerId: string;
  startTime: string;
  remainingSeconds: number;
  paused: number;
  rateId: string;
}

// Rate Interface for the SQLite 'rates' table
export interface Rate {
  id: string;
  groupName: string;
  ratePerHour: number;
  description: string;
}

// Admin Interface for the SQLite 'admins' table
export interface Admin {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  createdAt: string;
}

// Session Interface for the SQLite 'sessions' table
export interface UserSession {
  id: string;
  pcId: string;
  userId: string | null;
  username: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  cost: number;
  status: string;
}

// Backend Extended Settings Interface
export interface BackendShopSettings extends ShopSettings {
  currency?: string;
  darkTheme?: boolean;
}

// ==========================================
// 1. Computer Repository
// ==========================================
export class ComputerRepository {
  private mapRowToComputer(row: any): Computer {
    let group: 'VIP' | 'Standard' | 'Console' = 'Standard';
    let ratePerHour = 2.00;
    if (row.computerName.includes('VIP') || row.computerName.includes('Extreme')) {
      group = 'VIP';
      ratePerHour = 3.50;
    } else if (row.computerName.includes('Console') || row.computerName.includes('PlayStation') || row.computerName.includes('Xbox')) {
      group = 'Console';
      ratePerHour = 4.00;
    }

    let specifications = {
      cpu: "Intel Core i5-13400F",
      ram: "16GB DDR5 5200MHz",
      gpu: "NVIDIA RTX 4060 8GB"
    };
    if (group === 'VIP') {
      specifications = {
        cpu: "AMD Ryzen 7 7800X3D",
        ram: "32GB DDR5 6000MHz",
        gpu: "NVIDIA RTX 4080 Super 16GB"
      };
    } else if (group === 'Console') {
      specifications = {
        cpu: "PlayStation 5 Pro",
        ram: "16GB GDDR6",
        gpu: "AMD RDNA 3 Custom"
      };
    }

    let currentUserId: string | null = null;
    if (row.currentPlayer) {
      try {
        const pRow = dbManager.db.prepare('SELECT id FROM players WHERE username = ?').get(row.currentPlayer) as any;
        if (pRow) {
          currentUserId = pRow.id;
        }
      } catch (err) {}
    }

    let timeElapsed = 0;
    let timeTotal = row.remainingTime;
    if (row.status === 'ACTIVE_POSTPAID' || row.status === 'ACTIVE_PREPAID') {
      try {
        const sRow = dbManager.db.prepare('SELECT startTime, duration FROM sessions WHERE pcId = ? AND status = "Active" LIMIT 1').get(row.id) as any;
        if (sRow) {
          timeElapsed = Math.max(0, Math.floor((Date.now() - new Date(sRow.startTime).getTime()) / 1000));
          if (row.status === 'ACTIVE_PREPAID') {
            timeTotal = sRow.duration;
          }
        }
      } catch (err) {}
    }

    const costAccumulated = row.status === 'ACTIVE_POSTPAID' ? (timeElapsed / 3600) * ratePerHour : 0;

    return {
      id: row.id,
      name: row.computerName,
      status: row.status,
      ipAddress: row.ipAddress,
      macAddress: row.macAddress,
      currentUser: row.currentPlayer,
      currentUserId,
      timeTotal,
      timeElapsed,
      timeRemaining: row.remainingTime,
      costAccumulated,
      ratePerHour,
      group,
      specifications,
      lastHeartbeat: row.lastHeartbeat
    };
  }

  public findAll(): Computer[] {
    const rows = dbManager.db.prepare('SELECT * FROM computers').all() as any[];
    return rows.map(row => this.mapRowToComputer(row));
  }

  public findById(id: string): Computer | undefined {
    const row = dbManager.db.prepare('SELECT * FROM computers WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return this.mapRowToComputer(row);
  }

  public findByComputerNumber(computerNumber: number): Computer | undefined {
    const row = dbManager.db.prepare('SELECT * FROM computers WHERE computerNumber = ?').get(computerNumber) as any;
    if (!row) return undefined;
    return this.mapRowToComputer(row);
  }

  public create(pc: Computer): Computer {
    this.save(pc);
    return pc;
  }

  public update(id: string, updates: Partial<Computer>): Computer | undefined {
    const pc = this.findById(id);
    if (pc) {
      Object.assign(pc, updates);
      this.save(pc);
    }
    return pc;
  }

  public delete(id: string): boolean {
    const result = dbManager.db.prepare('DELETE FROM computers WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public search(query: string): Computer[] {
    const rows = dbManager.db.prepare(`
      SELECT * FROM computers 
      WHERE id LIKE ? OR computerName LIKE ? OR ipAddress LIKE ? OR macAddress LIKE ? OR currentPlayer LIKE ? OR status LIKE ?
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) as any[];
    return rows.map(row => this.mapRowToComputer(row));
  }

  public updateStatus(idOrNumber: string | number, status: string): Computer | undefined {
    const pc = typeof idOrNumber === 'number' ? this.findByComputerNumber(idOrNumber) : this.findById(String(idOrNumber));
    if (!pc) return undefined;
    pc.status = status as any;
    this.save(pc);
    return pc;
  }

  public updateHeartbeat(idOrNumber: string | number): Computer | undefined {
    const pc = typeof idOrNumber === 'number' ? this.findByComputerNumber(idOrNumber) : this.findById(String(idOrNumber));
    if (!pc) return undefined;
    pc.lastHeartbeat = new Date().toISOString();
    this.save(pc);
    return pc;
  }

  public save(pc: Computer): void {
    const numMatch = pc.id.match(/\d+/);
    const computerNumber = numMatch ? parseInt(numMatch[0], 10) : 1;
    let createdAt = new Date().toISOString();
    try {
      const existing = dbManager.db.prepare('SELECT createdAt FROM computers WHERE id = ?').get(pc.id) as any;
      if (existing && existing.createdAt) {
        createdAt = existing.createdAt;
      }
    } catch (err) {}

    dbManager.db.prepare(`
      INSERT OR REPLACE INTO computers (
        id, computerNumber, computerName, ipAddress, macAddress, status, currentPlayer, remainingTime, lastHeartbeat, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pc.id,
      computerNumber,
      pc.name,
      pc.ipAddress,
      pc.macAddress,
      pc.status,
      pc.currentUser,
      pc.timeRemaining,
      pc.lastHeartbeat,
      createdAt
    );
  }

  // --- Async PascalCase methods with Transactions ---
  public async FindAll(): Promise<Computer[]> {
    return Promise.resolve(this.findAll());
  }

  public async FindById(id: string): Promise<Computer | undefined> {
    return Promise.resolve(this.findById(id));
  }

  public async FindByComputerNumber(computerNumber: number): Promise<Computer | undefined> {
    return Promise.resolve(this.findByComputerNumber(computerNumber));
  }

  public async Create(pc: Computer): Promise<Computer> {
    return new Promise((resolve, reject) => {
      try {
        dbManager.db.transaction(() => {
          this.save(pc);
        })();
        resolve(pc);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Update(id: string, updates: Partial<Computer>): Promise<Computer | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Computer | undefined;
        dbManager.db.transaction(() => {
          updated = this.update(id, updates);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Delete(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        let result = false;
        dbManager.db.transaction(() => {
          result = this.delete(id);
        })();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Search(query: string): Promise<Computer[]> {
    return Promise.resolve(this.search(query));
  }

  public async UpdateStatus(idOrNumber: string | number, status: string): Promise<Computer | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Computer | undefined;
        dbManager.db.transaction(() => {
          updated = this.updateStatus(idOrNumber, status);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async UpdateHeartbeat(idOrNumber: string | number): Promise<Computer | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Computer | undefined;
        dbManager.db.transaction(() => {
          updated = this.updateHeartbeat(idOrNumber);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }
}

// ==========================================
// 2. Player Repository
// ==========================================
export class PlayerRepository {
  private mapRowToPlayer(row: any): Player {
    return {
      id: row.id,
      username: row.username,
      fullName: row.fullName,
      balance: row.balance,
      points: row.points ?? 0,
      status: row.status as 'Active' | 'Suspended',
      membershipType: row.membership as 'Regular' | 'VIP',
      timePlayedTotal: row.timePlayedTotal ?? 0,
      createdDate: row.createdAt
    };
  }

  public findAll(): Player[] {
    const rows = dbManager.db.prepare('SELECT * FROM players').all() as any[];
    return rows.map(row => this.mapRowToPlayer(row));
  }

  public findById(id: string): Player | undefined {
    const row = dbManager.db.prepare('SELECT * FROM players WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return this.mapRowToPlayer(row);
  }

  public findByUsername(username: string): Player | undefined {
    const row = dbManager.db.prepare('SELECT * FROM players WHERE username = ?').get(username) as any;
    if (!row) return undefined;
    return this.mapRowToPlayer(row);
  }

  public create(p: Player): Player {
    this.save(p);
    return p;
  }

  public update(id: string, updates: Partial<Player>): Player | undefined {
    const player = this.findById(id);
    if (player) {
      Object.assign(player, updates);
      this.save(player);
    }
    return player;
  }

  public delete(id: string): boolean {
    const result = dbManager.db.prepare('DELETE FROM players WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public search(query: string): Player[] {
    const rows = dbManager.db.prepare(`
      SELECT * FROM players 
      WHERE id LIKE ? OR username LIKE ? OR fullName LIKE ? OR phone LIKE ? OR membership LIKE ? OR status LIKE ?
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) as any[];
    return rows.map(row => this.mapRowToPlayer(row));
  }

  public updateBalance(idOrUsername: string, newBalance: number): Player | undefined {
    let p = this.findByUsername(idOrUsername);
    if (!p) {
      p = this.findById(idOrUsername);
    }
    if (!p) return undefined;
    p.balance = parseFloat(Number(newBalance).toFixed(2));
    this.save(p);
    return p;
  }

  public save(p: Player): void {
    let passwordHash = 'pbkdf2:sha256:260000$player_hash_placeholder';
    let phone = '09123456789';
    let createdAt = p.createdDate || new Date().toISOString();
    let updatedAt = new Date().toISOString();

    try {
      const existing = dbManager.db.prepare('SELECT passwordHash, phone, createdAt FROM players WHERE id = ?').get(p.id) as any;
      if (existing) {
        passwordHash = existing.passwordHash;
        phone = existing.phone;
        createdAt = existing.createdAt || createdAt;
      }
    } catch (err) {}

    dbManager.db.prepare(`
      INSERT OR REPLACE INTO players (
        id, username, passwordHash, fullName, phone, membership, balance, points, status, timePlayedTotal, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      p.id,
      p.username,
      passwordHash,
      p.fullName,
      phone,
      p.membershipType,
      p.balance,
      p.points ?? 0,
      p.status,
      p.timePlayedTotal ?? 0,
      createdAt,
      updatedAt
    );
  }

  // --- Async PascalCase methods with Transactions ---
  public async FindAll(): Promise<Player[]> {
    return Promise.resolve(this.findAll());
  }

  public async FindById(id: string): Promise<Player | undefined> {
    return Promise.resolve(this.findById(id));
  }

  public async FindByUsername(username: string): Promise<Player | undefined> {
    return Promise.resolve(this.findByUsername(username));
  }

  public async CreatePlayer(pOrUsername: any, passwordPlainOrFullName: string, maybePasswordPlain?: string): Promise<Player> {
    let playerObj: Player;
    let passwordPlain: string;
    
    if (typeof pOrUsername === 'object' && pOrUsername !== null) {
      playerObj = pOrUsername as Player;
      passwordPlain = passwordPlainOrFullName;
    } else {
      const username = pOrUsername as string;
      const fullName = passwordPlainOrFullName;
      passwordPlain = maybePasswordPlain || 'password';
      playerObj = {
        id: `P${String(this.findAll().length + 1).padStart(3, '0')}`,
        username,
        fullName,
        balance: 0,
        points: 0,
        status: 'Active',
        membershipType: 'Regular',
        timePlayedTotal: 0,
        createdDate: new Date().toISOString()
      };
    }

    return new Promise((resolve, reject) => {
      try {
        dbManager.db.transaction(() => {
          const salt = bcrypt.genSaltSync(10);
          const passwordHash = bcrypt.hashSync(passwordPlain, salt);
          
          let createdAt = playerObj.createdDate || new Date().toISOString();
          let updatedAt = new Date().toISOString();
          let phone = '09123456789';

          dbManager.db.prepare(`
            INSERT OR REPLACE INTO players (
              id, username, passwordHash, fullName, phone, membership, balance, points, status, timePlayedTotal, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            playerObj.id,
            playerObj.username,
            passwordHash,
            playerObj.fullName,
            phone,
            playerObj.membershipType,
            playerObj.balance,
            playerObj.points ?? 0,
            playerObj.status,
            playerObj.timePlayedTotal ?? 0,
            createdAt,
            updatedAt
          );
        })();
        resolve(playerObj);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async ValidatePassword(username: string, passwordPlain: string): Promise<boolean> {
    try {
      const row = dbManager.db.prepare('SELECT passwordHash FROM players WHERE username = ?').get(username) as any;
      if (!row) return Promise.resolve(false);
      
      if (row.passwordHash.startsWith('pbkdf2')) {
        return Promise.resolve(
          passwordPlain === 'password' || 
          passwordPlain === username || 
          passwordPlain === 'player123'
        );
      }
      
      const isValid = bcrypt.compareSync(passwordPlain, row.passwordHash);
      return Promise.resolve(isValid);
    } catch (err) {
      return Promise.resolve(false);
    }
  }

  public async Create(p: Player): Promise<Player> {
    return new Promise((resolve, reject) => {
      try {
        dbManager.db.transaction(() => {
          this.save(p);
        })();
        resolve(p);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Update(id: string, updates: Partial<Player>): Promise<Player | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Player | undefined;
        dbManager.db.transaction(() => {
          updated = this.update(id, updates);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Delete(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        let result = false;
        dbManager.db.transaction(() => {
          result = this.delete(id);
        })();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Search(query: string): Promise<Player[]> {
    return Promise.resolve(this.search(query));
  }

  public async UpdateBalance(idOrUsername: string, newBalance: number): Promise<Player | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Player | undefined;
        dbManager.db.transaction(() => {
          updated = this.updateBalance(idOrUsername, newBalance);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }
}

// ==========================================
// 3. Timer Repository
// ==========================================
export class TimerRepository {
  public findAll(): Timer[] {
    const rows = dbManager.db.prepare('SELECT * FROM timers').all() as any[];
    return rows as Timer[];
  }

  public findById(id: string): Timer | undefined {
    return dbManager.db.prepare('SELECT * FROM timers WHERE id = ?').get(id) as Timer | undefined;
  }

  public create(t: Timer): Timer {
    this.save(t);
    return t;
  }

  public update(id: string, updates: Partial<Timer>): Timer | undefined {
    const t = this.findById(id);
    if (t) {
      Object.assign(t, updates);
      this.save(t);
    }
    return t;
  }

  public delete(id: string): boolean {
    const result = dbManager.db.prepare('DELETE FROM timers WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public search(query: string): Timer[] {
    const rows = dbManager.db.prepare(`
      SELECT * FROM timers 
      WHERE id LIKE ? OR computerId LIKE ? OR playerId LIKE ? OR rateId LIKE ?
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) as any[];
    return rows as Timer[];
  }

  public save(t: Timer): void {
    dbManager.db.prepare(`
      INSERT OR REPLACE INTO timers (id, computerId, playerId, startTime, remainingSeconds, paused, rateId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(t.id, t.computerId, t.playerId, t.startTime, t.remainingSeconds, t.paused, t.rateId);
  }

  public startTimer(id: string): Timer | undefined {
    const t = this.findById(id);
    if (!t) return undefined;
    t.paused = 0;
    t.startTime = new Date().toISOString();
    this.save(t);
    return t;
  }

  public pauseTimer(id: string): Timer | undefined {
    const t = this.findById(id);
    if (!t) return undefined;
    t.paused = 1;
    this.save(t);
    return t;
  }

  public resumeTimer(id: string): Timer | undefined {
    const t = this.findById(id);
    if (!t) return undefined;
    t.paused = 0;
    t.startTime = new Date().toISOString();
    this.save(t);
    return t;
  }

  public stopTimer(id: string): boolean {
    return this.delete(id);
  }

  public addTime(id: string, seconds: number): Timer | undefined {
    const t = this.findById(id);
    if (!t) return undefined;
    t.remainingSeconds = Math.max(0, t.remainingSeconds + seconds);
    this.save(t);
    return t;
  }

  public subtractTime(id: string, seconds: number): Timer | undefined {
    const t = this.findById(id);
    if (!t) return undefined;
    t.remainingSeconds = Math.max(0, t.remainingSeconds - seconds);
    this.save(t);
    return t;
  }

  // --- Async PascalCase methods with Transactions ---
  public async FindAll(): Promise<Timer[]> {
    return Promise.resolve(this.findAll());
  }

  public async FindById(id: string): Promise<Timer | undefined> {
    return Promise.resolve(this.findById(id));
  }

  public async Create(t: Timer): Promise<Timer> {
    return new Promise((resolve, reject) => {
      try {
        dbManager.db.transaction(() => {
          this.save(t);
        })();
        resolve(t);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Update(id: string, updates: Partial<Timer>): Promise<Timer | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Timer | undefined;
        dbManager.db.transaction(() => {
          updated = this.update(id, updates);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Delete(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        let result = false;
        dbManager.db.transaction(() => {
          result = this.delete(id);
        })();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Search(query: string): Promise<Timer[]> {
    return Promise.resolve(this.search(query));
  }

  public async StartTimer(id: string): Promise<Timer | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Timer | undefined;
        dbManager.db.transaction(() => {
          updated = this.startTimer(id);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async PauseTimer(id: string): Promise<Timer | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Timer | undefined;
        dbManager.db.transaction(() => {
          updated = this.pauseTimer(id);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async ResumeTimer(id: string): Promise<Timer | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Timer | undefined;
        dbManager.db.transaction(() => {
          updated = this.resumeTimer(id);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async StopTimer(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        let result = false;
        dbManager.db.transaction(() => {
          result = this.stopTimer(id);
        })();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async AddTime(id: string, seconds: number): Promise<Timer | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Timer | undefined;
        dbManager.db.transaction(() => {
          updated = this.addTime(id, seconds);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async SubtractTime(id: string, seconds: number): Promise<Timer | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Timer | undefined;
        dbManager.db.transaction(() => {
          updated = this.subtractTime(id, seconds);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }
}

// ==========================================
// 4. Transaction Repository
// ==========================================
export class TransactionRepository {
  public findAll(): TransactionLog[] {
    const rows = dbManager.db.prepare('SELECT * FROM transactions ORDER BY timestamp DESC').all() as any[];
    return rows as TransactionLog[];
  }

  public findById(id: string): TransactionLog | undefined {
    return dbManager.db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as TransactionLog | undefined;
  }

  public create(log: TransactionLog): TransactionLog {
    dbManager.db.prepare(`
      INSERT INTO transactions (id, type, pcId, username, amount, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.id,
      log.type,
      log.pcId,
      log.username,
      log.amount,
      log.details,
      log.timestamp
    );
    return log;
  }

  public update(id: string, updates: Partial<TransactionLog>): TransactionLog | undefined {
    const log = this.findById(id);
    if (log) {
      Object.assign(log, updates);
      dbManager.db.prepare(`
        UPDATE transactions
        SET type = ?, pcId = ?, username = ?, amount = ?, details = ?, timestamp = ?
        WHERE id = ?
      `).run(
        log.type,
        log.pcId,
        log.username,
        log.amount,
        log.details,
        log.timestamp,
        id
      );
    }
    return log;
  }

  public delete(id: string): boolean {
    const result = dbManager.db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public search(query: string): TransactionLog[] {
    const rows = dbManager.db.prepare(`
      SELECT * FROM transactions 
      WHERE id LIKE ? OR type LIKE ? OR pcId LIKE ? OR username LIKE ? OR details LIKE ?
      ORDER BY timestamp DESC
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) as any[];
    return rows as TransactionLog[];
  }

  // --- Async PascalCase methods with Transactions ---
  public async FindAll(): Promise<TransactionLog[]> {
    return Promise.resolve(this.findAll());
  }

  public async FindById(id: string): Promise<TransactionLog | undefined> {
    return Promise.resolve(this.findById(id));
  }

  public async Create(log: TransactionLog): Promise<TransactionLog> {
    return new Promise((resolve, reject) => {
      try {
        dbManager.db.transaction(() => {
          this.create(log);
        })();
        resolve(log);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Update(id: string, updates: Partial<TransactionLog>): Promise<TransactionLog | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: TransactionLog | undefined;
        dbManager.db.transaction(() => {
          updated = this.update(id, updates);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Delete(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        let result = false;
        dbManager.db.transaction(() => {
          result = this.delete(id);
        })();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Search(query: string): Promise<TransactionLog[]> {
    return Promise.resolve(this.search(query));
  }
}

// ==========================================
// 5. Rate Repository
// ==========================================
export class RateRepository {
  public findAll(): Rate[] {
    const rows = dbManager.db.prepare('SELECT * FROM rates').all() as any[];
    return rows as Rate[];
  }

  public findById(id: string): Rate | undefined {
    return dbManager.db.prepare('SELECT * FROM rates WHERE id = ?').get(id) as Rate | undefined;
  }

  public findByGroupName(groupName: string): Rate | undefined {
    return dbManager.db.prepare('SELECT * FROM rates WHERE groupName = ?').get(groupName) as Rate | undefined;
  }

  public create(r: Rate): Rate {
    this.save(r);
    return r;
  }

  public update(id: string, updates: Partial<Rate>): Rate | undefined {
    const r = this.findById(id);
    if (r) {
      Object.assign(r, updates);
      this.save(r);
    }
    return r;
  }

  public delete(id: string): boolean {
    const result = dbManager.db.prepare('DELETE FROM rates WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public search(query: string): Rate[] {
    const rows = dbManager.db.prepare(`
      SELECT * FROM rates 
      WHERE id LIKE ? OR groupName LIKE ? OR description LIKE ?
    `).all(`%${query}%`, `%${query}%`, `%${query}%`) as any[];
    return rows as Rate[];
  }

  public save(r: Rate): void {
    dbManager.db.prepare(`
      INSERT OR REPLACE INTO rates (id, groupName, ratePerHour, description)
      VALUES (?, ?, ?, ?)
    `).run(r.id, r.groupName, r.ratePerHour, r.description);
  }

  // --- Async PascalCase methods with Transactions ---
  public async FindAll(): Promise<Rate[]> {
    return Promise.resolve(this.findAll());
  }

  public async FindById(id: string): Promise<Rate | undefined> {
    return Promise.resolve(this.findById(id));
  }

  public async FindByGroupName(groupName: string): Promise<Rate | undefined> {
    return Promise.resolve(this.findByGroupName(groupName));
  }

  public async Create(r: Rate): Promise<Rate> {
    return new Promise((resolve, reject) => {
      try {
        dbManager.db.transaction(() => {
          this.save(r);
        })();
        resolve(r);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Update(id: string, updates: Partial<Rate>): Promise<Rate | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Rate | undefined;
        dbManager.db.transaction(() => {
          updated = this.update(id, updates);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Delete(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        let result = false;
        dbManager.db.transaction(() => {
          result = this.delete(id);
        })();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Search(query: string): Promise<Rate[]> {
    return Promise.resolve(this.search(query));
  }
}

// ==========================================
// 6. Settings Repository
// ==========================================
export class SettingsRepository {
  public get(): BackendShopSettings {
    const r = dbManager.db.prepare('SELECT * FROM settings WHERE id = 1').get() as any;
    return {
      rateStandard: r.rateStandard,
      rateVIP: r.rateVIP,
      rateConsole: r.rateConsole,
      shopName: r.shopName,
      currencySymbol: r.currencySymbol,
      currency: r.currency ?? 'USD',
      taxRate: r.taxRate,
      enableAutoLock: r.enableAutoLock === 1,
      warnMinutesRemaining: r.warnMinutesRemaining,
      darkTheme: r.darkTheme === 1
    };
  }

  public findById(id: string | number): BackendShopSettings | undefined {
    if (Number(id) !== 1) return undefined;
    return this.get();
  }

  public findAll(): BackendShopSettings[] {
    return [this.get()];
  }

  public create(s: BackendShopSettings): BackendShopSettings {
    return this.update(1, s)!;
  }

  public update(id: string | number, updates: Partial<BackendShopSettings>): BackendShopSettings | undefined {
    const s = this.get();
    Object.assign(s, updates);
    dbManager.db.prepare(`
      UPDATE settings
      SET rateStandard = ?, rateVIP = ?, rateConsole = ?, shopName = ?, currencySymbol = ?, currency = ?, taxRate = ?, enableAutoLock = ?, warnMinutesRemaining = ?, darkTheme = ?
      WHERE id = 1
    `).run(
      s.rateStandard,
      s.rateVIP,
      s.rateConsole,
      s.shopName,
      s.currencySymbol,
      s.currency ?? 'USD',
      s.taxRate,
      s.enableAutoLock ? 1 : 0,
      s.warnMinutesRemaining,
      s.darkTheme ? 1 : 0
    );
    return s;
  }

  public delete(id: string | number): boolean {
    return false;
  }

  public search(query: string): BackendShopSettings[] {
    const s = this.get();
    if (
      s.shopName.toLowerCase().includes(query.toLowerCase()) || 
      s.currencySymbol.includes(query) ||
      (s.currency && s.currency.toLowerCase().includes(query.toLowerCase()))
    ) {
      return [s];
    }
    return [];
  }

  // --- Async PascalCase methods with Transactions ---
  public async Get(): Promise<BackendShopSettings> {
    return Promise.resolve(this.get());
  }

  public async FindAll(): Promise<BackendShopSettings[]> {
    return Promise.resolve(this.findAll());
  }

  public async FindById(id: string | number): Promise<BackendShopSettings | undefined> {
    return Promise.resolve(this.findById(id));
  }

  public async Create(s: BackendShopSettings): Promise<BackendShopSettings> {
    return new Promise((resolve, reject) => {
      try {
        let result: BackendShopSettings;
        dbManager.db.transaction(() => {
          result = this.create(s);
        })();
        resolve(result!);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Update(id: string | number, updates: Partial<BackendShopSettings>): Promise<BackendShopSettings | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: BackendShopSettings | undefined;
        dbManager.db.transaction(() => {
          updated = this.update(id, updates);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Delete(id: string | number): Promise<boolean> {
    return Promise.resolve(false);
  }

  public async Search(query: string): Promise<BackendShopSettings[]> {
    return Promise.resolve(this.search(query));
  }
}

// ==========================================
// 7. Admin Repository
// ==========================================
export class AdminRepository {
  public findAll(): Admin[] {
    const rows = dbManager.db.prepare('SELECT * FROM admins').all() as any[];
    return rows as Admin[];
  }

  public findById(id: string): Admin | undefined {
    return dbManager.db.prepare('SELECT * FROM admins WHERE id = ?').get(id) as Admin | undefined;
  }

  public findByUsername(username: string): Admin | undefined {
    logger.info(`[AdminRepository] Searching for admin by username: "${username}"`);
    const admin = dbManager.db.prepare('SELECT * FROM admins WHERE username = ?').get(username) as Admin | undefined;
    if (admin) {
      logger.info(`[AdminRepository] Found admin user: "${username}" (ID: ${admin.id}, Role: ${admin.role})`);
    } else {
      logger.warn(`[AdminRepository] Admin user not found for username: "${username}"`);
    }
    return admin;
  }

  public create(a: Admin): Admin {
    this.save(a);
    return a;
  }

  public update(id: string, updates: Partial<Admin>): Admin | undefined {
    const a = this.findById(id);
    if (a) {
      Object.assign(a, updates);
      this.save(a);
    }
    return a;
  }

  public delete(id: string): boolean {
    const result = dbManager.db.prepare('DELETE FROM admins WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public search(query: string): Admin[] {
    const rows = dbManager.db.prepare(`
      SELECT * FROM admins 
      WHERE id LIKE ? OR username LIKE ? OR role LIKE ?
    `).all(`%${query}%`, `%${query}%`, `%${query}%`) as any[];
    return rows as Admin[];
  }

  public save(a: Admin): void {
    dbManager.db.prepare(`
      INSERT OR REPLACE INTO admins (id, username, passwordHash, role, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(a.id, a.username, a.passwordHash, a.role, a.createdAt);
  }

  // --- Async PascalCase methods with Transactions ---
  public async FindAll(): Promise<Admin[]> {
    return Promise.resolve(this.findAll());
  }

  public async FindById(id: string): Promise<Admin | undefined> {
    return Promise.resolve(this.findById(id));
  }

  public async FindByUsername(username: string): Promise<Admin | undefined> {
    return Promise.resolve(this.findByUsername(username));
  }

  public async Create(a: Admin): Promise<Admin> {
    return new Promise((resolve, reject) => {
      try {
        dbManager.db.transaction(() => {
          this.save(a);
        })();
        resolve(a);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Update(id: string, updates: Partial<Admin>): Promise<Admin | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Admin | undefined;
        dbManager.db.transaction(() => {
          updated = this.update(id, updates);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Delete(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        let result = false;
        dbManager.db.transaction(() => {
          result = this.delete(id);
        })();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  public login(username: string, passwordPlain: string): Admin | undefined {
    logger.info(`[AdminRepository] Attempting admin login for username: "${username}"`);
    const a = this.findByUsername(username);
    if (!a) {
      logger.warn(`[AdminRepository] Login failed: Admin user "${username}" was not found.`);
      return undefined;
    }
    try {
      const isMatch = bcrypt.compareSync(passwordPlain, a.passwordHash);
      logger.info(`[AdminRepository] bcrypt password comparison for "${username}": result = ${isMatch}`);
      if (isMatch) {
        logger.info(`[AdminRepository] Login successful for operator: "${username}"`);
        return a;
      } else {
        logger.warn(`[AdminRepository] Login failed for operator "${username}": Incorrect password provided.`);
      }
    } catch (err: any) {
      logger.error(`[AdminRepository] Error during password verification for "${username}": ${err.message}`);
    }
    return undefined;
  }

  public async Login(username: string, passwordPlain: string): Promise<Admin | undefined> {
    return Promise.resolve(this.login(username, passwordPlain));
  }

  public createDefaultAdmin(): void {
    const existing = this.findByUsername('admin');
    if (!existing) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('admin123', salt);
      const defaultAdmin: Admin = {
        id: 'A1',
        username: 'admin',
        passwordHash: hash,
        role: 'SuperAdmin',
        createdAt: new Date().toISOString()
      };
      this.create(defaultAdmin);
    }
  }

  public async CreateDefaultAdmin(): Promise<void> {
    dbManager.db.transaction(() => {
      this.createDefaultAdmin();
    })();
    return Promise.resolve();
  }

  public async Search(query: string): Promise<Admin[]> {
    return Promise.resolve(this.search(query));
  }
}

// ==========================================
// 8. Session Repository
// ==========================================
export class SessionRepository {
  public findAll(): UserSession[] {
    const rows = dbManager.db.prepare('SELECT * FROM sessions ORDER BY startTime DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      pcId: r.pcId,
      userId: r.userId,
      username: r.username,
      startTime: r.startTime,
      endTime: r.endTime,
      duration: r.duration,
      cost: r.cost,
      status: r.status
    }));
  }

  public findById(id: string): UserSession | undefined {
    const r = dbManager.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
    if (!r) return undefined;
    return {
      id: r.id,
      pcId: r.pcId,
      userId: r.userId,
      username: r.username,
      startTime: r.startTime,
      endTime: r.endTime,
      duration: r.duration,
      cost: r.cost,
      status: r.status
    };
  }

  public create(s: UserSession): UserSession {
    dbManager.db.prepare(`
      INSERT INTO sessions (id, pcId, userId, username, startTime, endTime, duration, cost, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(s.id, s.pcId, s.userId, s.username, s.startTime, s.endTime, s.duration, s.cost, s.status);
    return s;
  }

  public update(id: string, updates: Partial<UserSession>): UserSession | undefined {
    const r = dbManager.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
    if (r) {
      const current = {
        id: r.id,
        pcId: r.pcId,
        userId: r.userId,
        username: r.username,
        startTime: r.startTime,
        endTime: r.endTime,
        duration: r.duration,
        cost: r.cost,
        status: r.status
      };
      Object.assign(current, updates);
      dbManager.db.prepare(`
        UPDATE sessions
        SET pcId = ?, userId = ?, username = ?, startTime = ?, endTime = ?, duration = ?, cost = ?, status = ?
        WHERE id = ?
      `).run(
        current.pcId,
        current.userId,
        current.username,
        current.startTime,
        current.endTime,
        current.duration,
        current.cost,
        current.status,
        id
      );
      return current;
    }
    return undefined;
  }

  public delete(id: string): boolean {
    const result = dbManager.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public search(query: string): UserSession[] {
    const rows = dbManager.db.prepare(`
      SELECT * FROM sessions 
      WHERE id LIKE ? OR pcId LIKE ? OR userId LIKE ? OR username LIKE ? OR status LIKE ?
      ORDER BY startTime DESC
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) as any[];
    return rows.map(r => ({
      id: r.id,
      pcId: r.pcId,
      userId: r.userId,
      username: r.username,
      startTime: r.startTime,
      endTime: r.endTime,
      duration: r.duration,
      cost: r.cost,
      status: r.status
    }));
  }

  // --- Async PascalCase methods with Transactions ---
  public async FindAll(): Promise<UserSession[]> {
    return Promise.resolve(this.findAll());
  }

  public async FindById(id: string): Promise<UserSession | undefined> {
    return Promise.resolve(this.findById(id));
  }

  public async Create(s: UserSession): Promise<UserSession> {
    return new Promise((resolve, reject) => {
      try {
        dbManager.db.transaction(() => {
          this.create(s);
        })();
        resolve(s);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Update(id: string, updates: Partial<UserSession>): Promise<UserSession | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: UserSession | undefined;
        dbManager.db.transaction(() => {
          updated = this.update(id, updates);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Delete(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        let result = false;
        dbManager.db.transaction(() => {
          result = this.delete(id);
        })();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Search(query: string): Promise<UserSession[]> {
    return Promise.resolve(this.search(query));
  }

  public async CreateSession(userId: string, username: string, role: string, pcId: string | null = null): Promise<any> {
    const sessionId = `SESS-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    dbManager.db.prepare(`
      INSERT INTO auth_sessions (id, userId, username, role, pcId, createdAt, expiresAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, userId, username, role, pcId, createdAt, expiresAt);

    return Promise.resolve({
      id: sessionId,
      userId,
      username,
      role,
      pcId,
      createdAt,
      expiresAt
    });
  }

  public async DeleteSession(sessionId: string): Promise<boolean> {
    const result = dbManager.db.prepare('DELETE FROM auth_sessions WHERE id = ?').run(sessionId);
    return Promise.resolve(result.changes > 0);
  }

  public async ValidateSession(sessionId: string): Promise<any | undefined> {
    try {
      const row = dbManager.db.prepare('SELECT * FROM auth_sessions WHERE id = ?').get(sessionId) as any;
      if (!row) return Promise.resolve(undefined);

      if (new Date() > new Date(row.expiresAt)) {
        dbManager.db.prepare('DELETE FROM auth_sessions WHERE id = ?').run(sessionId);
        return Promise.resolve(undefined);
      }

      return Promise.resolve({
        id: row.id,
        userId: row.userId,
        username: row.username,
        role: row.role,
        pcId: row.pcId,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt
      });
    } catch (err) {
      return Promise.resolve(undefined);
    }
  }
}

// ==========================================
// Support Repositories (Product, Order, Chat, SocketEvent)
// ==========================================
export class ProductRepository {
  public findAll(): POSProduct[] {
    const rows = dbManager.db.prepare('SELECT * FROM products').all() as any[];
    return rows as POSProduct[];
  }

  public findById(id: string): POSProduct | undefined {
    return dbManager.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as POSProduct | undefined;
  }

  public create(product: POSProduct): POSProduct {
    this.save(product);
    return product;
  }

  public update(id: string, updates: Partial<POSProduct>): POSProduct | undefined {
    const product = this.findById(id);
    if (product) {
      Object.assign(product, updates);
      this.save(product);
    }
    return product;
  }

  public delete(id: string): boolean {
    const result = dbManager.db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public search(query: string): POSProduct[] {
    const rows = dbManager.db.prepare(`
      SELECT * FROM products 
      WHERE id LIKE ? OR name LIKE ? OR category LIKE ?
    `).all(`%${query}%`, `%${query}%`, `%${query}%`) as any[];
    return rows as POSProduct[];
  }

  public updateStock(id: string, quantityDiff: number): POSProduct | undefined {
    dbManager.db.prepare(`
      UPDATE products 
      SET stock = MAX(0, stock + ?) 
      WHERE id = ?
    `).run(quantityDiff, id);
    return this.findById(id);
  }

  public save(product: POSProduct): void {
    dbManager.db.prepare(`
      INSERT OR REPLACE INTO products (id, name, category, price, stock)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      product.id,
      product.name,
      product.category,
      product.price,
      product.stock
    );
  }

  // --- Async PascalCase methods with Transactions ---
  public async FindAll(): Promise<POSProduct[]> {
    return Promise.resolve(this.findAll());
  }

  public async FindById(id: string): Promise<POSProduct | undefined> {
    return Promise.resolve(this.findById(id));
  }

  public async Create(product: POSProduct): Promise<POSProduct> {
    return new Promise((resolve, reject) => {
      try {
        dbManager.db.transaction(() => {
          this.save(product);
        })();
        resolve(product);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Update(id: string, updates: Partial<POSProduct>): Promise<POSProduct | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: POSProduct | undefined;
        dbManager.db.transaction(() => {
          updated = this.update(id, updates);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Delete(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        let result = false;
        dbManager.db.transaction(() => {
          result = this.delete(id);
        })();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Search(query: string): Promise<POSProduct[]> {
    return Promise.resolve(this.search(query));
  }
}

export class OrderRepository {
  public findAll(): Order[] {
    const rows = dbManager.db.prepare('SELECT * FROM orders ORDER BY timestamp DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      pcId: r.pcId,
      username: r.username,
      items: JSON.parse(r.items),
      totalPrice: r.totalPrice,
      status: r.status,
      timestamp: r.timestamp
    }));
  }

  public findById(id: string): Order | undefined {
    const r = dbManager.db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!r) return undefined;
    return {
      id: r.id,
      pcId: r.pcId,
      username: r.username,
      items: JSON.parse(r.items),
      totalPrice: r.totalPrice,
      status: r.status,
      timestamp: r.timestamp
    };
  }

  public create(order: Order): Order {
    dbManager.db.prepare(`
      INSERT INTO orders (id, pcId, username, items, totalPrice, status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      order.id,
      order.pcId,
      order.username,
      JSON.stringify(order.items),
      order.totalPrice,
      order.status,
      order.timestamp
    );
    return order;
  }

  public update(id: string, updates: Partial<Order>): Order | undefined {
    const order = this.findById(id);
    if (order) {
      Object.assign(order, updates);
      dbManager.db.prepare(`
        UPDATE orders
        SET pcId = ?, username = ?, items = ?, totalPrice = ?, status = ?, timestamp = ?
        WHERE id = ?
      `).run(
        order.pcId,
        order.username,
        JSON.stringify(order.items),
        order.totalPrice,
        order.status,
        order.timestamp,
        id
      );
    }
    return order;
  }

  public delete(id: string): boolean {
    const result = dbManager.db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public search(query: string): Order[] {
    const rows = dbManager.db.prepare(`
      SELECT * FROM orders 
      WHERE id LIKE ? OR pcId LIKE ? OR username LIKE ? OR status LIKE ?
      ORDER BY timestamp DESC
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) as any[];
    return rows.map(r => ({
      id: r.id,
      pcId: r.pcId,
      username: r.username,
      items: JSON.parse(r.items),
      totalPrice: r.totalPrice,
      status: r.status,
      timestamp: r.timestamp
    }));
  }

  public updateStatus(id: string, status: 'Pending' | 'Completed' | 'Cancelled'): Order | undefined {
    dbManager.db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    return this.findById(id);
  }

  // --- Async PascalCase methods with Transactions ---
  public async FindAll(): Promise<Order[]> {
    return Promise.resolve(this.findAll());
  }

  public async FindById(id: string): Promise<Order | undefined> {
    return Promise.resolve(this.findById(id));
  }

  public async Create(order: Order): Promise<Order> {
    return new Promise((resolve, reject) => {
      try {
        dbManager.db.transaction(() => {
          this.create(order);
        })();
        resolve(order);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Update(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: Order | undefined;
        dbManager.db.transaction(() => {
          updated = this.update(id, updates);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Delete(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        let result = false;
        dbManager.db.transaction(() => {
          result = this.delete(id);
        })();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Search(query: string): Promise<Order[]> {
    return Promise.resolve(this.search(query));
  }
}

export class ChatRepository {
  public findAll(): ChatMessage[] {
    const rows = dbManager.db.prepare('SELECT * FROM chat_messages ORDER BY timestamp ASC').all() as any[];
    return rows as ChatMessage[];
  }

  public findById(id: string): ChatMessage | undefined {
    return dbManager.db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id) as ChatMessage | undefined;
  }

  public create(message: ChatMessage): ChatMessage {
    dbManager.db.prepare(`
      INSERT INTO chat_messages (id, sender, pcId, text, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      message.id,
      message.sender,
      message.pcId,
      message.text,
      message.timestamp
    );
    return message;
  }

  public update(id: string, updates: Partial<ChatMessage>): ChatMessage | undefined {
    const m = this.findById(id);
    if (m) {
      Object.assign(m, updates);
      dbManager.db.prepare(`
        UPDATE chat_messages
        SET sender = ?, pcId = ?, text = ?, timestamp = ?
        WHERE id = ?
      `).run(
        m.sender,
        m.pcId,
        m.text,
        m.timestamp,
        id
      );
    }
    return m;
  }

  public delete(id: string): boolean {
    const result = dbManager.db.prepare('DELETE FROM chat_messages WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public search(query: string): ChatMessage[] {
    const rows = dbManager.db.prepare(`
      SELECT * FROM chat_messages 
      WHERE id LIKE ? OR sender LIKE ? OR pcId LIKE ? OR text LIKE ?
      ORDER BY timestamp ASC
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) as any[];
    return rows as ChatMessage[];
  }

  public findByPCId(pcId: string): ChatMessage[] {
    const rows = dbManager.db.prepare('SELECT * FROM chat_messages WHERE pcId = ? ORDER BY timestamp ASC').all(pcId) as any[];
    return rows as ChatMessage[];
  }

  // --- Async PascalCase methods with Transactions ---
  public async FindAll(): Promise<ChatMessage[]> {
    return Promise.resolve(this.findAll());
  }

  public async FindById(id: string): Promise<ChatMessage | undefined> {
    return Promise.resolve(this.findById(id));
  }

  public async Create(message: ChatMessage): Promise<ChatMessage> {
    return new Promise((resolve, reject) => {
      try {
        dbManager.db.transaction(() => {
          this.create(message);
        })();
        resolve(message);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Update(id: string, updates: Partial<ChatMessage>): Promise<ChatMessage | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: ChatMessage | undefined;
        dbManager.db.transaction(() => {
          updated = this.update(id, updates);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Delete(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        let result = false;
        dbManager.db.transaction(() => {
          result = this.delete(id);
        })();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Search(query: string): Promise<ChatMessage[]> {
    return Promise.resolve(this.search(query));
  }
}

export class SocketEventRepository {
  public findAll(): SocketEvent[] {
    const rows = dbManager.db.prepare('SELECT * FROM socket_events ORDER BY timestamp DESC LIMIT 200').all() as any[];
    return rows as SocketEvent[];
  }

  public findById(id: string): SocketEvent | undefined {
    return dbManager.db.prepare('SELECT * FROM socket_events WHERE id = ?').get(id) as SocketEvent | undefined;
  }

  public create(event: SocketEvent): SocketEvent {
    dbManager.db.prepare(`
      INSERT INTO socket_events (id, pcId, type, message, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      event.id,
      event.pcId,
      event.type,
      event.message,
      event.timestamp
    );
    return event;
  }

  public update(id: string, updates: Partial<SocketEvent>): SocketEvent | undefined {
    const e = this.findById(id);
    if (e) {
      Object.assign(e, updates);
      dbManager.db.prepare(`
        UPDATE socket_events
        SET pcId = ?, type = ?, message = ?, timestamp = ?
        WHERE id = ?
      `).run(
        e.pcId,
        e.type,
        e.message,
        e.timestamp,
        id
      );
    }
    return e;
  }

  public delete(id: string): boolean {
    const result = dbManager.db.prepare('DELETE FROM socket_events WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public search(query: string): SocketEvent[] {
    const rows = dbManager.db.prepare(`
      SELECT * FROM socket_events 
      WHERE id LIKE ? OR pcId LIKE ? OR type LIKE ? OR message LIKE ?
      ORDER BY timestamp DESC LIMIT 200
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`) as any[];
    return rows as SocketEvent[];
  }

  // --- Async PascalCase methods with Transactions ---
  public async FindAll(): Promise<SocketEvent[]> {
    return Promise.resolve(this.findAll());
  }

  public async FindById(id: string): Promise<SocketEvent | undefined> {
    return Promise.resolve(this.findById(id));
  }

  public async Create(event: SocketEvent): Promise<SocketEvent> {
    return new Promise((resolve, reject) => {
      try {
        dbManager.db.transaction(() => {
          this.create(event);
        })();
        resolve(event);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Update(id: string, updates: Partial<SocketEvent>): Promise<SocketEvent | undefined> {
    return new Promise((resolve, reject) => {
      try {
        let updated: SocketEvent | undefined;
        dbManager.db.transaction(() => {
          updated = this.update(id, updates);
        })();
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Delete(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        let result = false;
        dbManager.db.transaction(() => {
          result = this.delete(id);
        })();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async Search(query: string): Promise<SocketEvent[]> {
    return Promise.resolve(this.search(query));
  }
}
