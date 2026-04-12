// src/features/pos/services/storeService.js
import { db } from './database';
import { api } from './api';

class StoreService {
  constructor() {
    this.syncInProgress = false;
  }

  async syncStoreToCloud(storeId) {
    try {
      await db.ensureInitialized();
      
      const store = await db.getStore(String(storeId));
      if (!store) {
        throw new Error(`Store ${storeId} not found locally`);
      }

      // If store already has a cloud ID, just return it
      if (store._id || store.cloudId) {
        return { 
          success: true, 
          store,
          message: 'Store already synced',
          mongoId: store._id || store.cloudId
        };
      }

      console.log(`☁️ Syncing store ${store.name} to cloud...`);

      const storeData = {
        name: store.name,
        address: store.address,
        city: store.city,
        state: store.state,
        zip: store.zip,
        phone: store.phone,
        email: store.email,
        manager: store.manager,
        openTime: store.openTime,
        closeTime: store.closeTime,
        taxRate: store.taxRate,
        open: store.open,
        description: store.description,
        isDefault: store.isDefault || false
      };

      let result;
      if (store._id) {
        result = await api.updateStore(store._id, storeData);
      } else {
        result = await api.createStore(storeData);
      }

      if (result.success) {
        const updatedStore = {
          ...store,
          _id: result.store._id,
          cloudId: result.store._id,
          synced: true,
          syncRequired: false,
          lastSyncedAt: new Date().toISOString()
        };
        
        await db.saveStore(updatedStore);
        
        console.log(`✅ Store ${store.name} synced to cloud with ID: ${result.store._id}`);
        
        return { 
          success: true, 
          store: updatedStore,
          mongoId: result.store._id
        };
      } else {
        throw new Error(result.error || 'Failed to sync store to cloud');
      }
    } catch (error) {
      console.error('❌ Failed to sync store to cloud:', error);
      return { success: false, error: error.message };
    }
  }

  async syncAllStores() {
    try {
      await db.ensureInitialized();
      const stores = await db.getAllStores();
      const results = [];
      
      for (const store of stores) {
        if (!store._id && !store.cloudId) {
          const result = await this.syncStoreToCloud(store.id);
          results.push(result);
        } else {
          results.push({ success: true, store, message: 'Already synced' });
        }
      }
      
      return { success: true, results };
    } catch (error) {
      console.error('❌ Failed to sync all stores:', error);
      return { success: false, error: error.message };
    }
  }

  async getStoreMongoId(storeId) {
    const store = await db.getStore(String(storeId));
    if (!store) return null;
    return store._id || store.cloudId || null;
  }
}

export const storeService = new StoreService();