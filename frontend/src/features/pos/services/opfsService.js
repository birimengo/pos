// src/features/pos/services/opfsService.js
class OPFSService {
  constructor() {
    this.root = null;
    this.initialized = false;
    this.initializing = false;
  }

  async init() {
    if (this.initialized) return this.root;
    if (this.initializing) {
      // Wait for initialization to complete
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.root;
    }

    this.initializing = true;
    
    try {
      if (!navigator.storage || !navigator.storage.getDirectory) {
        throw new Error('OPFS not supported in this browser. Please use a modern browser like Chrome, Edge, or Opera.');
      }
      
      // Check if storage is available
      try {
        this.root = await navigator.storage.getDirectory();
      } catch (storageError) {
        if (storageError.name === 'SecurityError') {
          throw new Error('Storage access denied. Please check your browser permissions.');
        } else if (storageError.name === 'NotAllowedError') {
          throw new Error('Storage access not allowed in this context.');
        } else {
          throw new Error(`Failed to access storage: ${storageError.message}`);
        }
      }
      
      // Create required directories
      const dirs = ['products', 'receipts', 'backups', 'temp', 'exports'];
      for (const dir of dirs) {
        try {
          await this.ensureDirectory(dir);
        } catch (dirError) {
          console.warn(`⚠️ Failed to create directory ${dir}:`, dirError.message);
        }
      }
      
      this.initialized = true;
      console.log('✅ OPFS initialized successfully');
      
      // Run cleanup on startup
      this.cleanupTempFiles().catch(() => {});
      
      return this.root;
    } catch (error) {
      console.error('❌ OPFS initialization failed:', error);
      this.initialized = false;
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
    return this.root;
  }

  async ensureDirectory(dirName) {
    try {
      const dir = await this.root.getDirectoryHandle(dirName, { create: true });
      return dir;
    } catch (error) {
      if (error.name === 'TypeMismatchError') {
        // Directory exists but is a file - delete and recreate
        try {
          await this.root.removeEntry(dirName);
          return await this.root.getDirectoryHandle(dirName, { create: true });
        } catch (recreateError) {
          throw new Error(`Failed to recreate directory ${dirName}: ${recreateError.message}`);
        }
      }
      throw error;
    }
  }

  async getDirectory(dirName = '') {
    await this.ensureInitialized();
    
    try {
      if (!dirName) return this.root;
      return await this.root.getDirectoryHandle(dirName, { create: true });
    } catch (error) {
      if (error.name === 'NotFoundError') {
        // Directory doesn't exist - create it
        return await this.root.getDirectoryHandle(dirName, { create: true });
      }
      throw error;
    }
  }

  // ==================== FILE VALIDATION ====================

  async validateFile(fileData, options = {}) {
    const {
      minSize = 100,
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/json', 'text/plain']
    } = options;

    // Check if file exists
    if (!fileData) {
      return { valid: false, error: 'No file data provided' };
    }

    // Handle different file types
    let fileToCheck;
    let fileSize = 0;
    let fileType = '';

    if (fileData instanceof File || fileData instanceof Blob) {
      fileToCheck = fileData;
      fileSize = fileData.size;
      fileType = fileData.type || 'application/octet-stream';
    } else if (fileData instanceof ArrayBuffer) {
      fileSize = fileData.byteLength;
      fileType = 'application/octet-stream';
      fileToCheck = new Blob([fileData]);
    } else if (typeof fileData === 'string') {
      fileSize = new Blob([fileData]).size;
      fileType = 'text/plain';
      fileToCheck = new Blob([fileData]);
    } else {
      return { valid: false, error: 'Unsupported file type' };
    }

    // Check file size
    if (fileSize === 0) {
      return { valid: false, error: 'File is empty' };
    }
    
    if (fileSize < minSize) {
      return { valid: false, error: `File is too small/corrupted (${fileSize} bytes, minimum ${minSize} bytes)` };
    }
    
    if (fileSize > maxSize) {
      return { valid: false, error: `File too large (max ${maxSize / 1024 / 1024}MB)` };
    }

    // Check file type if allowedTypes provided
    if (allowedTypes && allowedTypes.length > 0 && fileType !== 'application/octet-stream') {
      const isTypeAllowed = allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          const baseType = type.replace('/*', '');
          return fileType.startsWith(baseType);
        }
        return fileType === type;
      });

      if (!isTypeAllowed) {
        return { valid: false, error: `File type not allowed: ${fileType}` };
      }
    }

    // For images, validate the image signature
    if (fileType.startsWith('image/')) {
      try {
        const arrayBuffer = await fileToCheck.slice(0, Math.min(100, fileSize)).arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const header = Array.from(uint8).map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Check for common image signatures
        const isValidJPEG = header.startsWith('ffd8');
        const isValidPNG = header.startsWith('89504e47');
        const isValidGIF = header.startsWith('474946');
        const isValidWEBP = header.startsWith('52494646'); // RIFF header for WEBP
        
        if (!isValidJPEG && !isValidPNG && !isValidGIF && !isValidWEBP) {
          return { valid: false, error: 'File is not a valid image (invalid signature)' };
        }
      } catch (error) {
        return { valid: false, error: `Failed to validate image: ${error.message}` };
      }
    }

    return { valid: true, file: fileToCheck, size: fileSize, type: fileType };
  }

  // ==================== FILE OPERATIONS ====================

  async saveFile(fileName, fileData, directory = '') {
    try {
      await this.ensureInitialized();
      
      // Validate the file
      const validation = await this.validateFile(fileData, {
        maxSize: directory === 'products' ? 10 * 1024 * 1024 : 50 * 1024 * 1024 // 10MB for products, 50MB for others
      });
      
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const dir = await this.getDirectory(directory);
      
      // Check if file exists and handle appropriately
      let fileHandle;
      try {
        fileHandle = await dir.getFileHandle(fileName, { create: false });
        // File exists - create a backup name
        const timestamp = Date.now();
        const nameParts = fileName.split('.');
        const ext = nameParts.pop();
        const baseName = nameParts.join('.');
        const backupName = `${baseName}_${timestamp}.${ext}`;
        
        console.log(`📝 File ${fileName} exists, saving as ${backupName}`);
        fileHandle = await dir.getFileHandle(backupName, { create: true });
        fileName = backupName;
      } catch (error) {
        // File doesn't exist - create new
        if (error.name === 'NotFoundError') {
          fileHandle = await dir.getFileHandle(fileName, { create: true });
        } else {
          throw error;
        }
      }

      // Create writable stream
      const writable = await fileHandle.createWritable();
      
      try {
        // Write data based on type
        if (fileData instanceof Blob) {
          await writable.write(await fileData.arrayBuffer());
        } else if (fileData instanceof ArrayBuffer) {
          await writable.write(fileData);
        } else if (typeof fileData === 'string') {
          await writable.write(fileData);
        } else {
          await writable.write(JSON.stringify(fileData));
        }
        
        await writable.close();
        
        // Verify file was written correctly
        const verifyFile = await this.readFile(fileName, directory);
        if (!verifyFile) {
          throw new Error('File verification failed - file not found after write');
        }
        
        if (verifyFile.size === 0) {
          throw new Error('File verification failed - written file is empty');
        }
        
        console.log(`✅ File saved: ${directory ? directory + '/' : ''}${fileName} (${verifyFile.size} bytes)`);
        
        return {
          success: true,
          fileName,
          path: directory ? `${directory}/${fileName}` : fileName,
          size: verifyFile.size
        };
      } catch (writeError) {
        // Clean up on error
        try {
          await writable.abort();
        } catch (abortError) {
          // Ignore abort errors
        }
        throw writeError;
      }
      
    } catch (error) {
      console.error(`❌ Failed to save file ${fileName}:`, error);
      return {
        success: false,
        fileName,
        error: error.message
      };
    }
  }

  async readFile(fileName, directory = '') {
    try {
      await this.ensureInitialized();
      
      const dir = await this.getDirectory(directory);
      
      try {
        const fileHandle = await dir.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        
        // Validate the file
        if (!file) {
          console.warn(`File not found: ${fileName}`);
          return null;
        }
        
        if (file.size === 0) {
          console.warn(`File is empty: ${fileName}`);
          return null;
        }
        
        return file;
      } catch (error) {
        if (error.name === 'NotFoundError') {
          return null;
        }
        throw error;
      }
    } catch (error) {
      console.error(`Failed to read file ${fileName}:`, error);
      return null;
    }
  }

  async readFileAsDataURL(fileName, directory = '') {
    try {
      const file = await this.readFile(fileName, directory);
      if (!file) return null;
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file as data URL'));
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error(`Failed to read file as data URL ${fileName}:`, error);
      return null;
    }
  }

  async readFileAsText(fileName, directory = '') {
    try {
      const file = await this.readFile(fileName, directory);
      if (!file) return null;
      
      return await file.text();
    } catch (error) {
      console.error(`Failed to read file as text ${fileName}:`, error);
      return null;
    }
  }

  async readFileAsArrayBuffer(fileName, directory = '') {
    try {
      const file = await this.readFile(fileName, directory);
      if (!file) return null;
      
      return await file.arrayBuffer();
    } catch (error) {
      console.error(`Failed to read file as array buffer ${fileName}:`, error);
      return null;
    }
  }

  // ==================== JSON OPERATIONS ====================

  async saveJSON(fileName, data, directory = '') {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const result = await this.saveFile(fileName, blob, directory);
      
      if (result.success) {
        console.log(`✅ JSON saved: ${fileName}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Failed to save JSON ${fileName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async readJSON(fileName, directory = '') {
    try {
      const text = await this.readFileAsText(fileName, directory);
      if (!text) return null;
      return JSON.parse(text);
    } catch (error) {
      console.error(`Failed to read JSON ${fileName}:`, error);
      return null;
    }
  }

  // ==================== PRODUCT IMAGE OPERATIONS ====================

  async saveProductImage(productId, imageBlob, isMain = false) {
    try {
      const validation = await this.validateFile(imageBlob, {
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });
      
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 6);
      const extension = imageBlob.type?.split('/')[1] || 'jpg';
      const fileName = `${productId}_${timestamp}_${random}.${extension}`;
      
      const result = await this.saveFile(fileName, imageBlob, 'products');
      
      if (result.success) {
        console.log(`✅ Product image saved: ${fileName} (${result.size} bytes)`);
        return {
          success: true,
          fileName,
          path: `products/${fileName}`,
          isMain,
          timestamp,
          size: result.size
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to save product image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getProductImages(productId) {
    try {
      await this.ensureInitialized();
      const dir = await this.getDirectory('products');
      const images = [];
      
      for await (const [name, handle] of dir) {
        if (handle.kind === 'file' && name.startsWith(productId)) {
          try {
            const file = await handle.getFile();
            
            // Validate image
            if (file.size > 0) {
              images.push({
                name,
                url: URL.createObjectURL(file),
                size: file.size,
                lastModified: file.lastModified,
                type: file.type
              });
            }
          } catch (fileError) {
            console.warn(`Failed to read image ${name}:`, fileError);
          }
        }
      }
      
      return images.sort((a, b) => b.lastModified - a.lastModified);
    } catch (error) {
      console.error('Failed to get product images:', error);
      return [];
    }
  }

  // ==================== FILE MANAGEMENT ====================

  async deleteFile(fileName, directory = '') {
    try {
      await this.ensureInitialized();
      const dir = await this.getDirectory(directory);
      
      try {
        await dir.removeEntry(fileName);
        console.log(`🗑️ File deleted: ${directory ? directory + '/' : ''}${fileName}`);
        return { success: true };
      } catch (error) {
        if (error.name === 'NotFoundError') {
          return { success: true, message: 'File already deleted' };
        }
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteFilesByPrefix(prefix, directory = '') {
    try {
      await this.ensureInitialized();
      const dir = await this.getDirectory(directory);
      let deletedCount = 0;
      
      for await (const [name, handle] of dir) {
        if (handle.kind === 'file' && name.startsWith(prefix)) {
          try {
            await dir.removeEntry(name);
            deletedCount++;
            console.log(`🗑️ Deleted: ${name}`);
          } catch (error) {
            console.warn(`Failed to delete ${name}:`, error);
          }
        }
      }
      
      console.log(`🗑️ Deleted ${deletedCount} files with prefix "${prefix}"`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Failed to delete files by prefix:', error);
      return { success: false, error: error.message };
    }
  }

  async listFiles(directory = '', pattern = null) {
    try {
      await this.ensureInitialized();
      const dir = await this.getDirectory(directory);
      const files = [];
      
      for await (const [name, handle] of dir) {
        if (handle.kind === 'file') {
          if (!pattern || name.match(pattern)) {
            try {
              const file = await handle.getFile();
              files.push({
                name,
                size: file.size,
                lastModified: file.lastModified,
                type: file.type
              });
            } catch (error) {
              console.warn(`Failed to get file info for ${name}:`, error);
              files.push({
                name,
                size: 0,
                lastModified: null,
                error: 'Could not read file'
              });
            }
          }
        }
      }
      
      return files.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }

  async fileExists(fileName, directory = '') {
    try {
      await this.ensureInitialized();
      const dir = await this.getDirectory(directory);
      
      try {
        await dir.getFileHandle(fileName);
        return true;
      } catch (error) {
        if (error.name === 'NotFoundError') {
          return false;
        }
        throw error;
      }
    } catch (error) {
      console.error('Failed to check file existence:', error);
      return false;
    }
  }

  async getFileInfo(fileName, directory = '') {
    try {
      await this.ensureInitialized();
      const dir = await this.getDirectory(directory);
      const fileHandle = await dir.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      
      return {
        name: fileName,
        size: file.size,
        lastModified: file.lastModified,
        type: file.type,
        exists: true
      };
    } catch (error) {
      if (error.name === 'NotFoundError') {
        return { exists: false };
      }
      console.error('Failed to get file info:', error);
      return { exists: false, error: error.message };
    }
  }

  // ==================== BACKUP AND RESTORE ====================

  async exportDatabase() {
    try {
      await this.ensureInitialized();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `backup-${timestamp}.json`;
      
      // Get all data from IndexedDB
      const { db } = await import('./database');
      const [
        products,
        customers,
        transactions,
        employees,
        stores,
        suppliers,
        purchaseOrders
      ] = await Promise.all([
        db.getAll('products'),
        db.getAll('customers'),
        db.getAll('transactions'),
        db.getAll('employees'),
        db.getAll('stores'),
        db.getAll('suppliers'),
        db.getAll('purchaseOrders')
      ]);
      
      const backupData = {
        timestamp,
        version: '2.0',
        products: products || [],
        customers: customers || [],
        transactions: transactions || [],
        employees: employees || [],
        stores: stores || [],
        suppliers: suppliers || [],
        purchaseOrders: purchaseOrders || []
      };
      
      const result = await this.saveJSON(fileName, backupData, 'backups');
      
      if (result.success) {
        console.log(`✅ Database exported to ${fileName}`);
        return { success: true, fileName, data: backupData };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to export database:', error);
      return { success: false, error: error.message };
    }
  }

  async importDatabase(fileName) {
    try {
      await this.ensureInitialized();
      
      const data = await this.readJSON(fileName, 'backups');
      if (!data) {
        throw new Error('Failed to read backup file');
      }
      
      console.log(`✅ Database imported from ${fileName}`);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Failed to import database:', error);
      return { success: false, error: error.message };
    }
  }

  async listBackups() {
    return this.listFiles('backups', /\.json$/);
  }

  // ==================== CLEANUP ====================

  async cleanupTempFiles() {
    try {
      const files = await this.listFiles('temp');
      let deletedCount = 0;
      
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const file of files) {
        if (file.lastModified && (now - file.lastModified) > maxAge) {
          const result = await this.deleteFile(file.name, 'temp');
          if (result.success) deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} temp files`);
      }
      
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
      return { success: false, error: error.message };
    }
  }

  async cleanupOrphanedFiles(validProductIds = []) {
    try {
      await this.ensureInitialized();
      const files = await this.listFiles('products');
      let deletedCount = 0;
      
      for (const file of files) {
        // Extract product ID from filename (format: prod_1234567890_timestamp_random.jpg)
        const match = file.name.match(/^(prod_\d+_[a-z0-9]+)_/);
        if (match) {
          const productId = match[1];
          if (!validProductIds.includes(productId)) {
            const result = await this.deleteFile(file.name, 'products');
            if (result.success) {
              deletedCount++;
              console.log(`🧹 Deleted orphaned image: ${file.name}`);
            }
          }
        }
      }
      
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Failed to cleanup orphaned files:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== STORAGE INFO ====================

  async getStorageInfo() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        
        // Get file counts
        const productFiles = await this.listFiles('products');
        const receiptFiles = await this.listFiles('receipts');
        const backupFiles = await this.listFiles('backups');
        
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota * 100).toFixed(2) : '0',
          usageMB: ((estimate.usage || 0) / 1024 / 1024).toFixed(2),
          quotaMB: ((estimate.quota || 0) / 1024 / 1024).toFixed(2),
          fileCounts: {
            products: productFiles.length,
            receipts: receiptFiles.length,
            backups: backupFiles.length,
            total: productFiles.length + receiptFiles.length + backupFiles.length
          }
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }

  async clearDirectory(directory = '') {
    try {
      await this.ensureInitialized();
      const dir = await this.getDirectory(directory);
      let deletedCount = 0;
      
      for await (const [name, handle] of dir) {
        if (handle.kind === 'file') {
          try {
            await dir.removeEntry(name);
            deletedCount++;
          } catch (error) {
            console.warn(`Failed to delete ${name}:`, error);
          }
        }
      }
      
      console.log(`🧹 Cleared ${deletedCount} files from ${directory || 'root'}`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error(`Failed to clear directory ${directory}:`, error);
      return { success: false, error: error.message };
    }
  }
}

// Create and export the instance
const opfs = new OPFSService();

// Export both the class and the instance
export { OPFSService, opfs };
export default opfs;