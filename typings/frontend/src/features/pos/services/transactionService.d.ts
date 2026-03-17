
declare interface transactionType {
	getTransactionLocally(transactionId: any): Promise<any>;

	getAllTransactionsLocally(): Promise<any>;

	getTransactionsByDateRange(startDate: any, endDate: any): Promise<null | Date | any[]>;

	getTransactionsByCustomer(customerId: any): Promise<Function | any[]>;

	getPendingPayments(): Promise<Function | any[]>;

	getOverduePayments(): Promise<null | boolean | Date | any[]>;

	addToSyncQueue(transactionId: any): Promise<void>;

	syncTransactionToCloud(transactionId: any): Promise<{	}>;

	syncAllPending(): Promise<{	}>;

	getDailySales(date: any, Date: any): Promise<any>;

	getMonthlySales(year: any, month: any): Promise<any>;

	getTopProducts(limit: number): Promise<null | any[]>;

	getPaymentMethodsBreakdown(startDate: any, endDate: any): Promise<any>;

	recordPayment(transactionId: any, paymentAmount: any): Promise<{	}>;

	extendDueDate(transactionId: any, newDueDate: any): Promise<{	}>;

	getSyncStatus(): Promise<null>;

	deleteTransaction(transactionId: any): Promise<{	}>;
}
