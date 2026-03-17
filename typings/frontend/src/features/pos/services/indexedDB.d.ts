
declare interface STORESType {
	static PRODUCTS: any;
}

declare interface sizesType {
	getSyncStats(): Promise<any>;

	deleteDatabase(): Promise<any>;
}
