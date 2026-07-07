/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Computer, Player, POSProduct, TransactionLog, Order, SocketEvent, ShopSettings } from '../types';

export const INITIAL_SETTINGS: ShopSettings = {
  rateStandard: 2.00, // $2.00/hr
  rateVIP: 3.50,      // $3.50/hr
  rateConsole: 4.00,  // $4.00/hr
  shopName: "NEX Gaming Lounge",
  currencySymbol: "$",
  taxRate: 0.10,      // 10% VAT
  enableAutoLock: true,
  warnMinutesRemaining: 5,
};

export const INITIAL_COMPUTERS: Computer[] = [
  {
    id: "PC-01",
    name: "NEX-01 (Standard)",
    status: "ACTIVE_PREPAID",
    ipAddress: "192.168.1.101",
    macAddress: "B4:2E:99:A1:C3:01",
    currentUser: "johndoe",
    currentUserId: "P001",
    timeTotal: 10800, // 3 hours
    timeElapsed: 4500, // 1 hour 15 min
    timeRemaining: 6300, // 1 hour 45 min
    costAccumulated: 2.50,
    ratePerHour: 2.00,
    group: "Standard",
    specifications: {
      cpu: "Intel Core i5-13400F",
      ram: "16GB DDR5 5200MHz",
      gpu: "NVIDIA RTX 4060 8GB"
    },
    lastHeartbeat: new Date(Date.now() - 5000).toISOString()
  },
  {
    id: "PC-02",
    name: "NEX-02 (Standard)",
    status: "LOCKED",
    ipAddress: "192.168.1.102",
    macAddress: "B4:2E:99:A1:C3:02",
    currentUser: null,
    currentUserId: null,
    timeTotal: 0,
    timeElapsed: 0,
    timeRemaining: 0,
    costAccumulated: 0,
    ratePerHour: 2.00,
    group: "Standard",
    specifications: {
      cpu: "Intel Core i5-13400F",
      ram: "16GB DDR5 5200MHz",
      gpu: "NVIDIA RTX 4060 8GB"
    },
    lastHeartbeat: new Date(Date.now() - 3000).toISOString()
  },
  {
    id: "PC-03",
    name: "NEX-03 (Standard)",
    status: "ACTIVE_POSTPAID",
    ipAddress: "192.168.1.103",
    macAddress: "B4:2E:99:A1:C3:03",
    currentUser: "alex99",
    currentUserId: "P002",
    timeTotal: 0,
    timeElapsed: 5400, // 1.5 hours
    timeRemaining: 0,
    costAccumulated: 3.00, // 1.5 * $2.00
    ratePerHour: 2.00,
    group: "Standard",
    specifications: {
      cpu: "Intel Core i5-13400F",
      ram: "16GB DDR5 5200MHz",
      gpu: "NVIDIA RTX 4060 8GB"
    },
    lastHeartbeat: new Date(Date.now() - 2000).toISOString()
  },
  {
    id: "PC-04",
    name: "NEX-04 (Standard)",
    status: "OFFLINE",
    ipAddress: "192.168.1.104",
    macAddress: "B4:2E:99:A1:C3:04",
    currentUser: null,
    currentUserId: null,
    timeTotal: 0,
    timeElapsed: 0,
    timeRemaining: 0,
    costAccumulated: 0,
    ratePerHour: 2.00,
    group: "Standard",
    specifications: {
      cpu: "Intel Core i5-12400F",
      ram: "16GB DDR4 3200MHz",
      gpu: "NVIDIA RTX 3060 12GB"
    },
    lastHeartbeat: new Date(Date.now() - 600000).toISOString() // 10 min ago
  },
  {
    id: "PC-05",
    name: "NEX-05 (Standard)",
    status: "MAINTENANCE",
    ipAddress: "192.168.1.105",
    macAddress: "B4:2E:99:A1:C3:05",
    currentUser: null,
    currentUserId: null,
    timeTotal: 0,
    timeElapsed: 0,
    timeRemaining: 0,
    costAccumulated: 0,
    ratePerHour: 2.00,
    group: "Standard",
    specifications: {
      cpu: "Intel Core i5-12400F",
      ram: "16GB DDR4 3200MHz",
      gpu: "NVIDIA RTX 3060 12GB"
    },
    lastHeartbeat: new Date(Date.now() - 12000).toISOString()
  },
  {
    id: "PC-06",
    name: "NEX-06 (Standard)",
    status: "LOCKED",
    ipAddress: "192.168.1.106",
    macAddress: "B4:2E:99:A1:C3:06",
    currentUser: null,
    currentUserId: null,
    timeTotal: 0,
    timeElapsed: 0,
    timeRemaining: 0,
    costAccumulated: 0,
    ratePerHour: 2.00,
    group: "Standard",
    specifications: {
      cpu: "Intel Core i5-13400F",
      ram: "16GB DDR5 5200MHz",
      gpu: "NVIDIA RTX 4060 8GB"
    },
    lastHeartbeat: new Date(Date.now() - 1000).toISOString()
  },
  {
    id: "PC-07",
    name: "NEX-07 (VIP Extreme)",
    status: "ACTIVE_PREPAID",
    ipAddress: "192.168.1.107",
    macAddress: "B4:2E:99:A1:C3:07",
    currentUser: "viper_pro",
    currentUserId: "P003",
    timeTotal: 18000, // 5 hours
    timeElapsed: 14400, // 4 hours
    timeRemaining: 3600, // 1 hour left
    costAccumulated: 14.00, // 4hr * $3.50
    ratePerHour: 3.50,
    group: "VIP",
    specifications: {
      cpu: "AMD Ryzen 7 7800X3D",
      ram: "32GB DDR5 6000MHz",
      gpu: "NVIDIA RTX 4080 Super 16GB"
    },
    lastHeartbeat: new Date(Date.now() - 4000).toISOString()
  },
  {
    id: "PC-08",
    name: "NEX-08 (VIP Extreme)",
    status: "LOCKED",
    ipAddress: "192.168.1.108",
    macAddress: "B4:2E:99:A1:C3:08",
    currentUser: null,
    currentUserId: null,
    timeTotal: 0,
    timeElapsed: 0,
    timeRemaining: 0,
    costAccumulated: 0,
    ratePerHour: 3.50,
    group: "VIP",
    specifications: {
      cpu: "AMD Ryzen 7 7800X3D",
      ram: "32GB DDR5 6000MHz",
      gpu: "NVIDIA RTX 4080 Super 16GB"
    },
    lastHeartbeat: new Date(Date.now() - 1500).toISOString()
  },
  {
    id: "PC-09",
    name: "NEX-09 (VIP Extreme)",
    status: "LOCKED",
    ipAddress: "192.168.1.109",
    macAddress: "B4:2E:99:A1:C3:09",
    currentUser: null,
    currentUserId: null,
    timeTotal: 0,
    timeElapsed: 0,
    timeRemaining: 0,
    costAccumulated: 0,
    ratePerHour: 3.50,
    group: "VIP",
    specifications: {
      cpu: "AMD Ryzen 7 7800X3D",
      ram: "32GB DDR5 6000MHz",
      gpu: "NVIDIA RTX 4080 Super 16GB"
    },
    lastHeartbeat: new Date(Date.now() - 6000).toISOString()
  },
  {
    id: "PC-10",
    name: "NEX-10 (Console Station)",
    status: "ACTIVE_PREPAID",
    ipAddress: "192.168.1.110",
    macAddress: "B4:2E:99:A1:C3:10",
    currentUser: "Guest-10",
    currentUserId: null,
    timeTotal: 7200, // 2 hours
    timeElapsed: 5400, // 1.5 hours
    timeRemaining: 1800, // 30 min left
    costAccumulated: 8.00,
    ratePerHour: 4.00,
    group: "Console",
    specifications: {
      cpu: "PlayStation 5 Pro",
      ram: "16GB GDDR6",
      gpu: "AMD RDNA 3 Custom"
    },
    lastHeartbeat: new Date(Date.now() - 4000).toISOString()
  },
  {
    id: "PC-11",
    name: "NEX-11 (Console Station)",
    status: "LOCKED",
    ipAddress: "192.168.1.111",
    macAddress: "B4:2E:99:A1:C3:11",
    currentUser: null,
    currentUserId: null,
    timeTotal: 0,
    timeElapsed: 0,
    timeRemaining: 0,
    costAccumulated: 0,
    ratePerHour: 4.00,
    group: "Console",
    specifications: {
      cpu: "Xbox Series X",
      ram: "16GB GDDR6",
      gpu: "AMD RDNA 2 Custom"
    },
    lastHeartbeat: new Date(Date.now() - 3000).toISOString()
  },
  {
    id: "PC-12",
    name: "NEX-12 (Console Station)",
    status: "LOCKED",
    ipAddress: "192.168.1.112",
    macAddress: "B4:2E:99:A1:C3:12",
    currentUser: null,
    currentUserId: null,
    timeTotal: 0,
    timeElapsed: 0,
    timeRemaining: 0,
    costAccumulated: 0,
    ratePerHour: 4.00,
    group: "Console",
    specifications: {
      cpu: "PlayStation 5 Pro",
      ram: "16GB GDDR6",
      gpu: "AMD RDNA 3 Custom"
    },
    lastHeartbeat: new Date(Date.now() - 5000).toISOString()
  }
];

export const INITIAL_PLAYERS: Player[] = [
  {
    id: "P001",
    username: "johndoe",
    fullName: "John Doe",
    balance: 15.50,
    points: 420,
    status: "Active",
    membershipType: "Regular",
    timePlayedTotal: 2450,
    createdDate: "2026-01-15T14:32:00.000Z"
  },
  {
    id: "P002",
    username: "alex99",
    fullName: "Alex Rivera",
    balance: 4.25,
    points: 150,
    status: "Active",
    membershipType: "Regular",
    timePlayedTotal: 840,
    createdDate: "2026-03-22T10:15:00.000Z"
  },
  {
    id: "P003",
    username: "viper_pro",
    fullName: "Marcus Aurelius",
    balance: 78.00,
    points: 2150,
    status: "Active",
    membershipType: "VIP",
    timePlayedTotal: 12400,
    createdDate: "2025-11-10T11:04:00.000Z"
  },
  {
    id: "P004",
    username: "luna_cat",
    fullName: "Luna Lovegood",
    balance: 0.00,
    points: 350,
    status: "Active",
    membershipType: "VIP",
    timePlayedTotal: 4300,
    createdDate: "2026-02-01T18:20:00.000Z"
  },
  {
    id: "P005",
    username: "haxor_neon",
    fullName: "Neon Genesis",
    balance: 12.00,
    points: 80,
    status: "Suspended",
    membershipType: "Regular",
    timePlayedTotal: 600,
    createdDate: "2026-05-12T09:44:00.000Z"
  }
];

export const INITIAL_PRODUCTS: POSProduct[] = [
  // Snacks
  { id: "PR01", name: "Spicy Nachos & Cheese", category: "Snacks", price: 2.50, stock: 45 },
  { id: "PR02", name: "Potato Chips (BBQ)", category: "Snacks", price: 1.20, stock: 80 },
  { id: "PR03", name: "Butter Popcorn", category: "Snacks", price: 1.80, stock: 30 },
  { id: "PR04", name: "Chocolate Cookies Bar", category: "Snacks", price: 1.00, stock: 120 },
  
  // Drinks
  { id: "PR05", name: "Ice-Cold Coca Cola (Can)", category: "Drinks", price: 1.50, stock: 150 },
  { id: "PR06", name: "Monster Energy Drink", category: "Drinks", price: 3.50, stock: 65 },
  { id: "PR07", name: "Brewed Black Coffee", category: "Drinks", price: 2.00, stock: 50 },
  { id: "PR08", name: "Iced Caramel Macchiato", category: "Drinks", price: 3.00, stock: 40 },
  
  // Meals
  { id: "PR09", name: "Cheeseburger with Fries", category: "Meals", price: 5.50, stock: 25 },
  { id: "PR10", name: "Stir-fry Noodles with Egg", category: "Meals", price: 4.50, stock: 35 },
  { id: "PR11", name: "Pepperoni Pizza (Slice)", category: "Meals", price: 2.80, stock: 40 },
  
  // Services
  { id: "PR12", name: "B&W Document Printing (A4)", category: "Services", price: 0.15, stock: 9999 },
  { id: "PR13", name: "Color Document Printing (A4)", category: "Services", price: 0.50, stock: 9999 },
  { id: "PR14", name: "Document Scanning (Per Page)", category: "Services", price: 0.30, stock: 9999 }
];

export const INITIAL_TRANSACTIONS: TransactionLog[] = [
  {
    id: "TX1001",
    type: "Session Checkout",
    pcId: "PC-02",
    username: "luna_cat",
    amount: 7.00,
    details: "Prepaid 2 hours check-out on NEX-02 (Standard PC)",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "TX1002",
    type: "Prepaid Topup",
    pcId: null,
    username: "viper_pro",
    amount: 50.00,
    details: "Cashier credit top-up for Marcus Aurelius (viper_pro)",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: "TX1003",
    type: "POS Purchase",
    pcId: "PC-01",
    username: "johndoe",
    amount: 6.50,
    details: "1x Cheeseburger with Fries, 1x Coca Cola on NEX-01",
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString()
  },
  {
    id: "TX1004",
    type: "Account Registration",
    pcId: null,
    username: "haxor_neon",
    amount: 10.00,
    details: "Account registration fee & initial credit deposit",
    timestamp: new Date(Date.now() - 3600000 * 10).toISOString()
  },
  {
    id: "TX1005",
    type: "Session Checkout",
    pcId: "PC-11",
    username: "Guest-11",
    amount: 12.00,
    details: "Postpaid session checkout of 3 hours on NEX-11 (Console)",
    timestamp: new Date(Date.now() - 3600000 * 0.5).toISOString()
  }
];

export const INITIAL_SOCKET_EVENTS: SocketEvent[] = [
  {
    id: "EV001",
    pcId: "PC-01",
    type: "client:connected",
    message: "PC-01 (192.168.1.101) connected and loaded NEX Client Shell v3.4.2",
    timestamp: new Date(Date.now() - 10000).toISOString()
  },
  {
    id: "EV002",
    pcId: "PC-01",
    type: "computer:unlock",
    message: "PC-01 unlocked by user 'johndoe' (Prepaid)",
    timestamp: new Date(Date.now() - 9500).toISOString()
  },
  {
    id: "EV003",
    pcId: "PC-03",
    type: "computer:unlock",
    message: "PC-03 unlocked by user 'alex99' (Postpaid)",
    timestamp: new Date(Date.now() - 8000).toISOString()
  },
  {
    id: "EV004",
    pcId: "PC-07",
    type: "client:heartbeat",
    message: "PC-07 VIP Client heartbeating successfully. Latency: 2ms",
    timestamp: new Date(Date.now() - 6000).toISOString()
  },
  {
    id: "EV005",
    pcId: "PC-10",
    type: "computer:unlock",
    message: "PC-10 Console activated. Mode: Guest Prepaid",
    timestamp: new Date(Date.now() - 5000).toISOString()
  }
];
