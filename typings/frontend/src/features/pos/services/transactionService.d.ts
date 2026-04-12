
declare interface transactionType {
	saveReturnTransaction(returnData: any): Promise<any>;

	updateTransactionLocally(transactionId: any, updates: any): Promise<{	}>;

	getReturnTransactions(): Promise<any>;

	getReturnByOriginalTransaction(transactionId: any): Promise<null | Function | any[]>;

	processReturn(transactionId: any, returnData: any): Promise<null | {	}>;

	recordStockHistory(historyData: any): Promise<{	}>;

	getTransactionLocally(transactionId: any): Promise<any>;

	canReturnTransaction(transaction: any): any;

	getAllTransactionsLocally(): Promise<null | any[]>;

	getTransactionsByDateRange(startDate: any, endDate: any): Promise<null | Date | any[]>;

	getTransactionsByCustomer(customerId: any): Promise<null | any[]>;

	getPendingPayments(): Promise<null | number | Date | any[]>;

	getOverduePayments(): Promise<null | boolean | Date | any[]>;

	addToSyncQueue(transactionId: any): Promise<void>;

	removeFromSyncQueue(transactionId: any): Promise<void>;

	syncTransactionToCloud(transactionId: any): Promise<null | {	}>;

	syncAllPending(): Promise<{	}>;

	recordPayment(transactionId: any, paymentAmount: any, paymentMethod: any, Cash: any, notes: any): Promise<null | {	}>;

	extendDueDate(transactionId: any, newDueDate: any): Promise<{	}>;

	getPaymentSchedule(transactionId: any): Promise<any>;

	getDailySales(date: any, Date: any): Promise<any>;

	getMonthlySales(year: any, month: any): Promise<any>;

	getTopProducts(limit: number): Promise<null | any[]>;

	getPaymentMethodsBreakdown(startDate: any, endDate: any): Promise<null | any[]>;

	isOverdue(transaction: any): boolean | Date;

	getDaysOverdue(transaction: any): any;

	calculateNextPaymentDue(transaction: any): any;

	formatCurrency(amount: any): null;

	formatDate(dateString: any): string | null;

	formatShortDate(dateString: any): string | null;

	getSyncStatus(): Promise<null>;

	deleteTransaction(transactionId: any): Promise<{	}>;

	getCustomerBalance(customerId: any): Promise<any>;
}
