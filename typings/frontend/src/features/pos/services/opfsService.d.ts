
declare interface backupDataType {
	importDatabase(fileName: any): Promise<any>;

	listBackups(): Promise<any>;

	cleanupTempFiles(): Promise<any>;

	cleanupOrphanedFiles(validProductIds: any): Promise<any>;

	getStorageInfo(): Promise<any>;

	clearDirectory(directory: any): Promise<any>;
}
