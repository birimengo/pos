
declare interface productType {
	saveProductImageLocally(productId: any, imageFile: any): Promise<any>;

	getProductLocally(productId: any): Promise<any>;

	getAllProductsLocally(): Promise<any[]>;

	updateProductLocally(productId: any, updates: any, newImageFile: any): Promise<{	}>;

	updateProductStock(productId: any, quantityChange: any): Promise<{	}>;

	restoreProductStock(transactionItems: any): Promise<{	}>;

	recordLocalStockHistory(historyData: any): Promise<{	}>;

	deleteProduct(productId: any, deleteFromCloud: boolean): Promise<{	}>;

	addToDeleteQueue(productId: any, cloudId: any): Promise<void>;

	addToSyncQueue(productId: any): Promise<void>;

	getSyncQueue(): Promise<any>;

	syncProductToCloud(productId: any): Promise<null | {	}>;

	syncDeleteFromCloud(queueItem: any): Promise<{	}>;

	syncAllPending(): Promise<{	} | null>;

	cleanupCorruptedImages(): Promise<{	}>;

	getSyncStatus(): Promise<null>;

	clearAllData(): Promise<{	}>;
}
