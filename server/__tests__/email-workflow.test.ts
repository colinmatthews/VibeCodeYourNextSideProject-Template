import request from 'supertest';
import express from 'express';
import { registerItemRoutes } from '../routes/itemRoutes';
import { sendEmail } from '../mail';
import { resetAllMocks, mockStorage, mockSendGrid } from './setup/mocks';

// Import and apply mocks
import './setup/mocks';

// TypeScript declarations for global mocks
declare global {
  var mockMailServiceInstance: {
    setApiKey: jest.MockedFunction<any>;
    send: jest.MockedFunction<any>;
  };
  var mockSendGrid: any;
}

// Get the global mock instance
const getMockMailService = () => global.mockMailServiceInstance;

describe('Email Workflow', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    await registerItemRoutes(app);
  });

  beforeEach(() => {
    resetAllMocks();
    process.env.SENDGRID_API_KEY = 'SG.test_api_key';
  });

  afterEach(() => {
    delete process.env.SENDGRID_API_KEY;
  });

  describe('SendGrid Email Service', () => {
    it('should send email successfully with valid parameters', async () => {
      const emailParams = {
        to: 'test@example.com',
        from: 'carlos@kindnessengineering.com',
        subject: 'Test Email',
        text: 'Test email content',
        html: '<p>Test email content</p>'
      };

      const result = await sendEmail(emailParams);

      expect(result).toBe(true);

      // Verify SendGrid service was called correctly
      const mockMailService = getMockMailService();
      // Note: setApiKey is called at module import time, not during test execution
      expect(mockMailService.send).toHaveBeenCalledWith({
        to: 'test@example.com',
        from: 'carlos@kindnessengineering.com',
        subject: 'Test Email',
        text: 'Test email content',
        html: '<p>Test email content</p>'
      });
    });

    it('should send email with auto-generated HTML from text', async () => {
      const emailParams = {
        to: 'test@example.com',
        from: 'carlos@kindnessengineering.com',
        subject: 'Test Email',
        text: 'Line 1\nLine 2\nLine 3'
      };

      const result = await sendEmail(emailParams);

      expect(result).toBe(true);

      const mockMailService = getMockMailService();
      expect(mockMailService.send).toHaveBeenCalledWith({
        to: 'test@example.com',
        from: 'carlos@kindnessengineering.com',
        subject: 'Test Email',
        text: 'Line 1\nLine 2\nLine 3',
        html: 'Line 1<br>Line 2<br>Line 3'
      });
    });

    it('should use verified sender domain', async () => {
      const emailParams = {
        to: 'test@example.com',
        from: 'different@example.com', // This should be overridden
        subject: 'Test Email',
        text: 'Test content'
      };

      await sendEmail(emailParams);

      const mockMailService = getMockMailService();
      expect(mockMailService.send).toHaveBeenCalledWith({
        to: 'test@example.com',
        from: 'carlos@kindnessengineering.com', // Verified sender
        subject: 'Test Email',
        text: 'Test content',
        html: 'Test content'
      });
    });

    it('should return false for missing required parameters', async () => {
      const incompleteParams = {
        to: 'test@example.com',
        // Missing from, subject, text
      };

      const result = await sendEmail(incompleteParams as any);

      expect(result).toBe(false);

      // Verify SendGrid was not called
      const mockMailService = getMockMailService();
      expect(mockMailService.send).not.toHaveBeenCalled();
    });

    it('should handle SendGrid API errors', async () => {
      const emailParams = {
        to: 'test@example.com',
        from: 'carlos@kindnessengineering.com',
        subject: 'Test Email',
        text: 'Test content'
      };

      // Mock SendGrid error
      const mockMailService = getMockMailService();
      interface SendGridError extends Error {
        response?: {
          status: number;
          statusText?: string;
          body?: { errors: Array<{ message: string }> };
          headers?: Record<string, any>;
        };
      }
      const sendGridError = new Error('SendGrid API Error') as SendGridError;
      sendGridError.response = {
        status: 400,
        statusText: 'Bad Request',
        body: { errors: [{ message: 'Invalid email' }] },
        headers: {}
      };
      mockMailService.send.mockRejectedValue(sendGridError);

      const result = await sendEmail(emailParams);

      expect(result).toBe(false);
    });

    it('should handle network errors', async () => {
      const emailParams = {
        to: 'test@example.com',
        from: 'carlos@kindnessengineering.com',
        subject: 'Test Email',
        text: 'Test content'
      };

      // Mock network error
      const mockMailService = getMockMailService();
      mockMailService.send.mockRejectedValue(new Error('Network timeout'));

      const result = await sendEmail(emailParams);

      expect(result).toBe(false);
    });
  });

  describe('Item Creation Email Notifications', () => {
    it('should send notification email when user has email notifications enabled', async () => {
      // Setup: User with email notifications enabled
      const userWithNotifications = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        emailNotifications: true,
        subscriptionType: 'free'
      };

      const createdItem = {
        id: 1,
        item: 'Test task item',
        userId: 'test-replit-user-id'
      };

      mockStorage.getUserById.mockResolvedValue(userWithNotifications);
      mockStorage.getItemsByUserId.mockResolvedValue([]); // Under limit
      mockStorage.createItem.mockResolvedValue(createdItem);

      const response = await request(app)
        .post('/api/items')
        .send({
          item: 'Test task item'
        })
        .expect(200);

      // Verify item creation
      expect(response.body).toEqual(createdItem);

      // Verify email notification was sent
      const mockMailService = getMockMailService();
      expect(mockMailService.send).toHaveBeenCalledWith({
        to: 'test@example.com',
        from: 'carlos@kindnessengineering.com',
        subject: 'New Item Created',
        text: 'A new item "Test task item" has been created in your list.',
        html: '<p>A new item "<strong>Test task item</strong>" has been created in your list.</p>'
      });
    });

    it('should not send notification email when user has email notifications disabled', async () => {
      // Setup: User with email notifications disabled
      const userWithoutNotifications = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        emailNotifications: false,
        subscriptionType: 'free'
      };

      const createdItem = {
        id: 1,
        item: 'Test task item',
        userId: 'test-replit-user-id'
      };

      mockStorage.getUserById.mockResolvedValue(userWithoutNotifications);
      mockStorage.getItemsByUserId.mockResolvedValue([]);
      mockStorage.createItem.mockResolvedValue(createdItem);

      const response = await request(app)
        .post('/api/items')
        .send({
          item: 'Test task item'
        })
        .expect(200);

      // Verify item creation
      expect(response.body).toEqual(createdItem);

      // Verify no email notification was sent
      const mockMailService = getMockMailService();
      expect(mockMailService.send).not.toHaveBeenCalled();
    });

    it('should not send notification email when user has no email', async () => {
      // Setup: User without email
      const userWithoutEmail = {
        id: 'test-replit-user-id',
        email: null,
        emailNotifications: true,
        subscriptionType: 'free'
      };

      const createdItem = {
        id: 1,
        item: 'Test task item',
        userId: 'test-replit-user-id'
      };

      mockStorage.getUserById.mockResolvedValue(userWithoutEmail);
      mockStorage.getItemsByUserId.mockResolvedValue([]);
      mockStorage.createItem.mockResolvedValue(createdItem);

      const response = await request(app)
        .post('/api/items')
        .send({
          item: 'Test task item'
        })
        .expect(200);

      // Verify item creation
      expect(response.body).toEqual(createdItem);

      // Verify no email notification was sent
      const mockMailService = getMockMailService();
      expect(mockMailService.send).not.toHaveBeenCalled();
    });

    it('should continue item creation even if email notification fails', async () => {
      // Setup: User with email notifications enabled
      const userWithNotifications = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        emailNotifications: true,
        subscriptionType: 'free'
      };

      const createdItem = {
        id: 1,
        item: 'Test task item',
        userId: 'test-replit-user-id'
      };

      mockStorage.getUserById.mockResolvedValue(userWithNotifications);
      mockStorage.getItemsByUserId.mockResolvedValue([]);
      mockStorage.createItem.mockResolvedValue(createdItem);

      // Mock email sending failure
      const mockMailService = getMockMailService();
      mockMailService.send.mockRejectedValue(new Error('Email sending failed'));

      const response = await request(app)
        .post('/api/items')
        .send({
          item: 'Test task item'
        })
        .expect(200);

      // Verify item creation still succeeded
      expect(response.body).toEqual(createdItem);
      expect(mockStorage.createItem).toHaveBeenCalled();

      // Verify email sending was attempted
      expect(mockMailService.send).toHaveBeenCalled();
    });

    it('should handle special characters in email content', async () => {
      const userWithNotifications = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        emailNotifications: true,
        subscriptionType: 'free'
      };

      const itemWithSpecialChars = 'Test item with "quotes" & <tags>';
      const createdItem = {
        id: 1,
        item: itemWithSpecialChars,
        userId: 'test-replit-user-id'
      };

      mockStorage.getUserById.mockResolvedValue(userWithNotifications);
      mockStorage.getItemsByUserId.mockResolvedValue([]);
      mockStorage.createItem.mockResolvedValue(createdItem);

      const response = await request(app)
        .post('/api/items')
        .send({
          item: itemWithSpecialChars
        })
        .expect(200);

      // Verify email content handles special characters
      const mockMailService = getMockMailService();
      expect(mockMailService.send).toHaveBeenCalledWith({
        to: 'test@example.com',
        from: 'carlos@kindnessengineering.com',
        subject: 'New Item Created',
        text: `A new item "${itemWithSpecialChars}" has been created in your list.`,
        html: `<p>A new item "<strong>${itemWithSpecialChars}</strong>" has been created in your list.</p>`
      });
    });
  });

  describe('Email Environment Configuration', () => {
    it('should skip sending when SENDGRID_API_KEY is not configured', async () => {
      // Remove API key to simulate optional configuration
      delete process.env.SENDGRID_API_KEY;

      const emailParams = {
        to: 'test@example.com',
        from: 'carlos@kindnessengineering.com',
        subject: 'Test',
        text: 'Test content'
      };

      const result = await sendEmail(emailParams);

      expect(result).toBe(false);

      const mockMailService = getMockMailService();
      expect(mockMailService.send).not.toHaveBeenCalled();
    });

    it('should validate email addresses', async () => {
      const invalidEmailParams = {
        to: 'invalid-email',
        from: 'carlos@kindnessengineering.com',
        subject: 'Test',
        text: 'Test'
      };

      // SendGrid would reject invalid emails
      const mockMailService = getMockMailService();
      interface SendGridError extends Error {
        response?: {
          status: number;
          body?: { errors: Array<{ message: string }> };
        };
      }
      const validationError = new Error('Invalid email address') as SendGridError;
      validationError.response = {
        status: 400,
        body: { errors: [{ message: 'Invalid email format' }] }
      };
      mockMailService.send.mockRejectedValue(validationError);

      const result = await sendEmail(invalidEmailParams);

      expect(result).toBe(false);
    });
  });

  describe('Email Rate Limiting and Delivery', () => {
    it('should handle rate limiting gracefully', async () => {
      const emailParams = {
        to: 'test@example.com',
        from: 'carlos@kindnessengineering.com',
        subject: 'Test Email',
        text: 'Test content'
      };

      // Mock rate limiting error
      const mockMailService = getMockMailService();
      interface SendGridError extends Error {
        response?: {
          status: number;
          statusText?: string;
          body?: { errors: Array<{ message: string }> };
          headers?: Record<string, any>;
        };
      }
      const rateLimitError = new Error('Rate limit exceeded') as SendGridError;
      rateLimitError.response = {
        status: 429,
        statusText: 'Too Many Requests',
        body: { errors: [{ message: 'Rate limit exceeded' }] },
        headers: {
          'x-ratelimit-limit': '100',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '1641234600',
          'retry-after': '60'
        }
      };
      mockMailService.send.mockRejectedValue(rateLimitError);

      const result = await sendEmail(emailParams);

      expect(result).toBe(false);
    });

    it('should handle SendGrid rate limiting with realistic response structure', async () => {
      const emailParams = {
        to: 'test@example.com',
        from: 'carlos@kindnessengineering.com',
        subject: 'Rate Limited Email',
        text: 'This should be rate limited'
      };

      // Import the rate limit response from mocks
      const { mockSendGridRateLimitResponse } = require('./setup/mocks');
      const mockMailService = getMockMailService();
      
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = mockSendGridRateLimitResponse[0];
      mockMailService.send.mockRejectedValue(rateLimitError);

      const result = await sendEmail(emailParams);

      expect(result).toBe(false);
      // Verify the realistic rate limit response structure was used
      expect(mockMailService.send).toHaveBeenCalled();
    });

    it('should log email sending attempts for debugging', async () => {
      const emailParams = {
        to: 'test@example.com',
        from: 'carlos@kindnessengineering.com',
        subject: 'Debug Test',
        text: 'Debug content'
      };

      // Mock console.log to verify logging
      const consoleSpy = jest.spyOn(console, 'log');

      await sendEmail(emailParams);

      // Check that we have multiple log calls including the success message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SendGrid] Email sent successfully to:'),
        'test@example.com'
      );

      consoleSpy.mockRestore();
    });

    it('should handle bounced emails', async () => {
      const emailParams = {
        to: 'bounced@example.com',
        from: 'carlos@kindnessengineering.com',
        subject: 'Test Email',
        text: 'Test content'
      };

      // Mock bounce error
      const mockMailService = getMockMailService();
      interface SendGridError extends Error {
        response?: {
          status: number;
          body?: { errors: Array<{ message: string }> };
        };
      }
      const bounceError = new Error('Email bounced') as SendGridError;
      bounceError.response = {
        status: 400,
        body: { errors: [{ message: 'The email address is invalid' }] }
      };
      mockMailService.send.mockRejectedValue(bounceError);

      const result = await sendEmail(emailParams);

      expect(result).toBe(false);
    });
  });
});
