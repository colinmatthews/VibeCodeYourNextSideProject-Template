import { getStorage } from 'firebase-admin/storage';
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

export class FirebaseStorageService {
  private _storage?: ReturnType<typeof getStorage>;
  
  private get storage() {
    if (!this._storage) {
      this._storage = getStorage();
    }
    return this._storage;
  }

  /**
   * Upload a file to Firebase Storage
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

    const bucket = this.storage.bucket();
    const fileRef = bucket.file(filePath);

    // Create a write stream to upload the file
    const stream = fileRef.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        console.error('Upload error:', error);
        reject(error);
      });

      stream.on('finish', async () => {
        try {
          // Generate a signed URL instead of making file public
          const [signedUrl] = await fileRef.getSignedUrl({
            action: 'read',
            expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
          });

          resolve({
            name: fileName,
            originalName: file.originalname,
            path: filePath,
            url: signedUrl,
            size: file.size,
            type: file.mimetype
          });
        } catch (error) {
          console.error('Error getting signed URL:', error);
          reject(error);
        }
      });

      // Write the file buffer to the stream
      stream.end(file.buffer);
    });
  }

  /**
   * Delete a file from Firebase Storage
   */
  async deleteFile(filePath: string): Promise<void> {
    const bucket = this.storage.bucket();
    const fileRef = bucket.file(filePath);

    try {
      await fileRef.delete();
    } catch (error: any) {
      // If file doesn't exist, that's okay
      if (error.code === 404) {
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
    const bucket = this.storage.bucket();
    const fileRef = bucket.file(filePath);

    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + (expiresInMinutes * 60 * 1000)
    });

    return url;
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string) {
    const bucket = this.storage.bucket();
    const fileRef = bucket.file(filePath);

    const [metadata] = await fileRef.getMetadata();
    return metadata;
  }

  /**
   * Stream a file for download
   */
  createDownloadStream(filePath: string): Readable {
    const bucket = this.storage.bucket();
    const fileRef = bucket.file(filePath);

    return fileRef.createReadStream();
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    const bucket = this.storage.bucket();
    const fileRef = bucket.file(filePath);

    try {
      const [exists] = await fileRef.exists();
      return exists;
    } catch (error) {
      return false;
    }
  }
}

export const firebaseStorage = new FirebaseStorageService();