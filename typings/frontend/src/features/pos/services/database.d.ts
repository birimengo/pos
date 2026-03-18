
declare interface itemType {
	put(storeName: any, data: any): Promise<any>;

	delete(storeName: any, id: any): Promise<void>;

	query(storeName: any, indexName: any, value: any): Promise<any>;

	saveProduct(product: any): Promise<any>;

	getProduct(id: any): Promise<any>;

	getProducts(): Promise<any>;

	getProductsByCategory(category: any): Promise<any>;

	getUnsyncedProducts(): Promise<Function>;

	markProductSynced(id: any, cloudId: any): Promise<void>;

	deleteProduct(id: any): Promise<any>;

	saveCustomer(customer: any): Promise<any>;

	getCustomers(): Promise<any>;

	getCustomer(id: any): Promise<any>;

	getCustomerByEmail(email: any): Promise<any>;

	getCustomerByPhone(phone: any): Promise<any>;

	saveTransaction(transaction: any): Promise<any>;

	getTransaction(id: any): Promise<any>;

	getTransactions(): Promise<any>;

	getTransactionsByDateRange(startDate: any, endDate: any): Promise<null | Date>;

	getTransactionsByCustomer(customerId: any): Promise<any>;

	getTransactionsByPaymentMethod(paymentMethod: any): Promise<any>;

	getUnsyncedTransactions(): Promise<Function>;

	markTransactionSynced(id: any, cloudId: any): Promise<void>;

	getDailySales(date: any): Promise<null>;

	addToSyncQueue(item: any): Promise<null>;

	getSyncQueue(): Promise<any>;

	deleteSyncQueueItem(id: any): Promise<any>;

	clearSyncQueue(): Promise<void>;

	getSetting(key: any): Promise<any>;

	setSetting(key: any, value: any): Promise<void>;

	clearAllStores(): Promise<void>;

	getDatabaseStats(): Promise<any>;

	fixEmailIndex(): Promise<{	}>;
}
