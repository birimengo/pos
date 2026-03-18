
declare interface validCustomerType {
	getAllTransactions(params: any): Promise<{	}>;

	getTransaction(id: any): Promise<{	}>;

	getTransactionsByDateRange(startDate: any, endDate: any): Promise<{	}>;

	getTransactionsByCustomer(customerId: any): Promise<{	}>;

	getDailySales(date: any): Promise<{	}>;

	getSalesSummary(startDate: any, endDate: any): Promise<{	}>;

	createCustomer(customerData: any): Promise<{	}>;

	updateCustomer(id: any, customerData: any): Promise<{	}>;

	deleteCustomer(id: any): Promise<{	}>;

	getAllCustomers(): Promise<{	}>;

	getCustomer(id: any): Promise<null | {	}>;

	getCustomerByEmail(email: any): Promise<null | {	}>;

	getCustomersByEmail(email: any): Promise<null | {	}>;

	searchCustomers(query: any): Promise<null | {	}>;

	getSyncData(since: any): Promise<null>;

	syncAll(data: any): Promise<{	}>;

	checkConnection(): Promise<any>;

	bulkCreateProducts(products: any): Promise<{	}>;

	bulkCreateTransactions(transactions: any): Promise<{	}>;
}
