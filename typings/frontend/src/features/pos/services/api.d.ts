
declare interface paramsType {
	post(url: any, data: any, config: any): Promise<any>;

	put(url: any, data: any, config: any): Promise<any>;

	delete(url: any, config: any): Promise<any>;

	patch(url: any, data: any, config: any): Promise<any>;

	login(email: any, password: any): Promise<any>;

	register(userData: any): Promise<any>;

	getCurrentUser(): Promise<any>;

	updateProfile(profileData: any): Promise<any>;

	logout(): Promise<any>;

	forgotPassword(email: any): Promise<any>;

	resetPassword(token: any, newPassword: any): Promise<any>;

	changePassword(currentPassword: any, newPassword: any): Promise<any>;

	getAllUsers(): Promise<any>;

	getUser(id: any): Promise<any>;

	createUser(userData: any): Promise<any>;

	updateUser(id: any, userData: any): Promise<any>;

	deleteUser(id: any): Promise<any>;

	uploadImageToCloudinary(file: any, folder: any, pos: any, products: any, retryCount: number): Promise<any>;

	createProduct(productData: any): Promise<any>;

	updateProduct(id: any, productData: any): Promise<any>;

	deleteProduct(id: any): Promise<any>;

	getAllProducts(): Promise<any>;

	getProduct(id: any): Promise<any>;

	getProductsByCategory(category: any): Promise<any>;

	createTransaction(transactionData: any): Promise<any>;

	syncTransaction(transactionData: any): Promise<any>;

	getAllTransactions(params: any): Promise<any>;

	getTransaction(id: any): Promise<any>;

	getTransactionByReceipt(receiptNumber: any): Promise<any>;

	updateTransaction(id: any, transactionData: any): Promise<any>;

	deleteTransaction(transactionId: any): Promise<any>;

	getTransactionsByDateRange(startDate: any, endDate: any): Promise<any>;

	getTransactionsByCustomer(customerId: any): Promise<any>;

	getDailySales(date: any): Promise<any>;

	getSalesSummary(startDate: any, endDate: any): Promise<any>;

	createCustomer(customerData: any): Promise<any>;

	updateCustomer(id: any, customerData: any): Promise<any>;

	deleteCustomer(id: any): Promise<any>;

	getAllCustomers(): Promise<any>;

	getCustomer(id: any): Promise<any>;

	getCustomerByEmail(email: any): Promise<any>;

	getCustomersByEmail(email: any): Promise<any>;

	searchCustomers(query: any): Promise<any>;

	addStockHistory(productId: any, historyData: any): Promise<any>;

	getStockHistory(productId: any, params: any): Promise<any>;

	getSyncData(since: any): Promise<any>;

	syncAll(data: any): Promise<any>;

	checkConnection(): Promise<any>;

	getAllStores(): Promise<any>;

	getStore(id: any): Promise<any>;

	createStore(storeData: any): Promise<any>;

	updateStore(id: any, storeData: any): Promise<any>;

	deleteStore(id: any): Promise<any>;

	getDefaultStore(): Promise<any>;

	setDefaultStore(id: any): Promise<any>;

	createTransfer(transferData: any): Promise<any>;

	getAllTransfers(): Promise<any>;

	getTransfer(id: any): Promise<any>;

	approveTransfer(id: any): Promise<any>;

	completeTransfer(id: any): Promise<any>;

	cancelTransfer(id: any): Promise<any>;

	deleteTransfer(id: any): Promise<any>;
}
