/**
 * Preload Script - Electron API Isolation Layer
 * Bridges secure main-process events and renderer frontend components
 */

// Since we are running in a secure, unified web-hosted Express environment,
// we define standard bridge contracts for the Client Lock Shell.
(window as any).NEX_ELECTRON_BRIDGE = {
  platform: process.platform || 'browser',
  sendIPC: (channel: string, data: any) => {
    console.log(`[PRELOAD BRIDGE] sending IPC on: ${channel}`, data);
  },
  onIPC: (channel: string, callback: (...args: any[]) => void) => {
    console.log(`[PRELOAD BRIDGE] registered listener on IPC: ${channel}`);
  }
};
