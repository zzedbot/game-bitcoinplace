import { Redis } from 'ioredis';

/**
 * 画布配置
 */
export const CANVAS_CONFIG = {
  WIDTH: 7000,
  HEIGHT: 3000,
  TOTAL_PIXELS: 21_000_000, // 21M
  ZONE_SIZE: 1000,
  TOTAL_ZONES: 21,
  COLORS: 16 // 0-15
} as const;

/**
 * CanvasService - 使用 Redis bitfield 管理画布状态
 * 
 * 技术说明:
 * - 每个像素用 4 bits 存储颜色值 (0-15)
 * - 总内存：21M × 4 bits = 84 Mbits = 10.5 MB
 * - 使用 Redis BITFIELD 命令高效读写
 */
export class CanvasService {
  private redis: Redis;

  // Redis key 前缀
  private readonly CANVAS_KEY = 'canvas:state';
  private readonly CACHE_KEY = 'canvas:cache';

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * 将坐标转换为 bitfield 偏移量
   * 每个像素占用 4 bits
   */
  private pixelToOffset(x: number, y: number): number {
    return (y * CANVAS_CONFIG.WIDTH + x) * 4;
  }

  /**
   * 验证坐标是否在画布范围内
   */
  private validateCoordinates(x: number, y: number): void {
    if (x < 0 || x >= CANVAS_CONFIG.WIDTH) {
      throw new Error(`X coordinate ${x} out of bounds [0, ${CANVAS_CONFIG.WIDTH - 1}]`);
    }
    if (y < 0 || y >= CANVAS_CONFIG.HEIGHT) {
      throw new Error(`Y coordinate ${y} out of bounds [0, ${CANVAS_CONFIG.HEIGHT - 1}]`);
    }
  }

  /**
   * 验证颜色值
   */
  private validateColor(color: number): void {
    if (color < 0 || color >= CANVAS_CONFIG.COLORS) {
      throw new Error(`Color ${color} out of bounds [0, ${CANVAS_CONFIG.COLORS - 1}]`);
    }
  }

  /**
   * 获取单个像素颜色
   */
  async getPixel(x: number, y: number): Promise<number | null> {
    this.validateCoordinates(x, y);

    const offset = this.pixelToOffset(x, y);
    const result = await this.redis.bitfield(this.CANVAS_KEY, 'GET', 'u4', offset.toString());

    return result[0] ?? null;
  }

  /**
   * 设置单个像素颜色
   * 返回旧颜色值
   */
  async setPixel(x: number, y: number, color: number): Promise<number | null> {
    this.validateCoordinates(x, y);
    this.validateColor(color);

    const offset = this.pixelToOffset(x, y);
    
    // 使用 OVERFLOW SAT 避免溢出错误
    const result = await this.redis.bitfield(
      this.CANVAS_KEY,
      'OVERFLOW', 'SAT',
      'GET', 'u4', offset.toString(),
      'SET', 'u4', offset.toString(), color.toString()
    );

    return result[0] ?? null;
  }

  /**
   * 批量获取像素颜色
   */
  async getPixels(coordinates: Array<{ x: number; y: number }>): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    const pipeline = this.redis.pipeline();

    for (const { x, y } of coordinates) {
      if (x >= 0 && x < CANVAS_CONFIG.WIDTH && y >= 0 && y < CANVAS_CONFIG.HEIGHT) {
        const offset = this.pixelToOffset(x, y);
        pipeline.bitfield(this.CANVAS_KEY, 'GET', 'u4', offset.toString());
      }
    }

    const pipelineResults = await pipeline.exec();
    
    let index = 0;
    for (const { x, y } of coordinates) {
      if (x >= 0 && x < CANVAS_CONFIG.WIDTH && y >= 0 && y < CANVAS_CONFIG.HEIGHT) {
        const key = `${x},${y}`;
        const value = pipelineResults?.[index]?.[1] as number[];
        results.set(key, value?.[0] ?? -1);
        index++;
      }
    }

    return results;
  }

  /**
   * 批量设置像素颜色
   */
  async setPixels(pixelMap: Map<string, number>): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const [coord, color] of pixelMap.entries()) {
      const [x, y] = coord.split(',').map(Number);
      if (x >= 0 && x < CANVAS_CONFIG.WIDTH && y >= 0 && y < CANVAS_CONFIG.HEIGHT) {
        this.validateColor(color);
        const offset = this.pixelToOffset(x, y);
        pipeline.bitfield(
          this.CANVAS_KEY,
          'OVERFLOW', 'SAT',
          'SET', 'u4', offset.toString(), color.toString()
        );
      }
    }

    await pipeline.exec();
  }

  /**
   * 获取区域像素 (用于缩略图/预览)
   */
  async getRegion(
    startX: number,
    startY: number,
    width: number,
    height: number
  ): Promise<number[][]> {
    // 边界检查
    const endX = Math.min(startX + width, CANVAS_CONFIG.WIDTH);
    const endY = Math.min(startY + height, CANVAS_CONFIG.HEIGHT);
    
    const region: number[][] = [];
    
    for (let y = startY; y < endY; y++) {
      const row: number[] = [];
      for (let x = startX; x < endX; x++) {
        const color = await this.getPixel(x, y);
        row.push(color ?? 0);
      }
      region.push(row);
    }

    return region;
  }

  /**
   * 获取整个画布状态 (用于初始同步)
   * 注意：大数据量，建议分块或使用 CDN
   */
  async getFullCanvas(): Promise<Uint8Array> {
    const pixels = new Uint8Array(CANVAS_CONFIG.TOTAL_PIXELS);
    
    // 分块读取，避免单次请求过大
    const CHUNK_SIZE = 10000;
    const totalChunks = Math.ceil(CANVAS_CONFIG.TOTAL_PIXELS / CHUNK_SIZE);

    for (let chunk = 0; chunk < totalChunks; chunk++) {
      const start = chunk * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, CANVAS_CONFIG.TOTAL_PIXELS);

      for (let i = start; i < end; i++) {
        const x = i % CANVAS_CONFIG.WIDTH;
        const y = Math.floor(i / CANVAS_CONFIG.WIDTH);
        const color = await this.getPixel(x, y);
        pixels[i] = color ?? 0;
      }
    }

    return pixels;
  }

  /**
   * 获取画布统计信息
   */
  async getStats(): Promise<{
    totalPixels: number;
    coloredPixels: number;
    uncoloredPixels: number;
    coveragePercent: number;
  }> {
    // 采样统计 (每 100 个像素采样 1 个)
    const sampleRate = 100;
    let colored = 0;
    let total = 0;

    for (let y = 0; y < CANVAS_CONFIG.HEIGHT; y += sampleRate) {
      for (let x = 0; x < CANVAS_CONFIG.WIDTH; x += sampleRate) {
        const color = await this.getPixel(x, y);
        if (color !== null && color !== 0) {
          colored++;
        }
        total++;
      }
    }

    const coveragePercent = total > 0 ? (colored / total) * 100 : 0;
    const estimatedColored = Math.round(colored * sampleRate * sampleRate);

    return {
      totalPixels: CANVAS_CONFIG.TOTAL_PIXELS,
      coloredPixels: estimatedColored,
      uncoloredPixels: CANVAS_CONFIG.TOTAL_PIXELS - estimatedColored,
      coveragePercent
    };
  }

  /**
   * 清除画布 (测试用)
   */
  async clear(): Promise<void> {
    await this.redis.del(this.CANVAS_KEY);
  }

  /**
   * 获取画布大小 (字节)
   */
  async getSize(): Promise<number> {
    const size = await this.redis.bitfield(this.CANVAS_KEY, 'GET', 'u4', '0');
    // 实际大小 = 21M pixels × 4 bits = 10.5 MB
    return CANVAS_CONFIG.TOTAL_PIXELS / 2; // 10.5 MB
  }

  /**
   * 检查画布是否已初始化
   */
  async isInitialized(): Promise<boolean> {
    const exists = await this.redis.exists(this.CANVAS_KEY);
    return exists === 1;
  }

  /**
   * 获取矿区 (zone) 内的像素统计
   */
  async getZoneStats(zoneIndex: number): Promise<{
    zoneIndex: number;
    totalPixels: number;
    coloredPixels: number;
    coveragePercent: number;
  }> {
    if (zoneIndex < 0 || zoneIndex >= CANVAS_CONFIG.TOTAL_ZONES) {
      throw new Error(`Zone index ${zoneIndex} out of bounds [0, ${CANVAS_CONFIG.TOTAL_ZONES - 1}]`);
    }

    const zoneRow = Math.floor(zoneIndex / 7);
    const zoneCol = zoneIndex % 7;
    const startX = zoneCol * CANVAS_CONFIG.ZONE_SIZE;
    const startY = zoneRow * CANVAS_CONFIG.ZONE_SIZE;

    let colored = 0;
    const totalPixels = CANVAS_CONFIG.ZONE_SIZE * CANVAS_CONFIG.ZONE_SIZE;

    // 采样统计
    const sampleRate = 50;
    let sampledColored = 0;
    let sampledTotal = 0;

    for (let y = startY; y < startY + CANVAS_CONFIG.ZONE_SIZE; y += sampleRate) {
      for (let x = startX; x < startX + CANVAS_CONFIG.ZONE_SIZE; x += sampleRate) {
        const color = await this.getPixel(x, y);
        if (color !== null && color !== 0) {
          sampledColored++;
        }
        sampledTotal++;
      }
    }

    const coveragePercent = sampledTotal > 0 ? (sampledColored / sampledTotal) * 100 : 0;
    const estimatedColored = Math.round((sampledColored / sampledTotal) * totalPixels);

    return {
      zoneIndex,
      totalPixels,
      coloredPixels: estimatedColored,
      coveragePercent
    };
  }
}

export const canvasService = (redis: Redis) => new CanvasService(redis);
