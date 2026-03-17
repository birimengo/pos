// src/features/pos/services/offlineSyncManager.js
import { offlineDB } from './indexedDB';
import { opfs } from './opfsService'; // Changed from opfsService to opfs
import { api } from './api';

class OfflineSyncManager {
  constructor() {
    this.syncInProgress = false;
    this.listeners = [];
  }

  async init() {
    await opfs.init();
    console.log('✅ Offline Sync Manager initialized');
  }

  async saveTransactionWithReceipt(transaction, receiptImage) {
    await offlineDB.saveTransaction(transaction);
    
    if (receiptImage) {
      const fileName = `receipts/${transaction.receiptNumber}.jpg`;
      await opfs.saveFile(fileName, receiptImage, 'receipts');
    }
    
    return { success: true };
  }

  async getReceiptImage(receiptNumber) {
    const fileName = `receipts/${receiptNumber}.jpg`;
    return opfs.readFile(fileName, 'receipts');
  }

  async backupDatabase() {
    const products = await offlineDB.getProducts();
    const customers = await offlineDB.getCustomers();
    const transactions = await offlineDB.getUnsyncedTransactions();
    
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      products,
      customers,
      transactions
    };
    
    const fileName = `backups/pos-backup-${Date.now()}.json`;
    await opfs.saveJSON(fileName, backupData, 'backups');
    
    return backupData;
  }

  async restoreFromBackup(fileName) {
    const backup = await opfs.readJSON(fileName, 'backups');
    
    if (backup) {
      if (backup.products) {
        await offlineDB.saveProducts(backup.products);
      }
      
      if (backup.customers) {
        await offlineDB.saveCustomers(backup.customers);
      }
      
      return true;
    }
    
    return false;
  }

  async getStorageInfo() {
    return opfs.getStorageInfo();
  }

  async cleanupOldReceipts(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const receipts = await opfs.listFiles('receipts');
    
    for (const receipt of receipts) {
      if (receipt.lastModified < cutoffDate.getTime()) {
        await opfs.deleteFile(receipt.name, 'receipts');
      }
    }
  }
}

export const offlineSyncManager = new OfflineSyncManager();