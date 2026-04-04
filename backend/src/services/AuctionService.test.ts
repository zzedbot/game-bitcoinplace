import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuctionService } from './AuctionService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    auction: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    bid: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    wallet: {
      findUnique: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) => fn({
      auction: mockPrisma.auction,
      bid: mockPrisma.bid,
      wallet: mockPrisma.wallet,
      transaction: mockPrisma.transaction,
    })),
  };
  return { PrismaClient: vi.fn(() => mockPrisma) };
});

describe('AuctionService', () => {
  let service: AuctionService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = new PrismaClient();
    service = new AuctionService(mockPrisma, 0.05); // 5% fee
  });

  describe('BE-6.1T: createAuction creates auction', () => {
    it('should create auction with valid params', async () => {
      // Arrange
      const mockAuction = {
        id: 1,
        sellerId: 'seller1',
        type: 'COLOR_RIGHT',
        itemId: 'item1',
        startPrice: 100,
        currentPrice: 100,
        startTime: new Date(),
        endTime: new Date(),
        status: 'ACTIVE',
      };
      mockPrisma.auction.create.mockResolvedValue(mockAuction);

      // Act
      const auction = await service.createAuction(
        'seller1',
        'COLOR_RIGHT',
        'item1',
        100,
        24
      );

      // Assert
      expect(auction.id).toBe(1);
      expect(auction.status).toBe('ACTIVE');
      expect(mockPrisma.auction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sellerId: 'seller1',
          type: 'COLOR_RIGHT',
          startPrice: 100,
          currentPrice: 100,
          status: 'ACTIVE',
        }),
      });
    });

    it('should create auction with buyout price', async () => {
      // Arrange
      mockPrisma.auction.create.mockResolvedValue({
        id: 1,
        buyoutPrice: 500,
      });

      // Act
      await service.createAuction('seller1', 'COLOR_RIGHT', 'item1', 100, 24, 500);

      // Assert
      expect(mockPrisma.auction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          buyoutPrice: 500,
        }),
      });
    });

    it('should throw if start price <= 0', async () => {
      // Act & Assert
      await expect(
        service.createAuction('seller1', 'COLOR_RIGHT', 'item1', 0, 24)
      ).rejects.toThrow('Start price must be positive');
    });

    it('should throw if duration <= 0', async () => {
      // Act & Assert
      await expect(
        service.createAuction('seller1', 'COLOR_RIGHT', 'item1', 100, 0)
      ).rejects.toThrow('Duration must be positive');
    });

    it('should throw if buyout <= start price', async () => {
      // Act & Assert
      await expect(
        service.createAuction('seller1', 'COLOR_RIGHT', 'item1', 100, 24, 50)
      ).rejects.toThrow('Buyout price must be higher than start price');
    });
  });

  describe('BE-6.3T: placeBid places bid', () => {
    it('should place valid bid', async () => {
      // Arrange
      const mockAuction = {
        id: 1,
        sellerId: 'seller1',
        status: 'ACTIVE',
        currentPrice: 100,
        endTime: new Date(Date.now() + 3600000),
      };
      const mockBid = { id: 1, amount: 150 };
      mockPrisma.auction.findUnique.mockResolvedValue(mockAuction);
      mockPrisma.bid.findFirst.mockResolvedValue(null);
      mockPrisma.bid.create.mockResolvedValue(mockBid);
      mockPrisma.auction.update.mockResolvedValue({ ...mockAuction, currentPrice: 150 });

      // Act
      const result = await service.placeBid(1, 'bidder1', 150);

      // Assert
      expect(result.auction.currentPrice).toBe(150);
      expect(result.bid.id).toBe(1);
    });

    it('should require minimum bid increment', async () => {
      // Arrange
      mockPrisma.auction.findUnique.mockResolvedValue({
        id: 1,
        currentPrice: 100,
        status: 'ACTIVE',
        endTime: new Date(Date.now() + 3600000),
      });

      // Act & Assert
      await expect(
        service.placeBid(1, 'bidder1', 100)
      ).rejects.toThrow('Bid must be at least 101');
    });

    it('should throw if auction not found', async () => {
      // Arrange
      mockPrisma.auction.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.placeBid(999, 'bidder1', 150)
      ).rejects.toThrow('Auction not found');
    });

    it('should throw if auction not active', async () => {
      // Arrange
      mockPrisma.auction.findUnique.mockResolvedValue({
        id: 1,
        status: 'SOLD',
      });

      // Act & Assert
      await expect(
        service.placeBid(1, 'bidder1', 150)
      ).rejects.toThrow('Auction is not active');
    });

    it('should throw if auction ended', async () => {
      // Arrange
      mockPrisma.auction.findUnique.mockResolvedValue({
        id: 1,
        status: 'ACTIVE',
        endTime: new Date(Date.now() - 3600000),
      });

      // Act & Assert
      await expect(
        service.placeBid(1, 'bidder1', 150)
      ).rejects.toThrow('Auction has ended');
    });

    it('should throw if seller bids on own auction', async () => {
      // Arrange
      mockPrisma.auction.findUnique.mockResolvedValue({
        id: 1,
        sellerId: 'seller1',
        status: 'ACTIVE',
        endTime: new Date(Date.now() + 3600000),
      });

      // Act & Assert
      await expect(
        service.placeBid(1, 'seller1', 150)
      ).rejects.toThrow('Seller cannot bid on own auction');
    });
  });

  describe('BE-6.4T: buyout purchases auction', () => {
    it('should complete buyout', async () => {
      // Arrange
      const mockAuction = {
        id: 1,
        buyoutPrice: 500,
        status: 'ACTIVE',
      };
      mockPrisma.auction.findUnique.mockResolvedValue(mockAuction);
      mockPrisma.wallet.findUnique.mockResolvedValue({ balance: 1000 });
      mockPrisma.auction.update.mockResolvedValue({ ...mockAuction, status: 'SOLD' });

      // Act
      const result = await service.buyout(1, 'buyer1');

      // Assert
      expect(result.status).toBe('SOLD');
    });

    it('should throw if no buyout price', async () => {
      // Arrange
      mockPrisma.auction.findUnique.mockResolvedValue({
        id: 1,
        buyoutPrice: null,
      });

      // Act & Assert
      await expect(
        service.buyout(1, 'buyer1')
      ).rejects.toThrow('Auction has no buyout price');
    });

    it('should throw if insufficient balance', async () => {
      // Arrange
      mockPrisma.auction.findUnique.mockResolvedValue({
        id: 1,
        buyoutPrice: 500,
        status: 'ACTIVE',
      });
      mockPrisma.wallet.findUnique.mockResolvedValue({ balance: 100 });

      // Act & Assert
      await expect(
        service.buyout(1, 'buyer1')
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('BE-6.5T: getAuctions queries auctions', () => {
    it('should return all auctions', async () => {
      // Arrange
      const auctions = [{ id: 1 }, { id: 2 }];
      mockPrisma.auction.findMany.mockResolvedValue(auctions);

      // Act
      const result = await service.getAuctions({});

      // Assert
      expect(result.length).toBe(2);
    });

    it('should filter by status', async () => {
      // Arrange
      mockPrisma.auction.findMany.mockResolvedValue([]);

      // Act
      await service.getAuctions({ status: 'ACTIVE' });

      // Assert
      expect(mockPrisma.auction.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        take: 20,
        skip: 0,
        orderBy: { endTime: 'asc' },
      });
    });

    it('should filter by price range', async () => {
      // Arrange
      mockPrisma.auction.findMany.mockResolvedValue([]);

      // Act
      await service.getAuctions({ minPrice: 100, maxPrice: 500 });

      // Assert
      expect(mockPrisma.auction.findMany).toHaveBeenCalledWith({
        where: {
          currentPrice: {
            gte: 100,
            lte: 500,
          },
        },
        take: 20,
        skip: 0,
        orderBy: { endTime: 'asc' },
      });
    });

    it('should support pagination', async () => {
      // Arrange
      mockPrisma.auction.findMany.mockResolvedValue([]);

      // Act
      await service.getAuctions({}, 10, 20);

      // Assert
      expect(mockPrisma.auction.findMany).toHaveBeenCalledWith({
        where: {},
        take: 10,
        skip: 20,
        orderBy: { endTime: 'asc' },
      });
    });
  });

  describe('BE-6.6T: processExpiredAuctions handles expiration', () => {
    it('should mark auction as sold if has buyer', async () => {
      // Arrange
      mockPrisma.auction.findMany.mockResolvedValue([
        { id: 1, buyerId: 'buyer1', currentPrice: 500 },
      ]);
      mockPrisma.auction.update.mockResolvedValue({ status: 'SOLD' });

      // Act
      const count = await service.processExpiredAuctions();

      // Assert
      expect(count).toBe(1);
      expect(mockPrisma.auction.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'SOLD' },
      });
    });

    it('should mark auction as expired if no buyer', async () => {
      // Arrange
      mockPrisma.auction.findMany.mockResolvedValue([
        { id: 1, buyerId: null },
      ]);

      // Act
      await service.processExpiredAuctions();

      // Assert
      expect(mockPrisma.auction.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'EXPIRED' },
      });
    });
  });

  describe('BE-6.7T: calculateFee calculates correctly', () => {
    it('should calculate 5% fee', () => {
      // Act
      const fee = service.calculateFee(1000);

      // Assert
      expect(fee).toBe(50);
    });

    it('should calculate fee for large amounts', () => {
      // Act
      const fee = service.calculateFee(10000);

      // Assert
      expect(fee).toBe(500);
    });

    it('should floor the result', () => {
      // Act
      const fee = service.calculateFee(1001);

      // Assert
      expect(fee).toBe(50); // 1001 * 0.05 = 50.05 -> 50
    });
  });

  describe('BE-6.7T: calculateSellerProceeds calculates net amount', () => {
    it('should subtract fee from amount', () => {
      // Act
      const proceeds = service.calculateSellerProceeds(1000);

      // Assert
      expect(proceeds).toBe(950);
    });

    it('should handle large amounts', () => {
      // Act
      const proceeds = service.calculateSellerProceeds(10000);

      // Assert
      expect(proceeds).toBe(9500);
    });
  });

  describe('BE-6.5T: getStats returns statistics', () => {
    it('should return auction statistics', async () => {
      // Arrange
      mockPrisma.auction.count.mockResolvedValueOnce(100); // total
      mockPrisma.auction.count.mockResolvedValueOnce(50);  // active
      mockPrisma.auction.count.mockResolvedValueOnce(30);  // sold
      mockPrisma.auction.findMany.mockResolvedValue([
        { currentPrice: 100 },
        { currentPrice: 200 },
      ]);

      // Act
      const stats = await service.getStats();

      // Assert
      expect(stats.totalAuctions).toBe(100);
      expect(stats.activeAuctions).toBe(50);
      expect(stats.soldAuctions).toBe(30);
      expect(stats.totalVolume).toBe(300);
    });
  });

  describe('BE-6.2T: cancelAuction cancels auction', () => {
    it('should cancel auction with no bids', async () => {
      // Arrange
      mockPrisma.auction.findUnique.mockResolvedValue({
        id: 1,
        sellerId: 'seller1',
        status: 'ACTIVE',
        bids: [],
      });
      mockPrisma.auction.update.mockResolvedValue({ status: 'CANCELLED' });

      // Act
      const result = await service.cancelAuction(1, 'seller1');

      // Assert
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw if not seller', async () => {
      // Arrange
      mockPrisma.auction.findUnique.mockResolvedValue({
        id: 1,
        sellerId: 'seller1',
      });

      // Act & Assert
      await expect(
        service.cancelAuction(1, 'seller2')
      ).rejects.toThrow('Only seller can cancel auction');
    });

    it('should throw if has bids', async () => {
      // Arrange
      mockPrisma.auction.findUnique.mockResolvedValue({
        id: 1,
        sellerId: 'seller1',
        status: 'ACTIVE',
        bids: [{ id: 1 }],
      });

      // Act & Assert
      await expect(
        service.cancelAuction(1, 'seller1')
      ).rejects.toThrow('Cannot cancel auction with bids');
    });
  });

  describe('BE-6.5T: getAuctionById returns details', () => {
    it('should return auction with bids', async () => {
      // Arrange
      const mockAuction = {
        id: 1,
        bids: [{ id: 1, amount: 100 }],
      };
      mockPrisma.auction.findUnique.mockResolvedValue(mockAuction);

      // Act
      const result = await service.getAuctionById(1);

      // Assert
      expect(result.id).toBe(1);
      expect(result.bids.length).toBe(1);
    });

    it('should throw if not found', async () => {
      // Arrange
      mockPrisma.auction.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getAuctionById(999)
      ).rejects.toThrow('Auction not found');
    });
  });
});
