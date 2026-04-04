import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HalvingCalculator } from './HalvingCalculator';

describe('HalvingCalculator', () => {
  let calculator: HalvingCalculator;

  beforeEach(() => {
    calculator = new HalvingCalculator();
  });

  describe('BE-5.2T-001: calculateReward returns correct halved amount', () => {
    it('should return base reward at cycle 0', () => {
      // Arrange
      const baseReward = 10417;
      const cycle = 0;

      // Act
      const reward = calculator.calculateReward(baseReward, cycle);

      // Assert
      expect(reward).toBe(10417);
    });

    it('should return half reward at cycle 1', () => {
      // Arrange
      const baseReward = 10417;
      const cycle = 1;

      // Act
      const reward = calculator.calculateReward(baseReward, cycle);

      // Assert
      expect(reward).toBe(5208);
    });

    it('should return quarter reward at cycle 2', () => {
      // Arrange
      const baseReward = 10417;
      const cycle = 2;

      // Act
      const reward = calculator.calculateReward(baseReward, cycle);

      // Assert
      expect(reward).toBe(2604);
    });

    it('should handle large cycle numbers', () => {
      // Arrange
      const baseReward = 10417;
      const cycle = 10;

      // Act
      const reward = calculator.calculateReward(baseReward, cycle);

      // Assert
      expect(reward).toBe(10); // 10417 / 2^10 ≈ 10.17
    });

    it('should return 0 when reward is less than 1', () => {
      // Arrange
      const baseReward = 10417;
      const cycle = 20; // 2^20 = 1048576, reward < 1

      // Act
      const reward = calculator.calculateReward(baseReward, cycle);

      // Assert
      expect(reward).toBe(0);
    });
  });

  describe('BE-5.2T-002: getCycleForDay returns correct cycle', () => {
    it('should return cycle 0 for day 0-6', () => {
      // Act & Assert
      for (let day = 0; day <= 6; day++) {
        expect(calculator.getCycleForDay(day, 7)).toBe(0);
      }
    });

    it('should return cycle 1 for day 7-13', () => {
      // Act & Assert
      for (let day = 7; day <= 13; day++) {
        expect(calculator.getCycleForDay(day, 7)).toBe(1);
      }
    });

    it('should return cycle 2 for day 14-20', () => {
      // Act & Assert
      for (let day = 14; day <= 20; day++) {
        expect(calculator.getCycleForDay(day, 7)).toBe(2);
      }
    });

    it('should handle day 0 correctly', () => {
      // Act
      const cycle = calculator.getCycleForDay(0, 7);

      // Assert
      expect(cycle).toBe(0);
    });

    it('should handle custom cycle length', () => {
      // Arrange
      const day = 25;
      const cycleLength = 10;

      // Act
      const cycle = calculator.getCycleForDay(day, cycleLength);

      // Assert
      expect(cycle).toBe(2); // 25 / 10 = 2.5, floor = 2
    });
  });

  describe('BE-5.2T-003: getTotalRewardForPeriod calculates cumulative reward', () => {
    it('should calculate reward for single day', () => {
      // Arrange
      const baseReward = 10417;
      const startDay = 0;
      const endDay = 0;
      const cycleLength = 7;

      // Act
      const total = calculator.getTotalRewardForPeriod(baseReward, startDay, endDay, cycleLength);

      // Assert
      expect(total).toBe(10417);
    });

    it('should calculate reward for full cycle 0 (7 days)', () => {
      // Arrange
      const baseReward = 10417;
      const startDay = 0;
      const endDay = 6;
      const cycleLength = 7;

      // Act
      const total = calculator.getTotalRewardForPeriod(baseReward, startDay, endDay, cycleLength);

      // Assert
      expect(total).toBe(10417 * 7); // 72919
    });

    it('should calculate reward spanning multiple cycles', () => {
      // Arrange
      const baseReward = 10417;
      const startDay = 5;
      const endDay = 12; // Spans cycle 0 and 1
      const cycleLength = 7;

      // Act
      const total = calculator.getTotalRewardForPeriod(baseReward, startDay, endDay, cycleLength);

      // Assert
      // Days 5-6: 2 * 10417 = 20834
      // Days 7-12: 6 * 5208 = 31248
      // Total: 52082
      expect(total).toBe(52082);
    });

    it('should handle startDay > endDay', () => {
      // Arrange
      const baseReward = 10417;
      const startDay = 10;
      const endDay = 5;
      const cycleLength = 7;

      // Act
      const total = calculator.getTotalRewardForPeriod(baseReward, startDay, endDay, cycleLength);

      // Assert
      expect(total).toBe(0);
    });
  });

  describe('BE-5.2T-004: getNextHalvingTime returns correct time', () => {
    it('should return days until next halving', () => {
      // Arrange
      const currentDay = 5;
      const cycleLength = 7;

      // Act
      const nextHalving = calculator.getNextHalvingTime(currentDay, cycleLength);

      // Assert
      expect(nextHalving).toBe(2); // 7 - 5 = 2 days
    });

    it('should return 0 on halving day', () => {
      // Arrange
      const currentDay = 7;
      const cycleLength = 7;

      // Act
      const nextHalving = calculator.getNextHalvingTime(currentDay, cycleLength);

      // Assert
      expect(nextHalving).toBe(0);
    });

    it('should handle day 0 (halving day returns 0)', () => {
      // Arrange
      const currentDay = 0;
      const cycleLength = 7;

      // Act
      const nextHalving = calculator.getNextHalvingTime(currentDay, cycleLength);

      // Assert
      expect(nextHalving).toBe(0); // Day 0 is a halving day
    });
  });

  describe('BE-5.2T-005: getHalvingSchedule returns full schedule', () => {
    it('should return schedule for all cycles in season', () => {
      // Arrange
      const baseReward = 10417;
      const seasonDays = 60;
      const cycleLength = 7;

      // Act
      const schedule = calculator.getHalvingSchedule(baseReward, seasonDays, cycleLength);

      // Assert
      expect(schedule.length).toBe(9); // 60 / 7 = 8.57, so 9 cycles (0-8)
      expect(schedule[0].cycle).toBe(0);
      expect(schedule[0].reward).toBe(10417);
      expect(schedule[1].cycle).toBe(1);
      expect(schedule[1].reward).toBe(5208);
    });

    it('should show decreasing rewards', () => {
      // Arrange
      const baseReward = 10417;
      const seasonDays = 60;
      const cycleLength = 7;

      // Act
      const schedule = calculator.getHalvingSchedule(baseReward, seasonDays, cycleLength);

      // Assert
      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i].reward).toBeLessThanOrEqual(schedule[i - 1].reward);
      }
    });
  });

  describe('BE-5.2T-006: validateHalvingParams throws on invalid input', () => {
    it('should throw when baseReward is negative', () => {
      // Act & Assert
      expect(() => calculator.validateHalvingParams(-100, 7)).toThrow();
    });

    it('should throw when cycleLength is 0', () => {
      // Act & Assert
      expect(() => calculator.validateHalvingParams(1000, 0)).toThrow();
    });

    it('should throw when cycleLength is negative', () => {
      // Act & Assert
      expect(() => calculator.validateHalvingParams(1000, -5)).toThrow();
    });

    it('should not throw for valid params', () => {
      // Act & Assert
      expect(() => calculator.validateHalvingParams(1000, 7)).not.toThrow();
    });
  });

  describe('BE-5.2T-007: getAverageReward calculates weighted average', () => {
    it('should calculate average for single cycle', () => {
      // Arrange
      const baseReward = 10417;
      const seasonDays = 7;
      const cycleLength = 7;

      // Act
      const avg = calculator.getAverageReward(baseReward, seasonDays, cycleLength);

      // Assert
      expect(avg).toBe(10417);
    });

    it('should calculate average for multiple cycles', () => {
      // Arrange
      const baseReward = 10417;
      const seasonDays = 14;
      const cycleLength = 7;

      // Act
      const avg = calculator.getAverageReward(baseReward, seasonDays, cycleLength);

      // Assert
      // (10417 * 7 + 5208 * 7) / 14 = 7812.5
      expect(avg).toBeCloseTo(7812, 0);
    });
  });

  describe('BE-5.2T-008: isHalvingDay returns true on halving days', () => {
    it('should return true for day 0 (season start)', () => {
      // Act
      const isHalving = calculator.isHalvingDay(0, 7);

      // Assert
      expect(isHalving).toBe(true);
    });

    it('should return true for halving days (7, 14, 21...)', () => {
      // Act & Assert
      expect(calculator.isHalvingDay(7, 7)).toBe(true);
      expect(calculator.isHalvingDay(14, 7)).toBe(true);
      expect(calculator.isHalvingDay(21, 7)).toBe(true);
    });

    it('should return false for non-halving days', () => {
      // Act & Assert
      expect(calculator.isHalvingDay(5, 7)).toBe(false);
      expect(calculator.isHalvingDay(10, 7)).toBe(false);
    });
  });

  describe('BE-5.2T-009: getSeasonTotalReward calculates total season reward', () => {
    it('should calculate total for 60-day season', () => {
      // Arrange
      const baseReward = 10417;
      const seasonDays = 60;
      const cycleLength = 7;

      // Act
      const total = calculator.getSeasonTotalReward(baseReward, seasonDays, cycleLength);

      // Assert
      // Should be sum of all daily rewards
      expect(total).toBeGreaterThan(0);
    });

    it('should match sum of daily rewards', () => {
      // Arrange
      const baseReward = 10417;
      const seasonDays = 14;
      const cycleLength = 7;

      // Act
      const total = calculator.getSeasonTotalReward(baseReward, seasonDays, cycleLength);

      // Assert
      // 7 days * 10417 + 7 days * 5208 = 109375
      expect(total).toBe(109375);
    });
  });

  describe('BE-5.2T-010: getInflationRate calculates inflation', () => {
    it('should return positive inflation for new rewards', () => {
      // Arrange
      const totalSupply = 1000000;
      const seasonReward = 500000;

      // Act
      const inflation = calculator.getInflationRate(totalSupply, seasonReward);

      // Assert
      expect(inflation).toBe(50); // 50%
    });

    it('should handle zero supply', () => {
      // Arrange
      const totalSupply = 0;
      const seasonReward = 500000;

      // Act
      const inflation = calculator.getInflationRate(totalSupply, seasonReward);

      // Assert
      expect(inflation).toBe(Infinity);
    });
  });
});
