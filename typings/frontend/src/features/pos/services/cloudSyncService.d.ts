
declare interface productDataType {
	pushCustomers(): Promise<{	}>;

	pushTransactions(): Promise<any>;

	pushToCloud(): Promise<null | {	}>;

	pullProducts(): Promise<{	}>;

	pullCustomers(): Promise<{	}>;

	pullTransactions(): Promise<{	}>;

	pullFromCloud(): Promise<null | {	}>;

	fullSync(): Promise<{	} | null>;

	restoreFromCloud(options: {	}): Promise<{	}>;

	getSyncStatus(): Promise<any>;

	getSyncStats(): Promise<any>;

	getLastSyncTime(): any;
}
