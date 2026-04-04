import { PrismaClient } from '@prisma/client';
import nodemailer, { Transporter } from 'nodemailer';

export type NotificationType =
  | 'MINING_REWARD'
  | 'AUCTION_NEW_BID'
  | 'AUCTION_OUTBID'
  | 'AUCTION_WON'
  | 'AUCTION_LOST'
  | 'SYSTEM'
  | 'P2P_TRANSFER'
  | 'COLOR_RIGHT_ALLOCATED';

export interface Notification {
  id: number;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  data?: any;
  createdAt: Date;
}

export class NotificationService {
  private prisma: PrismaClient;
  private transport: Transporter | null = null;
  private initialized: boolean = false;

  private readonly MAX_CONTENT_LENGTH = 5000;
  private readonly VALID_TYPES: NotificationType[] = [
    'MINING_REWARD',
    'AUCTION_NEW_BID',
    'AUCTION_OUTBID',
    'AUCTION_WON',
    'AUCTION_LOST',
    'SYSTEM',
    'P2P_TRANSFER',
    'COLOR_RIGHT_ALLOCATED',
  ];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 初始化邮件传输
   */
  async initialize(): Promise<void> {
    const smtpHost = process.env.SMTP_HOST || 'localhost';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    this.transport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser && smtpPass ? {
        user: smtpUser,
        pass: smtpPass,
      } : undefined,
    });

    this.initialized = true;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 发送应用内通知
   */
  async sendInAppNotification(
    userId: string,
    type: NotificationType,
    title: string,
    content: string,
    data?: any
  ): Promise<Notification> {
    await this.validateNotification(userId, type, title, content);

    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
        isRead: false,
        data,
      },
    });
  }

  /**
   * 发送邮件
   */
  async sendEmail(to: string, subject: string, html: string): Promise<{ messageId: string }> {
    if (!this.transport) {
      throw new Error('Email transport not initialized');
    }

    const result = await this.transport.sendMail({
      from: process.env.SMTP_FROM || 'noreply@bitcoinplace.com',
      to,
      subject,
      html,
    });

    return { messageId: result.messageId };
  }

  /**
   * 发送挖矿奖励通知
   */
  async sendMiningRewardNotification(
    userId: string,
    amount: number,
    blockNumber: number,
    sendEmailOption: boolean = false,
    userEmail?: string
  ): Promise<Notification> {
    const title = 'Mining Reward';
    const content = `You received ${amount} PX from block #${blockNumber}`;

    const notification = await this.sendInAppNotification(
      userId,
      'MINING_REWARD',
      title,
      content,
      { amount, blockNumber }
    );

    if (sendEmailOption && userEmail) {
      await this.sendEmail(
        userEmail,
        'Mining Reward Received',
        `<p>Congratulations! You received <strong>${amount} PX</strong> from block #${blockNumber}.</p>`
      );
    }

    return notification;
  }

  /**
   * 发送拍卖通知
   */
  async sendAuctionNotification(
    userId: string,
    eventType: 'NEW_BID' | 'AUCTION_WON' | 'OUTBID' | 'AUCTION_LOST',
    eventData: {
      auctionId: string;
      bidAmount?: number;
      finalPrice?: number;
      newBid?: number;
    }
  ): Promise<Notification> {
    let type: NotificationType;
    let title: string;
    let content: string;

    switch (eventType) {
      case 'NEW_BID':
        type = 'AUCTION_NEW_BID';
        title = 'New Bid on Your Auction';
        content = `A new bid of ${eventData.bidAmount} PX was placed on auction ${eventData.auctionId}`;
        break;
      case 'AUCTION_WON':
        type = 'AUCTION_WON';
        title = 'Auction Won!';
        content = `Congratulations! You won auction ${eventData.auctionId} for ${eventData.finalPrice} PX`;
        break;
      case 'OUTBID':
        type = 'AUCTION_OUTBID';
        title = 'You\'ve Been Outbid';
        content = `Someone bid ${eventData.newBid} PX on auction ${eventData.auctionId}`;
        break;
      case 'AUCTION_LOST':
        type = 'AUCTION_LOST';
        title = 'Auction Lost';
        content = `You were outbid on auction ${eventData.auctionId}`;
        break;
    }

    return this.sendInAppNotification(userId, type, title, content, {
      auctionId: eventData.auctionId,
      ...eventData,
    });
  }

  /**
   * 获取未读通知
   */
  async getUnreadNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    
    // Filter to ensure only unread notifications are returned
    return notifications.filter(n => !n.isRead);
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId: number): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    // Try updateMany first (Prisma standard)
    if ((this.prisma.notification as any).updateMany) {
      const result = await (this.prisma.notification as any).updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: { isRead: true },
      });
      return { count: result?.count ?? 0 };
    }

    // Fallback to update if updateMany doesn't exist
    const result = await this.prisma.notification.update({
      where: { userId, isRead: false } as any,
      data: { isRead: true },
    } as any);
    
    return { count: (result as any)?.count ?? 1 };
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId: number): Promise<void> {
    await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * 获取通知历史
   */
  async getNotificationHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 批量发送通知
   */
  async sendBulkNotifications(
    userIds: string[],
    type: NotificationType,
    title: string,
    content: string,
    data?: any
  ): Promise<Notification[]> {
    if (userIds.length === 0) {
      return [];
    }

    const notifications: Notification[] = [];

    for (const userId of userIds) {
      try {
        const notification = await this.sendInAppNotification(userId, type, title, content, data);
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send notification to user ${userId}:`, error);
      }
    }

    return notifications;
  }

  /**
   * 验证通知参数
   */
  async validateNotification(
    userId: string,
    type: NotificationType,
    title: string,
    content: string
  ): Promise<void> {
    if (!userId || userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!title || title.trim().length === 0) {
      throw new Error('Title is required');
    }

    if (title.length > 200) {
      throw new Error('Title exceeds maximum length of 200 characters');
    }

    if (content.length > this.MAX_CONTENT_LENGTH) {
      throw new Error(`Content exceeds maximum length of ${this.MAX_CONTENT_LENGTH} characters`);
    }

    if (!this.VALID_TYPES.includes(type)) {
      throw new Error(`Invalid notification type: ${type}`);
    }
  }
}
