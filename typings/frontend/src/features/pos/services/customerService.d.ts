
declare interface customerType {
	getCustomerLocally(customerId: any): Promise<any>;

	getAllCustomersLocally(): Promise<{	} | any[]>;

	getCustomerByEmail(email: any): Promise<any>;

	getCustomerByPhone(phone: any): Promise<any>;

	recalculateCustomerStats(customerId: any): Promise<{	}>;

	recalculateAllCustomersStats(): Promise<{	}>;

	getCustomerWithTransactions(customerId: any): Promise<any>;

	calculateCustomerStats(customer: any, transactions: any): any;

	syncCustomerToCloud(customerId: any): Promise<{	}>;

	addToSyncQueue(customerId: any): Promise<void>;

	addLoyaltyPoints(customerId: any, points: any, amount: any, transactionDetails: any): Promise<{	}>;

	getCustomerBalance(customerId: any): Promise<any>;

	deleteAllCustomers(): Promise<{	}>;

	getCustomerCount(): Promise<any>;

	searchCustomers(query: any): Promise<null | any[]>;
}
