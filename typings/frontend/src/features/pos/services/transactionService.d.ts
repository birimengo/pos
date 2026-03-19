
declare interface transactionType {
	getTransactionLocally(transactionId: any): Promise<any>;

	getAllTransactionsLocally(): Promise<any>;

	getTransactionsByDateRange(startDate: any, endDate: any): Promise<any>;

	getTransactionsByCustomer(customerId: any): Promise<any>;

	getPendingPayments(): Promise<any>;

	getOverduePayments(): Promise<any>;

	addToSyncQueue(transactionId: any): Promise<any>;

	removeFromSyncQueue(transactionId: any): Promise<any>;

	syncTransactionToCloud(transactionId: any): Promise<any>;

	syncAllPending(): Promise<any>;

	recordPayment(transactionId: any, paymentAmount: any, paymentMethod: any, Cash: any, notes: any): Promise<any>;

	extendDueDate(transactionId: any, newDueDate: any): Promise<any>;

	getPaymentSchedule(transactionId: any): Promise<any>;

	getDailySales(date: any, Date: any): Promise<any>;

	getMonthlySales(year: any, month: any): Promise<any>;

	getTopProducts(limit: number): Promise<any>;

	getPaymentMethodsBreakdown(startDate: any, endDate: any): Promise<any>;

	isOverdue(transaction: any): any;

	getDaysOverdue(transaction: any): any;

	calculateNextPaymentDue(transaction: any): any;

	formatCurrency(amount: any): any;

	formatDate(dateString: any): any;

	formatShortDate(dateString: any): any;

	getSyncStatus(): Promise<any>;

	deleteTransaction(transactionId: any): Promise<any>;

	getCustomerBalance(customerId: any): Promise<any>;
}
