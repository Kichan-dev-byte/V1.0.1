import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

class IPCMain extends EventEmitter {
  /**
   * Send a message on a channel with optional arguments
   */
  public send(channel: string, ...args: any[]): void {
    logger.debug(`[IPC] Broadcasting message on channel: ${channel}`);
    this.emit(channel, ...args);
  }

  /**
   * Listen to an IPC message on a channel
   */
  public handle(channel: string, listener: (...args: any[]) => void): void {
    logger.debug(`[IPC] Subscribed listener on channel: ${channel}`);
    this.on(channel, listener);
  }
}

export const ipcMain = new IPCMain();
export default ipcMain;
