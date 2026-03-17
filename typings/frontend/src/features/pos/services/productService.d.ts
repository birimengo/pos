
declare interface productType {
	saveProductImageLocally(productId: any, imageFile: any): Promise<any>;

	getProductLocally(productId: any): Promise<any>;

	getAllProductsLocally(): Promise<any>;

	updateProductLocally(productId: any, updates: any, newImageFile: any): Promise<any>;

	deleteProduct(productId: any, deleteFromCloud: boolean): Promise<any>;

	addToDeleteQueue(productId: any, cloudId: any): Promise<any>;

	addToSyncQueue(productId: any): Promise<any>;

	getSyncQueue(): Promise<any>;

	syncProductToCloud(productId: any): Promise<any>;

	syncDeleteFromCloud(queueItem: any): Promise<any>;

	syncAllPending(): Promise<any>;

	cleanupCorruptedImages(): Promise<any>;

	getSyncStatus(): Promise<any>;

	clearAllData(): Promise<any>;
}
