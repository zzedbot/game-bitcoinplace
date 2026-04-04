import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SeasonConfigService } from './SeasonConfigService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    seasonConfig: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    $disconnect: vi.fn(),
  };
  return { PrismaClient: vi.fn(() => mockPrisma) };
});

describe('SeasonConfigService', () => {
  let service: SeasonConfigService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = new PrismaClient();
    service = new SeasonConfigService(mockPrisma as any);
  });

  describe('BE-5.1T-001: initialize creates default config if not exists', () => {
    it('should create default season config when none exists', async () => {
      // Arrange
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(null);
      mockPrisma.seasonConfig.upsert.mockResolvedValue({
        id: 1,
        seasonNumber: 1,
        startDate: new Date(),
        miningDays: 49,
        freeDays: 7,
        stagnationDays: 4,
        totalDays: 60,
        halvingCycleDays: 7,
        baseReward: 10417,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await service.initialize();

      // Assert
      expect(mockPrisma.seasonConfig.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('BE-5.1T-002: initialize loads existing config', () => {
    it('should load existing config without creating new one', async () => {
      // Arrange
      const existingConfig = {
        id: 1,
        seasonNumber: 1,
        startDate: new Date(),
        miningDays: 49,
        freeDays: 7,
        stagnationDays: 4,
        totalDays: 60,
        halvingCycleDays: 7,
        baseReward: 10417,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(existingConfig);

      // Act
      await service.initialize();

      // Assert
      expect(mockPrisma.seasonConfig.upsert).not.toHaveBeenCalled();
    });
  });

  describe('BE-5.1T-003: getCurrentPhase returns correct phase', () => {
    it('should return MINING when in mining phase', async () => {
      // Arrange
      const config = createMockConfig();
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(config);
      await service.initialize();

      // Mock day 15 (within mining phase: 0-48)
      vi.spyOn(service as any, 'getDayInSeason').mockReturnValue(15);

      // Act
      const phase = await service.getCurrentPhase();

      // Assert
      expect(phase).toBe('MINING');
    });

    it('should return FREE when in free phase', async () => {
      // Arrange
      const config = createMockConfig();
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(config);
      await service.initialize();

      // Mock day 52 (within free phase: 49-55)
      vi.spyOn(service as any, 'getDayInSeason').mockReturnValue(52);

      // Act
      const phase = await service.getCurrentPhase();

      // Assert
      expect(phase).toBe('FREE');
    });

    it('should return STAGNATION when in stagnation phase', async () => {
      // Arrange
      const config = createMockConfig();
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(config);
      await service.initialize();

      // Mock day 58 (within stagnation phase: 56-59)
      vi.spyOn(service as any, 'getDayInSeason').mockReturnValue(58);

      // Act
      const phase = await service.getCurrentPhase();

      // Assert
      expect(phase).toBe('STAGNATION');
    });
  });

  describe('BE-5.1T-004: getDayInSeason calculates correctly', () => {
    beforeEach(() => {
      // Setup config for wrap around tests
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(createMockConfig());
    });

    it('should return day 0 on season start date', async () => {
      // Arrange
      await service.initialize();
      const startDate = new Date('2026-04-01T00:00:00Z');
      const currentDate = new Date('2026-04-01T00:00:00Z');

      // Act
      const day = (service as any).calculateDayInSeason(startDate, currentDate);

      // Assert
      expect(day).toBe(0);
    });

    it('should return day 15 after 15 days', async () => {
      // Arrange
      await service.initialize();
      const startDate = new Date('2026-04-01T00:00:00Z');
      const currentDate = new Date('2026-04-16T00:00:00Z');

      // Act
      const day = (service as any).calculateDayInSeason(startDate, currentDate);

      // Assert
      expect(day).toBe(15);
    });

    it('should wrap around for next season', async () => {
      // Arrange
      await service.initialize();
      const startDate = new Date('2026-04-01T00:00:00Z');
      const currentDate = new Date('2026-06-01T00:00:00Z'); // 61 days later

      // Act
      const day = (service as any).calculateDayInSeason(startDate, currentDate);

      // Assert
      expect(day).toBe(1); // 61 % 60 = 1
    });
  });

  describe('BE-5.1T-005: isMiningAllowed returns correct boolean', () => {
    it('should return true during mining phase', async () => {
      // Arrange
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(createMockConfig());
      await service.initialize();
      vi.spyOn(service as any, 'getDayInSeason').mockReturnValue(15);

      // Act
      const allowed = await service.isMiningAllowed();

      // Assert
      expect(allowed).toBe(true);
    });

    it('should return false during free phase', async () => {
      // Arrange
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(createMockConfig());
      await service.initialize();
      vi.spyOn(service as any, 'getDayInSeason').mockReturnValue(52);

      // Act
      const allowed = await service.isMiningAllowed();

      // Assert
      expect(allowed).toBe(false);
    });

    it('should return false during stagnation phase', async () => {
      // Arrange
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(createMockConfig());
      await service.initialize();
      vi.spyOn(service as any, 'getDayInSeason').mockReturnValue(58);

      // Act
      const allowed = await service.isMiningAllowed();

      // Assert
      expect(allowed).toBe(false);
    });
  });

  describe('BE-5.1T-006: getConfig returns current config', async () => {
    it('should return the loaded config', async () => {
      // Arrange
      const config = createMockConfig();
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(config);
      await service.initialize();

      // Act
      const result = await service.getConfig();

      // Assert
      expect(result).toEqual(config);
    });
  });

  describe('BE-5.1T-007: updateConfig updates configuration', async () => {
    it('should update mining days', async () => {
      // Arrange
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(createMockConfig());
      mockPrisma.seasonConfig.upsert.mockResolvedValue({
        ...createMockConfig(),
        miningDays: 50,
      });
      await service.initialize();

      // Act
      await service.updateConfig({ miningDays: 50 });

      // Assert
      expect(mockPrisma.seasonConfig.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        update: { miningDays: 50 },
        create: expect.any(Object),
      });
    });
  });

  describe('BE-5.1T-008: getHalvingCycle returns current cycle', () => {
    it('should return cycle 0 for days 0-6', async () => {
      // Arrange
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(createMockConfig());
      await service.initialize();
      vi.spyOn(service as any, 'getDayInSeason').mockReturnValue(5);

      // Act
      const cycle = await service.getHalvingCycle();

      // Assert
      expect(cycle).toBe(0);
    });

    it('should return cycle 1 for days 7-13', async () => {
      // Arrange
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(createMockConfig());
      await service.initialize();
      vi.spyOn(service as any, 'getDayInSeason').mockReturnValue(10);

      // Act
      const cycle = await service.getHalvingCycle();

      // Assert
      expect(cycle).toBe(1);
    });

    it('should return cycle 2 for days 14-20', async () => {
      // Arrange
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(createMockConfig());
      await service.initialize();
      vi.spyOn(service as any, 'getDayInSeason').mockReturnValue(18);

      // Act
      const cycle = await service.getHalvingCycle();

      // Assert
      expect(cycle).toBe(2);
    });
  });

  describe('BE-5.1T-009: getRewardForDay calculates halving correctly', () => {
    it('should return base reward for cycle 0', async () => {
      // Arrange
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(createMockConfig());
      await service.initialize();
      vi.spyOn(service as any, 'getDayInSeason').mockReturnValue(3);

      // Act
      const reward = await service.getRewardForDay();

      // Assert
      expect(reward).toBe(10417);
    });

    it('should return half reward for cycle 1', async () => {
      // Arrange
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(createMockConfig());
      await service.initialize();
      vi.spyOn(service as any, 'getDayInSeason').mockReturnValue(10);

      // Act
      const reward = await service.getRewardForDay();

      // Assert
      expect(reward).toBe(5208); // 10417 / 2 = 5208.5, rounded down
    });

    it('should return quarter reward for cycle 2', async () => {
      // Arrange
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(createMockConfig());
      await service.initialize();
      vi.spyOn(service as any, 'getDayInSeason').mockReturnValue(18);

      // Act
      const reward = await service.getRewardForDay();

      // Assert
      expect(reward).toBe(2604); // 10417 / 4 = 2604.25, rounded down
    });
  });

  describe('BE-5.1T-010: getSeasonProgress returns progress info', async () => {
    it('should return correct progress', async () => {
      // Arrange
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(createMockConfig());
      await service.initialize();
      vi.spyOn(service as any, 'getDayInSeason').mockReturnValue(30);

      // Act
      const progress = await service.getSeasonProgress();

      // Assert
      expect(progress.currentDay).toBe(30);
      expect(progress.totalDays).toBe(60);
      expect(progress.percentage).toBe(50);
    });
  });

  describe('BE-5.1T-011: validateConfig throws on invalid config', () => {
    it('should throw when miningDays is negative', async () => {
      // Arrange
      const invalidConfig = {
        miningDays: -1,
        freeDays: 7,
        stagnationDays: 4,
      };

      // Act & Assert
      await expect(service.validateConfig(invalidConfig as any)).rejects.toThrow();
    });

    it('should throw when total days exceed 365', async () => {
      // Arrange
      const invalidConfig = {
        miningDays: 200,
        freeDays: 100,
        stagnationDays: 100,
      };

      // Act & Assert
      await expect(service.validateConfig(invalidConfig as any)).rejects.toThrow();
    });
  });

  describe('BE-5.1T-012: resetSeason resets to new season', () => {
    it('should update season number and start date', async () => {
      // Arrange
      mockPrisma.seasonConfig.findFirst.mockResolvedValue(createMockConfig());
      mockPrisma.seasonConfig.update.mockResolvedValue({
        ...createMockConfig(),
        seasonNumber: 2,
        startDate: new Date(),
      });
      await service.initialize();

      // Act
      await service.resetSeason();

      // Assert
      expect(mockPrisma.seasonConfig.update).toHaveBeenCalled();
    });
  });
});

function createMockConfig() {
  return {
    id: 1,
    seasonNumber: 1,
    startDate: new Date('2026-04-01T00:00:00Z'),
    miningDays: 49,
    freeDays: 7,
    stagnationDays: 4,
    totalDays: 60,
    halvingCycleDays: 7,
    baseReward: 10417,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
