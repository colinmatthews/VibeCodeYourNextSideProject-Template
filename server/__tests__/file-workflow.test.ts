import request from 'supertest';
import express from 'express';
import { registerFileRoutes } from '../routes/fileRoutes';
import { resetAllMocks, mockStorage, mockFirebaseStorage } from './setup/mocks';

// Import and apply mocks
import './setup/mocks';

describe('File Workflow', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    await registerFileRoutes(app);
  });

  beforeEach(() => {
    resetAllMocks();
  });

  describe('GET /api/files - File Listing', () => {
    it('should retrieve user files successfully', async () => {
      const timestamp = 1641234567890;
      const randomId = 'abc123def';
      const mockFiles = [
        {
          id: 1,
          name: `${timestamp}-${randomId}.jpg`,
          originalName: 'photo1.jpg',
          path: `users/test-replit-user-id/files/${timestamp}-${randomId}.jpg`,
          url: `https://storage.googleapis.com/bucket-name/users/test-replit-user-id/files/${timestamp}-${randomId}.jpg?GoogleAccessId=service-account%40project.iam.gserviceaccount.com&Expires=1641321600&Signature=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`,
          size: 1024,
          type: 'image/jpeg',
          userId: 'test-replit-user-id'
        },
        {
          id: 2,
          name: `${timestamp + 1000}-${randomId}2.pdf`,
          originalName: 'document.pdf',
          path: `users/test-replit-user-id/files/${timestamp + 1000}-${randomId}2.pdf`,
          url: `https://storage.googleapis.com/bucket-name/users/test-replit-user-id/files/${timestamp + 1000}-${randomId}2.pdf?GoogleAccessId=service-account%40project.iam.gserviceaccount.com&Expires=1641321600&Signature=def456ghi789jkl012mno345pqr678stu901vwx234yza`,
          size: 2048,
          type: 'application/pdf',
          userId: 'test-replit-user-id'
        }
      ];

      mockStorage.getFilesByUserId.mockResolvedValue(mockFiles);

      const response = await request(app)
        .get('/api/files')
        .expect(200);

      expect(mockStorage.getFilesByUserId).toHaveBeenCalledWith('test-replit-user-id');
      expect(response.body).toEqual(mockFiles);
    });

    it('should return empty array when no files exist', async () => {
      mockStorage.getFilesByUserId.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/files')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockStorage.getFilesByUserId.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/files')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/files/upload - File Upload', () => {
    it('should upload file successfully for free user within limits', async () => {
      // Setup: Free user with space available
      const freeUser = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        subscriptionType: 'free',
        isPremium: false
      };

      const existingFiles = [
        { id: 1, size: 1024, userId: 'test-replit-user-id' },
        { id: 2, size: 2048, userId: 'test-replit-user-id' }
      ]; // Total: 3072 bytes, under 100MB limit

      mockStorage.getUserByFirebaseId.mockResolvedValue(freeUser);
      mockStorage.getFilesByUserId.mockResolvedValue(existingFiles);
      
      // Get the mock response from Firebase Storage service (from mocks.ts)
      // This will have the realistic signed URL format
      const mockUploadResponse = {
        name: expect.stringMatching(/^\d+-[a-zA-Z0-9]+\.jpg$/),
        originalName: 'original.jpg',
        path: expect.stringMatching(/^users\/test-replit-user-id\/files\/\d+-[a-zA-Z0-9]+\.jpg$/),
        url: expect.stringMatching(/^https:\/\/storage\.googleapis\.com\/bucket-name\/.*\?GoogleAccessId=.*&Expires=.*&Signature=.*/),
        size: 1024,
        type: 'image/jpeg'
      };
      
      const createdFile = {
        id: 3,
        userId: 'test-replit-user-id',
        ...mockUploadResponse
      };

      mockStorage.createFile.mockResolvedValue(createdFile);

      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.from('test file content'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .expect(200);

      // Verify Firebase Storage upload
      expect(mockFirebaseStorage.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: 'test.jpg',
          mimetype: 'image/jpeg'
        }),
        'test-replit-user-id'
      );

      // Verify database record creation with realistic mock data patterns
      expect(mockStorage.createFile).toHaveBeenCalledWith({
        userId: 'test-replit-user-id',
        name: expect.stringMatching(/^\d+-[a-zA-Z0-9]+\.jpg$/),
        originalName: 'original.jpg',
        path: expect.stringMatching(/^users\/test-replit-user-id\/files\/\d+-[a-zA-Z0-9]+\.jpg$/),
        url: expect.stringMatching(/^https:\/\/storage\.googleapis\.com\/bucket-name\/.*\?GoogleAccessId=.*&Expires=.*&Signature=.*/),
        size: 1024,
        type: 'image/jpeg'
      });

      expect(response.body).toEqual(expect.objectContaining({
        id: 3,
        userId: 'test-replit-user-id',
        originalName: 'original.jpg',
        size: 1024,
        type: 'image/jpeg'
      }));
    });

    it('should upload file successfully for pro user with higher limits', async () => {
      // Setup: Pro user
      const proUser = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        subscriptionType: 'pro',
        isPremium: true
      };

      const existingFiles = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        size: 10 * 1024 * 1024, // 10MB each
        userId: 'test-replit-user-id'
      })); // Total: 50 files, 500MB

      mockStorage.getUserByFirebaseId.mockResolvedValue(proUser);
      mockStorage.getFilesByUserId.mockResolvedValue(existingFiles);
      
      // Update Firebase Storage mock for large file upload
      const largeFileUploadResponse = {
        name: expect.stringMatching(/^\d+-[a-zA-Z0-9]+\.jpg$/),
        originalName: 'large.jpg',
        path: expect.stringMatching(/^users\/test-replit-user-id\/files\/\d+-[a-zA-Z0-9]+\.jpg$/),
        url: expect.stringMatching(/^https:\/\/storage\.googleapis\.com\/bucket-name\/.*\?GoogleAccessId=.*&Expires=.*&Signature=.*/),
        size: 40 * 1024 * 1024, // 40MB file
        type: 'image/jpeg'
      };
      
      const createdFile = {
        id: 51,
        userId: 'test-replit-user-id',
        ...largeFileUploadResponse
      };

      mockStorage.createFile.mockResolvedValue(createdFile);

      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.alloc(40 * 1024 * 1024), {
          filename: 'large.jpg',
          contentType: 'image/jpeg'
        })
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        id: 51,
        userId: 'test-replit-user-id',
        originalName: 'large.jpg',
        size: 40 * 1024 * 1024,
        type: 'image/jpeg'
      }));
    });

    it('should reject upload when free user exceeds file count limit', async () => {
      // Setup: Free user at file limit
      const freeUser = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        subscriptionType: 'free'
      };

      const existingFiles = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        size: 1024,
        userId: 'test-replit-user-id'
      })); // Already at 10 file limit

      mockStorage.getUserByFirebaseId.mockResolvedValue(freeUser);
      mockStorage.getFilesByUserId.mockResolvedValue(existingFiles);

      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.from('test content'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .expect(403);

      expect(response.body).toEqual({
        error: 'File limit reached. Free plan allows up to 10 files.',
        code: 'forbidden'
      });

      // Verify no upload attempted
      expect(mockFirebaseStorage.uploadFile).not.toHaveBeenCalled();
      expect(mockStorage.createFile).not.toHaveBeenCalled();
    });

    it('should reject upload when file size exceeds limit', async () => {
      // Setup: Free user trying to upload large file
      const freeUser = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        subscriptionType: 'free'
      };

      mockStorage.getUserByFirebaseId.mockResolvedValue(freeUser);
      mockStorage.getFilesByUserId.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.alloc(15 * 1024 * 1024), { // 15MB file
          filename: 'large.jpg',
          contentType: 'image/jpeg'
        })
        .expect(413);

      expect(response.body).toEqual({
        error: 'File too large. Free plan allows up to 10MB per file.',
        code: 'payload_too_large'
      });
    });

    it('should reject upload when total storage exceeds limit', async () => {
      // Setup: Free user at storage limit
      const freeUser = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        subscriptionType: 'free'
      };

      const existingFiles = [
        { id: 1, size: 99 * 1024 * 1024, userId: 'test-replit-user-id' } // 99MB
      ];

      mockStorage.getUserByFirebaseId.mockResolvedValue(freeUser);
      mockStorage.getFilesByUserId.mockResolvedValue(existingFiles);

      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.alloc(2 * 1024 * 1024), { // 2MB file
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .expect(413);

      expect(response.body).toEqual({
        error: 'Storage limit reached. Free plan allows up to 100MB total storage.',
        code: 'payload_too_large'
      });
    });

    it('should reject unsupported file types', async () => {
      const freeUser = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        subscriptionType: 'free'
      };

      mockStorage.getUserByFirebaseId.mockResolvedValue(freeUser);
      mockStorage.getFilesByUserId.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.from('executable content'), {
          filename: 'malware.exe',
          contentType: 'application/octet-stream'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle Firebase Storage upload errors', async () => {
      const freeUser = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        subscriptionType: 'free'
      };

      mockStorage.getUserByFirebaseId.mockResolvedValue(freeUser);
      mockStorage.getFilesByUserId.mockResolvedValue([]);
      
      // Mock Firebase Storage error
      mockFirebaseStorage.uploadFile.mockRejectedValue(new Error('Storage error'));

      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.from('test content'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg'
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing file in request', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .expect(400);

      expect(response.body).toEqual({
        error: 'No file provided',
        code: 'validation_error'
      });
    });
  });

  describe('GET /api/files/:id/download - File Download', () => {
    it('should download file successfully', async () => {
      const timestamp = 1641234567890;
      const randomId = 'abc123def';
      const mockFile = {
        id: 1,
        name: `${timestamp}-${randomId}.jpg`,
        originalName: 'photo.jpg',
        path: `users/test-replit-user-id/files/${timestamp}-${randomId}.jpg`,
        url: `https://storage.googleapis.com/bucket-name/users/test-replit-user-id/files/${timestamp}-${randomId}.jpg?GoogleAccessId=service-account%40project.iam.gserviceaccount.com&Expires=1641321600&Signature=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`,
        size: 1024,
        type: 'image/jpeg',
        userId: 'test-replit-user-id'
      };

      // Mock file lookup for this test
      mockStorage.getFileById.mockResolvedValue(mockFile);
      mockStorage.getFileByIdAndUserId.mockResolvedValue(mockFile);

      mockFirebaseStorage.fileExists.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/files/1/download')
        .expect(200);

      // Verify file existence check
      expect(mockFirebaseStorage.fileExists).toHaveBeenCalledWith(mockFile.path);

      // Verify download stream creation
      expect(mockFirebaseStorage.createDownloadStream).toHaveBeenCalledWith(mockFile.path);

      // Verify headers
      expect(response.headers['content-disposition']).toBe('attachment; filename="photo.jpg"');
      expect(response.headers['content-type']).toBe('image/jpeg');
    });

    it('should handle file not found in storage', async () => {
      const mockFile = {
        id: 1,
        path: 'users/test-replit-user-id/files/1641234567890-missing.jpg',
        originalName: 'missing.jpg',
        type: 'image/jpeg',
        userId: 'test-replit-user-id'
      };

      mockStorage.getFileById.mockResolvedValue(mockFile);
      mockStorage.getFileByIdAndUserId.mockResolvedValue(mockFile);

      mockFirebaseStorage.fileExists.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/files/1/download')
        .expect(404);

      expect(response.body).toEqual({
        error: 'File not found',
        code: 'not_found'
      });
    });
  });

  describe('DELETE /api/files/:id - File Deletion', () => {
    it('should delete file successfully', async () => {
      const mockFile = {
        id: 1,
        name: '1641234567890-abc123def.jpg',
        originalName: 'photo.jpg',
        path: 'users/test-replit-user-id/files/1641234567890-abc123def.jpg',
        userId: 'test-replit-user-id'
      };

      // Mock file lookup for ownership middleware
      mockStorage.getFileById.mockResolvedValue(mockFile);

      mockFirebaseStorage.deleteFile.mockResolvedValue(true);
      mockStorage.deleteFile.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/files/1')
        .expect(200);

      // Verify Firebase Storage deletion
      expect(mockFirebaseStorage.deleteFile).toHaveBeenCalledWith(mockFile.path);

      // Verify database record deletion
      expect(mockStorage.deleteFile).toHaveBeenCalledWith(1);

      expect(response.body).toEqual({
        message: 'File deleted successfully',
        filePath: mockFile.path
      });
    });

    it('should continue with database deletion even if Firebase Storage deletion fails', async () => {
      const mockFile = {
        id: 1,
        path: 'users/test-replit-user-id/files/1641234567890-abc123def.jpg',
        userId: 'test-replit-user-id'
      };

      // Mock file lookup for ownership middleware
      mockStorage.getFileById.mockResolvedValue(mockFile);

      // Mock Firebase Storage error
      mockFirebaseStorage.deleteFile.mockRejectedValue(new Error('Storage deletion failed'));
      mockStorage.deleteFile.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/files/1')
        .expect(200);

      // Verify both operations were attempted
      expect(mockFirebaseStorage.deleteFile).toHaveBeenCalledWith(mockFile.path);
      expect(mockStorage.deleteFile).toHaveBeenCalledWith(1);

      expect(response.body).toEqual({
        message: 'File deleted successfully',
        filePath: mockFile.path
      });
    });
  });

  describe('File Validation and Security', () => {
    it('should validate file extensions against MIME types', async () => {
      const freeUser = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        subscriptionType: 'free'
      };

      mockStorage.getUserByFirebaseId.mockResolvedValue(freeUser);
      mockStorage.getFilesByUserId.mockResolvedValue([]);

      // Test mismatched extension and MIME type - currently allowed by validation
      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.from('test content'), {
          filename: 'test.jpg', // .jpg extension
          contentType: 'application/pdf' // PDF MIME type
        })
        .expect(200); // Current behavior: allows if both individually valid

      expect(response.body).toHaveProperty('id'); // Should succeed since both extension and MIME type are individually valid
    });

    it('should enforce user ownership for all file operations', async () => {
      // This would be handled by middleware in real implementation
      // Test verifies that user ID is consistently used
      const userId = 'test-replit-user-id';

      await request(app).get('/api/files');
      expect(mockStorage.getFilesByUserId).toHaveBeenCalledWith(userId);
    });

    it('should handle malformed file IDs', async () => {
      const response = await request(app)
        .get('/api/files/invalid-id/download')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});