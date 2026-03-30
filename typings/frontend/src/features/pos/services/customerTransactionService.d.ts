
declare interface summaryType {
	getPaymentSchedule(customerId: any): Promise<any>;

	calculateNextPaymentDate(transaction: any): any;

	recordCustomerPayment(transactionId: any, amount: any, paymentMethod: any, Cash: any): Promise<any>;

	getCustomerLoyaltyStats(customerId: any): Promise<any>;

	refreshCustomerSummary(customerId: any): Promise<any>;

	refreshAllCustomerSummaries(): Promise<{	}>;
}
