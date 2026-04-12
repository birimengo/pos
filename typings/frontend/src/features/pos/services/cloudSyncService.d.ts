
declare interface productDataType {
	pushCustomers(): Promise<any>;

	pushTransactions(): Promise<any>;

	pushToCloud(): Promise<any>;

	pullProducts(): Promise<any>;

	pullCustomers(): Promise<any>;

	pullTransactions(): Promise<any>;

	pullFromCloud(): Promise<any>;

	fullSync(): Promise<any>;

	restoreFromCloud(options: {	}): Promise<any>;

	getSyncStatus(): Promise<any>;

	getSyncStats(): Promise<any>;

	getLastSyncTime(): any;
}
