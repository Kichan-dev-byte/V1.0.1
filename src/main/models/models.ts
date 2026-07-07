import { Computer, Player, POSProduct, Order, TransactionLog } from '../types/types';

export class ComputerModel {
  static create(id: string, name: string, group: 'VIP' | 'Standard' | 'Console', ratePerHour: number, ipAddress = '127.0.0.1', macAddress = '00:00:00:00:00:00'): Computer {
    return {
      id,
      name,
      status: 'LOCKED',
      ipAddress,
      macAddress,
      currentUser: null,
      currentUserId: null,
      timeTotal: 0,
      timeElapsed: 0,
      timeRemaining: 0,
      costAccumulated: 0,
      ratePerHour,
      group,
      specifications: {
        cpu: group === 'VIP' ? 'AMD Ryzen 7 7800X3D' : group === 'Console' ? 'PlayStation 5 Pro' : 'Intel Core i5-13400F',
        ram: group === 'VIP' ? '32GB DDR5' : group === 'Console' ? '16GB' : '16GB DDR5',
        gpu: group === 'VIP' ? 'NVIDIA RTX 4080 Super' : group === 'Console' ? 'AMD Custom' : 'NVIDIA RTX 4060'
      },
      lastHeartbeat: new Date().toISOString()
    };
  }

  static isExpired(pc: Computer): boolean {
    if (pc.status === 'ACTIVE_PREPAID' && pc.timeRemaining <= 0) {
      return true;
    }
    return false;
  }
}

export class PlayerModel {
  static validateBalance(player: Player, cost: number): boolean {
    return player.balance >= cost;
  }

  static addLoyaltyPoints(player: Player, amount: number): Player {
    return {
      ...player,
      points: player.points + amount
    };
  }
}

export class OrderModel {
  static calculateTotal(items: Array<{ price: number; quantity: number }>, taxRate: number): number {
    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    return subtotal * (1 + taxRate);
  }
}
