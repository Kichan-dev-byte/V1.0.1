/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, User, Eye, EyeOff } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (admin: any, session: any) => void;
  onTriggerSocketEvent: (pcId: string, type: string, message: string) => void;
}

export default function AdminLogin({ onLoginSuccess, onTriggerSocketEvent }: AdminLoginProps) {
  const [username, setUsername] = useState(() => localStorage.getItem('remember_admin_username') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('remember_admin_checked') === 'true');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });

      const data = await response.json();
      setLoading(false);

      if (!data.success) {
        setLoginError(data.error || 'Invalid administrator credentials.');
        return;
      }

      // Handle remember username
      if (rememberMe) {
        localStorage.setItem('remember_admin_username', username.trim());
        localStorage.setItem('remember_admin_checked', 'true');
      } else {
        localStorage.removeItem('remember_admin_username');
        localStorage.setItem('remember_admin_checked', 'false');
      }

      // Emit admin:login socket event
      onTriggerSocketEvent('SERVER', 'admin:login', `Admin @${data.user.username} successfully authenticated from LAN console.`);

      // Notify success
      onLoginSuccess(data.user, data.session);
    } catch (err: any) {
      setLoading(false);
      setLoginError('Failed to establish server handshake. Check network status.');
    }
  };

  return (
    <div id="admin-login-screen" className="flex-1 flex items-center justify-center bg-[#0c0c0e] p-6 select-none relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center space-y-3 mb-8">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center">
            <Lock className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl text-white font-black tracking-tight">Security Terminal</h2>
            <p className="text-xs text-zinc-400">Authenticate session to access the cashier dashboard</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">Operator ID</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                required
                disabled={loading}
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#09090b] border border-zinc-800 focus:border-cyan-500 disabled:opacity-50 rounded-xl p-2.5 pl-11 text-xs text-white outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">Terminal Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                disabled={loading}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#09090b] border border-zinc-800 focus:border-cyan-500 disabled:opacity-50 rounded-xl p-2.5 pl-11 pr-11 text-xs text-white outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input 
              type="checkbox" 
              id="admin-remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-zinc-800 bg-[#09090b] text-cyan-500 focus:ring-0 accent-cyan-500 cursor-pointer"
            />
            <label htmlFor="admin-remember-me" className="text-[11px] text-zinc-400 font-medium cursor-pointer select-none">Remember Operator ID</label>
          </div>

          {loginError && (
            <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl text-xs text-red-400 flex items-start gap-2 animate-pulse">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-900 disabled:text-zinc-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-cyan-500/10 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? 'Decrypting Session...' : 'Authenticate operator'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-zinc-850 flex items-center justify-between text-[10px] font-mono text-zinc-600">
          <span>CONSOLE: READY</span>
          <span>DEFAULT PASSWORD: admin123</span>
        </div>
      </div>
    </div>
  );
}
