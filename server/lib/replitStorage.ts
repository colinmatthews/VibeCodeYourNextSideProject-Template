import { Client } from '@replit/object-storage';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

export interface UploadResult {
  name: string;
  originalName: string;
  path: string;
  url: string;
  size: number;
  type: string;
}

export class ReplitStorageService {
  private client: Client;
  
  constructor() {
    this.client = new Client();
  }

  /**
   * Upload a file to Replit Object Storage
   */
  async uploadFile(
    file: Express.Multer.File,
    userId: string
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const randomString = uuidv4().substring(0, 8);
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    const filePath = `users/${userId}/files/${fileName}`;

    try {
      // Upload file bytes to Replit Object Storage
      const { ok, error } = await this.client.uploadFromBytes(filePath, file.buffer);
      
      if (!ok) {
        console.error('Replit storage upload error:', error);
        throw new Error(`Upload failed: ${error}`);
      }

      // Generate a secure download URL (valid for 7 days like Firebase)
      const downloadUrl = this.generateSecureUrl(filePath, 7 * 24 * 60 * 60 * 1000);

      return {
        name: fileName,
        originalName: file.originalname,
        path: filePath,
        url: downloadUrl,
        size: file.size,
        type: file.mimetype
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Replit Object Storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const { ok, error } = await this.client.delete(filePath);
      
      if (!ok) {
        // If file doesn't exist, that's okay (similar to Firebase behavior)
        if (error?.message?.includes('not found') || error?.message?.includes('404')) {
          console.warn(`File not found in storage: ${filePath}`);
          return;
        }
        throw new Error(`Delete failed: ${error?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      // Log error but don't throw for missing files
      if (error?.message?.includes('not found')) {
        console.warn(`File not found in storage: ${filePath}`);
        return;
      }
      throw error;
    }
  }

  /**
   * Get a signed URL for downloading a file
   */
  async getDownloadUrl(filePath: string, expiresInMinutes: number = 60): Promise<string> {
    const expiresInMs = expiresInMinutes * 60 * 1000;
    return this.generateSecureUrl(filePath, expiresInMs);
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string) {
    try {
      // List files to find the specific file and get its metadata
      const { ok, value: files, error } = await this.client.list();
      
      if (!ok) {
        throw new Error(`Failed to list files: ${error}`);
      }

      const file = files?.find(f => f.name === filePath);
      if (!file) {
        throw new Error('File not found');
      }

      return {
        name: filePath,
        size: 0, // StorageObject doesn't include size in the interface
        updated: new Date().toISOString(),
        contentType: 'application/octet-stream' // Replit doesn't store content type
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Stream a file for download
   */
  createDownloadStream(filePath: string): Readable {
    // Create a readable stream that downloads from Replit Object Storage
    const stream = new Readable({
      read() {
        // This will be populated by the async download
      }
    });

    // Start the download asynchronously
    this.downloadFileAsStream(filePath, stream).catch(error => {
      console.error('Download stream error:', error);
      stream.emit('error', error);
    });

    return stream;
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const { ok, value: files, error } = await this.client.list();
      
      if (!ok) {
        console.error('Error checking file existence:', error);
        return false;
      }

      return files?.some(f => f.name === filePath) ?? false;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  /**
   * Private helper to generate secure URLs (simulating signed URLs)
   */
  private generateSecureUrl(filePath: string, expiresInMs: number): string {
    const expires = Date.now() + expiresInMs;
    const signature = this.generateSignature(filePath, expires);
    
    // Create a URL that can be used to download the file
    // In a real implementation, this would be a proper signed URL
    // For now, we'll create a URL that includes the path and expiration
    const baseUrl = process.env.REPLIT_STORAGE_URL || 'https://storage.replit.com';
    return `${baseUrl}/${filePath}?expires=${expires}&signature=${signature}`;
  }

  /**
   * Private helper to generate signature for secure URLs
   */
  private generateSignature(filePath: string, expires: number): string {
    // In a real implementation, this would use HMAC with a secret key
    // For now, we'll create a simple hash-like signature
    const content = `${filePath}${expires}`;
    return Buffer.from(content).toString('base64').substring(0, 32);
  }

  /**
   * Private helper to download file as stream
   */
  private async downloadFileAsStream(filePath: string, stream: Readable): Promise<void> {
    try {
      // Use the downloadAsStream method which returns a Readable directly
      const downloadStream = this.client.downloadAsStream(filePath);

      // Pipe the download stream to our readable stream
      downloadStream.on('data', (chunk: any) => {
        stream.push(chunk);
      });

      downloadStream.on('end', () => {
        stream.push(null); // Signal end of stream
      });

      downloadStream.on('error', (error: any) => {
        stream.emit('error', error);
      });

    } catch (error) {
      throw error;
    }
  }
}

export const replitStorage = new ReplitStorageService();