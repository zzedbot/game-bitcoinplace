import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ColorRightService } from './ColorRightService';

// Mock PrismaClient
vi.mock('@prisma/client', () => {
  const PrismaClient = vi.fn().mockImplementation(() => ({
    colorRight: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn()
    },
    $disconnect: vi.fn()
  }));
  return { PrismaClient };
});

describe('ColorRightService', () => {
  let service: ColorRightService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    service = new ColorRightService(mockPrisma);
    vi.clearAllMocks();
  });

  describe('allocate', () => {
    it('应该为用户分配染色权', async () => {
      const userId = 'user-1';
      const mockColorRight = {
        id: 'cr-1',
        userId,
        x: 500,
        y: 500,
        zoneIndex: 0,
        used: false,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.colorRight.findUnique.mockResolvedValue(null);
      mockPrisma.colorRight.create.mockResolvedValue(mockColorRight);

      const result = await service.allocate(userId, 1);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(userId);
      expect(mockPrisma.colorRight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            used: false,
            color: null
          })
        })
      );
    });

    it('应该跳过已存在的位置', async () => {
      const userId = 'user-1';
      
      // 第一次查找返回已存在
      mockPrisma.colorRight.findUnique.mockResolvedValue({ id: 'existing' });
      mockPrisma.colorRight.create.mockResolvedValue(null);

      const result = await service.allocate(userId, 1);

      // 因为位置已存在，应该返回空数组
      expect(result).toHaveLength(0);
      expect(mockPrisma.colorRight.create).not.toHaveBeenCalled();
    });

    it('应该支持指定矿区分配', async () => {
      const userId = 'user-1';
      const zoneIndex = 5;

      mockPrisma.colorRight.findUnique.mockResolvedValue(null);
      mockPrisma.colorRight.create.mockResolvedValue({
        id: 'cr-1',
        userId,
        x: 5000,
        y: 2000,
        zoneIndex,
        used: false,
        color: null
      });

      const result = await service.allocate(userId, 1, zoneIndex);

      expect(result).toHaveLength(1);
      // 验证生成的坐标在指定矿区内
      expect(result[0].zoneIndex).toBe(zoneIndex);
    });
  });

  describe('useColorRight', () => {
    it('应该成功使用染色权', async () => {
      const userId = 'user-1';
      const colorRightId = 'cr-1';
      const color = 5;

      const mockColorRight = {
        id: colorRightId,
        userId,
        x: 500,
        y: 500,
        zoneIndex: 0,
        used: false,
        color: null
      };

      mockPrisma.colorRight.findUnique.mockResolvedValue(mockColorRight);
      mockPrisma.colorRight.update.mockResolvedValue({
        ...mockColorRight,
        used: true,
        color
      });

      const result = await service.useColorRight(colorRightId, userId, color);

      expect(result.used).toBe(true);
      expect(result.color).toBe(color);
      expect(mockPrisma.colorRight.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ used: true, color })
        })
      );
    });

    it('应该在颜色超出范围时抛出错误', async () => {
      const userId = 'user-1';
      
      await expect(service.useColorRight('cr-1', userId, -1)).rejects.toThrow('Color must be between 0 and 15');
      await expect(service.useColorRight('cr-1', userId, 16)).rejects.toThrow('Color must be between 0 and 15');
    });

    it('应该在染色权不存在时抛出错误', async () => {
      mockPrisma.colorRight.findUnique.mockResolvedValue(null);

      await expect(service.useColorRight('nonexistent', 'user-1', 5))
        .rejects.toThrow('ColorRight not found');
    });

    it('应该在非所有者使用时抛出错误', async () => {
      const mockColorRight = {
        id: 'cr-1',
        userId: 'other-user',
        x: 500,
        y: 500,
        zoneIndex: 0,
        used: false,
        color: null
      };

      mockPrisma.colorRight.findUnique.mockResolvedValue(mockColorRight);

      await expect(service.useColorRight('cr-1', 'user-1', 5))
        .rejects.toThrow('Not the owner');
    });
  });

  describe('getUserColorRights', () => {
    it('应该获取用户的染色权列表', async () => {
      const userId = 'user-1';
      const mockRights = [
        { id: 'cr-1', userId, x: 500, y: 500, used: false },
        { id: 'cr-2', userId, x: 600, y: 600, used: true }
      ];

      mockPrisma.colorRight.findMany.mockResolvedValue(mockRights);

      const result = await service.getUserColorRights(userId);

      expect(result).toHaveLength(2);
      expect(mockPrisma.colorRight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        })
      );
    });

    it('应该支持按使用状态过滤', async () => {
      mockPrisma.colorRight.findMany.mockResolvedValue([]);

      await service.getUserColorRights('user-1', true);

      expect(mockPrisma.colorRight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', used: true }
        })
      );
    });

    it('应该支持分页', async () => {
      mockPrisma.colorRight.findMany.mockResolvedValue([]);

      await service.getUserColorRights('user-1', undefined, 20, 40);

      expect(mockPrisma.colorRight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 40
        })
      );
    });
  });

  describe('getColorRightAt', () => {
    it('应该获取指定坐标的染色权', async () => {
      const mockColorRight = {
        id: 'cr-1',
        x: 500,
        y: 500,
        userId: 'user-1',
        used: false,
        color: null
      };

      mockPrisma.colorRight.findUnique.mockResolvedValue(mockColorRight);

      const result = await service.getColorRightAt(500, 500);

      expect(result?.x).toBe(500);
      expect(result?.y).toBe(500);
      expect(mockPrisma.colorRight.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { x_y: { x: 500, y: 500 } }
        })
      );
    });
  });

  describe('getZoneStats', () => {
    it('应该获取矿区统计信息', async () => {
      mockPrisma.colorRight.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60)  // used
        .mockResolvedValueOnce(40); // unused
      
      mockPrisma.colorRight.groupBy.mockResolvedValue([
        { userId: 'user-1', _count: 10 },
        { userId: 'user-2', _count: 20 }
      ]);

      const stats = await service.getZoneStats(0);

      expect(stats.total).toBe(100);
      expect(stats.used).toBe(60);
      expect(stats.unused).toBe(40);
      expect(stats.uniqueOwners).toBe(2);
    });
  });

  describe('canColorAt', () => {
    it('应该返回可以染色', async () => {
      const mockColorRight = {
        id: 'cr-1',
        userId: 'user-1',
        x: 500,
        y: 500,
        used: false,
        color: null
      };

      mockPrisma.colorRight.findUnique.mockResolvedValue(mockColorRight);

      const result = await service.canColorAt('user-1', 500, 500);

      expect(result.can).toBe(true);
      expect(result.colorRight).toBeDefined();
    });

    it('应该返回位置没有染色权', async () => {
      mockPrisma.colorRight.findUnique.mockResolvedValue(null);

      const result = await service.canColorAt('user-1', 500, 500);

      expect(result.can).toBe(false);
      expect(result.reason).toBe('No color right at this position');
    });

    it('应该返回非所有者', async () => {
      const mockColorRight = {
        id: 'cr-1',
        userId: 'other-user',
        x: 500,
        y: 500,
        used: false,
        color: null
      };

      mockPrisma.colorRight.findUnique.mockResolvedValue(mockColorRight);

      const result = await service.canColorAt('user-1', 500, 500);

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Not the owner');
    });
  });

  describe('generateRandomPosition', () => {
    it('应该生成有效的画布坐标', async () => {
      // 通过 allocate 间接测试
      mockPrisma.colorRight.findUnique.mockResolvedValue(null);
      mockPrisma.colorRight.create.mockImplementation((args) => 
        Promise.resolve({
          id: 'cr-1',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      );

      const result = await service.allocate('user-1', 1);

      expect(result[0].x).toBeGreaterThanOrEqual(0);
      expect(result[0].x).toBeLessThan(7000);
      expect(result[0].y).toBeGreaterThanOrEqual(0);
      expect(result[0].y).toBeLessThan(3000);
      expect(result[0].zoneIndex).toBeGreaterThanOrEqual(0);
      expect(result[0].zoneIndex).toBeLessThan(21);
    });
  });
});
