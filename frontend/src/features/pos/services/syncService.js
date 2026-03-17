// src/features/pos/services/syncService.js
import { offlineDB } from './indexedDB';
import { api } from './api';

class SyncService {
  constructor() {
    this.syncInProgress = false;
    this.listeners = [];
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  notifyListeners(status) {
    this.listeners.forEach(cb => cb(status));
  }

  async sync() {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    this.syncInProgress = true;
    this.notifyListeners({ type: 'sync-start', message: 'Syncing...' });

    try {
      // Get unsynced transactions
      const transactions = await offlineDB.getUnsyncedTransactions();
      
      if (transactions.length === 0) {
        this.notifyListeners({ type: 'sync-complete', message: 'All data synced' });
        this.syncInProgress = false;
        return;
      }

      // Sync each transaction
      for (const transaction of transactions) {
        try {
          // Send to server
          const response = await api.syncTransaction(transaction);
          
          if (response.success) {
            // Mark as synced
            await offlineDB.markTransactionSynced(transaction.id);
          }
        } catch (error) {
          console.error('Failed to sync transaction:', error);
          // Add to retry queue
          await offlineDB.addToSyncQueue({
            type: 'transaction',
            data: transaction,
            error: error.message
          });
        }
      }

      this.notifyListeners({ 
        type: 'sync-complete', 
        message: `Synced ${transactions.length} transactions` 
      });
    } catch (error) {
      console.error('Sync failed:', error);
      this.notifyListeners({ type: 'sync-error', message: error.message });
    } finally {
      this.syncInProgress = false;
    }
  }

  async saveOfflineTransaction(transaction) {
    await offlineDB.saveTransaction(transaction);
    this.notifyListeners({ 
      type: 'offline-save', 
      message: 'Transaction saved offline' 
    });
  }
}

export const syncService = new SyncService();