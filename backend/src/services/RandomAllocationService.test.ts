import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RandomAllocationService } from './RandomAllocationService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findMany: vi.fn(),
    },
    colorRight: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
  };
  return { PrismaClient: vi.fn(() => mockPrisma) };
});

describe('RandomAllocationService', () => {
  let service: RandomAllocationService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = new PrismaClient();
    service = new RandomAllocationService(mockPrisma as any);
  });

  describe('BE-5.3T-001: allocateToOnlineUsers distributes rights fairly', () => {
    it('should allocate rights to all online users', async () => {
      // Arrange
      const onlineUsers = [
        { id: 1, userId: 'user1', lastActiveAt: new Date() },
        { id: 2, userId: 'user2', lastActiveAt: new Date() },
        { id: 3, userId: 'user3', lastActiveAt: new Date() },
      ];
      const totalRights = 300;
      mockPrisma.user.findMany.mockResolvedValue(onlineUsers);

      // Act
      const result = await service.allocateToOnlineUsers(totalRights);

      // Assert
      expect(result.allocatedRights).toBe(300);
      expect(result.recipients.length).toBe(3);
    });

    it('should distribute equally when weights are same', async () => {
      // Arrange
      const onlineUsers = [
        { id: 1, userId: 'user1', lastActiveAt: new Date() },
        { id: 2, userId: 'user2', lastActiveAt: new Date() },
      ];
      const totalRights = 100;
      mockPrisma.user.findMany.mockResolvedValue(onlineUsers);

      // Act
      const result = await service.allocateToOnlineUsers(totalRights);

      // Assert
      expect(result.recipients.every(r => r.rights === 50)).toBe(true);
    });

    it('should handle remainder when not divisible', async () => {
      // Arrange
      const onlineUsers = [
        { id: 1, userId: 'user1', lastActiveAt: new Date() },
        { id: 2, userId: 'user2', lastActiveAt: new Date() },
        { id: 3, userId: 'user3', lastActiveAt: new Date() },
      ];
      const totalRights = 100;
      mockPrisma.user.findMany.mockResolvedValue(onlineUsers);

      // Act
      const result = await service.allocateToOnlineUsers(totalRights);

      // Assert
      const total = result.recipients.reduce((sum, r) => sum + r.rights, 0);
      expect(total).toBe(100);
    });

    it('should handle single user', async () => {
      // Arrange
      const onlineUsers = [{ id: 1, userId: 'user1', lastActiveAt: new Date() }];
      const totalRights = 100;
      mockPrisma.user.findMany.mockResolvedValue(onlineUsers);

      // Act
      const result = await service.allocateToOnlineUsers(totalRights);

      // Assert
      expect(result.recipients[0].rights).toBe(100);
    });

    it('should handle zero users', async () => {
      // Arrange
      const onlineUsers: any[] = [];
      const totalRights = 100;
      mockPrisma.user.findMany.mockResolvedValue(onlineUsers);

      // Act
      const result = await service.allocateToOnlineUsers(totalRights);

      // Assert
      expect(result.recipients.length).toBe(0);
      expect(result.unallocatedRights).toBe(100);
    });
  });

  describe('BE-5.3T-002: calculateWeightedAllocation distributes by weight', () => {
    it('should allocate proportionally to weights', async () => {
      // Arrange
      const users = [
        { id: 1, weight: 10 },
        { id: 2, weight: 20 },
        { id: 3, weight: 30 },
      ];
      const totalRights = 600;

      // Act
      const result = await service.calculateWeightedAllocation(users, totalRights);

      // Assert
      expect(result[0].rights).toBe(100); // 10/60 * 600
      expect(result[1].rights).toBe(200); // 20/60 * 600
      expect(result[2].rights).toBe(300); // 30/60 * 600
    });

    it('should handle zero total weight', async () => {
      // Arrange
      const users = [
        { id: 1, weight: 0 },
        { id: 2, weight: 0 },
      ];
      const totalRights = 100;

      // Act
      const result = await service.calculateWeightedAllocation(users, totalRights);

      // Assert
      expect(result.every(r => r.rights === 0)).toBe(true);
    });

    it('should handle single user with any weight', async () => {
      // Arrange
      const users = [{ id: 1, weight: 5 }];
      const totalRights = 100;

      // Act
      const result = await service.calculateWeightedAllocation(users, totalRights);

      // Assert
      expect(result[0].rights).toBe(100);
    });
  });

  describe('BE-5.3T-003: calculateUserWeight computes correct weight', () => {
    it('should return higher weight for more active users', async () => {
      // Arrange
      const now = new Date('2026-04-04T12:00:00Z');
      const activeUser = { id: 1, lastActiveAt: new Date('2026-04-04T11:00:00Z') }; // 1h ago
      const inactiveUser = { id: 2, lastActiveAt: new Date('2026-04-03T12:00:00Z') }; // 24h ago

      // Act
      const activeWeight = await service.calculateUserWeight(activeUser, now);
      const inactiveWeight = await service.calculateUserWeight(inactiveUser, now);

      // Assert
      expect(activeWeight).toBeGreaterThan(inactiveWeight);
    });

    it('should return weight 0 for very inactive users', async () => {
      // Arrange
      const now = new Date('2026-04-04T12:00:00Z');
      const veryInactiveUser = { id: 1, lastActiveAt: new Date('2026-04-01T12:00:00Z') }; // 3 days ago

      // Act
      const weight = await service.calculateUserWeight(veryInactiveUser, now);

      // Assert
      expect(weight).toBe(0);
    });

    it('should return max weight for very recent activity', async () => {
      // Arrange
      const now = new Date('2026-04-04T12:00:00Z');
      const veryActiveUser = { id: 1, lastActiveAt: new Date('2026-04-04T11:59:00Z') }; // 1 min ago

      // Act
      const weight = await service.calculateUserWeight(veryActiveUser, now);

      // Assert
      expect(weight).toBeGreaterThan(0);
    });
  });

  describe('BE-5.3T-004: getRandomOnlineUsers returns random subset', () => {
    it('should return requested number of users', async () => {
      // Arrange
      const allUsers = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        userId: `user${i}`,
        lastActiveAt: new Date(),
      }));
      mockPrisma.user.findMany.mockResolvedValue(allUsers);

      // Act
      const result = await service.getRandomOnlineUsers(10);

      // Assert
      expect(result.length).toBe(10);
    });

    it('should return all users if requested more than available', async () => {
      // Arrange
      const allUsers = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        userId: `user${i}`,
        lastActiveAt: new Date(),
      }));
      mockPrisma.user.findMany.mockResolvedValue(allUsers);

      // Act
      const result = await service.getRandomOnlineUsers(10);

      // Assert
      expect(result.length).toBe(5);
    });

    it('should return empty array if no users', async () => {
      // Arrange
      mockPrisma.user.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getRandomOnlineUsers(10);

      // Assert
      expect(result.length).toBe(0);
    });
  });

  describe('BE-5.3T-005: validateAllocation validates allocation params', () => {
    it('should not throw for valid params', async () => {
      // Act & Assert
      await expect(service.validateAllocation(1000, 10)).resolves.not.toThrow();
    });

    it('should throw when totalRights is negative', async () => {
      // Act & Assert
      await expect(service.validateAllocation(-100, 10)).rejects.toThrow();
    });

    it('should throw when userCount is 0', async () => {
      // Act & Assert
      await expect(service.validateAllocation(100, 0)).rejects.toThrow();
    });

    it('should throw when totalRights exceeds max allocation', async () => {
      // Act & Assert
      await expect(service.validateAllocation(10000000, 10)).rejects.toThrow();
    });
  });

  describe('BE-5.3T-006: recordAllocation saves to database', async () => {
    it('should save allocation records', async () => {
      // Arrange
      const allocations = [
        { userId: 'user1', rights: 100, reason: 'MINING_REWARD' },
        { userId: 'user2', rights: 100, reason: 'MINING_REWARD' },
      ];
      mockPrisma.colorRight.createMany.mockResolvedValue({ count: 2 });

      // Act
      const result = await service.recordAllocation(allocations);

      // Assert
      expect(result.count).toBe(2);
      expect(mockPrisma.colorRight.createMany).toHaveBeenCalledWith({
        data: expect.any(Array),
      });
    });

    it('should handle empty allocations', async () => {
      // Arrange
      const allocations: any[] = [];

      // Act
      const result = await service.recordAllocation(allocations);

      // Assert
      expect(result.count).toBe(0);
    });
  });

  describe('BE-5.3T-007: getAllocationHistory returns history', async () => {
    it('should return allocation history for user', async () => {
      // Arrange
      const history = [
        { id: 1, userId: 'user1', rights: 100, createdAt: new Date() },
        { id: 2, userId: 'user1', rights: 50, createdAt: new Date() },
      ];
      mockPrisma.colorRight.findMany.mockResolvedValue(history);

      // Act
      const result = await service.getAllocationHistory('user1');

      // Assert
      expect(result.length).toBe(2);
    });

    it('should return empty array for no history', async () => {
      // Arrange
      mockPrisma.colorRight.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getAllocationHistory('user1');

      // Assert
      expect(result.length).toBe(0);
    });
  });

  describe('BE-5.3T-008: getTotalAllocatedForUser sums allocations', async () => {
    it('should sum all allocations for user', async () => {
      // Arrange
      const allocations = [
        { id: 1, userId: 'user1', rights: 100 },
        { id: 2, userId: 'user1', rights: 50 },
        { id: 3, userId: 'user1', rights: 25 },
      ];
      mockPrisma.colorRight.aggregate.mockResolvedValue({
        _sum: { rights: 175 },
      });

      // Act
      const total = await service.getTotalAllocatedForUser('user1');

      // Assert
      expect(total).toBe(175);
    });

    it('should return 0 for no allocations', async () => {
      // Arrange
      mockPrisma.colorRight.aggregate.mockResolvedValue({ _sum: { rights: null } });

      // Act
      const total = await service.getTotalAllocatedForUser('user1');

      // Assert
      expect(total).toBe(0);
    });
  });

  describe('BE-5.3T-009: calculateFairDistribution ensures fairness', () => {
    it('should distribute within fairness threshold', async () => {
      // Arrange
      const users = Array.from({ length: 10 }, (_, i) => ({ id: i, weight: 1 }));
      const totalRights = 1000;

      // Act
      const result = await service.calculateWeightedAllocation(users, totalRights);

      // Assert
      const avg = totalRights / users.length;
      const maxDeviation = Math.max(...result.map(r => Math.abs(r.rights - avg)));
      expect(maxDeviation).toBeLessThanOrEqual(1); // Within 1 right
    });
  });

  describe('BE-5.3T-010: batchAllocate handles large allocations', async () => {
    it('should handle 10000+ rights allocation', async () => {
      // Arrange
      const onlineUsers = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        userId: `user${i}`,
        lastActiveAt: new Date(),
      }));
      const totalRights = 10417;
      mockPrisma.user.findMany.mockResolvedValue(onlineUsers);

      // Act
      const result = await service.allocateToOnlineUsers(totalRights);

      // Assert
      expect(result.allocatedRights).toBe(10417);
      expect(result.recipients.length).toBe(100);
    });

    it('should complete within time limit', async () => {
      // Arrange
      const onlineUsers = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        userId: `user${i}`,
        lastActiveAt: new Date(),
      }));
      const totalRights = 100000;
      mockPrisma.user.findMany.mockResolvedValue(onlineUsers);

      // Act
      const startTime = Date.now();
      const result = await service.allocateToOnlineUsers(totalRights);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(result.allocatedRights).toBe(100000);
    });
  });
});
