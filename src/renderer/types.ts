/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PCStatus = 'LOCKED' | 'ACTIVE_PREPAID' | 'ACTIVE_POSTPAID' | 'MAINTENANCE' | 'OFFLINE';

export interface ComputerSpecifications {
  cpu: string;
  ram: string;
  gpu: string;
}

export interface Computer {
  id: string; // e.g. "PC-01"
  name: string;
  status: PCStatus;
  ipAddress: string;
  macAddress: string;
  currentUser: string | null;
  currentUserId: string | null;
  timeTotal: number; // total seconds purchased (prepaid)
  timeElapsed: number; // seconds spent in current session
  timeRemaining: number; // seconds left (prepaid)
  costAccumulated: number; // dollars accumulated (postpaid)
  ratePerHour: number; // in dollars/hr
  group: 'VIP' | 'Standard' | 'Console';
  specifications: ComputerSpecifications;
  lastHeartbeat: string;
}

export interface Player {
  id: string;
  username: string;
  fullName: string;
  balance: number; // VIP balance in dollars
  points: number; // loyalty points
  status: 'Active' | 'Suspended';
  membershipType: 'Regular' | 'VIP';
  timePlayedTotal: number; // in minutes
  createdDate: string;
}

export interface POSProduct {
  id: string;
  name: string;
  category: 'Snacks' | 'Drinks' | 'Meals' | 'Services' | 'Tickets';
  price: number;
  stock: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  pcId: string;
  username: string;
  items: OrderItem[];
  totalPrice: number;
  status: 'Pending' | 'Completed' | 'Cancelled';
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: 'admin' | 'client';
  pcId: string;
  text: string;
  timestamp: string;
}

export interface TransactionLog {
  id: string;
  type: 'Session Checkout' | 'Prepaid Topup' | 'POS Purchase' | 'Account Registration' | 'Refund';
  pcId: string | null;
  username: string;
  amount: number;
  details: string;
  timestamp: string;
}

export interface SocketEvent {
  id: string;
  pcId: string;
  type: 
    | 'connect' | 'disconnect' | 'heartbeat' | 'lock' | 'unlock' | 'chat' | 'order' | 'alert'
    | 'client:connected' | 'client:heartbeat' | 'client:disconnected'
    | 'player:login' | 'player:logout'
    | 'timer:start' | 'timer:pause' | 'timer:resume' | 'timer:stop' | 'timer:extend'
    | 'computer:lock' | 'computer:unlock' | 'computer:shutdown' | 'computer:restart'
    | 'popup' | 'announcement';
  message: string;
  timestamp: string;
}

export interface ShopSettings {
  rateStandard: number; // dollars per hour
  rateVIP: number;
  rateConsole: number;
  shopName: string;
  currencySymbol: string;
  taxRate: number; // e.g. 0.12 for 12% VAT
  enableAutoLock: boolean;
  warnMinutesRemaining: number;
}
