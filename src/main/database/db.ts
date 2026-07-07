import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import {
  INITIAL_SETTINGS,
  INITIAL_COMPUTERS,
  INITIAL_PLAYERS,
  INITIAL_PRODUCTS,
  INITIAL_TRANSACTIONS,
  INITIAL_SOCKET_EVENTS
} from '../../renderer/data/mockData';

class DatabaseManager {
  private dbInstance: Database.Database | null = null;

  public get db(): Database.Database {
    if (!this.dbInstance) {
      this.init();
    }
    return this.dbInstance!;
  }

  /**
   * Initializes the SQLite database and bootstraps schemas
   */
  public init(): void {
    if (this.dbInstance) return;

    try {
      logger.info(`Opening SQLite database at ${config.dbFilePath}`);
      this.dbInstance = new Database(config.dbFilePath);

      // Enable foreign keys
      this.dbInstance.pragma('foreign_keys = ON');

      this.createTables();
    } catch (error: any) {
      logger.error(`SQLite Database initialization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Drops and recreates schemas or performs clean resets
   */
  public reset(): void {
    logger.info('Resetting SQLite database to clean defaults...');
    const d = this.db;
    try {
      d.prepare('DELETE FROM players').run();
      d.prepare('DELETE FROM computers').run();
      d.prepare('DELETE FROM transactions').run();
      d.prepare('DELETE FROM timers').run();
      d.prepare('DELETE FROM rates').run();
      d.prepare('DELETE FROM settings').run();
      d.prepare('DELETE FROM admins').run();
      d.prepare('DELETE FROM sessions').run();
      d.prepare('DELETE FROM products').run();
      d.prepare('DELETE FROM orders').run();
      d.prepare('DELETE FROM chat_messages').run();
      d.prepare('DELETE FROM socket_events').run();
      this.seedIfEmpty();
    } catch (err: any) {
      logger.error(`Database reset failed: ${err.message}`);
    }
  }

  private createTables(): void {
    const d = this.dbInstance!;

    // 1. Players Table
    try {
      d.prepare('SELECT points FROM players LIMIT 1').get();
    } catch (e) {
      logger.info('Dropping obsolete players table due to schema change...');
      d.prepare('DROP TABLE IF EXISTS players').run();
    }

    d.prepare(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        fullName TEXT NOT NULL,
        phone TEXT NOT NULL,
        membership TEXT NOT NULL,
        balance REAL NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        timePlayedTotal INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `).run();

    // 2. Computers Table
    try {
      d.prepare('SELECT computerNumber FROM computers LIMIT 1').get();
    } catch (e) {
      logger.info('Dropping obsolete computers table due to schema change...');
      d.prepare('DROP TABLE IF EXISTS computers').run();
    }

    d.prepare(`
      CREATE TABLE IF NOT EXISTS computers (
        id TEXT PRIMARY KEY,
        computerNumber INTEGER NOT NULL,
        computerName TEXT NOT NULL,
        ipAddress TEXT NOT NULL,
        macAddress TEXT NOT NULL,
        status TEXT NOT NULL,
        currentPlayer TEXT,
        remainingTime INTEGER NOT NULL,
        lastHeartbeat TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    `).run();

    // 3. Transactions Table
    d.prepare(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        pcId TEXT,
        username TEXT NOT NULL,
        amount REAL NOT NULL,
        details TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `).run();

    // 4. Timers Table (Tracks duration metrics and active countdowns)
    try {
      d.prepare('SELECT computerId FROM timers LIMIT 1').get();
    } catch (e) {
      logger.info('Dropping obsolete timers table due to schema change...');
      d.prepare('DROP TABLE IF EXISTS timers').run();
    }

    d.prepare(`
      CREATE TABLE IF NOT EXISTS timers (
        id TEXT PRIMARY KEY,
        computerId TEXT NOT NULL,
        playerId TEXT NOT NULL,
        startTime TEXT NOT NULL,
        remainingSeconds INTEGER NOT NULL,
        paused INTEGER NOT NULL,
        rateId TEXT NOT NULL
      )
    `).run();

    // 5. Rates Table (Gaming tier rate definitions)
    d.prepare(`
      CREATE TABLE IF NOT EXISTS rates (
        id TEXT PRIMARY KEY,
        groupName TEXT UNIQUE NOT NULL,
        ratePerHour REAL NOT NULL,
        description TEXT
      )
    `).run();

    // 6. Settings Table (Shop config limits, single-record singleton structure)
    try {
      d.prepare('SELECT darkTheme FROM settings LIMIT 1').get();
    } catch (e) {
      logger.info('Dropping obsolete settings table to add darkTheme and currency columns...');
      d.prepare('DROP TABLE IF EXISTS settings').run();
    }

    d.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        rateStandard REAL NOT NULL,
        rateVIP REAL NOT NULL,
        rateConsole REAL NOT NULL,
        shopName TEXT NOT NULL,
        currencySymbol TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        taxRate REAL NOT NULL,
        enableAutoLock INTEGER NOT NULL, -- 0 (false) or 1 (true)
        warnMinutesRemaining INTEGER NOT NULL,
        darkTheme INTEGER NOT NULL DEFAULT 1 -- 0 (false) or 1 (true)
      )
    `).run();

    // 7. Admins Table
    try {
      d.prepare('SELECT fullName FROM admins LIMIT 1').get();
      logger.info('Dropping obsolete admins table due to schema change...');
      d.prepare('DROP TABLE IF EXISTS admins').run();
    } catch (e) {
      // Already migrated or not yet created
    }

    d.prepare(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    `).run();

    // 8. Sessions Table
    d.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        pcId TEXT NOT NULL,
        userId TEXT,
        username TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT,
        duration INTEGER NOT NULL,
        cost REAL NOT NULL,
        status TEXT NOT NULL
      )
    `).run();

    // Secondary Support Tables to fulfill POS and internal logs seamlessly
    d.prepare(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        stock INTEGER NOT NULL
      )
    `).run();

    d.prepare(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        pcId TEXT NOT NULL,
        username TEXT NOT NULL,
        items TEXT NOT NULL, -- JSON stringified items list
        totalPrice REAL NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `).run();

    d.prepare(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        sender TEXT NOT NULL,
        pcId TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `).run();

    d.prepare(`
      CREATE TABLE IF NOT EXISTS socket_events (
        id TEXT PRIMARY KEY,
        pcId TEXT NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `).run();

    this.seedIfEmpty();
  }

  private seedIfEmpty(): void {
    const d = this.dbInstance!;

    // Check settings
    const settingsCount = d.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
    if (settingsCount.count === 0) {
      logger.info('Seeding default settings into SQLite settings table...');
      d.prepare(`
        INSERT INTO settings (id, rateStandard, rateVIP, rateConsole, shopName, currencySymbol, currency, taxRate, enableAutoLock, warnMinutesRemaining, darkTheme)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        INITIAL_SETTINGS.rateStandard,
        INITIAL_SETTINGS.rateVIP,
        INITIAL_SETTINGS.rateConsole,
        "NEX Gaming Lounge",
        "$",
        "USD",
        INITIAL_SETTINGS.taxRate,
        INITIAL_SETTINGS.enableAutoLock ? 1 : 0,
        INITIAL_SETTINGS.warnMinutesRemaining,
        1
      );
    }

    // Check computers
    const computersCount = d.prepare('SELECT COUNT(*) as count FROM computers').get() as { count: number };
    if (computersCount.count === 0) {
      logger.info('Seeding default computers into SQLite computers table...');
      const insertPc = d.prepare(`
        INSERT INTO computers (id, computerNumber, computerName, ipAddress, macAddress, status, currentPlayer, remainingTime, lastHeartbeat, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const pc of INITIAL_COMPUTERS) {
        const numMatch = pc.id.match(/\d+/);
        const computerNumber = numMatch ? parseInt(numMatch[0], 10) : 1;
        insertPc.run(
          pc.id,
          computerNumber,
          pc.name,
          pc.ipAddress,
          pc.macAddress,
          pc.status,
          pc.currentUser,
          pc.timeRemaining,
          pc.lastHeartbeat,
          new Date().toISOString()
        );
      }
    }

    // Check players
    const playersCount = d.prepare('SELECT COUNT(*) as count FROM players').get() as { count: number };
    if (playersCount.count === 0) {
      logger.info('Seeding default players into SQLite players table...');
      const insertPlayer = d.prepare(`
        INSERT INTO players (id, username, passwordHash, fullName, phone, membership, balance, points, status, timePlayedTotal, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of INITIAL_PLAYERS) {
        insertPlayer.run(
          p.id,
          p.username,
          'pbkdf2:sha256:260000$player_hash_placeholder', // default password hash
          p.fullName,
          '09123456789', // default phone number
          p.membershipType,
          p.balance,
          p.points,
          p.status,
          p.timePlayedTotal,
          p.createdDate,
          p.createdDate
        );
      }
    }

    // Check products
    const productsCount = d.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
    if (productsCount.count === 0) {
      logger.info('Seeding default products into SQLite products table...');
      const insertProduct = d.prepare(`
        INSERT INTO products (id, name, category, price, stock)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const prod of INITIAL_PRODUCTS) {
        insertProduct.run(
          prod.id,
          prod.name,
          prod.category,
          prod.price,
          prod.stock
        );
      }
    }

    // Check transactions
    const txCount = d.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number };
    if (txCount.count === 0) {
      logger.info('Seeding default transactions into SQLite transactions table...');
      const insertTx = d.prepare(`
        INSERT INTO transactions (id, type, pcId, username, amount, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const tx of INITIAL_TRANSACTIONS) {
        insertTx.run(
          tx.id,
          tx.type,
          tx.pcId,
          tx.username,
          tx.amount,
          tx.details,
          tx.timestamp
        );
      }
    }

    // Check socket events
    const eventCount = d.prepare('SELECT COUNT(*) as count FROM socket_events').get() as { count: number };
    if (eventCount.count === 0) {
      logger.info('Seeding default socket events into SQLite socket_events table...');
      const insertEvent = d.prepare(`
        INSERT INTO socket_events (id, pcId, type, message, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const ev of INITIAL_SOCKET_EVENTS) {
        insertEvent.run(
          ev.id,
          ev.pcId,
          ev.type,
          ev.message,
          ev.timestamp
        );
      }
    }

    // Check rates
    const ratesCount = d.prepare('SELECT COUNT(*) as count FROM rates').get() as { count: number };
    if (ratesCount.count === 0) {
      logger.info('Seeding default rates into SQLite rates table...');
      const insertRate = d.prepare(`
        INSERT INTO rates (id, groupName, ratePerHour, description)
        VALUES (?, ?, ?, ?)
      `);
      insertRate.run('R1', 'Standard', INITIAL_SETTINGS.rateStandard, 'Standard gaming tier');
      insertRate.run('R2', 'VIP', INITIAL_SETTINGS.rateVIP, 'Extreme specs and private cabin');
      insertRate.run('R3', 'Console', INITIAL_SETTINGS.rateConsole, 'PS5 Pro and Xbox Series X lounge');
    }

    // Check admins
    const adminsCount = d.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
    if (adminsCount.count === 0) {
      logger.info('Seeding default admin profiles into SQLite admins table...');
      const insertAdmin = d.prepare(`
        INSERT INTO admins (id, username, passwordHash, role, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      const salt = bcrypt.genSaltSync(10);
      const adminHash = bcrypt.hashSync('admin123', salt);
      const cashierHash = bcrypt.hashSync('cashier123', salt);
      insertAdmin.run('A1', 'admin', adminHash, 'SuperAdmin', new Date().toISOString());
      insertAdmin.run('A2', 'cashier1', cashierHash, 'Cashier', new Date().toISOString());
    }
  }
}

export const dbManager = new DatabaseManager();
export const db = dbManager;
export default db;
