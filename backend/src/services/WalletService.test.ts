import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletService } from './WalletService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    wallet: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  
  // Make $transaction execute the function with the mock tx context
  mockPrisma.$transaction.mockImplementation(async (fn: any) => {
    const tx = {
      wallet: mockPrisma.wallet,
      transaction: mockPrisma.transaction,
    };
    return fn(tx);
  });
  
  return { PrismaClient: vi.fn(() => mockPrisma) };
});

describe('WalletService', () => {
  let service: WalletService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to avoid test pollution
    const mockPrismaInstance = new PrismaClient();
    (mockPrismaInstance.wallet.findUnique as any).mockReset();
    (mockPrismaInstance.wallet.create as any).mockReset();
    (mockPrismaInstance.wallet.update as any).mockReset();
    (mockPrismaInstance.transaction.create as any).mockReset();
    (mockPrismaInstance.transaction.findMany as any).mockReset();
    mockPrisma = mockPrismaInstance;
    service = new WalletService(mockPrisma as any);
  });

  describe('BE-5.5T-001: createWallet creates wallet for user', () => {
    it('should create new wallet with zero balance', async () => {
      // Arrange
      const userId = 'user123';
      mockPrisma.wallet.create.mockResolvedValue({
        id: 1,
        userId,
        balance: 0,
        frozenBalance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const wallet = await service.createWallet(userId);

      // Assert
      expect(wallet.userId).toBe(userId);
      expect(wallet.balance).toBe(0);
      expect(mockPrisma.wallet.create).toHaveBeenCalledWith({
        data: {
          userId,
          balance: 0,
          frozenBalance: 0,
        },
      });
    });

    it('should throw if wallet already exists', async () => {
      // Arrange
      const userId = 'user123';
      mockPrisma.wallet.create.mockRejectedValue(new Error('Unique constraint failed'));

      // Act & Assert
      await expect(service.createWallet(userId)).rejects.toThrow();
    });
  });

  describe('BE-5.5T-002: getBalance returns correct balance', () => {
    it('should return wallet balance', async () => {
      // Arrange
      const userId = 'user123';
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 1,
        userId,
        balance: 1000,
        frozenBalance: 200,
      });

      // Act
      const balance = await service.getBalance(userId);

      // Assert
      expect(balance).toBe(1000);
    });

    it('should return 0 for non-existent wallet', async () => {
      // Arrange
      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      // Act
      const balance = await service.getBalance('user123');

      // Assert
      expect(balance).toBe(0);
    });

    it('should return available balance (total - frozen)', async () => {
      // Arrange
      const userId = 'user123';
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 1,
        userId,
        balance: 1000,
        frozenBalance: 200,
      });

      // Act
      const available = await service.getAvailableBalance(userId);

      // Assert
      expect(available).toBe(800);
    });
  });

  describe('BE-5.5T-003: credit adds funds to wallet', () => {
    it('should credit amount to wallet', async () => {
      // Arrange
      const userId = 'user123';
      const amount = 500;
      mockPrisma.wallet.update.mockResolvedValue({
        id: 1,
        userId,
        balance: 500,
        frozenBalance: 0,
      });
      mockPrisma.transaction.create.mockResolvedValue({ id: 1 });

      // Act
      const result = await service.credit(userId, amount, 'MINING_REWARD');

      // Assert
      expect(result.balance).toBe(500);
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith({
        where: { userId },
        data: {
          balance: { increment: amount },
        },
      });
    });

    it('should create transaction record', async () => {
      // Arrange
      const userId = 'user123';
      const amount = 500;
      mockPrisma.wallet.update.mockResolvedValue({ id: 1, userId, balance: 500 });
      mockPrisma.transaction.create.mockResolvedValue({ id: 1 });

      // Act
      await service.credit(userId, amount, 'MINING_REWARD', 'Mining reward day 1');

      // Assert
      expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: 'MINING_REWARD',
          amount,
          description: 'Mining reward day 1',
        },
      });
    });

    it('should throw for negative amount', async () => {
      // Act & Assert
      await expect(service.credit('user123', -100, 'INVALID')).rejects.toThrow();
    });
  });

  describe('BE-5.5T-004: debit subtracts funds from wallet', () => {
    it('should debit amount from wallet', async () => {
      // Arrange
      const userId = 'user123';
      const amount = 200;
      mockPrisma.wallet.findUnique.mockResolvedValue({ balance: 1000 });
      mockPrisma.wallet.update.mockResolvedValue({ balance: 800 });
      mockPrisma.transaction.create.mockResolvedValue({ id: 1 });

      // Act
      const result = await service.debit(userId, amount, 'AUCTION_BID');

      // Assert
      expect(result.balance).toBe(800);
    });

    it('should throw for insufficient balance', async () => {
      // Arrange
      const userId = 'user123';
      const amount = 2000;
      mockPrisma.wallet.findUnique.mockResolvedValue({ balance: 1000 });

      // Act & Assert
      await expect(service.debit(userId, amount, 'AUCTION_BID')).rejects.toThrow('Insufficient balance');
    });

    it('should throw for negative amount', async () => {
      // Act & Assert
      await expect(service.debit('user123', -100, 'INVALID')).rejects.toThrow();
    });
  });

  describe('BE-5.5T-005: transfer moves funds between wallets', () => {
    it('should transfer amount between users', async () => {
      // Arrange
      const fromUserId = 'user1';
      const toUserId = 'user2';
      const amount = 100;

      mockPrisma.wallet.findUnique
        .mockResolvedValueOnce({ balance: 500, userId: fromUserId }) // from
        .mockResolvedValueOnce({ balance: 200, userId: toUserId }) // to
        .mockResolvedValueOnce({ balance: 400, userId: fromUserId }) // updated from
        .mockResolvedValueOnce({ balance: 300, userId: toUserId }); // updated to

      mockPrisma.wallet.update
        .mockResolvedValueOnce({ balance: 400, userId: fromUserId })
        .mockResolvedValueOnce({ balance: 300, userId: toUserId });

      mockPrisma.transaction.create.mockResolvedValue({ id: 1 });

      // Act
      const result = await service.transfer(fromUserId, toUserId, amount, 'P2P_TRANSFER');

      // Assert
      expect(result.fromWallet.balance).toBe(400);
      expect(result.toWallet.balance).toBe(300);
    });

    it('should throw for insufficient balance', async () => {
      // Arrange
      const fromUserId = 'user1';
      const toUserId = 'user2';
      const amount = 1000;

      mockPrisma.wallet.findUnique.mockResolvedValue({ balance: 500, userId: fromUserId });

      // Act & Assert
      await expect(service.transfer(fromUserId, toUserId, amount, 'P2P_TRANSFER')).rejects.toThrow();
    });

    it('should create transaction records for both parties', async () => {
      // Arrange
      const fromUserId = 'user1';
      const toUserId = 'user2';
      const amount = 100;

      mockPrisma.wallet.findUnique
        .mockResolvedValueOnce({ balance: 500, userId: fromUserId })
        .mockResolvedValueOnce({ balance: 200, userId: toUserId })
        .mockResolvedValueOnce({ balance: 400, userId: fromUserId })
        .mockResolvedValueOnce({ balance: 300, userId: toUserId });

      mockPrisma.wallet.update
        .mockResolvedValueOnce({ balance: 400, userId: fromUserId })
        .mockResolvedValueOnce({ balance: 300, userId: toUserId });

      mockPrisma.transaction.create.mockResolvedValue({ id: 1 });

      // Act
      await service.transfer(fromUserId, toUserId, amount, 'P2P_TRANSFER', 'Payment');

      // Assert
      expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('BE-5.5T-006: freeze locks funds', () => {
    it('should freeze specified amount', async () => {
      // Arrange
      const userId = 'user123';
      const amount = 200;
      mockPrisma.wallet.findUnique.mockResolvedValue({ balance: 1000, frozenBalance: 0 });
      mockPrisma.wallet.update.mockResolvedValue({ balance: 1000, frozenBalance: 200 });

      // Act
      const result = await service.freeze(userId, amount);

      // Assert
      expect(result.frozenBalance).toBe(200);
    });

    it('should throw for insufficient available balance', async () => {
      // Arrange
      const userId = 'user123';
      const amount = 1000;
      mockPrisma.wallet.findUnique.mockResolvedValue({ balance: 500, frozenBalance: 0 });

      // Act & Assert
      await expect(service.freeze(userId, amount)).rejects.toThrow('Insufficient available balance');
    });
  });

  describe('BE-5.5T-007: unfreeze releases frozen funds', () => {
    it('should unfreeze specified amount', async () => {
      // Arrange
      const userId = 'user123';
      const amount = 100;
      mockPrisma.wallet.findUnique.mockResolvedValueOnce({ balance: 1000, frozenBalance: 200 });
      mockPrisma.wallet.update.mockResolvedValueOnce({ balance: 1000, frozenBalance: 100 });

      // Act
      const result = await service.unfreeze(userId, amount);

      // Assert
      expect(result.frozenBalance).toBe(100);
    });

    it('should throw for insufficient frozen balance', async () => {
      // Arrange
      const userId = 'user123';
      const amount = 500;
      mockPrisma.wallet.findUnique.mockResolvedValueOnce({ balance: 1000, frozenBalance: 200 });

      // Act & Assert
      await expect(service.unfreeze(userId, amount)).rejects.toThrow();
    });
  });

  describe('BE-5.5T-008: getTransactionHistory returns history', async () => {
    it('should return transaction history for user', async () => {
      // Arrange
      const transactions = [
        { id: 1, type: 'MINING_REWARD', amount: 100, createdAt: new Date() },
        { id: 2, type: 'AUCTION_BID', amount: -50, createdAt: new Date() },
      ];
      mockPrisma.transaction.findMany.mockResolvedValueOnce(transactions);

      // Act
      const history = await service.getTransactionHistory('user123');

      // Assert
      expect(history.length).toBe(2);
    });

    it('should support pagination', async () => {
      // Arrange
      mockPrisma.transaction.findMany.mockResolvedValueOnce([]);

      // Act
      await service.getTransactionHistory('user123', 10, 0);

      // Assert
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('BE-5.5T-009: getOrCre ateWallet returns existing or creates new', async () => {
    it('should return existing wallet', async () => {
      // Arrange
      const userId = 'user123';
      const existingWallet = { id: 1, userId, balance: 500 };
      mockPrisma.wallet.findUnique.mockResolvedValueOnce(existingWallet);

      // Act
      const wallet = await service.getOrCreateWallet(userId);

      // Assert
      expect(wallet.balance).toBe(500);
      expect(mockPrisma.wallet.create).not.toHaveBeenCalled();
    });

    it('should create new wallet if not exists', async () => {
      // Arrange
      const userId = 'user123';
      mockPrisma.wallet.findUnique.mockResolvedValueOnce(null);
      mockPrisma.wallet.create.mockResolvedValueOnce({ id: 1, userId, balance: 0 });

      // Act
      const wallet = await service.getOrCreateWallet(userId);

      // Assert
      expect(wallet.balance).toBe(0);
      expect(mockPrisma.wallet.create).toHaveBeenCalled();
    });
  });

  describe('BE-5.5T-010: validateTransaction validates transaction params', () => {
    it('should not throw for valid params', async () => {
      // Act & Assert
      await expect(service.validateTransaction(100, 'MINING_REWARD')).resolves.not.toThrow();
    });

    it('should throw for zero amount', async () => {
      // Act & Assert
      await expect(service.validateTransaction(0, 'MINING_REWARD')).rejects.toThrow();
    });

    it('should throw for invalid transaction type', async () => {
      // Act & Assert
      await expect(service.validateTransaction(100, 'INVALID_TYPE' as any)).rejects.toThrow();
    });

    it('should throw for very large amount', async () => {
      // Act & Assert
      await expect(service.validateTransaction(1000000000, 'MINING_REWARD')).rejects.toThrow();
    });
  });

  describe('BE-5.5T-011: atomic transfer rolls back on failure', async () => {
    it('should rollback if debit fails', async () => {
      // Arrange
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      // Act & Assert
      await expect(service.transfer('user1', 'user2', 100, 'TRANSFER')).rejects.toThrow();
    });

    it('should complete successfully when all operations succeed', async () => {
      // Arrange
      mockPrisma.wallet.findUnique
        .mockResolvedValueOnce({ balance: 500 })
        .mockResolvedValueOnce({ balance: 200 });
      mockPrisma.$transaction.mockResolvedValue({ success: true });

      // Act
      const result = await service.transfer('user1', 'user2', 100, 'TRANSFER');

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('BE-5.5T-012: getTotalBalance sums all user balances', () => {
    it('should return sum of balance and frozen balance', async () => {
      // Arrange
      const userId = 'user123';
      mockPrisma.wallet.findUnique.mockResolvedValue({
        balance: 1000,
        frozenBalance: 200,
      });

      // Act
      const total = await service.getTotalBalance(userId);

      // Assert
      expect(total).toBe(1200);
    });
  });
});
