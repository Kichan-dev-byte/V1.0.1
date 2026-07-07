/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  INITIAL_COMPUTERS, 
  INITIAL_PLAYERS, 
  INITIAL_PRODUCTS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_SOCKET_EVENTS, 
  INITIAL_SETTINGS 
} from './data/mockData';
import { 
  Computer, 
  Player, 
  POSProduct, 
  Order, 
  ChatMessage, 
  TransactionLog, 
  SocketEvent, 
  ShopSettings 
} from './types';
import AdminDashboard from './components/AdminDashboard';
import ClientStation from './components/ClientStation';
import InstallerWizard from './components/InstallerWizard';
import AdminLogin from './components/AdminLogin';
import { 
  Cpu, 
  Server, 
  Monitor, 
  Settings2, 
  BellRing, 
  AlertTriangle, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning';
  title: string;
  message: string;
}

export default function App() {
  // Navigation / Router view mode
  const [viewMode, setViewMode] = useState<'installer' | 'admin' | 'client'>('installer');

  // Active Admin/Cashier Session
  const [currentAdminSession, setCurrentAdminSession] = useState<any | null>(() => {
    const saved = localStorage.getItem('nex_admin_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Master States with LocalStorage persistence fallback
  const [settings, setSettings] = useState<ShopSettings>(() => {
    const saved = localStorage.getItem('nex_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [computers, setComputers] = useState<Computer[]>(() => {
    const saved = localStorage.getItem('nex_computers');
    return saved ? JSON.parse(saved) : INITIAL_COMPUTERS;
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('nex_players');
    return saved ? JSON.parse(saved) : INITIAL_PLAYERS;
  });

  const [products, setProducts] = useState<POSProduct[]>(() => {
    const saved = localStorage.getItem('nex_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>([]);

  const [transactions, setTransactions] = useState<TransactionLog[]>(() => {
    const saved = localStorage.getItem('nex_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [socketEvents, setSocketEvents] = useState<SocketEvent[]>(() => {
    const saved = localStorage.getItem('nex_socket_events');
    return saved ? JSON.parse(saved) : INITIAL_SOCKET_EVENTS;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Selected client PC to view/simulate
  const [activeClientPcId, setActiveClientPcId] = useState<string>("PC-01");

  // Notifications Toast queue
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Sync to LocalStorage on modifications
  useEffect(() => {
    localStorage.setItem('nex_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('nex_computers', JSON.stringify(computers));
  }, [computers]);

  useEffect(() => {
    localStorage.setItem('nex_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('nex_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('nex_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('nex_socket_events', JSON.stringify(socketEvents));
  }, [socketEvents]);

  // Toast dispatch
  const showToast = (title: string, message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Triggers Socket LAN logs & dynamic toast banners
  const handleTriggerSocketEvent = (pcId: string, type: SocketEvent['type'], message: string) => {
    const newEvent: SocketEvent = {
      id: `EV-${Date.now().toString().slice(-6)}`,
      pcId,
      type,
      message,
      timestamp: new Date().toISOString()
    };

    setSocketEvents(prev => [newEvent, ...prev]);

    // Format visual notification banners
    if (type === 'unlock') {
      showToast(`${pcId} Active Session Started`, message, 'success');
    } else if (type === 'lock') {
      showToast(`${pcId} Connection Locked`, message, 'warning');
    } else if (type === 'order') {
      showToast(`${pcId} Order Placed`, message, 'success');
    } else if (type === 'chat') {
      showToast(`New Chat from ${pcId}`, message, 'info');
    } else if (type === 'alert') {
      showToast(`System Alert`, message, 'warning');
    }
  };

  // Master handler for Chat triggers
  const handleSendChatMessage = (pcId: string, sender: ChatMessage['sender'], text: string) => {
    const newMsg: ChatMessage = {
      id: `MSG-${Date.now().toString().slice(-6)}`,
      sender,
      pcId,
      text,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, newMsg]);

    // Log socket packet
    handleTriggerSocketEvent(
      pcId, 
      'chat', 
      `${sender === 'admin' ? 'Cashier Admin' : 'Client Seat'} transmitted packet: "${text}"`
    );
  };

  const handleResetApplicationState = () => {
    if (window.confirm("Are you sure you want to reset all configurations, transaction logs, and computer layouts back to defaults?")) {
      localStorage.clear();
      setSettings(INITIAL_SETTINGS);
      setComputers(INITIAL_COMPUTERS);
      setPlayers(INITIAL_PLAYERS);
      setProducts(INITIAL_PRODUCTS);
      setTransactions(INITIAL_TRANSACTIONS);
      setSocketEvents(INITIAL_SOCKET_EVENTS);
      setOrders([]);
      setChatMessages([]);
      setViewMode('installer');
      setCurrentAdminSession(null);
      showToast("System Purged", "Reset all relational databases and socket configs.", "warning");
    }
  };

  const handleAdminLogout = async () => {
    if (currentAdminSession) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: currentAdminSession.id })
        });
      } catch (err) {}

      // Emit admin:logout socket event
      handleTriggerSocketEvent('SERVER', 'admin:logout' as any, `Admin @${currentAdminSession.username} manually logged out of console.`);

      setCurrentAdminSession(null);
      localStorage.removeItem('nex_admin_session');
      showToast("Operator Session Terminated", "Logged out of cashier terminal.", "info");
    }
  };

  return (
    <div id="nex-app-wrapper" className="min-h-screen bg-[#09090b] flex flex-col font-sans text-zinc-300">
      
      {/* Global Top Application Bar */}
      <header id="global-header" className="bg-[#18181b] border-b border-zinc-800/80 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-xl">
        
        {/* Branding Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Cpu className="w-5.5 h-5.5 text-black" />
          </div>
          <div>
            <h1 className="text-white font-extrabold tracking-wider text-base leading-none">NEX CAFE SUITE</h1>
            <span className="text-cyan-400 font-mono text-[9px] tracking-widest block mt-1">SECURE LAN CONTROLLER v4.2</span>
          </div>
        </div>

        {/* Global Router Mode Toggles (Only visible once installer is finished) */}
        {viewMode !== 'installer' && (
          <div className="flex bg-[#09090b] border border-zinc-800 p-1 rounded-2xl shadow-inner">
            <button
              onClick={() => setViewMode('admin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'admin' 
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/15' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Server className="w-4 h-4" />
              🛡️ Cashier Server Console
            </button>
            
            <button
              onClick={() => setViewMode('client')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'client' 
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/15' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
              🖥️ Live Client Station
            </button>
          </div>
        )}

        {/* Diagnostic Actions & Status Indicator */}
        <div className="flex items-center gap-4">
          {currentAdminSession && viewMode === 'admin' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#09090b] border border-zinc-800 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-[10px] font-mono text-zinc-400">OPERATOR: {currentAdminSession.username}</span>
              <button 
                onClick={handleAdminLogout}
                className="text-[10px] text-red-400 hover:text-red-300 ml-1 font-mono uppercase underline hover:no-underline cursor-pointer"
              >
                Logout
              </button>
            </div>
          )}

          <div className="hidden lg:flex items-center gap-2 font-mono text-[10px] text-zinc-500 border-r border-zinc-800 pr-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SOCKET SERVER Liveliness: OK</span>
          </div>

          <button
            onClick={handleResetApplicationState}
            title="Reset Database to Default"
            className="p-2 bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900 text-zinc-400 hover:text-red-400 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </header>

      {/* Main Container Driver Area */}
      <main id="primary-viewport" className="flex-1 flex flex-col overflow-hidden">
        {viewMode === 'installer' && (
          <InstallerWizard onComplete={() => setViewMode('admin')} />
        )}

        {viewMode === 'admin' && (
          !currentAdminSession ? (
            <AdminLogin 
              onLoginSuccess={(adminUser, session) => {
                setCurrentAdminSession(session);
                localStorage.setItem('nex_admin_session', JSON.stringify(session));
                showToast(`Session Initialized`, `Operator ${adminUser.username} authenticated successfully.`, "success");
              }}
              onTriggerSocketEvent={handleTriggerSocketEvent}
            />
          ) : (
            <AdminDashboard 
              computers={computers}
              players={players}
              products={products}
              orders={orders}
              transactions={transactions}
              socketEvents={socketEvents}
              settings={settings}
              chatMessages={chatMessages}
              onUpdateComputers={setComputers}
              onUpdatePlayers={setPlayers}
              onUpdateProducts={setProducts}
              onUpdateOrders={setOrders}
              onUpdateTransactions={setTransactions}
              onUpdateSocketEvents={setSocketEvents}
              onUpdateSettings={setSettings}
              onSendAdminMessage={(pcId, text) => handleSendChatMessage(pcId, 'admin', text)}
              onTriggerSocketEvent={handleTriggerSocketEvent}
              onViewClientPC={(pcId) => {
                setActiveClientPcId(pcId);
                setViewMode('client');
              }}
            />
          )
        )}

        {viewMode === 'client' && (
          <ClientStation 
            computers={computers}
            players={players}
            products={products}
            chatMessages={chatMessages}
            settings={settings}
            activePcId={activeClientPcId}
            onSelectPc={setActiveClientPcId}
            onUpdateComputers={setComputers}
            onUpdatePlayers={setPlayers}
            onSendChatMessage={(pcId, sender, text) => handleSendChatMessage(pcId, sender, text)}
            onTriggerSocketEvent={handleTriggerSocketEvent}
          />
        )}
      </main>

      {/* Dynamic LAN Real-time Toast Notifications stack */}
      <div id="toast-container" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full p-4 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`p-4 rounded-2xl border flex items-start gap-3 shadow-2xl backdrop-blur-md pointer-events-auto transition-all animate-bounce-short ${
              toast.type === 'success' ? 'bg-[#0f1d16]/95 border-emerald-800 text-emerald-400' :
              toast.type === 'warning' ? 'bg-[#221810]/95 border-amber-900 text-amber-400' :
              'bg-[#101726]/95 border-blue-900 text-blue-400'
            }`}
          >
            <BellRing className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-xs text-white leading-normal uppercase font-mono tracking-wider">{toast.title}</h4>
              <p className="text-[11px] text-slate-300 leading-normal mt-1">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

