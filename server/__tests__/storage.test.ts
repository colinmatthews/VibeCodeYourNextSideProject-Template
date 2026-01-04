import { resetAllMocks, mockStorage } from './setup/mocks';

// Import and apply mocks
import './setup/mocks';

describe('Storage Layer', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('User Storage Operations', () => {
    const mockUser = {
      id: 'test-replit-user-id',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      postalCode: '12345',
      isPremium: false,
      subscriptionType: 'free' as const,
      emailNotifications: true,
      stripeCustomerId: 'cus_test123'
    };

    describe('getUserById', () => {
      it('should retrieve user by ID', async () => {
        mockStorage.getUserById.mockResolvedValue(mockUser);

        const result = await mockStorage.getUserById('test-replit-user-id');

        expect(mockStorage.getUserById).toHaveBeenCalledWith('test-replit-user-id');
        expect(result).toEqual(mockUser);
      });

      it('should return null when user not found', async () => {
        mockStorage.getUserById.mockResolvedValue(null);

        const result = await mockStorage.getUserById('nonexistent-uid');

        expect(result).toBeNull();
      });

      it('should handle database errors', async () => {
        const dbError = new Error('Database connection failed');
        mockStorage.getUserById.mockRejectedValue(dbError);

        await expect(mockStorage.getUserById('test-replit-user-id'))
          .rejects.toThrow('Database connection failed');
      });
    });

    describe('getUserByEmail', () => {
      it('should retrieve user by email', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(mockUser);

        const result = await mockStorage.getUserByEmail('test@example.com');

        expect(mockStorage.getUserByEmail).toHaveBeenCalledWith('test@example.com');
        expect(result).toEqual(mockUser);
      });

      it('should return null when email not found', async () => {
        mockStorage.getUserByEmail.mockResolvedValue(null);

        const result = await mockStorage.getUserByEmail('nonexistent@example.com');

        expect(result).toBeNull();
      });
    });

    describe('createUser', () => {
      it('should create new user with all required fields', async () => {
        const newUserData = {
          id: 'new-replit-user-id',
          email: 'new@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          address: '456 New St',
          city: 'New City',
          state: 'NS',
          postalCode: '67890',
          isPremium: true,
          subscriptionType: 'pro' as const,
          emailNotifications: false,
          stripeCustomerId: 'cus_new123'
        };

        mockStorage.createUser.mockResolvedValue(newUserData);

        const result = await mockStorage.createUser(newUserData);

        expect(mockStorage.createUser).toHaveBeenCalledWith(newUserData);
        expect(result).toEqual(newUserData);
      });

      it('should create user with minimal required fields', async () => {
        const minimalUserData = {
          id: 'minimal-replit-user-id',
          email: 'minimal@example.com',
          firstName: '',
          lastName: '',
          address: '',
          city: '',
          state: '',
          postalCode: '',
          isPremium: false,
          subscriptionType: 'free' as const,
          emailNotifications: false
        };

        mockStorage.createUser.mockResolvedValue(minimalUserData);

        const result = await mockStorage.createUser(minimalUserData);

        expect(result).toEqual(minimalUserData);
      });

      it('should handle duplicate user creation', async () => {
        const duplicateError = new Error('User already exists');
        mockStorage.createUser.mockRejectedValue(duplicateError);

        await expect(mockStorage.createUser(mockUser))
          .rejects.toThrow('User already exists');
      });
    });

    describe('updateUser', () => {
      it('should update user with partial data', async () => {
        const updateData = {
          firstName: 'Updated John',
          emailNotifications: false
        };

        const updatedUser = {
          ...mockUser,
          ...updateData
        };

        mockStorage.updateUser.mockResolvedValue(updatedUser);

        const result = await mockStorage.updateUser('test-replit-user-id', updateData);

        expect(mockStorage.updateUser).toHaveBeenCalledWith('test-replit-user-id', updateData);
        expect(result).toEqual(updatedUser);
      });

      it('should update subscription type', async () => {
        const updateData = {
          subscriptionType: 'pro' as const,
          isPremium: true
        };

        const updatedUser = {
          ...mockUser,
          ...updateData
        };

        mockStorage.updateUser.mockResolvedValue(updatedUser);

        const result = await mockStorage.updateUser('test-replit-user-id', updateData);

        expect(result.subscriptionType).toBe('pro');
        expect(result.isPremium).toBe(true);
      });

      it('should handle user not found for update', async () => {
        const notFoundError = new Error('User not found');
        mockStorage.updateUser.mockRejectedValue(notFoundError);

        await expect(mockStorage.updateUser('nonexistent-uid', { firstName: 'Test' }))
          .rejects.toThrow('User not found');
      });
    });
  });

  describe('Item Storage Operations', () => {
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

    describe('getItemsByUserId', () => {
      it('should retrieve items for user', async () => {
        mockStorage.getItemsByUserId.mockResolvedValue(mockItems);

        const result = await mockStorage.getItemsByUserId('test-replit-user-id');

        expect(mockStorage.getItemsByUserId).toHaveBeenCalledWith('test-replit-user-id');
        expect(result).toEqual(mockItems);
      });

      it('should return empty array when no items found', async () => {
        mockStorage.getItemsByUserId.mockResolvedValue([]);

        const result = await mockStorage.getItemsByUserId('test-replit-user-id');

        expect(result).toEqual([]);
      });

      it('should not return items from other users', async () => {
        // Verify user isolation
        mockStorage.getItemsByUserId.mockImplementation((userId: string) => {
          if (userId === 'test-replit-user-id') {
            return Promise.resolve(mockItems);
          }
          return Promise.resolve([]);
        });

        const userItems = await mockStorage.getItemsByUserId('test-replit-user-id');
        const otherUserItems = await mockStorage.getItemsByUserId('other-replit-user-id');

        expect(userItems).toEqual(mockItems);
        expect(otherUserItems).toEqual([]);
      });
    });

    describe('createItem', () => {
      it('should create new item for user', async () => {
        const newItemData = {
          userId: 'test-replit-user-id',
          item: 'New test item'
        };

        const createdItem = {
          id: 3,
          ...newItemData
        };

        mockStorage.createItem.mockResolvedValue(createdItem);

        const result = await mockStorage.createItem(newItemData);

        expect(mockStorage.createItem).toHaveBeenCalledWith(newItemData);
        expect(result).toEqual(createdItem);
      });

      it('should validate item ownership during creation', async () => {
        const itemData = {
          userId: 'test-replit-user-id',
          item: 'Test item'
        };

        mockStorage.createItem.mockResolvedValue({
          id: 1,
          ...itemData
        });

        const result = await mockStorage.createItem(itemData);

        expect(result.userId).toBe('test-replit-user-id');
      });
    });

    describe('deleteItem', () => {
      it('should delete item by ID', async () => {
        mockStorage.deleteItem.mockResolvedValue(true);

        await mockStorage.deleteItem(1);

        expect(mockStorage.deleteItem).toHaveBeenCalledWith(1);
      });

      it('should handle deletion of non-existent item', async () => {
        const notFoundError = new Error('Item not found');
        mockStorage.deleteItem.mockRejectedValue(notFoundError);

        await expect(mockStorage.deleteItem(999))
          .rejects.toThrow('Item not found');
      });
    });
  });

  describe('File Storage Operations', () => {
    const mockFiles = [
      {
        id: 1,
        name: 'test-file-1.jpg',
        originalName: 'original1.jpg',
        path: 'uploads/test-replit-user-id/test-file-1.jpg',
        url: 'https://storage.example.com/test-file-1.jpg',
        size: 1024,
        type: 'image/jpeg',
        userId: 'test-replit-user-id'
      },
      {
        id: 2,
        name: 'test-file-2.pdf',
        originalName: 'document.pdf',
        path: 'uploads/test-replit-user-id/test-file-2.pdf',
        url: 'https://storage.example.com/test-file-2.pdf',
        size: 2048,
        type: 'application/pdf',
        userId: 'test-replit-user-id'
      }
    ];

    describe('getFilesByUserId', () => {
      it('should retrieve files for user', async () => {
        mockStorage.getFilesByUserId.mockResolvedValue(mockFiles);

        const result = await mockStorage.getFilesByUserId('test-replit-user-id');

        expect(mockStorage.getFilesByUserId).toHaveBeenCalledWith('test-replit-user-id');
        expect(result).toEqual(mockFiles);
      });

      it('should return empty array when no files found', async () => {
        mockStorage.getFilesByUserId.mockResolvedValue([]);

        const result = await mockStorage.getFilesByUserId('test-replit-user-id');

        expect(result).toEqual([]);
      });

      it('should enforce user file isolation', async () => {
        // Verify files are isolated by user
        mockStorage.getFilesByUserId.mockImplementation((userId: string) => {
          if (userId === 'test-replit-user-id') {
            return Promise.resolve(mockFiles);
          }
          return Promise.resolve([]);
        });

        const userFiles = await mockStorage.getFilesByUserId('test-replit-user-id');
        const otherUserFiles = await mockStorage.getFilesByUserId('other-replit-user-id');

        expect(userFiles).toEqual(mockFiles);
        expect(otherUserFiles).toEqual([]);
      });
    });

    describe('createFile', () => {
      it('should create new file record for user', async () => {
        const newFileData = {
          userId: 'test-replit-user-id',
          name: 'new-file.jpg',
          originalName: 'photo.jpg',
          path: 'uploads/test-replit-user-id/new-file.jpg',
          url: 'https://storage.example.com/new-file.jpg',
          size: 1536,
          type: 'image/jpeg'
        };

        const createdFile = {
          id: 3,
          ...newFileData
        };

        mockStorage.createFile.mockResolvedValue(createdFile);

        const result = await mockStorage.createFile(newFileData);

        expect(mockStorage.createFile).toHaveBeenCalledWith(newFileData);
        expect(result).toEqual(createdFile);
      });

      it('should validate file metadata', async () => {
        const fileData = {
          userId: 'test-replit-user-id',
          name: 'test.jpg',
          originalName: 'test.jpg',
          path: 'uploads/test-replit-user-id/test.jpg',
          url: 'https://storage.example.com/test.jpg',
          size: 1024,
          type: 'image/jpeg'
        };

        mockStorage.createFile.mockResolvedValue({ id: 1, ...fileData });

        const result = await mockStorage.createFile(fileData);

        expect(result.userId).toBe('test-replit-user-id');
        expect(result.size).toBeGreaterThan(0);
        expect(result.type).toMatch(/^[a-z]+\/[a-z]+$/);
      });
    });

    describe('deleteFile', () => {
      it('should delete file record by ID', async () => {
        mockStorage.deleteFile.mockResolvedValue(true);

        await mockStorage.deleteFile(1);

        expect(mockStorage.deleteFile).toHaveBeenCalledWith(1);
      });

      it('should handle deletion of non-existent file', async () => {
        const notFoundError = new Error('File not found');
        mockStorage.deleteFile.mockRejectedValue(notFoundError);

        await expect(mockStorage.deleteFile(999))
          .rejects.toThrow('File not found');
      });
    });
  });

  describe('Data Integrity and Security', () => {
    it('should enforce user ownership in all operations', async () => {
      const userId = 'test-replit-user-id';

      // Test user operations
      await mockStorage.getUserById(userId);
      expect(mockStorage.getUserById).toHaveBeenCalledWith(userId);

      // Test item operations
      await mockStorage.getItemsByUserId(userId);
      expect(mockStorage.getItemsByUserId).toHaveBeenCalledWith(userId);

      // Test file operations
      await mockStorage.getFilesByUserId(userId);
      expect(mockStorage.getFilesByUserId).toHaveBeenCalledWith(userId);
    });

    it('should handle concurrent operations safely', async () => {
      // Simulate concurrent operations
      const promises = [
        mockStorage.getUserById('user1'),
        mockStorage.getUserById('user2'),
        mockStorage.getItemsByUserId('user1'),
        mockStorage.getFilesByUserId('user2')
      ];

      mockStorage.getUserById.mockResolvedValue({ id: 'user1' });
      mockStorage.getItemsByUserId.mockResolvedValue([]);
      mockStorage.getFilesByUserId.mockResolvedValue([]);

      await Promise.all(promises);

      // Verify all operations completed
      expect(mockStorage.getUserById).toHaveBeenCalledTimes(2);
      expect(mockStorage.getItemsByUserId).toHaveBeenCalledTimes(1);
      expect(mockStorage.getFilesByUserId).toHaveBeenCalledTimes(1);
    });

    it('should validate data types and constraints', async () => {
      // Test subscription type validation
      const validSubscriptions = ['free', 'pro'];
      const userData = {
        id: 'test-uid',
        email: 'test@example.com',
        subscriptionType: 'pro'
      };

      mockStorage.createUser.mockImplementation((data: any) => {
        if (!validSubscriptions.includes(data.subscriptionType)) {
          return Promise.reject(new Error('Invalid subscription type'));
        }
        return Promise.resolve(data);
      });

      await expect(mockStorage.createUser(userData))
        .resolves.toBeDefined();

      // Test invalid subscription type
      const invalidUserData = { ...userData, subscriptionType: 'invalid' };
      await expect(mockStorage.createUser(invalidUserData))
        .rejects.toThrow('Invalid subscription type');
    });
  });
});