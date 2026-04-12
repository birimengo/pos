
declare interface itemType {
	put(storeName: any, data: any): Promise<any>;

	_saveCustomer(db: any, data: any): Promise<any>;

	_saveTransaction(db: any, data: any): Promise<any>;

	_saveProduct(db: any, data: any): Promise<any>;

	_saveStockHistory(db: any, data: any): Promise<any>;

	_saveReturn(db: any, data: any): Promise<any>;

	_saveStore(db: any, data: any): Promise<any>;

	_saveTransfer(db: any, data: any): Promise<any>;

	delete(storeName: any, id: any): Promise<null>;

	query(storeName: any, indexName: any, value: any): Promise<any>;

	queryRange(storeName: any, indexName: any, lower: any, upper: any, lowerOpen: any, upperOpen: boolean): Promise<any>;

	saveProduct(product: any): Promise<any>;

	getProduct(id: any): Promise<any>;

	getProducts(): Promise<any>;

	getProductsByCategory(category: any): Promise<Function>;

	getProductBySku(sku: any): Promise<Function>;

	getUnsyncedProducts(): Promise<Function>;

	markProductSynced(id: any, cloudId: any): Promise<void>;

	deleteProduct(id: any): Promise<any>;

	saveCustomer(customer: any): Promise<any>;

	getCustomers(): Promise<any>;

	getCustomer(id: any): Promise<any>;

	getCustomerByEmail(email: any): Promise<any>;

	getCustomerByPhone(phone: any): Promise<any>;

	getCustomerByCloudId(cloudId: any): Promise<any>;

	getUnsyncedCustomers(): Promise<Function>;

	markCustomerSynced(id: any, cloudId: any): Promise<void>;

	saveTransaction(transaction: any): Promise<any>;

	getTransaction(id: any): Promise<any>;

	getTransactions(): Promise<any>;

	getTransactionsByDateRange(startDate: any, endDate: any): Promise<null | Date>;

	getTransactionsByCustomer(customerId: any): Promise<null>;

	getTransactionsByPaymentMethod(paymentMethod: any): Promise<Function>;

	getCreditTransactions(): Promise<Function>;

	getInstallmentTransactions(): Promise<Function>;

	getPendingPayments(): Promise<null | number | Date>;

	getOverdueTransactions(): Promise<Function>;

	getUnsyncedTransactions(): Promise<Function>;

	markTransactionSynced(id: any, cloudId: any): Promise<void>;

	getDailySales(date: any, Date: any): Promise<null>;

	_isOverdue(transaction: any): boolean | Date;

	addToStockHistory(historyData: any): Promise<any>;

	getStockHistory(productId: any): Promise<null>;

	getStockHistoryByStore(): Promise<any>;

	getStockHistoryByType(productId: any, adjustmentType: any): Promise<Function>;

	updateStockHistory(id: any, updates: any): Promise<boolean>;

	deleteStockHistory(id: any): Promise<any>;

	clearStockHistory(): Promise<void>;

	getStockHistoryStats(): Promise<any>;

	saveReturn(returnData: any): Promise<any>;

	getReturn(id: any): Promise<any>;

	getAllReturns(): Promise<any>;

	getReturnsByOriginalTransaction(transactionId: any): Promise<null | Function>;

	getReturnsByOriginalReceipt(receiptNumber: any): Promise<null | Function>;

	getReturnsByType(returnType: any): Promise<null | Function>;

	getReturnsByCondition(condition: any): Promise<null | Function>;

	getReturnsByCustomer(customerId: any): Promise<null | Function>;

	getUnsyncedReturns(): Promise<null | Function>;

	markReturnSynced(id: any, cloudId: any): Promise<null>;

	deleteReturn(id: any): Promise<any>;

	clearReturns(): Promise<null>;

	getReturnsStats(): Promise<any>;

	saveStore(store: any): Promise<any>;

	getStore(id: any): Promise<any>;

	getAllStores(): Promise<any>;

	getStoresByCity(city: any): Promise<Function>;

	getStoresByState(state: any): Promise<Function>;

	getOpenStores(): Promise<Function>;

	getDefaultStore(): Promise<Function>;

	deleteStore(id: any): Promise<any>;

	clearStores(): Promise<void>;

	saveTransfer(transfer: any): Promise<any>;

	getTransfer(id: any): Promise<any>;

	getAllTransfers(): Promise<any>;

	getTransfersByFromStore(storeId: any): Promise<Function>;

	getTransfersByToStore(storeId: any): Promise<Function>;

	getTransfersByProduct(productId: any): Promise<Function>;

	getTransfersByStatus(status: any): Promise<Function>;

	getPendingTransfers(): Promise<any>;

	getInTransitTransfers(): Promise<any>;

	getCompletedTransfers(): Promise<any>;

	deleteTransfer(id: any): Promise<any>;

	clearTransfers(): Promise<void>;

	getTransfersStats(): Promise<any>;

	addToSyncQueue(item: any): Promise<any>;

	getSyncQueue(): Promise<any>;

	getSyncQueueItem(type: any, referenceId: any): Promise<null>;

	getPendingSyncItems(): Promise<Function>;

	updateSyncQueueItem(id: any, updates: any): Promise<null>;

	deleteSyncQueueItem(id: any): Promise<any>;

	clearSyncQueue(): Promise<void>;

	getSetting(key: any): Promise<any>;

	setSetting(key: any, value: any): Promise<void>;

	getDatabaseStats(): Promise<any>;

	getSyncStats(): Promise<null>;

	fixEmailIndex(): Promise<{	}>;

	vacuum(): Promise<null | {	}>;
}
