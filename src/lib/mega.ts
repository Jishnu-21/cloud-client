import { Storage, MutableFile, File as MegaFile } from 'megajs';
import { Buffer } from 'buffer';

export interface MegaConfig {
  email: string;
  password: string;
}

export interface MegaFileInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  type: 'file' | 'folder';
  created_at: string;
  secure_url: string;
}

class MegaClient {
  private storage: Storage | null = null;
  public isInitialized = false;
  private fileCache: Map<string, MegaFileInfo[]> = new Map();

  async initialize(config: MegaConfig): Promise<void> {
    if (this.isInitialized) {
      console.log('MEGA client already initialized');
      return;
    }

    try {
      console.log('Attempting to initialize MEGA client');
      this.storage = new Storage({
        email: config.email,
        password: config.password,
      });

      await this.storage.ready;
      
      // Verify we can access the root folder
      const rootFiles = Object.values(this.storage.files)
        .filter(file => file.parent === this.storage.root);
      
      console.log(`MEGA client initialized successfully. Found ${rootFiles.length} files/folders in root.`);
      console.log('Root folder contains:', rootFiles.map(f => ({name: f.name, type: f.directory ? 'folder' : 'file'})));
      this.isInitialized = true;
    } catch (error) {
      this.storage = null;
      this.isInitialized = false;
      this.fileCache.clear();
      console.error('MEGA initialization error:', error);
      if (error instanceof Error) {
        console.error('Stack:', error.stack);
      }
      throw error;
    }
  }

  async listFiles(path: string = ''): Promise<MegaFileInfo[]> {
    try {
      // Check cache first
      const cacheKey = path;
      const cachedResult = this.fileCache.get(cacheKey);
      if (cachedResult) {
        console.log(`Using cached result for path: "${path}"`);
        return cachedResult;
      }

      console.log(`Listing files for path: "${path}"`);
      const folder = await this.getFolderByPath(path);
      
      // Get all files and folders in the current folder
      const items = Object.values(this.megaStorage.files)
        .filter(file => file.parent === folder);
      
      console.log(`Found ${items.length} items in folder "${folder.name || 'root'}"`);
      console.log('Items:', items.map(f => ({name: f.name, type: f.directory ? 'folder' : 'file'})));
      
      const result = await Promise.all(
        items.map(async (file) => {
          // Get download link with proper parameters
          let secureUrl = '';
          if (!file.directory) {
            // Get the download link with the key already included
            secureUrl = await file.link({ noKey: false });
          }

          return {
            id: file.nodeId || '',
            name: file.name || '',
            path: path ? `${path}/${file.name || ''}` : (file.name || ''),
            size: file.size || 0,
            type: file.directory ? 'folder' as const : 'file' as const,
            created_at: new Date((file.timestamp || 0) * 1000).toISOString(),
            secure_url: secureUrl,
          };
        })
      );

      // Cache the result
      this.fileCache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Error listing files:', error);
      if (error instanceof Error) {
        console.error('Stack:', error.stack);
      }
      throw error;
    }
  }

  private get megaStorage(): Storage {
    if (!this.isInitialized || !this.storage) {
      throw new Error('MEGA client not initialized');
    }
    return this.storage;
  }

  private clearCache() {
    this.fileCache.clear();
  }

  async uploadFile(file: File, path: string = ''): Promise<MegaFileInfo> {
    try {
      console.log(`Uploading file: "${file.name}" to path: "${path}"`);
      const folder = await this.getFolderByPath(path);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload the file with options
      const uploadedFile = await new Promise<MegaFile>((resolve, reject) => {
        try {
          const uploadStream = folder.upload(file.name, buffer, (err: Error | null) => {
            if (err) reject(err);
          });
          uploadStream.complete.then((result: MegaFile) => resolve(result)).catch(reject);
        } catch (error) {
          reject(error);
        }
      });

      // Get the download link with the key included
      const secureUrl = await uploadedFile.link({ noKey: false });
      console.log(`File uploaded successfully: "${file.name}"`);

      // Clear cache after upload
      this.clearCache();

      return {
        id: uploadedFile.nodeId || '',
        name: uploadedFile.name || '',
        path: path ? `${path}/${uploadedFile.name || ''}` : (uploadedFile.name || ''),
        size: uploadedFile.size || 0,
        type: 'file' as const,
        created_at: new Date((uploadedFile.timestamp || 0) * 1000).toISOString(),
        secure_url: secureUrl,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      if (error instanceof Error) {
        console.error('Stack:', error.stack);
      }
      throw error;
    }
  }

  async deleteFile(nodeId: string): Promise<void> {
    try {
      console.log(`Deleting file with ID: "${nodeId}"`);
      const file = this.megaStorage.files[nodeId];
      if (!file) {
        throw new Error(`File not found with ID: ${nodeId}`);
      }
      await file.delete();
      console.log(`File deleted successfully: "${file.name}"`);
      this.clearCache();
    } catch (error) {
      console.error('Error deleting file:', error);
      if (error instanceof Error) {
        console.error('Stack:', error.stack);
      }
      throw error;
    }
  }

  async createFolder(name: string, path: string = ''): Promise<MegaFileInfo> {
    try {
      console.log(`Creating folder: "${name}" in path: "${path}"`);
      const parentFolder = await this.getFolderByPath(path);
      console.log(`Parent folder found: "${parentFolder.name || 'root'}"`);
      
      // Check if folder already exists
      const existingItems = Object.values(this.megaStorage.files)
        .filter(file => 
          file.parent === parentFolder && 
          file.directory && 
          file.name === name
        );
      
      if (existingItems.length > 0) {
        console.log(`Folder "${name}" already exists in this location`);
        const existingFolder = existingItems[0];
        
        return {
          id: existingFolder.nodeId || '',
          name: existingFolder.name || '',
          path: path ? `${path}/${existingFolder.name || ''}` : (existingFolder.name || ''),
          size: 0,
          type: 'folder',
          created_at: new Date((existingFolder.timestamp || 0) * 1000).toISOString(),
          secure_url: '',
        };
      }
      
      const folder = await parentFolder.mkdir(name);
      console.log(`Folder created successfully: "${name}"`);

      this.clearCache();

      return {
        id: folder.nodeId || '',
        name: folder.name || '',
        path: path ? `${path}/${folder.name || ''}` : (folder.name || ''),
        size: 0,
        type: 'folder',
        created_at: new Date((folder.timestamp || 0) * 1000).toISOString(),
        secure_url: '',
      };
    } catch (error) {
      console.error(`Error creating folder "${name}" in path "${path}":`, error);
      if (error instanceof Error) {
        console.error('Stack:', error.stack);
      }
      throw error;
    }
  }

  async deleteFolder(path: string = ''): Promise<void> {
    try {
      console.log(`Deleting folder at path: "${path}"`);
      const folder = await this.getFolderByPath(path);
      await folder.delete();
      console.log(`Folder deleted successfully: "${folder.name}"`);
      this.clearCache();
    } catch (error) {
      console.error('Error deleting folder:', error);
      if (error instanceof Error) {
        console.error('Stack:', error.stack);
      }
      throw error;
    }
  }

  private async getFolderByPath(path: string): Promise<MutableFile> {
    try {
      if (!path || path === '/') {
        console.log('Returning root folder');
        return this.megaStorage.root;
      }

      const parts = path.split('/').filter(Boolean);
      let currentFolder: MutableFile = this.megaStorage.root;
      console.log(`Finding folder path: "${path}", parts:`, parts);

      for (const part of parts) {
        console.log(`Looking for subfolder: "${part}" in "${currentFolder.name || 'root'}"`);
        
        // Get all children of the current folder
        const children = Object.values(this.megaStorage.files)
          .filter(file => file.parent === currentFolder && file.directory);
        
        console.log(`Found ${children.length} subfolders:`, children.map(c => c.name));
        
        const nextFolder = children.find(child => child.name === part);
        if (!nextFolder) {
          console.log(`Subfolder "${part}" not found in "${currentFolder.name || 'root'}"`);
          throw new Error(`Folder not found: ${part} in path ${path}`);
        }
        currentFolder = nextFolder;
      }

      console.log(`Found folder: "${currentFolder.name || 'unknown'}"`);
      return currentFolder;
    } catch (error) {
      console.error(`Error getting folder by path: "${path}"`, error);
      if (error instanceof Error) {
        console.error('Stack:', error.stack);
      }
      throw error;
    }
  }
}

export const megaClient = new MegaClient();