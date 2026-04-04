/**
 * HalvingCalculator - 比特币减半机制计算器
 * 
 * 实现 BitcoinPlace 的减半经济模型：
 * - 每 7 天为一个减半周期
 * - 奖励按 50% 递减
 * - 支持任意周期长度配置
 */

export class HalvingCalculator {
  /**
   * 计算指定周期的奖励
   * @param baseReward 基础奖励
   * @param cycle 减半周期 (0 = 无减半)
   * @returns 该周期的每日奖励 (向下取整)
   */
  calculateReward(baseReward: number, cycle: number): number {
    if (cycle < 0) {
      throw new Error('Cycle cannot be negative');
    }

    const reward = baseReward / Math.pow(2, cycle);
    return Math.floor(reward);
  }

  /**
   * 根据天数计算当前减半周期
   * @param day 赛季中的第几天 (从 0 开始)
   * @param cycleLength 减半周期长度 (天数)
   * @returns 减半周期编号
   */
  getCycleForDay(day: number, cycleLength: number): number {
    if (cycleLength <= 0) {
      throw new Error('Cycle length must be positive');
    }

    return Math.floor(day / cycleLength);
  }

  /**
   * 计算指定时间段内的总奖励
   * @param baseReward 基础奖励
   * @param startDay 起始天数
   * @param endDay 结束天数
   * @param cycleLength 减半周期长度
   * @returns 总奖励
   */
  getTotalRewardForPeriod(
    baseReward: number,
    startDay: number,
    endDay: number,
    cycleLength: number
  ): number {
    if (startDay > endDay) {
      return 0;
    }

    let total = 0;
    for (let day = startDay; day <= endDay; day++) {
      const cycle = this.getCycleForDay(day, cycleLength);
      total += this.calculateReward(baseReward, cycle);
    }

    return total;
  }

  /**
   * 计算距离下次减半的天数
   * @param currentDay 当前天数
   * @param cycleLength 减半周期长度
   * @returns 距离下次减半的天数 (当天是减半日则返回 0)
   */
  getNextHalvingTime(currentDay: number, cycleLength: number): number {
    if (this.isHalvingDay(currentDay, cycleLength)) {
      return 0;
    }
    const currentCycle = this.getCycleForDay(currentDay, cycleLength);
    const nextHalvingDay = (currentCycle + 1) * cycleLength;
    return nextHalvingDay - currentDay;
  }

  /**
   * 获取整个赛季的减半时间表
   * @param baseReward 基础奖励
   * @param seasonDays 赛季总天数
   * @param cycleLength 减半周期长度
   * @returns 减半时间表
   */
  getHalvingSchedule(
    baseReward: number,
    seasonDays: number,
    cycleLength: number
  ): Array<{ cycle: number; startDay: number; endDay: number; reward: number }> {
    const schedule = [];
    const totalCycles = Math.ceil(seasonDays / cycleLength);

    for (let cycle = 0; cycle < totalCycles; cycle++) {
      const startDay = cycle * cycleLength;
      const endDay = Math.min(startDay + cycleLength - 1, seasonDays - 1);
      const reward = this.calculateReward(baseReward, cycle);

      schedule.push({
        cycle,
        startDay,
        endDay,
        reward,
      });
    }

    return schedule;
  }

  /**
   * 验证减半参数
   * @param baseReward 基础奖励
   * @param cycleLength 减半周期长度
   */
  validateHalvingParams(baseReward: number, cycleLength: number): void {
    if (baseReward <= 0) {
      throw new Error('Base reward must be positive');
    }

    if (cycleLength <= 0) {
      throw new Error('Cycle length must be positive');
    }
  }

  /**
   * 计算赛季平均每日奖励
   * @param baseReward 基础奖励
   * @param seasonDays 赛季总天数
   * @param cycleLength 减半周期长度
   * @returns 平均每日奖励
   */
  getAverageReward(baseReward: number, seasonDays: number, cycleLength: number): number {
    const totalReward = this.getSeasonTotalReward(baseReward, seasonDays, cycleLength);
    return Math.floor(totalReward / seasonDays);
  }

  /**
   * 判断是否为减半日
   * @param day 天数
   * @param cycleLength 减半周期长度
   * @returns 是否为减半日
   */
  isHalvingDay(day: number, cycleLength: number): boolean {
    return day % cycleLength === 0;
  }

  /**
   * 计算赛季总奖励
   * @param baseReward 基础奖励
   * @param seasonDays 赛季总天数
   * @param cycleLength 减半周期长度
   * @returns 赛季总奖励
   */
  getSeasonTotalReward(baseReward: number, seasonDays: number, cycleLength: number): number {
    return this.getTotalRewardForPeriod(baseReward, 0, seasonDays - 1, cycleLength);
  }

  /**
   * 计算通胀率
   * @param totalSupply 当前总供应量
   * @param seasonReward 赛季新增奖励
   * @returns 通胀率 (百分比)
   */
  getInflationRate(totalSupply: number, seasonReward: number): number {
    if (totalSupply === 0) {
      return Infinity;
    }

    return (seasonReward / totalSupply) * 100;
  }
}
