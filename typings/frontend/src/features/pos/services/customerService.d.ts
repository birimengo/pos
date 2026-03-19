
declare interface customerType {
	getCustomerLocally(customerId: any): Promise<any>;

	getAllCustomersLocally(): Promise<any>;

	getCustomerWithTransactions(customerId: any): Promise<any>;

	calculateCustomerStats(customer: any, transactions: any): any;

	syncCustomerToCloud(customerId: any): Promise<any>;

	addToSyncQueue(customerId: any): Promise<any>;

	addLoyaltyPoints(customerId: any, points: any, amount: any, transactionDetails: any): Promise<any>;
}
