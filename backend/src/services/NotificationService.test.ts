import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from './NotificationService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(() => mockPrisma) };
});

// Mock nodemailer
vi.mock('nodemailer', async () => {
  const actual = await vi.importActual('nodemailer');
  return {
    ...actual,
    default: {
      ...actual,
      createTransport: vi.fn(() => ({
        sendMail: vi.fn().mockResolvedValue({ messageId: 'msg123' }),
      })),
    },
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'msg123' }),
    })),
  };
});

describe('NotificationService', () => {
  let service: NotificationService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = new PrismaClient();
    service = new NotificationService(mockPrisma as any);
  });

  describe('BE-5.7T-001: initialize configures email transport', () => {
    it('should create email transport', async () => {
      // Act
      await service.initialize();

      // Assert
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('BE-5.7T-002: sendInAppNotification creates notification', () => {
    it('should create in-app notification', async () => {
      // Arrange
      const userId = 'user123';
      const type = 'MINING_REWARD';
      const title = 'Mining Reward';
      const content = 'You received 100 PX';

      mockPrisma.notification.create.mockResolvedValue({
        id: 1,
        userId,
        type,
        title,
        content,
        isRead: false,
        createdAt: new Date(),
      });

      // Act
      const notification = await service.sendInAppNotification(userId, type, title, content);

      // Assert
      expect(notification.userId).toBe(userId);
      expect(notification.isRead).toBe(false);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type,
          title,
          content,
          isRead: false,
        },
      });
    });

    it('should handle optional data field', async () => {
      // Arrange
      const userId = 'user123';
      const data = { amount: 100, blockNumber: 1 };
      mockPrisma.notification.create.mockResolvedValue({ id: 1, data });

      // Act
      await service.sendInAppNotification(userId, 'MINING_REWARD', 'Reward', 'You got 100 PX', data);

      // Assert
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          data: data,
        }),
      });
    });
  });

  describe('BE-5.7T-003: sendEmail sends email notification', () => {
    it('should send email to user', async () => {
      // Arrange
      const to = 'user@example.com';
      const subject = 'Welcome to BitcoinPlace';
      const html = '<h1>Welcome!</h1>';
      await service.initialize();

      // Act
      const result = await service.sendEmail(to, subject, html);

      // Assert
      expect(result.messageId).toBe('msg123');
    });

    it('should handle email sending errors', async () => {
      // Arrange
      const mockTransport = { sendMail: vi.fn().mockRejectedValue(new Error('SMTP error')) };
      (service as any).transport = mockTransport;

      // Act & Assert
      await expect(service.sendEmail('user@example.com', 'Test', 'Content')).rejects.toThrow();
    });
  });

  describe('BE-5.7T-004: sendMiningRewardNotification sends reward notification', () => {
    it('should send in-app notification for mining reward', async () => {
      // Arrange
      const userId = 'user123';
      const amount = 10417;
      const blockNumber = 1;
      mockPrisma.notification.create.mockResolvedValue({ id: 1 });

      // Act
      await service.sendMiningRewardNotification(userId, amount, blockNumber);

      // Assert
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      const callArgs = mockPrisma.notification.create.mock.calls[0][0];
      expect(callArgs.data.type).toBe('MINING_REWARD');
      expect(callArgs.data.title).toContain('Mining Reward');
      expect(callArgs.data.content).toContain(amount.toString());
    });

    it('should optionally send email', async () => {
      // Arrange
      const userId = 'user123';
      const amount = 10417;
      mockPrisma.notification.create.mockResolvedValue({ id: 1, userId });
      const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue({ messageId: 'msg1' });

      // Act
      await service.sendMiningRewardNotification(userId, amount, 1, true, 'user@example.com');

      // Assert
      expect(sendEmailSpy).toHaveBeenCalled();
    });
  });

  describe('BE-5.7T-005: sendAuctionNotification sends auction notifications', () => {
    it('should send notification for new bid', async () => {
      // Arrange
      const userId = 'user123';
      mockPrisma.notification.create.mockResolvedValue({ id: 1 });

      // Act
      await service.sendAuctionNotification(userId, 'NEW_BID', {
        auctionId: 'auction1',
        bidAmount: 100,
      });

      // Assert
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'AUCTION_NEW_BID',
        }),
      });
    });

    it('should send notification for auction won', async () => {
      // Arrange
      const userId = 'user123';
      mockPrisma.notification.create.mockResolvedValue({ id: 1 });

      // Act
      await service.sendAuctionNotification(userId, 'AUCTION_WON', {
        auctionId: 'auction1',
        finalPrice: 500,
      });

      // Assert
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'AUCTION_WON',
        }),
      });
    });

    it('should send notification for auction outbid', async () => {
      // Arrange
      const userId = 'user123';
      mockPrisma.notification.create.mockResolvedValue({ id: 1 });

      // Act
      await service.sendAuctionNotification(userId, 'OUTBID', {
        auctionId: 'auction1',
        newBid: 200,
      });

      // Assert
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'AUCTION_OUTBID',
        }),
      });
    });
  });

  describe('BE-5.7T-006: getUnreadNotifications returns unread count', () => {
    it('should return unread notifications', async () => {
      // Arrange
      const unreadNotifications = [
        { id: 1, isRead: false },
        { id: 2, isRead: false },
      ];
      mockPrisma.notification.findMany.mockResolvedValue(unreadNotifications);

      // Act
      const result = await service.getUnreadNotifications('user123');

      // Assert
      expect(result.length).toBe(2);
    });

    it('should support limit parameter', async () => {
      // Arrange
      mockPrisma.notification.findMany.mockResolvedValue([]);

      // Act
      await service.getUnreadNotifications('user123', 10);

      // Assert
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123', isRead: false },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('BE-5.7T-007: markAsRead marks notification as read', () => {
    it('should mark single notification as read', async () => {
      // Arrange
      mockPrisma.notification.update.mockResolvedValue({ id: 1, isRead: true });

      // Act
      const result = await service.markAsRead(1);

      // Assert
      expect(result.isRead).toBe(true);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isRead: true },
      });
    });
  });

  describe('BE-5.7T-008: markAllAsRead marks all notifications as read', () => {
    it('should mark all notifications as read', async () => {
      // Arrange
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      // Act
      const result = await service.markAllAsRead('user123');

      // Assert
      expect(result.count).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user123', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('BE-5.7T-009: deleteNotification removes notification', () => {
    it('should delete notification', async () => {
      // Arrange
      mockPrisma.notification.delete.mockResolvedValue({ id: 1 });

      // Act
      await service.deleteNotification(1);

      // Assert
      expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('BE-5.7T-010: getNotificationHistory returns paginated history', () => {
    it('should return paginated notifications', async () => {
      // Arrange
      const notifications = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        type: 'MINING_REWARD',
        createdAt: new Date(),
      }));
      mockPrisma.notification.findMany.mockResolvedValue(notifications);

      // Act
      const result = await service.getNotificationHistory('user123', 10, 0);

      // Assert
      expect(result.length).toBe(20);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('BE-5.7T-011: sendBulkNotifications sends to multiple users', () => {
    it('should send notification to multiple users', async () => {
      // Arrange
      const userIds = ['user1', 'user2', 'user3'];
      mockPrisma.notification.create.mockResolvedValue({ id: 1 });

      // Act
      const results = await service.sendBulkNotifications(userIds, 'SYSTEM', 'Announcement', 'New feature!');

      // Assert
      expect(results.length).toBe(3);
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(3);
    });

    it('should handle empty user list', async () => {
      // Act
      const results = await service.sendBulkNotifications([], 'SYSTEM', 'Test', 'Content');

      // Assert
      expect(results.length).toBe(0);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('BE-5.7T-012: validateNotification validates notification params', () => {
    it('should not throw for valid params', async () => {
      // Act & Assert
      await expect(
        service.validateNotification('user123', 'MINING_REWARD', 'Title', 'Content')
      ).resolves.not.toThrow();
    });

    it('should throw for empty title', async () => {
      // Act & Assert
      await expect(
        service.validateNotification('user123', 'MINING_REWARD', '', 'Content')
      ).rejects.toThrow();
    });

    it('should throw for very long content', async () => {
      // Act & Assert
      await expect(
        service.validateNotification('user123', 'MINING_REWARD', 'Title', 'x'.repeat(10000))
      ).rejects.toThrow();
    });

    it('should throw for invalid notification type', async () => {
      // Act & Assert
      await expect(
        service.validateNotification('user123', 'INVALID_TYPE' as any, 'Title', 'Content')
      ).rejects.toThrow();
    });
  });
});
