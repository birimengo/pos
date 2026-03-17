
declare interface productDataType {
	pushCustomers(): Promise<{	}>;

	pushTransactions(): Promise<{	}>;

	pushToCloud(): Promise<null | {	}>;

	pullProducts(): Promise<{	}>;

	pullCustomers(): Promise<{	}>;

	pullTransactions(): Promise<{	}>;

	pullFromCloud(): Promise<null | {	}>;

	fullSync(): Promise<{	} | null>;

	restoreFromCloud(options: {	}): Promise<{	}>;

	getSyncStatus(): Promise<null>;

	getSyncStats(): Promise<null>;

	getLastSyncTime(): any;
}
