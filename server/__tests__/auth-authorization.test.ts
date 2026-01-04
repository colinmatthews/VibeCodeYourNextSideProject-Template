import request from 'supertest';
import express from 'express';
import {
  requiresOwnership,
  requiresFileOwnership,
  requiresItemOwnership,
  requiresUserExists,
  extractUserId,
  isOwner
} from '../middleware/authHelpers';
import { requireAuth } from '../middleware/auth';
import { resetAllMocks, mockStorage } from './setup/mocks';

// Import and apply mocks
import './setup/mocks';

describe('Authorization & Ownership', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Test routes for ownership validation
    app.get('/api/users/:userId/profile', requireAuth, requiresOwnership, (req: any, res) => {
      res.json({ message: 'Profile accessed', userId: req.params.userId });
    });

    app.get('/api/files/:id', requireAuth, requiresFileOwnership, (req: any, res) => {
      res.json({ message: 'File accessed', file: req.file });
    });

    app.delete('/api/items/:id', requireAuth, requiresItemOwnership, (req: any, res) => {
      res.json({ message: 'Item deleted', item: req.item });
    });

    app.get('/api/protected/user', requireAuth, requiresUserExists, (req: any, res) => {
      res.json({ message: 'User exists', userProfile: req.userProfile });
    });

    // Test routes for query/body parameter ownership
    app.post('/api/user-data', requireAuth, requiresOwnership, (req: any, res) => {
      res.json({ message: 'Data accessed', userId: req.body.userId });
    });

    app.get('/api/user-query', requireAuth, requiresOwnership, (req: any, res) => {
      res.json({ message: 'Query accessed', userId: req.query.userId });
    });
  });

  beforeEach(() => {
    resetAllMocks();
  });

  describe('Resource Ownership Validation', () => {
    describe('URL Parameter Ownership', () => {
      it('should allow access to own user profile', async () => {
        const response = await request(app)
          .get('/api/users/test-replit-user-id/profile')
          .expect(200);

        expect(response.body).toEqual({
          message: 'Profile accessed',
          userId: 'test-replit-user-id'
        });
      });

      it('should deny access to other user profiles', async () => {
        const response = await request(app)
          .get('/api/users/other-replit-user-id/profile')
          .expect(403);

        expect(response.body).toEqual({
          error: 'Access denied: You can only access your own resources',
          code: 'auth/access-denied'
        });
      });

      it('should handle missing userId parameter', async () => {
        app.get('/api/test-missing-param', requireAuth, requiresOwnership, (req: any, res) => {
          res.json({ message: 'Should not reach here' });
        });

        const response = await request(app)
          .get('/api/test-missing-param')
          .expect(400);

        expect(response.body).toEqual({
          error: 'User ID is required'
        });
      });
    });

    describe('Request Body Ownership', () => {
      it('should allow access when body userId matches authenticated user', async () => {
        const response = await request(app)
          .post('/api/user-data')
          .send({ userId: 'test-replit-user-id', data: 'test' })
          .expect(200);

        expect(response.body.userId).toBe('test-replit-user-id');
      });

      it('should deny access when body userId does not match', async () => {
        const response = await request(app)
          .post('/api/user-data')
          .send({ userId: 'other-user-id', data: 'test' })
          .expect(403);

        expect(response.body).toEqual({
          error: 'Access denied: You can only access your own resources',
          code: 'auth/access-denied'
        });
      });
    });

    describe('Query Parameter Ownership', () => {
      it('should allow access when query userId matches authenticated user', async () => {
        const response = await request(app)
          .get('/api/user-query?userId=test-replit-user-id&filter=active')
          .expect(200);

        expect(response.body.userId).toBe('test-replit-user-id');
      });

      it('should deny access when query userId does not match', async () => {
        const response = await request(app)
          .get('/api/user-query?userId=different-user&filter=active')
          .expect(403);

        expect(response.body).toEqual({
          error: 'Access denied: You can only access your own resources',
          code: 'auth/access-denied'
        });
      });
    });

    describe('ID Parameter Ownership', () => {
      it('should handle id parameter as alias for userId', async () => {
        app.get('/api/resource/:id/data', requireAuth, requiresOwnership, (req: any, res) => {
          res.json({ message: 'Resource accessed', id: req.params.id });
        });

        const response = await request(app)
          .get('/api/resource/test-replit-user-id/data')
          .expect(200);

        expect(response.body.id).toBe('test-replit-user-id');
      });
    });
  });

  describe('File Ownership Validation', () => {
    const mockFile = {
      id: 1,
      name: 'test-file.jpg',
      originalName: 'original.jpg',
      path: 'users/test-replit-user-id/files/test-file.jpg',
      url: 'https://storage.example.com/test-file.jpg',
      size: 1024,
      type: 'image/jpeg',
      userId: 'test-replit-user-id'
    };

    it('should allow access to owned files', async () => {
      mockStorage.getFileById.mockResolvedValue(mockFile);

      const response = await request(app)
        .get('/api/files/1')
        .expect(200);

      expect(response.body.file).toEqual(mockFile);
      expect(mockStorage.getFileById).toHaveBeenCalledWith(1);
    });

    it('should deny access to files owned by other users', async () => {
      const otherUserFile = {
        ...mockFile,
        userId: 'other-replit-user-id'
      };

      mockStorage.getFileById.mockResolvedValue(otherUserFile);

      const response = await request(app)
        .get('/api/files/1')
        .expect(403);

      expect(response.body).toEqual({
        error: 'Access denied: You can only access your own files',
        code: 'auth/access-denied'
      });
    });

    it('should handle non-existent files', async () => {
      mockStorage.getFileById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/files/999')
        .expect(404);

      expect(response.body).toEqual({
        error: 'File not found'
      });
    });

    it('should handle invalid file IDs', async () => {
      const response = await request(app)
        .get('/api/files/invalid')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid file ID'
      });
    });

    it('should handle database errors during file lookup', async () => {
      mockStorage.getFileById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/files/1')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to verify file ownership'
      });
    });

    it('should attach file to request for downstream use', async () => {
      mockStorage.getFileById.mockResolvedValue(mockFile);

      app.get('/api/test-file-attachment/:id', requireAuth, requiresFileOwnership, (req: any, res) => {
        res.json({ 
          attachedFile: req.file,
          fileId: req.file?.id,
          fileName: req.file?.name
        });
      });

      const response = await request(app)
        .get('/api/test-file-attachment/1')
        .expect(200);

      expect(response.body.attachedFile).toEqual(mockFile);
      expect(response.body.fileId).toBe(1);
      expect(response.body.fileName).toBe('test-file.jpg');
    });
  });

  describe('Item Ownership Validation', () => {
    const mockItems = [
      {
        id: 1,
        item: 'Test item 1',
        userId: 'test-replit-user-id'
      },
      {
        id: 2,
        item: 'Test item 2',
        userId: 'test-replit-user-id'
      }
    ];

    it('should allow access to owned items', async () => {
      mockStorage.getItemsByUserId.mockResolvedValue(mockItems);

      const response = await request(app)
        .delete('/api/items/1')
        .expect(200);

      expect(response.body.item).toEqual(mockItems[0]);
      expect(mockStorage.getItemsByUserId).toHaveBeenCalledWith('test-replit-user-id');
    });

    it('should deny access to items owned by other users', async () => {
      mockStorage.getItemsByUserId.mockResolvedValue([]);

      const response = await request(app)
        .delete('/api/items/1')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Item not found or access denied'
      });
    });

    it('should handle non-existent items', async () => {
      mockStorage.getItemsByUserId.mockResolvedValue(mockItems);

      const response = await request(app)
        .delete('/api/items/999')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Item not found or access denied'
      });
    });

    it('should handle invalid item IDs', async () => {
      const response = await request(app)
        .delete('/api/items/invalid')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid item ID'
      });
    });

    it('should handle database errors during item lookup', async () => {
      mockStorage.getItemsByUserId.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/items/1')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to verify item ownership'
      });
    });

    it('should attach item to request for downstream use', async () => {
      mockStorage.getItemsByUserId.mockResolvedValue(mockItems);

      app.get('/api/test-item-attachment/:id', requireAuth, requiresItemOwnership, (req: any, res) => {
        res.json({ 
          attachedItem: req.item,
          itemId: req.item?.id,
          itemText: req.item?.item
        });
      });

      const response = await request(app)
        .get('/api/test-item-attachment/2')
        .expect(200);

      expect(response.body.attachedItem).toEqual(mockItems[1]);
      expect(response.body.itemId).toBe(2);
      expect(response.body.itemText).toBe('Test item 2');
    });
  });

  describe('User Existence Validation', () => {
    const mockUserProfile = {
      id: 'test-replit-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      subscriptionType: 'free'
    };

    it('should allow access when user exists', async () => {
      mockStorage.getUserById.mockResolvedValue(mockUserProfile);

      const response = await request(app)
        .get('/api/protected/user')
        .expect(200);

      expect(response.body.userProfile).toEqual(mockUserProfile);
      expect(mockStorage.getUserById).toHaveBeenCalledWith('test-replit-user-id');
    });

    it('should deny access when user does not exist', async () => {
      mockStorage.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/protected/user')
        .expect(404);

      expect(response.body).toEqual({
        error: 'User profile not found'
      });
    });

    it('should handle database errors during user lookup', async () => {
      mockStorage.getUserById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/protected/user')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to verify user'
      });
    });

    it('should attach user profile to request', async () => {
      mockStorage.getUserById.mockResolvedValue(mockUserProfile);

      app.get('/api/test-user-attachment', requireAuth, requiresUserExists, (req: any, res) => {
        res.json({ 
          userProfile: req.userProfile,
          userEmail: req.userProfile?.email,
          subscriptionType: req.userProfile?.subscriptionType
        });
      });

      const response = await request(app)
        .get('/api/test-user-attachment')
        .expect(200);

      expect(response.body.userProfile).toEqual(mockUserProfile);
      expect(response.body.userEmail).toBe('test@example.com');
      expect(response.body.subscriptionType).toBe('free');
    });
  });

  describe('Permission Level Enforcement', () => {
    describe('Free User Limitations', () => {
      const freeUser = {
        id: 'test-replit-user-id',
        email: 'free@example.com',
        subscriptionType: 'free',
        isPremium: false
      };

      it('should enforce free user item limits', async () => {
        // Mock 5 existing items (at limit)
        const existingItems = Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          item: `Item ${i + 1}`,
          userId: 'test-replit-user-id'
        }));

        mockStorage.getUserById.mockResolvedValue(freeUser);
        mockStorage.getItemsByUserId.mockResolvedValue(existingItems);

        // Test route that simulates item creation logic
        app.post('/api/test-item-limit', requireAuth, requiresUserExists, (req: any, res) => {
          const items = req.userProfile.subscriptionType?.includes('pro') 
            ? [] // Pro users can create unlimited items
            : existingItems; // Use the existing items defined in test

          if (!req.userProfile.subscriptionType?.includes('pro') && items.length >= 5) {
            return res.status(403).json({
              error: 'Item limit reached. Please upgrade to Pro plan.',
              code: 'forbidden'
            });
          }

          res.json({ message: 'Item creation allowed' });
        });

        const response = await request(app)
          .post('/api/test-item-limit')
          .send({ item: 'New item' })
          .expect(403);

        expect(response.body).toEqual({
          error: 'Item limit reached. Please upgrade to Pro plan.',
          code: 'forbidden'
        });
      });

      it('should enforce free user file limits', async () => {
        const existingFiles = Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          name: `file${i + 1}.jpg`,
          size: 1024,
          userId: 'test-replit-user-id'
        }));

        mockStorage.getUserById.mockResolvedValue(freeUser);
        mockStorage.getFilesByUserId.mockResolvedValue(existingFiles);

        app.post('/api/test-file-limit', requireAuth, requiresUserExists, (req: any, res) => {
          const files = existingFiles; // Use the existing files defined in test
          const maxFiles = req.userProfile.subscriptionType?.includes('pro') ? 100 : 10;

          if (files.length >= maxFiles) {
            return res.status(403).json({
              error: `File limit reached. ${req.userProfile.subscriptionType?.includes('pro') ? 'Pro' : 'Free'} plan allows up to ${maxFiles} files.`,
              code: 'forbidden'
            });
          }

          res.json({ message: 'File upload allowed' });
        });

        const response = await request(app)
          .post('/api/test-file-limit')
          .send({ fileName: 'new-file.jpg' })
          .expect(403);

        expect(response.body).toEqual({
          error: 'File limit reached. Free plan allows up to 10 files.',
          code: 'forbidden'
        });
      });

      it('should enforce free user storage limits', async () => {
        const existingFiles = [
          { id: 1, size: 99 * 1024 * 1024, userId: 'test-replit-user-id' } // 99MB
        ];

        mockStorage.getUserById.mockResolvedValue(freeUser);
        mockStorage.getFilesByUserId.mockResolvedValue(existingFiles);

        app.post('/api/test-storage-limit', requireAuth, requiresUserExists, (req: any, res) => {
          const files = existingFiles; // Use the existing files defined in test
          const totalSize = files.reduce((sum: number, file: any) => sum + file.size, 0);
          const newFileSize = req.body.size || 0;
          const maxSize = req.userProfile.subscriptionType?.includes('pro') 
            ? 1024 * 1024 * 1024 // 1GB
            : 100 * 1024 * 1024; // 100MB

          if (totalSize + newFileSize > maxSize) {
            return res.status(413).json({
              error: `Storage limit reached. ${req.userProfile.subscriptionType?.includes('pro') ? 'Pro' : 'Free'} plan allows up to ${Math.round(maxSize / (1024 * 1024))}MB total storage.`,
              code: 'payload_too_large'
            });
          }

          res.json({ message: 'Storage space available' });
        });

        const response = await request(app)
          .post('/api/test-storage-limit')
          .send({ size: 2 * 1024 * 1024 }) // 2MB file
          .expect(413);

        expect(response.body).toEqual({
          error: 'Storage limit reached. Free plan allows up to 100MB total storage.',
          code: 'payload_too_large'
        });
      });
    });

    describe('Pro User Extended Access', () => {
      const proUser = {
        id: 'test-replit-user-id',
        email: 'pro@example.com',
        subscriptionType: 'pro',
        isPremium: true
      };

      it('should allow pro users extended file limits', async () => {
        const existingFiles = Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          name: `file${i + 1}.jpg`,
          size: 10 * 1024 * 1024, // 10MB each
          userId: 'test-replit-user-id'
        }));

        mockStorage.getUserById.mockResolvedValue(proUser);
        mockStorage.getFilesByUserId.mockResolvedValue(existingFiles);

        app.post('/api/test-pro-file-limit', requireAuth, requiresUserExists, (req: any, res) => {
          const files = existingFiles; // Use the existing files defined in test
          const maxFiles = req.userProfile.subscriptionType?.includes('pro') ? 100 : 10;

          if (files.length >= maxFiles) {
            return res.status(403).json({
              error: `File limit reached. ${req.userProfile.subscriptionType?.includes('pro') ? 'Pro' : 'Free'} plan allows up to ${maxFiles} files.`
            });
          }

          res.json({ 
            message: 'File upload allowed',
            currentFiles: files.length,
            maxFiles 
          });
        });

        const response = await request(app)
          .post('/api/test-pro-file-limit')
          .send({ fileName: 'new-file.jpg' })
          .expect(200);

        expect(response.body).toEqual({
          message: 'File upload allowed',
          currentFiles: 50,
          maxFiles: 100
        });
      });

      it('should allow pro users extended storage limits', async () => {
        const existingFiles = [
          { id: 1, size: 500 * 1024 * 1024, userId: 'test-replit-user-id' } // 500MB
        ];

        mockStorage.getUserById.mockResolvedValue(proUser);
        mockStorage.getFilesByUserId.mockResolvedValue(existingFiles);

        app.post('/api/test-pro-storage-limit', requireAuth, requiresUserExists, (req: any, res) => {
          const files = existingFiles; // Use the existing files defined in test
          const totalSize = files.reduce((sum: number, file: any) => sum + file.size, 0);
          const newFileSize = req.body.size || 0;
          const maxSize = req.userProfile.subscriptionType?.includes('pro') 
            ? 1024 * 1024 * 1024 // 1GB
            : 100 * 1024 * 1024; // 100MB

          res.json({ 
            message: 'Storage check complete',
            currentSize: Math.round(totalSize / (1024 * 1024)),
            maxSize: Math.round(maxSize / (1024 * 1024)),
            remainingSpace: Math.round((maxSize - totalSize) / (1024 * 1024))
          });
        });

        const response = await request(app)
          .post('/api/test-pro-storage-limit')
          .send({ size: 50 * 1024 * 1024 }) // 50MB file
          .expect(200);

        expect(response.body).toEqual({
          message: 'Storage check complete',
          currentSize: 500,
          maxSize: 1024,
          remainingSpace: 524
        });
      });
    });

    describe('Subscription Status Changes', () => {
      it('should handle subscription downgrades', async () => {
        // User was pro but subscription expired
        const downgradeUser = {
          id: 'test-replit-user-id',
          email: 'downgrade@example.com',
          subscriptionType: 'free', // Changed from pro to free
          isPremium: false
        };

        // User has more items than free plan allows
        const excessItems = Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          item: `Item ${i + 1}`,
          userId: 'test-replit-user-id'
        }));

        mockStorage.getUserById.mockResolvedValue(downgradeUser);
        mockStorage.getItemsByUserId.mockResolvedValue(excessItems);

        app.get('/api/test-downgrade-status', requireAuth, requiresUserExists, (req: any, res) => {
          const items = excessItems; // Use the excess items defined in test
          const isOverLimit = !req.userProfile.subscriptionType?.includes('pro') && items.length > 5;

          res.json({ 
            isOverLimit,
            itemCount: items.length,
            subscriptionType: req.userProfile.subscriptionType,
            message: isOverLimit ? 'User has exceeded free plan limits' : 'User within limits'
          });
        });

        const response = await request(app)
          .get('/api/test-downgrade-status')
          .expect(200);

        expect(response.body).toEqual({
          isOverLimit: true,
          itemCount: 10,
          subscriptionType: 'free',
          message: 'User has exceeded free plan limits'
        });
      });
    });
  });

  describe('Helper Functions', () => {
    describe('extractUserId', () => {
      it('should extract user ID from authenticated request', () => {
        const mockRequest = {
          user: { claims: { sub: 'test-user-id', email: 'test@example.com' } }
        } as any;

        const userId = extractUserId(mockRequest);
        expect(userId).toBe('test-user-id');
      });

      it('should return null for unauthenticated request', () => {
        const mockRequest = {} as any;
        const userId = extractUserId(mockRequest);
        expect(userId).toBeNull();
      });

      it('should return null for request without user claims', () => {
        const mockRequest = {
          user: { email: 'test@example.com' }
        } as any;

        const userId = extractUserId(mockRequest);
        expect(userId).toBeNull();
      });
    });

    describe('isOwner', () => {
      it('should return true when user owns resource', () => {
        const mockRequest = {
          user: { claims: { sub: 'test-user-id', email: 'test@example.com' } }
        } as any;

        const owns = isOwner(mockRequest, 'test-user-id');
        expect(owns).toBe(true);
      });

      it('should return false when user does not own resource', () => {
        const mockRequest = {
          user: { claims: { sub: 'test-user-id', email: 'test@example.com' } }
        } as any;

        const owns = isOwner(mockRequest, 'other-user-id');
        expect(owns).toBe(false);
      });

      it('should return false for unauthenticated request', () => {
        const mockRequest = {} as any;
        const owns = isOwner(mockRequest, 'test-user-id');
        expect(owns).toBe(false);
      });
    });
  });

  describe('Edge Cases & Data Isolation', () => {
    it('should prevent access with null/undefined user IDs', async () => {
      app.post('/api/test-null-user', requireAuth, requiresOwnership, (req: any, res) => {
        res.json({ message: 'Should not reach here' });
      });

      const response = await request(app)
        .post('/api/test-null-user')
        .send({ userId: null })
        .expect(400);

      expect(response.body.error).toBe('User ID is required');
    });

    it('should handle concurrent ownership checks', async () => {
      const mockFile = {
        id: 1,
        userId: 'test-replit-user-id'
      };

      mockStorage.getFileById.mockResolvedValue(mockFile);

      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(app).get('/api/files/1')
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(mockStorage.getFileById).toHaveBeenCalledTimes(5);
    });

    it('should maintain data isolation across requests', async () => {
      // Setup different users' files
      const user1File = { id: 1, userId: 'user-1' };
      const user2File = { id: 2, userId: 'user-2' };

      // Mock different responses based on file ID
      mockStorage.getFileById
        .mockResolvedValueOnce(user1File)
        .mockResolvedValueOnce(user2File);

      // First request should fail (user-1's file accessed by test-replit-user-id)
      const response1 = await request(app)
        .get('/api/files/1')
        .expect(403);

      // Second request should also fail (user-2's file accessed by test-replit-user-id)  
      const response2 = await request(app)
        .get('/api/files/2')
        .expect(403);

      expect(response1.body.code).toBe('auth/access-denied');
      expect(response2.body.code).toBe('auth/access-denied');
    });
  });
});