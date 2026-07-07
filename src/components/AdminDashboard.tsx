/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Computer, 
  Player, 
  POSProduct, 
  Order, 
  ChatMessage, 
  TransactionLog, 
  SocketEvent, 
  ShopSettings 
} from '../types';
import { 
  Monitor, 
  Plus, 
  Lock, 
  Unlock, 
  Coffee, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Search, 
  FileText, 
  Terminal, 
  Settings, 
  Power, 
  Send, 
  AlertCircle, 
  ChevronRight, 
  CheckCircle, 
  XCircle,
  Clock,
  Laptop,
  Flame,
  Volume2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface AdminDashboardProps {
  computers: Computer[];
  players: Player[];
  products: POSProduct[];
  orders: Order[];
  transactions: TransactionLog[];
  socketEvents: SocketEvent[];
  settings: ShopSettings;
  chatMessages: ChatMessage[];
  
  onUpdateComputers: (computers: Computer[]) => void;
  onUpdatePlayers: (players: Player[]) => void;
  onUpdateProducts: (products: POSProduct[]) => void;
  onUpdateOrders: (orders: Order[]) => void;
  onUpdateTransactions: (transactions: TransactionLog[]) => void;
  onUpdateSocketEvents: (socketEvents: SocketEvent[]) => void;
  onUpdateSettings: (settings: ShopSettings) => void;
  onSendAdminMessage: (pcId: string, text: string) => void;
  onTriggerSocketEvent: (pcId: string, type: SocketEvent['type'], message: string) => void;
  onViewClientPC: (pcId: string) => void;
}

export default function AdminDashboard({
  computers,
  players,
  products,
  orders,
  transactions,
  socketEvents,
  settings,
  chatMessages,
  onUpdateComputers,
  onUpdatePlayers,
  onUpdateProducts,
  onUpdateOrders,
  onUpdateTransactions,
  onUpdateSocketEvents,
  onUpdateSettings,
  onSendAdminMessage,
  onTriggerSocketEvent,
  onViewClientPC,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'grid' | 'pos' | 'members' | 'reports' | 'lan' | 'settings'>('grid');
  const [selectedGroup, setSelectedGroup] = useState<'All' | 'Standard' | 'VIP' | 'Console'>('All');
  
  // Sidebar detailed selection
  const [selectedPcId, setSelectedPcId] = useState<string | null>("PC-01");
  const selectedPC = computers.find(c => c.id === selectedPcId) || null;

  // Search/Filters states
  const [playerSearch, setPlayerSearch] = useState('');
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerUsername, setNewPlayerUsername] = useState('');
  const [newPlayerType, setNewPlayerType] = useState<'Regular' | 'VIP'>('Regular');
  const [newPlayerDeposit, setNewPlayerDeposit] = useState('10');

  // Top Up Dialog
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpPlayerId, setTopUpPlayerId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('10');

  // POS State
  const [posSelectedPC, setPosSelectedPC] = useState<string>("PC-01");
  const [posCart, setPosCart] = useState<Array<{ product: POSProduct; quantity: number }>>([]);
  const [posCustomerName, setPosCustomerName] = useState('Guest/Walk-in');

  // Manual Session Start State
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [sessionPcId, setSessionPcId] = useState<string | null>(null);
  const [sessionUserType, setSessionUserType] = useState<'guest' | 'member'>('guest');
  const [sessionSelectedMemberId, setSessionSelectedMemberId] = useState('');
  const [sessionPrepaidHours, setSessionPrepaidHours] = useState('2');
  const [sessionPostpaid, setSessionPostpaid] = useState(false);

  // Chat/Quick text state
  const [adminChatText, setAdminChatText] = useState('');
  const [systemAlertMessage, setSystemAlertMessage] = useState('');

  // Local Ticking for Postpaid & Prepaid timers shown in Admin Panel
  useEffect(() => {
    const timer = setInterval(() => {
      const updated = computers.map(pc => {
        if (pc.status === 'ACTIVE_PREPAID') {
          const nextRemaining = Math.max(0, pc.timeRemaining - 1);
          const nextElapsed = pc.timeElapsed + 1;
          
          // Auto Lock on Prepaid finished
          if (nextRemaining === 0 && pc.timeTotal > 0 && settings.enableAutoLock) {
            onTriggerSocketEvent(pc.id, 'lock', `Session time expired for player ${pc.currentUser || 'Guest'}. Automatically locked PC.`);
            return {
              ...pc,
              status: 'LOCKED' as const,
              currentUser: null,
              currentUserId: null,
              timeTotal: 0,
              timeElapsed: 0,
              timeRemaining: 0,
              costAccumulated: 0
            };
          }

          // Trigger warning alerts at e.g. 5 mins left
          if (nextRemaining === settings.warnMinutesRemaining * 60) {
            onTriggerSocketEvent(pc.id, 'alert', `${settings.warnMinutesRemaining} minutes remaining for player ${pc.currentUser || 'Guest'}.`);
          }

          return {
            ...pc,
            timeRemaining: nextRemaining,
            timeElapsed: nextElapsed
          };
        } else if (pc.status === 'ACTIVE_POSTPAID') {
          const nextElapsed = pc.timeElapsed + 1;
          const cost = (nextElapsed / 3600) * pc.ratePerHour;
          return {
            ...pc,
            timeElapsed: nextElapsed,
            costAccumulated: parseFloat(cost.toFixed(2))
          };
        }
        return pc;
      });

      // Avoid trigger loop by ensuring there is actual change
      if (JSON.stringify(updated) !== JSON.stringify(computers)) {
        onUpdateComputers(updated);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [computers, settings, onUpdateComputers]);

  // Handle Chat Submit
  const handleChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminChatText.trim() || !selectedPcId) return;
    onSendAdminMessage(selectedPcId, adminChatText);
    setAdminChatText('');
  };

  // PC Filter Grouping
  const filteredComputers = computers.filter(pc => {
    if (selectedGroup === 'All') return true;
    return pc.group === selectedGroup;
  });

  // Calculate Metrics
  const activeCount = computers.filter(c => c.status.startsWith('ACTIVE')).length;
  const lockedCount = computers.filter(c => c.status === 'LOCKED').length;
  const offlineCount = computers.filter(c => c.status === 'OFFLINE').length;
  const maintenanceCount = computers.filter(c => c.status === 'MAINTENANCE').length;
  
  const totalRevenue = transactions.reduce((acc, curr) => acc + curr.amount, 0);

  // POS Add Item
  const handleAddPosCart = (product: POSProduct) => {
    if (product.stock <= 0 && product.category !== 'Services') return;
    setPosCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  // POS Checkout
  const handlePosCheckout = () => {
    if (posCart.length === 0) return;
    const orderPrice = posCart.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
    const targetPC = computers.find(pc => pc.id === posSelectedPC);
    const orderUsername = targetPC && targetPC.currentUser ? targetPC.currentUser : posCustomerName;

    // Create Order
    const newOrder: Order = {
      id: `OR-${Date.now().toString().slice(-6)}`,
      pcId: posSelectedPC,
      username: orderUsername,
      items: posCart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      })),
      totalPrice: parseFloat(orderPrice.toFixed(2)),
      status: 'Completed',
      timestamp: new Date().toISOString()
    };

    onUpdateOrders([newOrder, ...orders]);

    // Create transaction log
    const newTx: TransactionLog = {
      id: `TX-${Date.now().toString().slice(-6)}`,
      type: 'POS Purchase',
      pcId: posSelectedPC,
      username: orderUsername,
      amount: orderPrice,
      details: `POS item sales to ${posSelectedPC} (${orderUsername}): ` + posCart.map(i => `${i.quantity}x ${i.product.name}`).join(', '),
      timestamp: new Date().toISOString()
    };

    onUpdateTransactions([newTx, ...transactions]);

    // Deduct stock
    const updatedProducts = products.map(p => {
      const cartItem = posCart.find(c => c.product.id === p.id);
      if (cartItem && p.category !== 'Services') {
        return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
      }
      return p;
    });
    onUpdateProducts(updatedProducts);

    // Socket Event log
    onTriggerSocketEvent(posSelectedPC, 'order', `Cashier fulfilled order for ${orderUsername}. Total billing: $${orderPrice.toFixed(2)}`);

    // Reset POS cart
    setPosCart([]);
    addSystemLog(`Completed POS transaction of $${orderPrice.toFixed(2)} for ${posSelectedPC}`);
  };

  // Helper helper to format durations
  const formatTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Remote Actions
  const handleLockPC = (pcId: string) => {
    const pc = computers.find(c => c.id === pcId);
    if (!pc) return;

    // Create transaction log if active session had accrued postpaid cost
    if (pc.status === 'ACTIVE_POSTPAID' && pc.costAccumulated > 0) {
      const checkoutTx: TransactionLog = {
        id: `TX-${Date.now().toString().slice(-6)}`,
        type: 'Session Checkout',
        pcId: pc.id,
        username: pc.currentUser || 'Guest',
        amount: pc.costAccumulated,
        details: `Postpaid checkout of ${formatTime(pc.timeElapsed)} on ${pc.name}`,
        timestamp: new Date().toISOString()
      };
      onUpdateTransactions([checkoutTx, ...transactions]);
    }

    const updated = computers.map(c => {
      if (c.id === pcId) {
        return {
          ...c,
          status: 'LOCKED' as const,
          currentUser: null,
          currentUserId: null,
          timeTotal: 0,
          timeElapsed: 0,
          timeRemaining: 0,
          costAccumulated: 0
        };
      }
      return c;
    });

    onUpdateComputers(updated);
    onTriggerSocketEvent(pcId, 'lock', `Remote Lock command issued by Cashier. Session destroyed.`);
  };

  const handleUnlockPC = (pcId: string) => {
    setSessionPcId(pcId);
    setSessionUserType('guest');
    setShowStartSessionModal(true);
  };

  const startPrepaidSession = (pcId: string, username: string, userId: string | null, hours: number) => {
    const rate = computers.find(c => c.id === pcId)?.ratePerHour || 2.00;
    const durationSec = hours * 3600;
    const cost = hours * rate;

    // Log transaction
    const prepaidTx: TransactionLog = {
      id: `TX-${Date.now().toString().slice(-6)}`,
      type: 'Prepaid Topup',
      pcId: pcId,
      username: username,
      amount: cost,
      details: `Prepaid session started for ${hours} hours on ${pcId}`,
      timestamp: new Date().toISOString()
    };

    onUpdateTransactions([prepaidTx, ...transactions]);

    // If member, deduct from loyalty balance
    if (userId) {
      onUpdatePlayers(players.map(p => {
        if (p.id === userId) {
          return {
            ...p,
            balance: Math.max(0, p.balance - cost),
            points: p.points + Math.floor(cost * 10)
          };
        }
        return p;
      }));
    }

    onUpdateComputers(computers.map(c => {
      if (c.id === pcId) {
        return {
          ...c,
          status: 'ACTIVE_PREPAID' as const,
          currentUser: username,
          currentUserId: userId,
          timeTotal: durationSec,
          timeElapsed: 0,
          timeRemaining: durationSec,
          costAccumulated: cost
        };
      }
      return c;
    }));

    onTriggerSocketEvent(pcId, 'unlock', `Prepaid session of ${hours} hours unlocked for player ${username}.`);
    setShowStartSessionModal(false);
  };

  const startPostpaidSession = (pcId: string, username: string, userId: string | null) => {
    onUpdateComputers(computers.map(c => {
      if (c.id === pcId) {
        return {
          ...c,
          status: 'ACTIVE_POSTPAID' as const,
          currentUser: username,
          currentUserId: userId,
          timeTotal: 0,
          timeElapsed: 0,
          timeRemaining: 0,
          costAccumulated: 0
        };
      }
      return c;
    }));

    onTriggerSocketEvent(pcId, 'unlock', `Postpaid (Pay-as-you-go) session unlocked for player ${username}.`);
    setShowStartSessionModal(false);
  };

  const handleStartSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionPcId) return;

    if (sessionUserType === 'guest') {
      const hours = parseFloat(sessionPrepaidHours);
      if (sessionPostpaid) {
        startPostpaidSession(sessionPcId, 'Guest-User', null);
      } else {
        startPrepaidSession(sessionPcId, 'Guest-User', null, hours);
      }
    } else {
      // Member session
      const player = players.find(p => p.id === sessionSelectedMemberId);
      if (!player) return;

      if (sessionPostpaid) {
        startPostpaidSession(sessionPcId, player.username, player.id);
      } else {
        const hours = parseFloat(sessionPrepaidHours);
        startPrepaidSession(sessionPcId, player.username, player.id, hours);
      }
    }
  };

  // Add Member
  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName || !newPlayerUsername) return;

    const deposit = parseFloat(newPlayerDeposit) || 0;
    const newPlayer: Player = {
      id: `P${(players.length + 1).toString().padStart(3, '0')}`,
      username: newPlayerUsername.toLowerCase().trim(),
      fullName: newPlayerName.trim(),
      balance: deposit,
      points: Math.floor(deposit * 10),
      status: 'Active',
      membershipType: newPlayerType,
      timePlayedTotal: 0,
      createdDate: new Date().toISOString()
    };

    onUpdatePlayers([newPlayer, ...players]);

    if (deposit > 0) {
      const regTx: TransactionLog = {
        id: `TX-${Date.now().toString().slice(-6)}`,
        type: 'Account Registration',
        pcId: null,
        username: newPlayer.username,
        amount: deposit,
        details: `Account registration with $${deposit.toFixed(2)} initial credit deposit.`,
        timestamp: new Date().toISOString()
      };
      onUpdateTransactions([regTx, ...transactions]);
    }

    addSystemLog(`Registered new member: ${newPlayer.username} (${newPlayer.fullName})`);
    
    // Reset fields
    setNewPlayerName('');
    setNewPlayerUsername('');
    setNewPlayerDeposit('10');
    setShowAddPlayerModal(false);
  };

  // Top Up Action
  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpPlayerId) return;

    const amt = parseFloat(topUpAmount) || 0;
    const player = players.find(p => p.id === topUpPlayerId);
    if (!player || amt <= 0) return;

    onUpdatePlayers(players.map(p => {
      if (p.id === topUpPlayerId) {
        return {
          ...p,
          balance: p.balance + amt,
          points: p.points + Math.floor(amt * 10)
        };
      }
      return p;
    }));

    // Add TX
    const topTx: TransactionLog = {
      id: `TX-${Date.now().toString().slice(-6)}`,
      type: 'Prepaid Topup',
      pcId: null,
      username: player.username,
      amount: amt,
      details: `Prepaid balance top-up of $${amt.toFixed(2)} by Cashier`,
      timestamp: new Date().toISOString()
    };

    onUpdateTransactions([topTx, ...transactions]);
    addSystemLog(`Topped up member ${player.username} with $${amt.toFixed(2)}`);
    
    setShowTopUpModal(false);
    setTopUpPlayerId(null);
  };

  // Mass Commands
  const handleMassLock = () => {
    const updated = computers.map(pc => ({
      ...pc,
      status: 'LOCKED' as const,
      currentUser: null,
      currentUserId: null,
      timeTotal: 0,
      timeElapsed: 0,
      timeRemaining: 0,
      costAccumulated: 0
    }));
    onUpdateComputers(updated);
    addSystemLog("Triggered MASS LOCK on all computers.");
    computers.forEach(pc => onTriggerSocketEvent(pc.id, 'lock', "System lock forced by master cashier."));
  };

  const handleMassBroadcast = () => {
    if (!systemAlertMessage.trim()) return;
    computers.forEach(pc => {
      onTriggerSocketEvent(pc.id, 'alert', `BROADCAST: ${systemAlertMessage}`);
    });
    setSystemAlertMessage('');
    addSystemLog("Dispatched network-wide broadcast banner.");
  };

  const addSystemLog = (msg: string) => {
    onTriggerSocketEvent('SERVER', 'alert', msg);
  };

  // Reports Chart Configurations
  const hourlyData = [
    { name: '10:00 AM', standard: 3, vip: 1, console: 1 },
    { name: '12:00 PM', standard: 5, vip: 2, console: 2 },
    { name: '02:00 PM', standard: 4, vip: 3, console: 3 },
    { name: '04:00 PM', standard: 6, vip: 3, console: 3 },
    { name: '06:00 PM', standard: 6, vip: 3, console: 3 },
    { name: '08:00 PM', standard: 6, vip: 3, console: 3 },
    { name: '10:00 PM', standard: 4, vip: 2, console: 1 },
  ];

  const catSales = [
    { name: 'PC Game Time', value: transactions.filter(t => t.type.startsWith('Prepaid') || t.type.startsWith('Session')).reduce((a,c)=>a+c.amount,0) },
    { name: 'F&B POS Sales', value: transactions.filter(t => t.type === 'POS Purchase').reduce((a,c)=>a+c.amount,0) },
    { name: 'VIP Deposits', value: transactions.filter(t => t.type === 'Account Registration').reduce((a,c)=>a+c.amount,0) },
  ];

  return (
    <div id="admin-dashboard-root" className="flex-1 flex flex-col bg-[#0c0c0e]">
      
      {/* Metrics Banner */}
      <div id="admin-metrics-row" className="grid grid-cols-2 md:grid-cols-5 border-b border-zinc-800 bg-zinc-900/50 p-4 gap-4">
        
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-3 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Connected Stations</span>
            <span className="text-xl text-white font-bold tracking-tight">
              {computers.filter(c => c.status !== 'OFFLINE').length} <span className="text-xs text-zinc-500">/ {computers.length}</span>
            </span>
          </div>
          <Laptop className="w-8 h-8 text-cyan-400 opacity-80" />
        </div>

        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-3 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Active Sessions</span>
            <span className="text-xl text-emerald-400 font-bold tracking-tight">
              {activeCount} <span className="text-xs text-zinc-500">online</span>
            </span>
          </div>
          <Flame className="w-8 h-8 text-emerald-500 opacity-80" />
        </div>

        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-3 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Locked / Idle</span>
            <span className="text-xl text-amber-500 font-bold tracking-tight">
              {lockedCount} <span className="text-xs text-zinc-500">stations</span>
            </span>
          </div>
          <Lock className="w-8 h-8 text-amber-500 opacity-80" />
        </div>

        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-3 flex items-center justify-between col-span-2 md:col-span-1 shadow-md">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Total Members</span>
            <span className="text-xl text-blue-400 font-bold tracking-tight">
              {players.length} <span className="text-xs text-zinc-500">registered</span>
            </span>
          </div>
          <Users className="w-8 h-8 text-blue-500 opacity-80" />
        </div>

        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-3 flex items-center justify-between col-span-2 md:col-span-1 shadow-md">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Revenue Today</span>
            <span className="text-xl text-cyan-400 font-bold tracking-tight">
              ${totalRevenue.toFixed(2)}
            </span>
          </div>
          <TrendingUp className="w-8 h-8 text-cyan-400 opacity-80" />
        </div>

      </div>

      {/* Main Container: Split with Live PC Control Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side Tab Content Panel */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto min-w-0">
          
          {/* Sub Header Navigation */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex bg-[#18181b] border border-zinc-800 p-1 rounded-xl">
              {[
                { tab: 'grid', label: 'Monitor Grid', icon: Monitor },
                { tab: 'pos', label: 'POS Billing', icon: Coffee },
                { tab: 'members', label: 'Members DB', icon: Users },
                { tab: 'reports', label: 'Reports & Audits', icon: FileText },
                { tab: 'lan', label: 'Socket LAN', icon: Terminal },
                { tab: 'settings', label: 'Cafe Rates', icon: Settings }
              ].map(btn => {
                const Icon = btn.icon;
                const isActive = activeTab === btn.tab;
                return (
                  <button
                    key={btn.tab}
                    onClick={() => setActiveTab(btn.tab as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      isActive 
                        ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/10' 
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{btn.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mass control banner */}
            {activeTab === 'grid' && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Broadcast text alert..." 
                    value={systemAlertMessage}
                    onChange={(e) => setSystemAlertMessage(e.target.value)}
                    className="w-52 bg-[#18181b] border border-zinc-850 rounded-xl py-1.5 pl-3 pr-8 text-xs text-zinc-300 focus:border-cyan-500 outline-none"
                  />
                  <button 
                    onClick={handleMassBroadcast}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-cyan-400"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleMassLock}
                  className="px-3 py-1.5 bg-red-950/40 border border-red-900/60 hover:bg-red-900/50 text-red-400 text-xs font-bold uppercase rounded-xl flex items-center gap-1.5"
                >
                  <Power className="w-3.5 h-3.5" />
                  Lock All
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: MONITOR GRID */}
          {activeTab === 'grid' && (
            <div className="space-y-6">
              
              {/* Grouping Filters */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {(['All', 'Standard', 'VIP', 'Console'] as const).map(group => (
                    <button
                      key={group}
                      onClick={() => setSelectedGroup(group)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        selectedGroup === group 
                          ? 'bg-cyan-950/60 text-cyan-400 border-cyan-500/80 shadow-md shadow-cyan-500/5' 
                          : 'bg-[#18181b] border-zinc-800 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      {group === 'All' ? 'All Groups' : `${group} Group`}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-mono text-zinc-500">
                  Showing {filteredComputers.length} of {computers.length} PCs
                </span>
              </div>

              {/* Grid cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredComputers.map(pc => {
                  const isSelected = selectedPcId === pc.id;
                  const isActive = pc.status.startsWith('ACTIVE');
                  const isLocked = pc.status === 'LOCKED';
                  const isOffline = pc.status === 'OFFLINE';
                  const isMaintenance = pc.status === 'MAINTENANCE';

                  return (
                    <div
                      key={pc.id}
                      onClick={() => setSelectedPcId(pc.id)}
                      className={`p-4 rounded-xl transition-all cursor-pointer relative group pc-card shadow-lg ${
                        isSelected 
                          ? 'ring-2 ring-cyan-500 shadow-xl shadow-cyan-500/5 scale-[1.01]' 
                          : ''
                      } ${
                        isActive ? 'status-occupied' :
                        isLocked ? 'status-locked' : 'status-available'
                      }`}
                    >
                      {/* Top PC Card header */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                            {pc.id}
                            <span className={`w-2 h-2 rounded-full ${
                              isActive ? 'bg-emerald-500 shadow-md shadow-emerald-500/30 animate-pulse' :
                              isLocked ? 'bg-amber-500' :
                              isOffline ? 'bg-zinc-700' : 'bg-red-500'
                            }`} />
                          </h3>
                          <span className="text-[10px] font-mono text-zinc-500">{pc.group} Station</span>
                        </div>

                        {/* Status chip */}
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isActive && pc.status.includes('PREPAID') ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' :
                          isActive && pc.status.includes('POSTPAID') ? 'bg-blue-950 text-blue-400 border border-blue-900/50' :
                          isLocked ? 'bg-amber-950 text-amber-400 border border-amber-900/50' :
                          isOffline ? 'bg-zinc-900 text-zinc-500 border border-zinc-800' :
                          'bg-red-950 text-red-400 border border-red-900/50'
                        }`}>
                          {pc.status.replace('ACTIVE_', '')}
                        </span>
                      </div>

                      {/* Middle Card info */}
                      <div className="space-y-2 mt-4 min-h-[50px]">
                        {isActive ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">User: <strong className="text-slate-200">{pc.currentUser}</strong></span>
                              {pc.status === 'ACTIVE_PREPAID' ? (
                                <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(pc.timeRemaining)}
                                </span>
                              ) : (
                                <span className="text-blue-400 font-mono font-semibold">Postpaid</span>
                              )}
                            </div>
                            <div className="flex justify-between text-[11px] font-mono text-slate-500">
                              <span>Spent: {formatTime(pc.timeElapsed)}</span>
                              <span>Charge: ${pc.costAccumulated.toFixed(2)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 flex items-center justify-center py-2 italic font-medium">
                            {isLocked ? "Awaiting Login Handshake" :
                             isOffline ? "Client Shell Inactive" : "Maintenance Mode Lock"}
                          </div>
                        )}
                      </div>

                      {/* Card Quick Action buttons */}
                      <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 mt-4">
                        <span className="text-[10px] font-mono text-slate-600 group-hover:text-slate-400 transition-colors">
                          {pc.ipAddress}
                        </span>

                        <div className="flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onViewClientPC(pc.id)}
                            title="Interactive Client View"
                            className="p-1 bg-[#1a202c] hover:bg-teal-950 hover:text-teal-400 rounded border border-slate-800 text-slate-400"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                          </button>

                          {isLocked ? (
                            <button
                              onClick={() => handleUnlockPC(pc.id)}
                              title="Start Session"
                              className="p-1 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-900/40 rounded"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              disabled={isOffline || isMaintenance}
                              onClick={() => handleLockPC(pc.id)}
                              title="Force Session Lock"
                              className="p-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 2: CASHIER POS */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Product Shelf (Left side) */}
              <div className="xl:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-teal-400" />
                    Product Catalog
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">Select products to add to cart</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleAddPosCart(p)}
                      disabled={p.stock <= 0 && p.category !== 'Services'}
                      className="p-3 bg-[#11141a] hover:bg-[#141821] border border-slate-800/80 hover:border-slate-700 rounded-xl text-left transition-all relative flex flex-col justify-between h-28 group"
                    >
                      <div>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 text-slate-500 block w-max mb-1">
                          {p.category}
                        </span>
                        <h4 className="text-xs font-bold text-white group-hover:text-teal-400 transition-colors leading-normal">{p.name}</h4>
                      </div>
                      <div className="flex justify-between items-baseline mt-2">
                        <span className="text-teal-400 font-mono text-sm font-bold">${p.price.toFixed(2)}</span>
                        {p.category !== 'Services' && (
                          <span className={`text-[9px] font-mono ${p.stock < 10 ? 'text-amber-500 font-bold' : 'text-slate-500'}`}>
                            {p.stock > 0 ? `${p.stock} left` : 'Out of Stock'}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cart / Checkout Billing Panel (Right side) */}
              <div className="bg-[#11141a] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between min-h-[400px]">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-4">
                    Active POS Transaction
                  </h3>

                  {/* Customer Target settings */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-500 mb-1">STATION DESTINATION</label>
                      <select 
                        value={posSelectedPC} 
                        onChange={(e) => setPosSelectedPC(e.target.value)}
                        className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl p-2 text-xs text-white outline-none"
                      >
                        {computers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.id} {c.currentUser ? `(${c.currentUser})` : '(Guest / Locked)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!computers.find(c => c.id === posSelectedPC)?.currentUser && (
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 mb-1">CUSTOMER NAME (GUEST)</label>
                        <input 
                          type="text" 
                          value={posCustomerName}
                          onChange={(e) => setPosCustomerName(e.target.value)}
                          className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl p-2 text-xs text-white outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Cart Items List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto mb-4">
                    {posCart.length === 0 ? (
                      <div className="py-8 text-center text-slate-600 text-xs italic">
                        Cart is empty. Click catalog items above to add.
                      </div>
                    ) : (
                      posCart.map(item => (
                        <div key={item.product.id} className="flex justify-between items-center text-xs bg-[#0a0c0f] p-2 rounded-lg border border-slate-800/60">
                          <div>
                            <p className="font-bold text-white">{item.product.name}</p>
                            <span className="text-[10px] text-slate-500 font-mono">
                              ${item.product.price.toFixed(2)} x {item.quantity}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-teal-400 font-bold">
                              ${(item.product.price * item.quantity).toFixed(2)}
                            </span>
                            <button
                              onClick={() => {
                                setPosCart(prev => prev.filter(c => c.product.id !== item.product.id));
                              }}
                              className="text-red-500 hover:text-red-400 font-bold p-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Totals & Checkout Button */}
                <div className="border-t border-slate-800 pt-4 space-y-4">
                  <div className="space-y-1.5 font-mono text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="text-white">${posCart.reduce((a,c)=>a+(c.product.price*c.quantity),0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (10% Included):</span>
                      <span className="text-white">${(posCart.reduce((a,c)=>a+(c.product.price*c.quantity),0) * 0.1).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-slate-800/80 pt-1.5">
                      <span className="text-teal-400">GRAND TOTAL:</span>
                      <span className="text-teal-400">${posCart.reduce((a,c)=>a+(c.product.price*c.quantity),0).toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePosCheckout}
                    disabled={posCart.length === 0}
                    className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-emerald-400 hover:opacity-95 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Confirm POS & Charge Cash
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: MEMBERS DATABASE */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="relative w-72">
                  <input 
                    type="text" 
                    placeholder="Search username or member name..." 
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-300 focus:border-teal-500 outline-none"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                </div>

                <button
                  onClick={() => setShowAddPlayerModal(true)}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4 text-black" />
                  Add Member
                </button>
              </div>

              {/* Members Table */}
              <div className="bg-[#11141a] border border-slate-800/80 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-500 uppercase">
                        <th className="p-4">ID</th>
                        <th className="p-4">Member Info</th>
                        <th className="p-4">Membership</th>
                        <th className="p-4">Loyalty Balance</th>
                        <th className="p-4">VIP Points</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {players
                        .filter(p => 
                          p.username.includes(playerSearch.toLowerCase()) || 
                          p.fullName.toLowerCase().includes(playerSearch.toLowerCase())
                        )
                        .map(p => (
                          <tr key={p.id} className="hover:bg-[#151a24] transition-colors">
                            <td className="p-4 font-mono font-bold text-slate-500">{p.id}</td>
                            <td className="p-4">
                              <p className="font-bold text-white">{p.fullName}</p>
                              <span className="text-[10px] text-slate-400 font-mono">@{p.username}</span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                                p.membershipType === 'VIP' 
                                  ? 'bg-purple-950 text-purple-400 border border-purple-900/60' 
                                  : 'bg-slate-900 text-slate-400 border border-slate-800'
                              }`}>
                                {p.membershipType}
                              </span>
                            </td>
                            <td className="p-4 font-mono font-bold text-emerald-400">
                              ${p.balance.toFixed(2)}
                            </td>
                            <td className="p-4 font-mono text-slate-300">
                              {p.points} <span className="text-[10px] text-slate-500">pts</span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                                p.status === 'Active' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => {
                                    setTopUpPlayerId(p.id);
                                    setShowTopUpModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-teal-950 hover:bg-teal-900 text-teal-400 font-bold text-[10px] uppercase tracking-wide border border-teal-900 rounded"
                                >
                                  Load Cash
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REPORTS & ANALYTICS */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              
              {/* Charts grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Traffic peak area chart */}
                <div className="bg-[#11141a] border border-slate-800 p-4 rounded-2xl space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">LAN Traffic & Seat Occupancy Peaks</h3>
                    <span className="text-[10px] text-slate-500 block">Calculated hourly based on concurrent client heartbeats</span>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hourlyData}>
                        <defs>
                          <linearGradient id="colorStd" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorVIP" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                        <YAxis stroke="#6b7280" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#11141a', border: '1px solid #374151' }} />
                        <Area type="monotone" dataKey="standard" name="Standard PCs" stroke="#14b8a6" fillOpacity={1} fill="url(#colorStd)" />
                        <Area type="monotone" dataKey="vip" name="VIP PCs" stroke="#a855f7" fillOpacity={1} fill="url(#colorVIP)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sales distribution bar chart */}
                <div className="bg-[#18181b] border border-zinc-800 p-4 rounded-2xl space-y-4 animate-fade-in shadow-md">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Revenue Streams Distribution</h3>
                    <span className="text-[10px] text-zinc-500 block">Revenue streams breakdown of today's logs</span>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={catSales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                        <YAxis stroke="#71717a" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                        <Bar dataKey="value" name="Revenue Amount ($)">
                          {catSales.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#06b6d4' : index === 1 ? '#8b5cf6' : '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Transactions Ledger */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Durable Audits Transaction Ledger</h3>
                <div className="bg-[#18181b] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-500 uppercase">
                          <th className="p-4">Transaction ID</th>
                          <th className="p-4">Classification</th>
                          <th className="p-4">Username / Station</th>
                          <th className="p-4">Audited Amount</th>
                          <th className="p-4">Transaction Details</th>
                          <th className="p-4 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {transactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-[#151a24] transition-colors font-mono">
                            <td className="p-4 text-slate-500 font-bold">{tx.id}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.type === 'POS Purchase' ? 'bg-[#151c27] text-purple-400 border border-purple-900/60' :
                                tx.type === 'Prepaid Topup' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/60' :
                                tx.type === 'Session Checkout' ? 'bg-blue-950 text-blue-400 border border-blue-900/60' :
                                'bg-slate-900 text-slate-400 border border-slate-850'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-slate-300 font-bold">@{tx.username}</span>
                              {tx.pcId && <span className="text-[10px] text-slate-500 block">{tx.pcId}</span>}
                            </td>
                            <td className="p-4 text-teal-400 font-bold">
                              ${tx.amount.toFixed(2)}
                            </td>
                            <td className="p-4 text-slate-400 font-sans max-w-xs truncate">
                              {tx.details}
                            </td>
                            <td className="p-4 text-slate-500 text-right text-[10px]">
                              {new Date(tx.timestamp).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: SOCKET.IO LAN EVENTS LOG */}
          {activeTab === 'lan' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-teal-400 animate-pulse" />
                    Socket.IO TCP Packet Sniffer
                  </h2>
                  <span className="text-xs text-slate-500 block">Listening to websocket connections on port 3000 (WS/WSS Client Protocols)</span>
                </div>
                <button
                  onClick={() => onUpdateSocketEvents([])}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Clear Packet Logs
                </button>
              </div>

              {/* Rolling Shell Console */}
              <div className="bg-[#07080a] p-4 rounded-2xl border border-slate-800 font-mono text-[11px] leading-relaxed text-slate-300 h-96 overflow-y-auto space-y-1 shadow-inner scrollbar-thin">
                <div className="text-teal-400 font-bold mb-2">--- NEX SOCKET SERVER INGRESS CAPTURING ACTIVE ---</div>
                {socketEvents.length === 0 ? (
                  <div className="text-slate-600 italic py-12 text-center">No websocket TCP frames captured in the last packet buffer.</div>
                ) : (
                  socketEvents.map(evt => (
                    <div key={evt.id} className="hover:bg-slate-900 p-1 rounded transition-colors flex items-start gap-2">
                      <span className="text-slate-500">[{new Date(evt.timestamp).toLocaleTimeString()}]</span>
                      <span className={`font-bold uppercase text-[10px] px-1 rounded shrink-0 ${
                        evt.type === 'connect' ? 'bg-emerald-950 text-emerald-400' :
                        evt.type === 'disconnect' ? 'bg-red-950 text-red-400' :
                        evt.type === 'unlock' ? 'bg-blue-950 text-blue-400' :
                        evt.type === 'lock' ? 'bg-amber-950 text-amber-400' :
                        evt.type === 'order' ? 'bg-purple-950 text-purple-400' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {evt.type}
                      </span>
                      <span className="text-slate-400">Station <strong className="text-white">{evt.pcId}</strong></span>
                      <span className="text-slate-200">{evt.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS / CAFE RATES */}
          {activeTab === 'settings' && (
            <div className="bg-[#11141a] border border-slate-800 rounded-2xl p-6 space-y-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                NEX Café Configurations & Billing Framework
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Hourly rates configurator */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">Hourly Group Rates</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 mb-1">STANDARD COMPUTERS RATE (PER HOUR)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">$</span>
                        <input 
                          type="number" 
                          step="0.5"
                          value={settings.rateStandard}
                          onChange={(e) => onUpdateSettings({ ...settings, rateStandard: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl py-2 pl-7 pr-3 text-xs text-white focus:border-teal-500 outline-none font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 mb-1">VIP HIGH-END COMPUTERS RATE (PER HOUR)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">$</span>
                        <input 
                          type="number" 
                          step="0.5"
                          value={settings.rateVIP}
                          onChange={(e) => onUpdateSettings({ ...settings, rateVIP: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl py-2 pl-7 pr-3 text-xs text-white focus:border-teal-500 outline-none font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 mb-1">CONSOLE STATIONS (PS5/XBOX) RATE (PER HOUR)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">$</span>
                        <input 
                          type="number" 
                          step="0.5"
                          value={settings.rateConsole}
                          onChange={(e) => onUpdateSettings({ ...settings, rateConsole: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl py-2 pl-7 pr-3 text-xs text-white focus:border-teal-500 outline-none font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Automation & Safety properties */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest">Automation & Safety Parameters</h3>
                  
                  <div className="space-y-4 pt-2">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={settings.enableAutoLock}
                        onChange={(e) => onUpdateSettings({ ...settings, enableAutoLock: e.target.checked })}
                        className="mt-1 w-4 h-4 accent-teal-500"
                      />
                      <div>
                        <span className="text-xs font-bold text-white block">Auto Lock client on prepaid expiration</span>
                        <p className="text-[10px] text-slate-400">Instantly triggers shell locking binary across the LAN network when user time reaches zero.</p>
                      </div>
                    </label>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 mb-1">WARN REMAINING MINUTES POPUP</label>
                      <select
                        value={settings.warnMinutesRemaining}
                        onChange={(e) => onUpdateSettings({ ...settings, warnMinutesRemaining: parseInt(e.target.value) || 5 })}
                        className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl p-2 text-xs text-white outline-none font-mono"
                      >
                        <option value="1">1 Minute Remaining</option>
                        <option value="3">3 Minutes Remaining</option>
                        <option value="5">5 Minutes Remaining (Recommended)</option>
                        <option value="10">10 Minutes Remaining</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 mb-1">CAFÉ NAME / LAUNCHER HEADER</label>
                      <input 
                        type="text" 
                        value={settings.shopName}
                        onChange={(e) => onUpdateSettings({ ...settings, shopName: e.target.value })}
                        className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl p-2 text-xs text-white focus:border-teal-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Right Sidebar: Active PC Remote Command HUD */}
        <div id="admin-sidebar-hud" className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#0a0c0f] flex flex-col justify-between shrink-0">
          
          {selectedPC ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedPC.id} HUD Control</h3>
                  <span className="text-[10px] font-mono text-slate-500">{selectedPC.name}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  selectedPC.status.startsWith('ACTIVE') ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-900 text-zinc-500'
                }`}>
                  {selectedPC.status.replace('ACTIVE_', '')}
                </span>
              </div>

              {/* Scrolling Details / Live Chat */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* Info block */}
                <div className="bg-[#18181b]/60 border border-zinc-800/80 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Status:</span>
                    <span className="text-white font-semibold">{selectedPC.status}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">IP Address:</span>
                    <span className="text-white font-mono">{selectedPC.ipAddress}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">MAC Address:</span>
                    <span className="text-white font-mono text-[11px]">{selectedPC.macAddress}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Hourly Rate:</span>
                    <span className="text-cyan-400 font-mono font-bold">${selectedPC.ratePerHour.toFixed(2)}/hr</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-zinc-800 pt-2">
                    <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wider block mb-1">Hardware Blueprint</span>
                    <span className="text-[10px] text-zinc-400 text-right">
                      {selectedPC.specifications.cpu} • {selectedPC.specifications.ram} • {selectedPC.specifications.gpu}
                    </span>
                  </div>
                </div>

                {/* Session controls if active */}
                {selectedPC.status.startsWith('ACTIVE') ? (
                  <div className="space-y-2.5">
                    <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Timer Synchronization</h4>
                    <div className="bg-[#18181b] border border-zinc-800 p-3 rounded-xl space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-[#09090b] p-2 rounded-lg border border-zinc-800">
                          <span className="text-[10px] text-zinc-500 font-mono uppercase block">Time Elapsed</span>
                          <span className="text-sm font-mono text-white font-bold">{formatTime(selectedPC.timeElapsed)}</span>
                        </div>
                        <div className="bg-[#09090b] p-2 rounded-lg border border-zinc-800">
                          <span className="text-[10px] text-zinc-500 font-mono uppercase block">
                            {selectedPC.status === 'ACTIVE_PREPAID' ? 'Time Left' : 'Postpaid Billing'}
                          </span>
                          <span className="text-sm font-mono text-cyan-400 font-bold">
                            {selectedPC.status === 'ACTIVE_PREPAID' ? formatTime(selectedPC.timeRemaining) : `$${selectedPC.costAccumulated.toFixed(2)}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            // Add 1 hour prepaid time
                            const updated = computers.map(pc => {
                              if (pc.id === selectedPC.id) {
                                    return {
                                      ...pc,
                                      timeRemaining: pc.timeRemaining + 3600,
                                      timeTotal: pc.timeTotal + 3600
                                    };
                                  }
                                  return pc;
                                });
                                onUpdateComputers(updated);
                                onTriggerSocketEvent(selectedPC.id, 'alert', "Cashier topped up +1 Hour of extra prepaid session time.");
                              }}
                              className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg"
                            >
                              +1 Hour Prepaid
                            </button>
                            <button
                              onClick={() => handleLockPC(selectedPC.id)}
                              className="px-3 py-1.5 bg-red-950/50 hover:bg-red-900/60 text-red-400 font-bold text-xs border border-red-900/40 rounded-lg"
                            >
                              End Session
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-xl text-xs text-amber-400 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Station locked. Use Quick Unlock to allocate time to a Guest or registered Member account.</span>
                      </div>
                    )}

                    {/* Live Client Chat Simulation */}
                    <div className="space-y-2 flex flex-col h-60 border border-zinc-800 rounded-xl bg-[#09090b] overflow-hidden">
                      <div className="bg-[#18181b] px-3 py-2 border-b border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                        Two-Way Live LAN Chat
                      </div>

                      {/* Messages list */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs scrollbar-thin">
                        {chatMessages.filter(m => m.pcId === selectedPC.id).length === 0 ? (
                          <div className="text-zinc-600 italic py-8 text-center text-[11px]">
                            No active chat history with this computer.
                          </div>
                        ) : (
                          chatMessages
                            .filter(m => m.pcId === selectedPC.id)
                            .map(msg => (
                              <div 
                                key={msg.id} 
                                className={`flex flex-col max-w-[80%] ${
                                  msg.sender === 'admin' ? 'ml-auto items-end' : 'mr-auto items-start'
                                }`}
                              >
                                <span className="text-[9px] text-zinc-500 font-mono mb-0.5">
                                  {msg.sender === 'admin' ? 'Cashier Master' : selectedPC.id}
                                </span>
                                <div className={`p-2 rounded-xl text-zinc-200 ${
                                  msg.sender === 'admin' 
                                    ? 'bg-cyan-950/80 rounded-tr-none border border-cyan-800/60 text-cyan-200' 
                                    : 'bg-[#18181b] rounded-tl-none border border-zinc-800/80'
                                }`}>
                                  {msg.text}
                                </div>
                              </div>
                            ))
                        )}
                      </div>

                      {/* Input form */}
                      <form onSubmit={handleChatSend} className="p-2 border-t border-zinc-800 flex gap-1.5 bg-[#18181b]/60">
                        <input 
                          type="text" 
                          placeholder="Send message to client..." 
                          value={adminChatText}
                          onChange={(e) => setAdminChatText(e.target.value)}
                          disabled={selectedPC.status === 'OFFLINE'}
                          className="flex-1 bg-[#09090b] border border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-500 disabled:opacity-40"
                        />
                        <button 
                          type="submit"
                          disabled={selectedPC.status === 'OFFLINE' || !adminChatText.trim()}
                          className="p-1.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>

                  </div>

                  {/* Bottom Quick Commands */}
                  <div className="p-4 border-t border-zinc-800 bg-[#18181b]/40 grid grid-cols-2 gap-2">
                    {selectedPC.status === 'LOCKED' ? (
                      <button
                        onClick={() => handleUnlockPC(selectedPC.id)}
                        className="w-full py-2 bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Quick Unlock
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLockPC(selectedPC.id)}
                        disabled={selectedPC.status === 'OFFLINE'}
                        className="w-full py-2 bg-red-950/40 hover:bg-red-900/50 text-red-400 font-bold text-xs border border-red-900/40 rounded-xl flex items-center justify-center gap-1"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Force Lock
                      </button>
                    )}

                    <button
                      onClick={() => {
                        // Toggle maintenance/locked
                        const updated = computers.map(pc => {
                          if (pc.id === selectedPC.id) {
                            return {
                              ...pc,
                              status: pc.status === 'MAINTENANCE' ? 'LOCKED' as const : 'MAINTENANCE' as const
                            };
                          }
                          return pc;
                        });
                        onUpdateComputers(updated);
                        onTriggerSocketEvent(selectedPC.id, 'alert', `Station status toggled between Maintenance/Locked by cashier console.`);
                      }}
                      disabled={selectedPC.status.startsWith('ACTIVE') || selectedPC.status === 'OFFLINE'}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-350 font-bold text-xs rounded-xl flex items-center justify-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Maintenance
                    </button>
                  </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600 italic text-xs h-full px-8 text-center space-y-2">
              <Monitor className="w-8 h-8 text-slate-700 animate-pulse" />
              <span>Select any station in the monitor grid to trigger remote shell overrides, live billing audits, or diagnostic messaging.</span>
            </div>
          )}

        </div>

      </div>

      {/* MODAL 1: ADD PLAYER / MEMBERSHIP MODAL */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddPlayer} className="bg-[#14181f] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Register New Member Account
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1">FULL NAME</label>
                <input 
                  type="text" 
                  required
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1">CHOSEN USERNAME (FOR CLIENT LOGINS)</label>
                <input 
                  type="text" 
                  required
                  value={newPlayerUsername}
                  onChange={(e) => setNewPlayerUsername(e.target.value)}
                  className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1">MEMBERSHIP CATEGORY</label>
                  <select
                    value={newPlayerType}
                    onChange={(e) => setNewPlayerType(e.target.value as any)}
                    className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl p-2 text-xs text-white outline-none"
                  >
                    <option value="Regular">Regular (Standard Rates)</option>
                    <option value="VIP">VIP Tier (Premium Perks)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1">INITIAL DEPOSIT BALANCE ($)</label>
                  <input 
                    type="number" 
                    value={newPlayerDeposit}
                    onChange={(e) => setNewPlayerDeposit(e.target.value)}
                    className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-teal-500 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddPlayerModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold uppercase tracking-wider rounded-xl shadow-md"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: CASHIER TOP UP MODAL */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleTopUpSubmit} className="bg-[#14181f] border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Load Prepaid Balances
            </h3>

            <div>
              <p className="text-xs text-slate-400 mb-3">
                Deposit cash onto member account: <strong className="text-white">@{players.find(p => p.id === topUpPlayerId)?.username}</strong>
              </p>
              <label className="block text-[10px] font-mono text-slate-500 mb-1">LOAD AMOUNT (USD CREDITS)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">$</span>
                <input 
                  type="number" 
                  step="5"
                  required
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl py-2.5 pl-7 pr-3 text-sm text-white outline-none focus:border-teal-500 font-mono font-bold"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Provides 1:1 conversion rate + credits {Math.floor((parseFloat(topUpAmount) || 0) * 10)} VIP loyalty reward points.</p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowTopUpModal(false); setTopUpPlayerId(null); }}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold uppercase tracking-wider rounded-xl"
              >
                Authorize Deposit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: START SESSION MODAL (MANUAL UNLOCK) */}
      {showStartSessionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleStartSessionSubmit} className="bg-[#14181f] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Launch Session: {sessionPcId}
            </h3>

            <div className="space-y-4">
              {/* Toggle User Type */}
              <div className="flex bg-[#0a0c0f] p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSessionUserType('guest')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
                    sessionUserType === 'guest' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Guest Session
                </button>
                <button
                  type="button"
                  onClick={() => setSessionUserType('member')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
                    sessionUserType === 'member' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Member Account
                </button>
              </div>

              {sessionUserType === 'member' ? (
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1">SELECT MEMBER ACCOUNT</label>
                  <select
                    required
                    value={sessionSelectedMemberId}
                    onChange={(e) => setSessionSelectedMemberId(e.target.value)}
                    className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  >
                    <option value="">-- Choose Account --</option>
                    {players
                      .filter(p => p.status === 'Active')
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} (@{p.username}) - Bal: ${p.balance.toFixed(2)}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-800/40 text-[11px] text-slate-400">
                  Guest accounts bypass membership databases and log cashier cash overrides directly.
                </div>
              )}

              {/* Billing Mode (Prepaid vs Postpaid) */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 font-semibold">
                  <input 
                    type="checkbox" 
                    checked={sessionPostpaid}
                    onChange={(e) => setSessionPostpaid(e.target.checked)}
                    className="w-4 h-4 accent-teal-500"
                  />
                  Postpaid (Pay-as-you-go billing)
                </label>

                {!sessionPostpaid && (
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-1">PREPAID SESSION TIME</label>
                    <select
                      value={sessionPrepaidHours}
                      onChange={(e) => setSessionPrepaidHours(e.target.value)}
                      className="w-full bg-[#0a0c0f] border border-slate-800 rounded-xl p-2 text-xs text-white outline-none font-mono"
                    >
                      <option value="1">1 Hour Session</option>
                      <option value="2">2 Hour Session</option>
                      <option value="3">3 Hour Session</option>
                      <option value="5">5 Hour Promo Pack</option>
                      <option value="10">10 Hour Ultimate Pack</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setShowStartSessionModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sessionUserType === 'member' && !sessionSelectedMemberId}
                className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold uppercase tracking-wider rounded-xl disabled:opacity-30"
              >
                Authorize Session
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
