
declare interface itemType {
	put(storeName: any, data: any): Promise<any>;

	_saveCustomer(db: any, data: any): Promise<any>;

	_saveTransaction(db: any, data: any): Promise<any>;

	_saveProduct(db: any, data: any): Promise<any>;

	delete(storeName: any, id: any): Promise<void>;

	query(storeName: any, indexName: any, value: any): Promise<any>;

	queryRange(storeName: any, indexName: any, lower: any, upper: any, lowerOpen: any, upperOpen: boolean): Promise<any>;

	saveProduct(product: any): Promise<any>;

	getProduct(id: any): Promise<any>;

	getProducts(): Promise<any>;

	getProductsByCategory(category: any): Promise<any>;

	getProductBySku(sku: any): Promise<any[]>;

	getUnsyncedProducts(): Promise<any>;

	markProductSynced(id: any, cloudId: any): Promise<void>;

	deleteProduct(id: any): Promise<any>;

	saveCustomer(customer: any): Promise<any>;

	getCustomers(): Promise<any>;

	getCustomer(id: any): Promise<any>;

	getCustomerByEmail(email: any): Promise<any>;

	getCustomerByPhone(phone: any): Promise<any>;

	getCustomerByCloudId(cloudId: any): Promise<any>;

	getUnsyncedCustomers(): Promise<any>;

	markCustomerSynced(id: any, cloudId: any): Promise<void>;

	saveTransaction(transaction: any): Promise<any>;

	getTransaction(id: any): Promise<any>;

	getTransactions(): Promise<Function>;

	getTransactionsByDateRange(startDate: any, endDate: any): Promise<any>;

	getTransactionsByCustomer(customerId: any): Promise<Function | null>;

	getTransactionsByPaymentMethod(paymentMethod: any): Promise<any>;

	getCreditTransactions(): Promise<any>;

	getInstallmentTransactions(): Promise<any>;

	getPendingPayments(): Promise<null | number | Date>;

	getOverdueTransactions(): Promise<Function>;

	getUnsyncedTransactions(): Promise<any>;

	markTransactionSynced(id: any, cloudId: any): Promise<void>;

	getDailySales(date: any, Date: any): Promise<null>;

	_isOverdue(transaction: any): boolean | Date;

	addToSyncQueue(item: any): Promise<any>;

	getSyncQueue(): Promise<any>;

	getSyncQueueItem(type: any, referenceId: any): Promise<null>;

	getPendingSyncItems(): Promise<Function>;

	updateSyncQueueItem(id: any, updates: any): Promise<void>;

	deleteSyncQueueItem(id: any): Promise<any>;

	clearSyncQueue(): Promise<void>;

	getSetting(key: any): Promise<any>;

	setSetting(key: any, value: any): Promise<void>;

	clearAllStores(): Promise<void>;

	getDatabaseStats(): Promise<any>;

	getSyncStats(): Promise<null>;

	fixEmailIndex(): Promise<{	}>;

	vacuum(): Promise<{	}>;
}
