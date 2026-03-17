
declare interface itemType {
	put(storeName: any, data: any): Promise<any>;

	delete(storeName: any, id: any): Promise<any>;

	query(storeName: any, indexName: any, value: any): Promise<any>;

	saveProduct(product: any): Promise<any>;

	getProduct(id: any): Promise<any>;

	getProducts(): Promise<any>;

	getProductsByCategory(category: any): Promise<any>;

	getUnsyncedProducts(): Promise<any>;

	markProductSynced(id: any, cloudId: any): Promise<any>;

	deleteProduct(id: any): Promise<any>;

	saveCustomer(customer: any): Promise<any>;

	getCustomers(): Promise<any>;

	getCustomer(id: any): Promise<any>;

	getCustomerByEmail(email: any): Promise<any>;

	getCustomerByPhone(phone: any): Promise<any>;

	saveTransaction(transaction: any): Promise<any>;

	getTransaction(id: any): Promise<any>;

	getTransactions(): Promise<any>;

	getTransactionsByDateRange(startDate: any, endDate: any): Promise<any>;

	getTransactionsByCustomer(customerId: any): Promise<any>;

	getTransactionsByPaymentMethod(paymentMethod: any): Promise<any>;

	getUnsyncedTransactions(): Promise<any>;

	markTransactionSynced(id: any, cloudId: any): Promise<any>;

	getDailySales(date: any): Promise<any>;

	addToSyncQueue(item: any): Promise<any>;

	getSyncQueue(): Promise<any>;

	deleteSyncQueueItem(id: any): Promise<any>;

	clearSyncQueue(): Promise<any>;

	getSetting(key: any): Promise<any>;

	setSetting(key: any, value: any): Promise<any>;

	clearAllStores(): Promise<any>;

	getDatabaseStats(): Promise<any>;
}
