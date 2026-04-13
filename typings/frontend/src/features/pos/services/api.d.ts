
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

	getAllUsers(): Promise<{	}>;

	getUser(id: any): Promise<{	}>;

	createUser(userData: any): Promise<{	}>;

	updateUser(id: any, userData: any): Promise<{	}>;

	deleteUser(id: any): Promise<{	}>;

	uploadImageToCloudinary(file: any, folder: any, pos: any, products: any, retryCount: number): Promise<any>;

	createProduct(productData: any): Promise<{	}>;

	updateProduct(id: any, productData: any): Promise<{	}>;

	deleteProduct(id: any): Promise<{	}>;

	getAllProducts(): Promise<null | {	}>;

	getProduct(id: any): Promise<{	}>;

	getProductsByCategory(category: any): Promise<{	}>;

	createTransaction(transactionData: any): Promise<{	}>;

	syncTransaction(transactionData: any): Promise<any>;

	getAllTransactions(params: any): Promise<null | {	}>;

	getTransaction(id: any): Promise<{	}>;

	getTransactionByReceipt(receiptNumber: any): Promise<{	}>;

	updateTransaction(id: any, transactionData: any): Promise<{	}>;

	deleteTransaction(transactionId: any): Promise<{	}>;

	getTransactionsByDateRange(startDate: any, endDate: any): Promise<{	}>;

	getTransactionsByCustomer(customerId: any): Promise<{	}>;

	getDailySales(date: any): Promise<{	}>;

	getSalesSummary(startDate: any, endDate: any): Promise<{	}>;

	createCustomer(customerData: any): Promise<{	}>;

	updateCustomer(id: any, customerData: any): Promise<{	}>;

	deleteCustomer(id: any): Promise<{	}>;

	getAllCustomers(): Promise<{	}>;

	getCustomer(id: any): Promise<{	}>;

	getCustomerByEmail(email: any): Promise<{	}>;

	getCustomersByEmail(email: any): Promise<{	}>;

	searchCustomers(query: any): Promise<{	}>;

	addStockHistory(productId: any, historyData: any): Promise<{	}>;

	getStockHistory(productId: any, params: any): Promise<{	}>;

	getSyncData(since: any): Promise<{	}>;

	syncAll(data: any): Promise<{	}>;

	checkConnection(): Promise<any>;

	getAllStores(): Promise<{	}>;

	getStore(id: any): Promise<{	}>;

	createStore(storeData: any): Promise<null | {	}>;

	updateStore(id: any, storeData: any): Promise<{	}>;

	deleteStore(id: any): Promise<{	}>;

	getDefaultStore(): Promise<{	}>;

	setDefaultStore(id: any): Promise<{	}>;

	createTransfer(transferData: any): Promise<{	}>;

	getAllTransfers(): Promise<{	}>;

	getTransfer(id: any): Promise<{	}>;

	approveTransfer(id: any): Promise<{	}>;

	completeTransfer(id: any): Promise<{	}>;

	cancelTransfer(id: any): Promise<{	}>;

	deleteTransfer(id: any): Promise<{	}>;
}
