/**
 * Unified Backend Types - re-exporting core typings from renderer/types
 */

export * from '../../renderer/types';

export interface DBStore {
  settings: any;
  computers: any[];
  players: any[];
  products: any[];
  transactions: any[];
  orders: any[];
  socketEvents: any[];
  chatMessages: any[];
}
