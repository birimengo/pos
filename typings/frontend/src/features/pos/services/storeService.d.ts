
declare interface storeDataType {
	syncAllStores(): Promise<{	}>;

	getStoreMongoId(storeId: any): Promise<any>;
}
