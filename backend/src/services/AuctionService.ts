/**
 * AuctionService - 拍卖行服务
 * 
 * 功能：
 * - 创建拍卖 (挂单)
 * - 竞价出价
 * - 一口价购买
 * - 拍卖查询/筛选
 * - 自动成交
 * - 交易手续费
 */

import { PrismaClient } from '@prisma/client';

export type AuctionStatus = 'ACTIVE' | 'SOLD' | 'EXPIRED' | 'CANCELLED';

export interface Auction {
  id: string;
  sellerId: string;
  colorRightId: string;
  startingPrice: bigint;
  currentPrice: bigint;
  buyNowPrice?: bigint | null;
  status: AuctionStatus;
  startTime: Date;
  endTime: Date;
  winnerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: bigint;
  createdAt: Date;
}

export class AuctionService {
  private prisma: PrismaClient;
  private feeRate: number;

  constructor(prisma: PrismaClient, feeRate: number = 0.05) {
    this.prisma = prisma;
    this.feeRate = feeRate;
  }

  /**
   * 创建拍卖
   */
  async createAuction(
    sellerId: string,
    type: AuctionType,
    itemId: string,
    startPrice: number,
    durationHours: number,
    buyoutPrice?: number
  ): Promise<Auction> {
    if (startPrice <= 0) {
      throw new Error('Start price must be positive');
    }

    if (durationHours <= 0) {
      throw new Error('Duration must be positive');
    }

    if (buyoutPrice && buyoutPrice <= startPrice) {
      throw new Error('Buyout price must be higher than start price');
    }

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    return this.prisma.auction.create({
      data: {
        sellerId,
        type,
        itemId,
        startPrice,
        currentPrice: startPrice,
        buyoutPrice,
        startTime,
        endTime,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * 竞价
   */
  async placeBid(
    auctionId: number,
    bidderId: string,
    amount: number
  ): Promise<{ auction: Auction; bid: Bid }> {
    return this.prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
      });

      if (!auction) {
        throw new Error('Auction not found');
      }

      if (auction.status !== 'ACTIVE') {
        throw new Error('Auction is not active');
      }

      if (auction.endTime <= new Date()) {
        throw new Error('Auction has ended');
      }

      if (bidderId === auction.sellerId) {
        throw new Error('Seller cannot bid on own auction');
      }

      const minBid = auction.currentPrice + 1;
      if (amount < minBid) {
        throw new Error(`Bid must be at least ${minBid}`);
      }

      // 检查是否有之前的出价，需要退款
      const previousBid = await tx.bid.findFirst({
        where: { auctionId, bidderId: { not: bidderId } },
        orderBy: { createdAt: 'desc' },
      });

      // 创建新出价
      const bid = await tx.bid.create({
        data: {
          auctionId,
          bidderId,
          amount,
        },
      });

      // 更新拍卖当前价格
      const updatedAuction = await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentPrice: amount,
          buyerId: bidderId,
        },
      });

      return { auction: updatedAuction, bid };
    });
  }

  /**
   * 一口价购买
   */
  async buyout(auctionId: number, buyerId: string): Promise<Auction> {
    return this.prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
      });

      if (!auction) {
        throw new Error('Auction not found');
      }

      if (!auction.buyoutPrice) {
        throw new Error('Auction has no buyout price');
      }

      if (auction.status !== 'ACTIVE') {
        throw new Error('Auction is not active');
      }

      // 扣除买家余额
      const buyerWallet = await tx.wallet.findUnique({
        where: { userId: buyerId },
      });

      if (!buyerWallet || buyerWallet.balance < auction.buyoutPrice) {
        throw new Error('Insufficient balance');
      }

      // 完成交易
      const updatedAuction = await tx.auction.update({
        where: { id: auctionId },
        data: {
          status: 'SOLD',
          currentPrice: auction.buyoutPrice,
          buyerId,
        },
      });

      // 创建交易记录
      await tx.transaction.create({
        data: {
          userId: buyerId,
          type: 'AUCTION_BID',
          amount: -auction.buyoutPrice,
          description: `Auction buyout #${auctionId}`,
        },
      });

      return updatedAuction;
    });
  }

  /**
   * 查询拍卖
   */
  async getAuctions(
    filters: {
      status?: AuctionStatus;
      type?: AuctionType;
      sellerId?: string;
      buyerId?: string;
      minPrice?: number;
      maxPrice?: number;
    },
    limit: number = 20,
    offset: number = 0
  ): Promise<Auction[]> {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.sellerId) {
      where.sellerId = filters.sellerId;
    }

    if (filters.buyerId) {
      where.buyerId = filters.buyerId;
    }

    if (filters.minPrice || filters.maxPrice) {
      where.currentPrice = {};
      if (filters.minPrice) {
        where.currentPrice.gte = filters.minPrice;
      }
      if (filters.maxPrice) {
        where.currentPrice.lte = filters.maxPrice;
      }
    }

    return this.prisma.auction.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { endTime: 'asc' },
    });
  }

  /**
   * 获取拍卖详情
   */
  async getAuctionById(auctionId: number): Promise<Auction & { bids: Bid[] }> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!auction) {
      throw new Error('Auction not found');
    }

    return auction as any;
  }

  /**
   * 取消拍卖
   */
  async cancelAuction(auctionId: number, sellerId: string): Promise<Auction> {
    return this.prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
      });

      if (!auction) {
        throw new Error('Auction not found');
      }

      if (auction.sellerId !== sellerId) {
        throw new Error('Only seller can cancel auction');
      }

      if (auction.status !== 'ACTIVE') {
        throw new Error('Cannot cancel non-active auction');
      }

      if (auction.bids && auction.bids.length > 0) {
        throw new Error('Cannot cancel auction with bids');
      }

      return tx.auction.update({
        where: { id: auctionId },
        data: { status: 'CANCELLED' },
      });
    });
  }

  /**
   * 处理到期拍卖
   */
  async processExpiredAuctions(): Promise<number> {
    const now = new Date();

    const expiredAuctions = await this.prisma.auction.findMany({
      where: {
        status: 'ACTIVE',
        endTime: { lte: now },
      },
    });

    let processedCount = 0;

    for (const auction of expiredAuctions) {
      await this.prisma.$transaction(async (tx) => {
        // 如果有出价，成交给出价最高者
        if (auction.buyerId) {
          await tx.auction.update({
            where: { id: auction.id },
            data: { status: 'SOLD' },
          });

          // 创建交易记录
          await tx.transaction.create({
            data: {
              userId: auction.buyerId,
              type: 'AUCTION_BID',
              amount: -auction.currentPrice,
              description: `Auction won #${auction.id}`,
            },
          });
        } else {
          // 无出价，流拍
          await tx.auction.update({
            where: { id: auction.id },
            data: { status: 'EXPIRED' },
          });
        }

        processedCount++;
      });
    }

    return processedCount;
  }

  /**
   * 计算手续费
   */
  calculateFee(amount: number): number {
    return Math.floor(amount * this.feeRate);
  }

  /**
   * 计算卖家收益
   */
  calculateSellerProceeds(amount: number): number {
    const fee = this.calculateFee(amount);
    return amount - fee;
  }

  /**
   * 获取拍卖统计
   */
  async getStats(): Promise<{
    totalAuctions: number;
    activeAuctions: number;
    soldAuctions: number;
    totalVolume: number;
  }> {
    const [total, active, sold] = await Promise.all([
      this.prisma.auction.count(),
      this.prisma.auction.count({ where: { status: 'ACTIVE' } }),
      this.prisma.auction.count({ where: { status: 'SOLD' } }),
    ]);

    const soldAuctions = await this.prisma.auction.findMany({
      where: { status: 'SOLD' },
      select: { currentPrice: true },
    });

    const totalVolume = soldAuctions.reduce((sum, a) => sum + a.currentPrice, 0);

    return {
      totalAuctions: total,
      activeAuctions: active,
      soldAuctions: sold,
      totalVolume,
    };
  }
}
