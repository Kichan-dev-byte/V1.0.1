/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Computer, 
  Player, 
  POSProduct, 
  ChatMessage, 
  SocketEvent, 
  ShopSettings 
} from '../types';
import { 
  Monitor, 
  Lock, 
  KeyRound, 
  Ticket, 
  Send, 
  Clock, 
  Coffee, 
  Gamepad2, 
  LogOut, 
  MessageSquare, 
  AlertCircle,
  HelpCircle,
  Wifi,
  Cpu,
  ChevronDown,
  ShoppingBag,
  CheckCircle2
} from 'lucide-react';

interface ClientStationProps {
  computers: Computer[];
  players: Player[];
  products: POSProduct[];
  chatMessages: ChatMessage[];
  settings: ShopSettings;
  activePcId: string;
  
  onSelectPc: (pcId: string) => void;
  onUpdateComputers: (computers: Computer[]) => void;
  onUpdatePlayers: (players: Player[]) => void;
  onSendChatMessage: (pcId: string, sender: 'admin' | 'client', text: string) => void;
  onTriggerSocketEvent: (pcId: string, type: SocketEvent['type'], message: string) => void;
}

export default function ClientStation({
  computers,
  players,
  products,
  chatMessages,
  settings,
  activePcId,
  onSelectPc,
  onUpdateComputers,
  onUpdatePlayers,
  onSendChatMessage,
  onTriggerSocketEvent,
}: ClientStationProps) {
  
  // Selection of which computer simulation to view
  const activePC = computers.find(c => c.id === activePcId) || computers[0];

  // Auth form inputs
  const [authTab, setAuthTab] = useState<'member' | 'ticket'>('member');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ticketCode, setTicketCode] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active screen tabs (Game, Order, Chat)
  const [activeScreenTab, setActiveScreenTab] = useState<'desktop' | 'order' | 'game' | 'chat'>('desktop');

  // Chat panel
  const [clientChatText, setClientChatText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // POS selection
  const [orderCart, setOrderCart] = useState<Array<{ product: POSProduct; quantity: number }>>([]);
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  // Game state (Cyber Clicker)
  const [gameScore, setGameScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [totalAccumulatedPoints, setTotalAccumulatedPoints] = useState(0);

  // Auto Scroll Chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeScreenTab]);

  // Handle Member Login
  const handleMemberLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const player = players.find(p => p.username.toLowerCase() === username.toLowerCase().trim());
    
    if (!player) {
      setLoginError('Invalid username. Member account not found.');
      return;
    }

    if (player.status === 'Suspended') {
      setLoginError('This member account is suspended. Contact cashier.');
      return;
    }

    if (player.balance <= 0) {
      setLoginError('Insufficient funds. Please reload balance at the cashier desk.');
      return;
    }

    // Unlocks standard postpaid session as default
    const updated = computers.map(pc => {
      if (pc.id === activePC.id) {
        return {
          ...pc,
          status: 'ACTIVE_POSTPAID' as const,
          currentUser: player.username,
          currentUserId: player.id,
          timeTotal: 0,
          timeElapsed: 0,
          timeRemaining: 0,
          costAccumulated: 0
        };
      }
      return pc;
    });

    onUpdateComputers(updated);
    onTriggerSocketEvent(activePC.id, 'unlock', `Player @${player.username} successfully logged in at ${activePC.id} using loyalty balances.`);
    
    // reset
    setUsername('');
    setPassword('');
  };

  // Handle Ticket Login
  const handleTicketLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!ticketCode.trim()) {
      setLoginError('Please enter a valid prepaid ticket code.');
      return;
    }

    // Simulating ticket: Code formats: e.g. "T3" (3 hours prepaid), "T5" (5 hours prepaid), "T10"
    const code = ticketCode.toUpperCase().trim();
    let hours = 1;

    if (code.startsWith('T')) {
      const parsedHours = parseInt(code.slice(1));
      if (!isNaN(parsedHours) && parsedHours > 0) {
        hours = parsedHours;
      }
    } else {
      setLoginError('Invalid coupon sequence. Tickets must follow T[Hours] format (e.g. T3, T5).');
      return;
    }

    const durationSec = hours * 3600;
    const rate = activePC.ratePerHour;
    const cost = hours * rate;

    const updated = computers.map(pc => {
      if (pc.id === activePC.id) {
        return {
          ...pc,
          status: 'ACTIVE_PREPAID' as const,
          currentUser: `Ticket-${code}`,
          currentUserId: null,
          timeTotal: durationSec,
          timeElapsed: 0,
          timeRemaining: durationSec,
          costAccumulated: cost
        };
      }
      return pc;
    });

    onUpdateComputers(updated);
    onTriggerSocketEvent(activePC.id, 'unlock', `Prepaid ticket code '${code}' successfully unlocked ${hours} hours of playtime.`);
    
    setTicketCode('');
  };

  // Guest Quick Unlock
  const handleGuestQuickUnlock = () => {
    const durationSec = 2 * 3600; // 2 hours prepaid default
    const cost = 2 * activePC.ratePerHour;

    const updated = computers.map(pc => {
      if (pc.id === activePC.id) {
        return {
          ...pc,
          status: 'ACTIVE_PREPAID' as const,
          currentUser: 'Guest-Player',
          currentUserId: null,
          timeTotal: durationSec,
          timeElapsed: 0,
          timeRemaining: durationSec,
          costAccumulated: cost
        };
      }
      return pc;
    });

    onUpdateComputers(updated);
    onTriggerSocketEvent(activePC.id, 'unlock', `Quick guest session (2 Hours Prepaid) unlocked at ${activePC.id}.`);
  };

  // Chat send from Client
  const handleClientChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientChatText.trim()) return;
    onSendChatMessage(activePC.id, 'client', clientChatText);
    setClientChatText('');
  };

  // Order placing
  const handleClientOrder = () => {
    if (orderCart.length === 0) return;
    
    const cartTotal = orderCart.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
    const details = orderCart.map(c => `${c.quantity}x ${c.product.name}`).join(', ');

    // Push events to console
    onTriggerSocketEvent(activePC.id, 'order', `NEW CLIENT ORDER placed by ${activePC.currentUser || 'Guest'}. Total: $${cartTotal.toFixed(2)}. Items: ${details}`);
    
    setOrderCart([]);
    setOrderSubmitted(true);
    setTimeout(() => setOrderSubmitted(false), 3000);
  };

  // Clicker game play
  const handleGameClick = () => {
    const gain = multiplier;
    setGameScore(prev => prev + gain);
    setTotalAccumulatedPoints(prev => prev + gain);

    // If player is a registered member, let's award actual member VIP points!
    if (activePC.currentUserId) {
      onUpdatePlayers(players.map(p => {
        if (p.id === activePC.currentUserId) {
          return {
            ...p,
            points: p.points + 1
          };
        }
        return p;
      }));
    }
  };

  const handleBuyMultiplier = () => {
    const cost = multiplier * 25;
    if (gameScore >= cost) {
      setGameScore(prev => prev - cost);
      setMultiplier(prev => prev + 1);
    }
  };

  const handleLogout = () => {
    // If postpaid session, cashier does checkout on locks, but we destroy session locally first
    onTriggerSocketEvent(activePC.id, 'lock', `Player ${activePC.currentUser} manually clicked Log Out. OS lock shell re-engaged.`);
    
    const updated = computers.map(pc => {
      if (pc.id === activePC.id) {
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
      return pc;
    });

    onUpdateComputers(updated);
    setActiveScreenTab('desktop');
  };

  // Timer rendering
  const formatTime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="client-station-root" className="flex-1 flex flex-col bg-[#0c0c0e] overflow-hidden select-none">
      
      {/* Simulation Selector Bar */}
      <div id="client-selector-bar" className="bg-[#18181b] border-b border-zinc-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-cyan-950/40 border border-cyan-800 text-cyan-400 text-xs rounded-lg font-mono uppercase font-bold">
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            Client Shell Mode
          </div>
          <span className="text-xs text-zinc-400 font-medium hidden sm:inline">Simulating network PC terminal output:</span>
        </div>

        {/* Dropdown Selector */}
        <div className="relative">
          <select 
            value={activePcId} 
            onChange={(e) => onSelectPc(e.target.value)}
            className="appearance-none bg-[#09090b] border border-zinc-800 hover:border-zinc-700 text-xs text-white rounded-xl py-1.5 pl-4 pr-10 outline-none font-bold cursor-pointer"
          >
            {computers.map(pc => (
              <option key={pc.id} value={pc.id}>
                {pc.id} - {pc.status.startsWith('ACTIVE') ? `Online (${pc.currentUser})` : 'Locked / Ready'}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      {/* RENDER ACTIVE PC SCREENS BASED ON SYSTEM STATUS */}
      <div className="flex-1 relative flex items-center justify-center p-4 bg-[#0c0c0e]">
        
        {/* CASE 1: COMPUTER IS LOCKED */}
        {activePC.status === 'LOCKED' && (
          <div 
            id="client-lockscreen" 
            className="w-full max-w-4xl bg-[#18181b] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[500px]"
          >
            {/* Left Lock Banner (Cyber Cafe Aesthetic) */}
            <div className="w-full md:w-96 bg-zinc-900 p-8 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-cyan-500 flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-black" />
                  </div>
                  <span className="text-white font-black tracking-widest font-mono text-xs uppercase">{settings.shopName}</span>
                </div>

                <div className="space-y-1 pt-6">
                  <span className="text-cyan-400 font-mono text-[10px] tracking-widest uppercase">STATION LOCKED</span>
                  <h1 className="text-3xl text-white font-extrabold tracking-tight leading-none">{activePC.id}</h1>
                  <p className="text-xs text-zinc-400">{activePC.group} Hardware Configuration</p>
                </div>
              </div>

              {/* Hardware specifications list */}
              <div className="space-y-3 pt-6 md:pt-0">
                <div className="bg-[#09090b] p-3 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                    <Cpu className="w-4 h-4 text-cyan-500 shrink-0" />
                    <span>PC Specifications</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 space-y-0.5 leading-normal">
                    <p>CPU: <strong className="text-zinc-300">{activePC.specifications.cpu}</strong></p>
                    <p>RAM: <strong className="text-zinc-300">{activePC.specifications.ram}</strong></p>
                    <p>GPU: <strong className="text-zinc-300">{activePC.specifications.gpu}</strong></p>
                  </div>
                </div>

                <div className="flex justify-between text-[10px] font-mono text-zinc-650">
                  <span>IP: {activePC.ipAddress}</span>
                  <span>Port: 3000 (LAN)</span>
                </div>
              </div>
            </div>

            {/* Right Lock Forms */}
            <div className="flex-1 p-8 flex flex-col justify-between">
              
              {/* Header Clock */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl text-white font-bold">Welcome, Guest!</h2>
                  <p className="text-xs text-zinc-400">Unlock this station using a member login, ticket, or quick guest pass.</p>
                </div>
                <div className="text-right">
                  <span className="text-xl text-cyan-400 font-mono font-bold">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[10px] text-zinc-500 block font-mono">STATION ONLINE</span>
                </div>
              </div>

              {/* Form container */}
              <div className="my-6 max-w-sm w-full mx-auto space-y-4">
                
                {/* Mode Selector Tabs */}
                <div className="flex bg-[#09090b] p-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => { setAuthTab('member'); setLoginError(''); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      authTab === 'member' ? 'bg-[#18181b] text-cyan-400 border border-zinc-800 shadow-sm' : 'text-zinc-500'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Member Login
                  </button>
                  <button
                    onClick={() => { setAuthTab('ticket'); setLoginError(''); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      authTab === 'ticket' ? 'bg-[#18181b] text-cyan-400 border border-zinc-800 shadow-sm' : 'text-zinc-500'
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    Enter Ticket
                  </button>
                </div>

                {/* Tab Forms */}
                {authTab === 'member' ? (
                  <form onSubmit={handleMemberLogin} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-500 mb-1">USERNAME</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. johndoe"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-[#09090b] border border-zinc-800 focus:border-cyan-500 rounded-xl p-2.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-500 mb-1">SECURE SHELL PASSWORD</label>
                      <input 
                        type="password" 
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#09090b] border border-zinc-800 focus:border-cyan-500 rounded-xl p-2.5 text-xs text-white outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-cyan-500/10"
                    >
                      Authenticate Session
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleTicketLogin} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-500 mb-1">PREPAID COUPON CODE</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. T3"
                        value={ticketCode}
                        onChange={(e) => setTicketCode(e.target.value)}
                        className="w-full bg-[#09090b] border border-zinc-800 focus:border-cyan-500 rounded-xl p-2.5 text-xs text-white font-mono font-bold tracking-widest outline-none uppercase"
                      />
                    </div>
                    
                    <div className="p-3 bg-cyan-950/10 border border-cyan-900/40 rounded-xl text-[10px] text-zinc-400 font-mono flex items-start gap-1.5">
                      <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Use ticket format: T[Hours]. Standard codes are T1 (1hr), T2 (2hrs), T3 (3hrs), or T5 (5hrs).</span>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-cyan-500/10"
                    >
                      Verify Coupon Time
                    </button>
                  </form>
                )}

                {/* Error Banner */}
                {loginError && (
                  <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl text-xs text-red-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}
              </div>

              {/* Quick Guest Entry button */}
              <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 mt-4">
                <span className="text-[10px] text-zinc-500 font-mono">Bypassing account registration?</span>
                <button
                  type="button"
                  onClick={handleGuestQuickUnlock}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-350 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all"
                >
                  Quick Guest Play (2hr)
                </button>
              </div>

            </div>
          </div>
        )}

        {/* CASE 2: COMPUTER IS MAINTENANCE */}
        {activePC.status === 'MAINTENANCE' && (
          <div className="w-full max-w-2xl bg-[#18181b] border border-red-900/40 rounded-3xl p-8 flex flex-col items-center text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent opacity-60" />
            
            <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-800 flex items-center justify-center animate-pulse">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>

            <div className="space-y-2 relative">
              <span className="text-red-400 font-mono text-xs tracking-widest font-bold uppercase">DIAGNOSTIC SYSTEM LOCKOUT</span>
              <h1 className="text-2xl text-white font-black tracking-tight">Station {activePC.id} Undergoing Maintenance</h1>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                This station is temporarily locked out of local network configurations for diagnostic optimization or software patching. Please use an adjacent terminal.
              </p>
            </div>

            <div className="p-3 bg-[#09090b] border border-zinc-800 rounded-xl font-mono text-[10px] text-zinc-500">
              LAN Heartbeat OK • Terminal Shell Daemon Locked
            </div>
          </div>
        )}

        {/* CASE 3: COMPUTER IS OFFLINE */}
        {activePC.status === 'OFFLINE' && (
          <div className="w-full max-w-2xl bg-[#18181b] border border-zinc-800 rounded-3xl p-8 flex flex-col items-center text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Monitor className="w-8 h-8 text-zinc-600" />
            </div>

            <div className="space-y-2">
              <span className="text-zinc-500 font-mono text-xs tracking-widest font-bold uppercase">SHUTDOWN STATE</span>
              <h1 className="text-2xl text-white font-black tracking-tight">Terminal Offline</h1>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                No active TCP heartbeat received from this terminal's client process. To simulate, unlock this station from the cashier admin console.
              </p>
            </div>
          </div>
        )}

        {/* CASE 4: COMPUTER IS ACTIVE (UNLOCKED SESSION) */}
        {activePC.status.startsWith('ACTIVE') && (
          <div 
            id="client-active-desktop" 
            className="w-full max-w-5xl bg-[#0c0c0e] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[550px] relative"
          >
            {/* Desktop Wallpaper representation */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0c0c0e] via-zinc-900 to-[#18181b] z-0" />
            
            {/* Desktop Header */}
            <div className="relative z-10 bg-[#18181b]/60 border-b border-zinc-800/80 px-6 py-3.5 flex justify-between items-center backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-white leading-none font-mono">{activePC.id} Active</h3>
                  <span className="text-[9px] text-zinc-400 font-mono">User: <strong>@{activePC.currentUser}</strong></span>
                </div>
              </div>

              {/* Sub-navigation for Player Screen tabs */}
              <div className="flex bg-[#09090b]/80 p-1 rounded-xl border border-zinc-800">
                {[
                  { tab: 'desktop', label: 'E-Sports Lobby', icon: Gamepad2 },
                  { tab: 'order', label: 'Order Meals', icon: Coffee },
                  { tab: 'game', label: 'Play Arcade Clicker', icon: Gamepad2 },
                  { tab: 'chat', label: 'Chat Admin', icon: MessageSquare }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = activeScreenTab === item.tab;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => setActiveScreenTab(item.tab as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isActive ? 'bg-[#18181b] text-cyan-400 border border-zinc-800 shadow-sm' : 'text-zinc-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* End session LogOut button */}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-900/40 text-red-400 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>

            {/* Main Window Frame */}
            <div className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Floating Timer widget ALWAYS displayed at left side on Client screen */}
              <div className="w-full md:w-60 bg-zinc-900/80 border-r border-zinc-800/60 p-4 flex flex-col justify-between backdrop-blur-md">
                
                <div className="space-y-4">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block border-b border-zinc-800 pb-1.5">
                    NEX Session Widget
                  </span>

                  {/* Remaining or Elapsed ticks */}
                  <div className="space-y-1 bg-[#09090b] p-3 rounded-xl border border-zinc-800 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono block">
                      {activePC.status === 'ACTIVE_PREPAID' ? 'Time Remaining' : 'Time Elapsed'}
                    </span>
                    <span className="text-xl font-mono text-cyan-400 font-extrabold tracking-tight">
                      {activePC.status === 'ACTIVE_PREPAID' ? formatTime(activePC.timeRemaining) : formatTime(activePC.timeElapsed)}
                    </span>
                  </div>

                  {/* Pricing info */}
                  <div className="space-y-2 pt-2 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Group Class:</span>
                      <strong className="text-white">{activePC.group}</strong>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Hourly Rate:</span>
                      <strong className="text-cyan-400 font-mono">${activePC.ratePerHour.toFixed(2)}/hr</strong>
                    </div>
                    {activePC.status === 'ACTIVE_POSTPAID' && (
                      <div className="flex justify-between text-zinc-400 border-t border-zinc-800 pt-2 font-bold">
                        <span className="text-cyan-400">Accrued Cost:</span>
                        <strong className="text-cyan-400 font-mono">${activePC.costAccumulated.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-cyan-950/20 border border-cyan-900/30 rounded-xl text-[10px] text-zinc-400 leading-normal flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Your session is synchronized with the master server console logs. Keep this widget active.</span>
                </div>
              </div>

              {/* Multi-screen Contents */}
              <div className="flex-1 p-6 overflow-y-auto">
                
                {/* SCREEN A: E-SPORTS LOBBY DEFAULT */}
                {activeScreenTab === 'desktop' && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <h2 className="text-xl text-white font-extrabold tracking-tight">Welcome back, {activePC.currentUser}!</h2>
                      <p className="text-xs text-zinc-400">Access gaming channels, e-sports launchers, and custom dining services below.</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[
                        { name: 'Steam Launcher', desc: 'CS:GO & Dota 2', color: 'from-[#0e1724] to-[#12253d]' },
                        { name: 'Riot Gaming Suite', desc: 'Valorant & League', color: 'from-[#1a1215] to-[#3a1b1e]' },
                        { name: 'Epic Games Client', desc: 'Fortnite & Unreal', color: 'from-[#141414] to-[#252525]' },
                        { name: 'Battle.net Arena', desc: 'Overwatch & Diablo', color: 'from-[#0e1e33] to-[#183961]' },
                        { name: 'NEX Game Portal', desc: '100+ LAN Classics', color: 'from-[#0a1b18] to-[#143d34]' },
                        { name: 'Internet Browser', desc: 'Secure Chromium', color: 'from-[#141c2b] to-[#20314f]' }
                      ].map((card, i) => (
                        <div 
                          key={i} 
                          className={`p-4 rounded-xl bg-gradient-to-tr ${card.color} border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group hover:-translate-y-0.5`}
                        >
                          <Gamepad2 className="w-6 h-6 text-white mb-2 group-hover:scale-110 transition-transform" />
                          <h4 className="text-xs font-bold text-white">{card.name}</h4>
                          <span className="text-[10px] text-zinc-400 font-medium block">{card.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SCREEN B: ORDER MEALS */}
                {activeScreenTab === 'order' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-base font-bold text-white">NEX Bistro & Café Dining</h2>
                        <p className="text-xs text-zinc-400">Order snacks and ice-cold beverages straight to your keyboard desk.</p>
                      </div>
                      <Coffee className="w-5 h-5 text-cyan-400" />
                    </div>

                    {orderSubmitted ? (
                      <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 rounded-xl flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6" />
                        <div>
                          <p className="text-xs font-bold text-white">Order Sent to Cashier Console!</p>
                          <p className="text-[10px] text-zinc-400">A waiter will deliver items to {activePC.id} shortly.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Shelf items list (Left side) */}
                        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                          {products
                            .filter(p => p.category !== 'Services')
                            .map(p => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setOrderCart(prev => {
                                    const existing = prev.find(item => item.product.id === p.id);
                                    if (existing) {
                                      return prev.map(item => item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item);
                                    }
                                    return [...prev, { product: p, quantity: 1 }];
                                  });
                                }}
                                disabled={p.stock <= 0}
                                className="p-3 bg-[#18181b]/60 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 rounded-xl text-left flex justify-between items-center transition-all disabled:opacity-30"
                              >
                                <div>
                                  <h4 className="text-xs font-bold text-white">{p.name}</h4>
                                  <span className="text-[10px] font-mono text-cyan-400">${p.price.toFixed(2)}</span>
                                </div>
                                <ShoppingBag className="w-4 h-4 text-zinc-500 hover:text-cyan-400" />
                              </button>
                            ))}
                        </div>

                        {/* Order Cart list */}
                        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-3 flex flex-col justify-between min-h-[180px]">
                          <div>
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-2 border-b border-zinc-800 pb-1">
                              Your Cart Basket
                            </span>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                              {orderCart.length === 0 ? (
                                <p className="text-[10px] text-zinc-500 italic py-4 text-center">Cart is empty</p>
                              ) : (
                                orderCart.map(item => (
                                  <div key={item.product.id} className="flex justify-between items-center text-[11px] font-mono text-zinc-300">
                                    <span>{item.product.name} x{item.quantity}</span>
                                    <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <div className="border-t border-zinc-800 pt-2.5 mt-2.5">
                            <div className="flex justify-between text-xs font-mono mb-2 text-zinc-450">
                              <span>Total Cost:</span>
                              <strong className="text-cyan-400">${orderCart.reduce((a,c)=>a+(c.product.price*c.quantity), 0).toFixed(2)}</strong>
                            </div>
                            <button
                              onClick={handleClientOrder}
                              disabled={orderCart.length === 0}
                              className="w-full py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-bold uppercase rounded-lg disabled:opacity-35 shadow-md shadow-cyan-500/10"
                            >
                              Send Order
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SCREEN C: PLAY ARCADE CLICKER */}
                {activeScreenTab === 'game' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                      <div>
                        <h2 className="text-base font-bold text-white">Cyber Space Miner Arcade</h2>
                        <p className="text-xs text-zinc-400">Click to mine resources and gain free VIP loyalty points!</p>
                      </div>
                      <Gamepad2 className="w-5 h-5 text-cyan-400" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      {/* Big Clicker Button */}
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <button
                          onClick={handleGameClick}
                          className="w-36 h-36 rounded-full bg-gradient-to-tr from-cyan-600 to-emerald-400 border-4 border-cyan-950 active:scale-95 shadow-lg shadow-cyan-500/20 transition-transform flex items-center justify-center flex-col relative group cursor-pointer"
                        >
                          <div className="absolute inset-0 rounded-full bg-cyan-400/10 opacity-0 group-hover:opacity-100 animate-ping" />
                          <Gamepad2 className="w-10 h-10 text-black mb-1" />
                          <span className="text-black font-black text-xs uppercase tracking-wider">MINE SPACE</span>
                        </button>
                        <span className="text-[10px] text-zinc-500 font-mono">Each click gains +{multiplier} mineral resource</span>
                      </div>

                      {/* Game Dashboard details */}
                      <div className="space-y-3 bg-[#18181b] p-4 rounded-2xl border border-zinc-800 shadow-md">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-400">Minerals Harvested:</span>
                          <span className="text-cyan-400 font-bold">{gameScore} minerals</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-zinc-400">Mine Rate Multiplier:</span>
                          <span className="text-white font-bold">x{multiplier}</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono border-t border-zinc-800 pt-2">
                          <span className="text-zinc-400">Accrued VIP Points:</span>
                          <span className="text-emerald-400 font-bold">+{totalAccumulatedPoints} points</span>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={handleBuyMultiplier}
                            disabled={gameScore < multiplier * 25}
                            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl disabled:opacity-40"
                          >
                            Buy Mining Laser Upgrade (Cost: {multiplier * 25} minerals)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCREEN D: CHAT WITH ADMIN */}
                {activeScreenTab === 'chat' && (
                  <div className="flex flex-col h-72 bg-[#09090b] rounded-2xl border border-zinc-800 overflow-hidden">
                    {/* Log listing */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                      {chatMessages.filter(m => m.pcId === activePC.id).length === 0 ? (
                        <div className="text-zinc-650 italic text-[11px] py-12 text-center">
                          Initiate a conversation with the Cashier Desk using the form below.
                        </div>
                      ) : (
                        chatMessages
                          .filter(m => m.pcId === activePC.id)
                          .map(msg => (
                            <div 
                              key={msg.id} 
                              className={`flex flex-col max-w-[80%] ${
                                msg.sender === 'client' ? 'ml-auto items-end' : 'mr-auto items-start'
                              }`}
                            >
                              <span className="text-[9px] text-zinc-500 font-mono mb-0.5">
                                {msg.sender === 'client' ? 'Your Seat' : 'Cashier Counter'}
                              </span>
                              <div className={`p-2 rounded-xl text-slate-200 ${
                                msg.sender === 'client' 
                                  ? 'bg-cyan-950/80 rounded-tr-none border border-cyan-800/60 text-cyan-250' 
                                  : 'bg-[#18181b] rounded-tl-none border border-zinc-800/80'
                              }`}>
                                {msg.text}
                              </div>
                            </div>
                          ))
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Chat input */}
                    <form onSubmit={handleClientChatSend} className="p-3 border-t border-zinc-800 flex gap-2 bg-[#18181b]">
                      <input 
                        type="text" 
                        placeholder="Type message to cashier..." 
                        value={clientChatText}
                        onChange={(e) => setClientChatText(e.target.value)}
                        className="flex-1 bg-[#09090b] border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none focus:border-cyan-500"
                      />
                      <button 
                        type="submit"
                        disabled={!clientChatText.trim()}
                        className="p-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg disabled:opacity-40 transition-all"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
