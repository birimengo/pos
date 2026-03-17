
declare interface backupDataType {
	restoreFromBackup(fileName: any): Promise<boolean>;

	getStorageInfo(): Promise<any>;

	cleanupOldReceipts(daysOld: number): Promise<void>;
}
