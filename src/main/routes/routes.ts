import { Router } from 'express';
import { 
  ComputerController, 
  BillingController, 
  PlayerController, 
  ChatController, 
  SettingsController,
  TimerController,
  AdminController
} from '../controllers/controllers';

const router = Router();

const pcCtrl = new ComputerController();
const billingCtrl = new BillingController();
const playerCtrl = new PlayerController();
const chatCtrl = new ChatController();
const settingsCtrl = new SettingsController();
const timerCtrl = new TimerController();
const adminCtrl = new AdminController();

// ==========================================
// 1. Computer Routes
// ==========================================
router.get('/computers', pcCtrl.getAll.bind(pcCtrl));
router.get('/computers/:id', pcCtrl.getById.bind(pcCtrl));
router.post('/computers/:id/unlock', pcCtrl.unlock.bind(pcCtrl));
router.post('/computers/:id/lock', pcCtrl.lock.bind(pcCtrl));
router.post('/computers/:id/maintenance', pcCtrl.setMaintenance.bind(pcCtrl));

// ==========================================
// 2. Player Routes
// ==========================================
router.get('/players', playerCtrl.getAll.bind(playerCtrl));
router.post('/players', playerCtrl.create.bind(playerCtrl));
router.post('/players/topup', playerCtrl.topup.bind(playerCtrl)); // Uses the new PlayerController.topup

// ==========================================
// 3. Timer Routes (New SQLite Timers Support)
// ==========================================
router.get('/timers', timerCtrl.getAll.bind(timerCtrl));
router.get('/timers/:id', timerCtrl.getById.bind(timerCtrl));
router.post('/timers', timerCtrl.create.bind(timerCtrl));
router.post('/timers/:id/start', timerCtrl.start.bind(timerCtrl));
router.post('/timers/:id/pause', timerCtrl.pause.bind(timerCtrl));
router.post('/timers/:id/resume', timerCtrl.resume.bind(timerCtrl));
router.delete('/timers/:id', timerCtrl.delete.bind(timerCtrl));

// ==========================================
// 4. Admin Routes
// ==========================================
router.get('/admin/stats', adminCtrl.getStats.bind(adminCtrl));
router.get('/admin/transactions', adminCtrl.getTransactions.bind(adminCtrl));
router.get('/admin/products', adminCtrl.getProducts.bind(adminCtrl));
router.post('/admin/products', adminCtrl.createProduct.bind(adminCtrl));
router.get('/admin/orders', adminCtrl.getOrders.bind(adminCtrl));
router.post('/admin/orders', adminCtrl.placeOrder.bind(adminCtrl));
router.post('/admin/orders/:id/settle', adminCtrl.settleOrder.bind(adminCtrl));
router.get('/admin/settings', adminCtrl.getSettings.bind(adminCtrl));
router.post('/admin/settings', adminCtrl.updateSettings.bind(adminCtrl));
router.post('/admin/settings/reset', adminCtrl.resetDatabase.bind(adminCtrl));
router.get('/admin/settings/events', adminCtrl.getSocketEvents.bind(adminCtrl));
router.get('/admin/chats', adminCtrl.getChats.bind(adminCtrl));
router.post('/admin/chats', adminCtrl.sendChat.bind(adminCtrl));

// ==========================================
// Backward Compatible Legacy Routes
// ==========================================
router.get('/products', billingCtrl.getProducts.bind(billingCtrl));
router.post('/products', billingCtrl.createProduct.bind(billingCtrl));
router.get('/orders', billingCtrl.getOrders.bind(billingCtrl));
router.post('/orders', billingCtrl.placeOrder.bind(billingCtrl));
router.post('/orders/:id/settle', billingCtrl.settleOrder.bind(billingCtrl));
router.get('/transactions', billingCtrl.getTransactions.bind(billingCtrl));

router.get('/chats', chatCtrl.getHistory.bind(chatCtrl));
router.post('/chats', chatCtrl.send.bind(chatCtrl));

router.get('/settings', settingsCtrl.get.bind(settingsCtrl));
router.post('/settings', settingsCtrl.update.bind(settingsCtrl));
router.post('/settings/reset', settingsCtrl.reset.bind(settingsCtrl));
router.get('/settings/events', settingsCtrl.getSocketEvents.bind(settingsCtrl));

export default router;
