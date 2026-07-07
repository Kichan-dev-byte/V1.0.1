/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Monitor, 
  Server, 
  Database, 
  Network, 
  ShieldCheck, 
  FolderDown, 
  Cpu, 
  CheckCircle2, 
  Lock, 
  Play, 
  AlertTriangle,
  FileCode,
  Terminal,
  Settings
} from 'lucide-react';

interface InstallerWizardProps {
  onComplete: () => void;
}

export default function InstallerWizard({ onComplete }: InstallerWizardProps) {
  const [step, setStep] = useState(1);
  const [installMode, setInstallMode] = useState<'server' | 'client'>('server');
  const [dbType, setDbType] = useState<'postgresql' | 'sqlite'>('postgresql');
  const [dbHost, setDbHost] = useState('localhost');
  const [dbName, setDbName] = useState('nex_db');
  const [dbUser, setDbUser] = useState('postgres');
  const [dbPort, setDbPort] = useState('5432');
  const [lanPort, setLanPort] = useState('3000');
  const [testingDb, setTestingDb] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'failed'>('idle');
  const [compiling, setCompiling] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);
  const [firewallAdded, setFirewallAdded] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    "Initializing NEX Installer Engine v4.2.1...",
    "Verifying OS architecture: Linux x64 detected.",
    "Checking dependencies: node-gyp, sqlite3, pg-native...",
  ]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleTestDatabase = () => {
    setTestingDb(true);
    setTestResult('idle');
    addLog(`Attempting connection to ${dbType}://${dbUser}@${dbHost}:${dbPort}/${dbName}...`);
    
    setTimeout(() => {
      setTestingDb(false);
      setTestResult('success');
      addLog(`Database handshake successful! SQLite/Postgres pooled driver initialized.`);
      addLog(`Created schemas: computers, users, tickets, transactions, pos_products.`);
    }, 1500);
  };

  const startCompilation = () => {
    setCompiling(true);
    addLog("Packaging binaries with electron-builder...");
    addLog("Injecting Node.js secure runtime client parameters...");
    addLog("Generating certificate credentials for local LAN SSL...");

    const interval = setInterval(() => {
      setCompileProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setCompiling(false);
          addLog("Build completed: NEX-Computer-Shop-Suite.msi (145.2 MB)");
          addLog("Build completed: NEX-Client-Shell.exe (82.1 MB)");
          addLog("Ready to deploy across local network computers.");
          return 100;
        }
        const next = prev + 10;
        if (next === 30) addLog("Embedding Socket.IO server modules...");
        if (next === 60) addLog("Minifying React build assets & Express backend code...");
        if (next === 90) addLog("Optimizing SQLite index strategies & securing network tunnels...");
        return next;
      });
    }, 300);
  };

  return (
    <div id="installer-wizard-container" className="min-h-screen bg-[#0c0c0e] text-zinc-350 flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-black">
      <div id="installer-card" className="w-full max-w-4xl bg-[#18181b] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden min-h-[550px]">
        
        {/* Left Side: Step Tracker */}
        <div id="installer-sidebar" className="w-full md:w-64 bg-zinc-900 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Cpu className="w-5 h-5 text-black" />
              </div>
              <div>
                <h2 className="text-white font-bold tracking-wider text-sm">NEX COMPUTER</h2>
                <span className="text-cyan-400 font-mono text-[10px] tracking-widest">SETUP WIZARD</span>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { step: 1, label: "Welcome & EULA", icon: Monitor },
                { step: 2, label: "Deployment Mode", icon: Server },
                { step: 3, label: "Database Config", icon: Database },
                { step: 4, label: "LAN Networking", icon: Network },
                { step: 5, label: "Security & Rules", icon: ShieldCheck },
                { step: 6, label: "Build Installer", icon: FolderDown }
              ].map((item) => {
                const Icon = item.icon;
                const isCompleted = step > item.step;
                const isActive = step === item.step;
                return (
                  <div 
                    key={item.step} 
                    className={`flex items-center gap-3 transition-colors ${
                      isActive ? 'text-cyan-400' : isCompleted ? 'text-zinc-500' : 'text-zinc-600'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center border text-xs font-mono font-bold ${
                      isActive 
                        ? 'bg-cyan-950/50 border-cyan-500 text-cyan-400' 
                        : isCompleted 
                        ? 'bg-emerald-950/30 border-emerald-800 text-emerald-400' 
                        : 'border-zinc-800 text-zinc-650'
                    }`}>
                      {isCompleted ? "✓" : item.step}
                    </div>
                    <span className="text-xs font-medium tracking-wide">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[10px] text-zinc-600 font-mono mt-6 md:mt-0">
            Version 4.2.1 Stable<br />
            © {new Date().getFullYear()} NEX Systems International
          </div>
        </div>

        {/* Right Side: Main Content */}
        <div id="installer-main-content" className="flex-1 p-6 md:p-8 flex flex-col justify-between">
          
          {/* Step Contents */}
          <div className="flex-1">
            {step === 1 && (
              <div id="installer-step-1" className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-wider text-cyan-400 uppercase">Phase 1 & 2 • Infrastructure</span>
                  <h1 className="text-2xl text-white font-bold tracking-tight">Setup NEX Computer Shop Management Suite</h1>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Welcome to the installation wizard for the NEX Computer Shop Suite. This system powers hundreds of internet cafes, LAN gaming centers, and e-sports arenas globally with a high-performance timer engine, POS sales, and secure client locking.
                </p>

                <div className="bg-[#09090b] rounded-xl border border-zinc-800 p-4 h-48 overflow-y-auto text-[11px] font-mono leading-relaxed text-zinc-400 space-y-2">
                  <p className="text-white font-bold text-xs">END USER LICENSE AGREEMENT (EULA)</p>
                  <p>1. LICENSE GRANT: NEX Systems grants you a non-exclusive license to operate this server software and distribute client shell locking components on your local subnet.</p>
                  <p>2. NO REVERSE ENGINEERING: You shall not decompile or reverse engineer the local binary timer execution cores.</p>
                  <p>3. REAL-TIME CONNECTIONS: The system utilizes Socket.IO TCP connections on dedicated ports. Client monitors must remain unblocked by anti-virus to perform system locking operations.</p>
                  <p>4. MEMORY ISOLATION: The software creates isolated worker processes to safeguard billing logs against memory injection tools.</p>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-zinc-405 bg-cyan-950/20 border border-cyan-900/40 p-3 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>By clicking Next, you accept this license agreement and confirm you are installing on a system running standard network configurations.</span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div id="installer-step-2" className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-wider text-cyan-400 uppercase">Phase 1 • Client-Server Topology</span>
                  <h1 className="text-2xl text-white font-bold tracking-tight">Choose Installation Mode</h1>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Decide whether this computer will act as the master control server or as a locked user client terminal.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <button 
                    onClick={() => { setInstallMode('server'); addLog("Switched mode: Server master application selected."); }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      installMode === 'server' 
                        ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/5' 
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${installMode === 'server' ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Server className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-white text-sm">Server Master Console</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Install on the cashier/owner computer. Controls all stations, tracks active sessions, handles deposits, processes POS sales, and issues tickets.
                    </p>
                  </button>

                  <button 
                    onClick={() => { setInstallMode('client'); addLog("Switched mode: Client Lock Shell selected."); }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      installMode === 'client' 
                        ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/5' 
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${installMode === 'client' ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Monitor className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-white text-sm">Client Lock Shell</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Install on player computers. Locks the operating system into a high-security shell, displays the lock screen, prompts for login, and tracks active session time.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div id="installer-step-3" className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-wider text-cyan-400 uppercase">Phase 2 • SQL Database Provisioning</span>
                  <h1 className="text-2xl text-white font-bold tracking-tight">Database Connectivity & Isolation</h1>
                </div>
                <p className="text-xs text-zinc-400">
                  NEX relies on durable persistence to safeguard player cash balances, active tickets, and tax compliance histories.
                </p>

                <div className="bg-[#09090b] p-4 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                    <label className="text-xs font-mono font-bold text-zinc-400 mr-4">RDBMS Engine</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs cursor-pointer text-white font-medium">
                        <input 
                          type="radio" 
                          checked={dbType === 'postgresql'} 
                          onChange={() => setDbType('postgresql')}
                          className="accent-cyan-500" 
                        />
                        PostgreSQL (Cloud / LAN Server)
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer text-zinc-400">
                        <input 
                          type="radio" 
                          checked={dbType === 'sqlite'} 
                          onChange={() => setDbType('sqlite')}
                          className="accent-cyan-500" 
                        />
                        SQLite (Local Embedded Mode)
                      </label>
                    </div>
                  </div>

                  {dbType === 'postgresql' ? (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 mb-1">HOST ADDRESS</label>
                        <input 
                          type="text" 
                          value={dbHost} 
                          onChange={(e) => setDbHost(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 mb-1">DATABASE NAME</label>
                        <input 
                          type="text" 
                          value={dbName} 
                          onChange={(e) => setDbName(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 mb-1">USERNAME</label>
                        <input 
                          type="text" 
                          value={dbUser} 
                          onChange={(e) => setDbUser(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500 mb-1">PASSWORD</label>
                        <input 
                          type="password" 
                          value="••••••••••••••" 
                          disabled
                          className="w-full bg-[#09090b] border border-zinc-850 rounded-lg p-2 text-xs text-zinc-500 cursor-not-allowed outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/50">
                      <p className="text-xs text-zinc-400">
                        SQLite stores all data in a local encrypted database file: <code className="text-cyan-400">/db/nex_cafe_local.db</code>. Recommended only for shops with less than 10 stations.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button 
                      type="button"
                      onClick={handleTestDatabase}
                      disabled={testingDb}
                      className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-750 font-medium text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      {testingDb ? "Testing Connection..." : "Test DB Connection"}
                    </button>

                    {testResult === 'success' && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Connection verified! Schemas up to date.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div id="installer-step-4" className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-wider text-cyan-400 uppercase">Phase 3 • Socket.IO LAN Handshake</span>
                  <h1 className="text-2xl text-white font-bold tracking-tight">LAN WebSocket Port Setup</h1>
                </div>
                <p className="text-xs text-zinc-400">
                  Configure the master port for TCP Socket.IO handshakes. Client PCs will connect to the Server IP address on this port to feed real-time usage metrics and receive shutdown commands.
                </p>

                <div className="bg-[#09090b] p-4 rounded-xl border border-zinc-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-zinc-400 mb-1">Socket Port</label>
                      <input 
                        type="text" 
                        value={lanPort} 
                        onChange={(e) => setLanPort(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-zinc-400 mb-1">Heartbeat Interval</label>
                      <select className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 outline-none font-mono">
                        <option>3000 ms (Recommended)</option>
                        <option>5000 ms</option>
                        <option>10000 ms</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-[#09090b] rounded-lg border border-zinc-850 space-y-1 text-[11px] text-zinc-450">
                    <p className="font-bold text-white mb-1 flex items-center gap-1">
                      <Network className="w-3.5 h-3.5 text-cyan-400" />
                      Client Connection String:
                    </p>
                    <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-cyan-400 block font-mono text-[10px] select-all">
                      ws://192.168.1.100:{lanPort}/socket.io
                    </code>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div id="installer-step-5" className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-wider text-cyan-400 uppercase">Phase 4 & 10 • Shell Hardening</span>
                  <h1 className="text-2xl text-white font-bold tracking-tight">Security & OS Hardening Rules</h1>
                </div>
                <p className="text-xs text-zinc-400">
                  NEX Client includes a deep system driver hooks library that overrides standard system interrupt sequences (such as Ctrl+Alt+Del, Alt+Tab, Windows Key) to prevent players from bypassing the lock screen.
                </p>

                <div className="space-y-2 mt-2">
                  <div className="bg-[#18181b] p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Disable Windows Task Manager & Explorer</h4>
                      <p className="text-[10px] text-zinc-400">Prevents users from force-killing the client lock process.</p>
                    </div>
                    <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded text-[10px] font-mono uppercase font-bold">Enabled</span>
                  </div>

                  <div className="bg-[#18181b] p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">USB Flash Auto-Scan & Lockdown</h4>
                      <p className="text-[10px] text-zinc-400">Disables USB auto-run and screens for unauthorized malware or cheats.</p>
                    </div>
                    <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded text-[10px] font-mono uppercase font-bold">Enabled</span>
                  </div>

                  <div className="bg-[#18181b] p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Generate OS Firewall Exception Rules</h4>
                      <p className="text-[10px] text-zinc-400">Injects TCP/UDP permissions into local operating system security rules.</p>
                    </div>
                    <button 
                      onClick={() => { setFirewallAdded(true); addLog("Firewall rule commands injected successfully!"); }}
                      disabled={firewallAdded}
                      className={`px-3 py-1 rounded text-[10px] font-bold transition-all uppercase cursor-pointer ${
                        firewallAdded 
                          ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' 
                          : 'bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white'
                      }`}
                    >
                      {firewallAdded ? "Configured ✓" : "Apply Rules"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 6 && (
              <div id="installer-step-6" className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-wider text-cyan-400 uppercase">Phase 12 • Build & Compile</span>
                  <h1 className="text-2xl text-white font-bold tracking-tight">Generate Shop Installer Packages</h1>
                </div>
                <p className="text-xs text-zinc-400">
                  Ready to compile your custom configuration parameters into offline installer files.
                </p>

                <div className="bg-[#09090b] p-4 rounded-xl border border-zinc-800 space-y-4">
                  {compiling ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-cyan-400">Compiling Electron distribution assets...</span>
                        <span className="text-white font-bold">{compileProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${compileProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : compileProgress === 100 ? (
                    <div className="flex items-center gap-4 bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-lg">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-white">NEX Installer Package successfully generated!</h4>
                        <p className="text-[10px] text-zinc-400">
                          Deploy <code className="text-emerald-400">NEX-Client-Shell.exe</code> on client PCs and connect to this master console.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 space-y-3">
                      <FileCode className="w-12 h-12 text-zinc-500 animate-pulse" />
                      <button 
                        onClick={startCompilation}
                        className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-emerald-400 hover:opacity-90 text-black font-bold text-xs tracking-wider uppercase rounded-xl shadow-lg shadow-cyan-500/10 transition-opacity cursor-pointer"
                      >
                        Generate & Download MSI Packages
                      </button>
                      <span className="text-[10px] text-zinc-500">Includes secure Node.JS bindings & Win/Linux installer bundles</span>
                    </div>
                  )}

                  {/* Terminal Log */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1 uppercase">
                      <Terminal className="w-3 h-3 text-cyan-400" />
                      Install Progress Console
                    </span>
                    <div className="bg-[#09090b] p-3 rounded-lg border border-zinc-800 h-28 overflow-y-auto font-mono text-[9px] text-zinc-400 space-y-1 scrollbar-thin">
                      {logs.map((log, i) => (
                        <div key={i} className="leading-relaxed">
                          <span className="text-cyan-500/80">❯</span> {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div id="installer-actions" className="flex items-center justify-between border-t border-zinc-800 pt-6 mt-6">
            <button 
              type="button"
              onClick={() => step > 1 && setStep(step - 1)}
              disabled={step === 1}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                step === 1 
                  ? 'text-zinc-600 cursor-not-allowed' 
                  : 'text-zinc-350 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              Previous
            </button>

            <div className="flex gap-2">
              <button 
                type="button"
                onClick={onComplete}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Skip to Dashboard
              </button>

              {step < 6 ? (
                <button 
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-emerald-400 hover:opacity-95 text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-opacity cursor-pointer"
                >
                  Next Step
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={onComplete}
                  disabled={compileProgress < 100}
                  className={`px-5 py-2 font-bold text-xs uppercase tracking-wider rounded-xl transition-all ${
                    compileProgress === 100 
                      ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/10 cursor-pointer' 
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  Finish & Launch Console
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
