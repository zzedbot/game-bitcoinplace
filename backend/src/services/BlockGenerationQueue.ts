import { Queue, Worker, Job } from 'bullmq';

export interface BlockJobData {
  blockNumber: number;
  reward: number;
  timestamp: number;
}

export interface QueueStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
}

export type ProcessFunction = (blockNumber: number, reward: number) => Promise<any>;

export class BlockGenerationQueue {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private processFn: ProcessFunction | null = null;
  private readonly queueName = 'block-generation';
  private readonly connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };

  /**
   * 初始化队列和工作器
   */
  async initialize(): Promise<void> {
    // If queue/worker already exist (e.g., manually injected for testing), use them
    if (this.queue && this.worker) {
      // Register event handlers on existing worker
      this.worker.on('completed', (job) => {
        console.log(`Block generation job ${job.id} completed`);
      });

      this.worker.on('failed', (job, error) => {
        console.error(`Block generation job ${job?.id} failed:`, error);
      });
      return;
    }

    const connection = this.connection;

    this.queue = new Queue(this.queueName, {
      connection,
    });

    const processor = async (job: Job<BlockJobData>) => {
      return this.processBlock(job);
    };

    this.worker = new Worker(this.queueName, processor, {
      connection,
    });

    // Register event handlers
    this.worker.on('completed', (job) => {
      console.log(`Block generation job ${job.id} completed`);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`Block generation job ${job?.id} failed:`, error);
    });
  }

  /**
   * 处理区块生成
   */
  private async processBlock(job: Job<BlockJobData>): Promise<any> {
    const { blockNumber, reward } = job.data;

    // Update progress
    await job.updateProgress(0);

    if (this.processFn) {
      const result = await this.processFn(blockNumber, reward);
      await job.updateProgress(100);
      return result;
    }

    throw new Error('No process function registered');
  }

  /**
   * 添加区块生成任务
   */
  async addBlockJob(blockNumber: number, reward: number): Promise<string> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    const job = await this.queue.add(
      'generate-block',
      {
        blockNumber,
        reward,
        timestamp: Date.now(),
      },
      {
        priority: this.calculatePriority(blockNumber),
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          count: 50, // Keep last 50 failed jobs
        },
      }
    );

    return job.id || '';
  }

  /**
   * 计算任务优先级（区块号越小优先级越高）
   */
  private calculatePriority(blockNumber: number): number {
    // Lower block number = higher priority (lower number)
    // Priority 1 is highest, higher numbers are lower priority
    return Math.max(1, 10000 - blockNumber);
  }

  /**
   * 获取队列统计
   */
  async getQueueStats(): Promise<QueueStats> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    const jobs = await this.queue.getJobs(['completed', 'failed', 'waiting', 'active', 'delayed']);
    
    const completedJobs = jobs.filter(j => !j.failedReason).length;
    const failedJobs = jobs.filter(j => j.failedReason).length;
    const pendingJobs = jobs.filter(j => j.finishedOn === undefined).length;

    return {
      totalJobs: jobs.length,
      completedJobs,
      failedJobs,
      pendingJobs,
    };
  }

  /**
   * 暂停队列
   */
  async pause(): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }
    await this.worker.pause();
  }

  /**
   * 恢复队列
   */
  async resume(): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }
    await this.worker.resume();
  }

  /**
   * 清空队列
   */
  async drain(): Promise<void> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }
    await this.queue.drain();
  }

  /**
   * 重试失败的任务
   */
  async retryFailedJob(jobId: string): Promise<string> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    const failedJobs = await this.queue.getJobs(['failed']);
    const failedJob = failedJobs.find(j => j.id === jobId);

    if (!failedJob) {
      throw new Error(`Failed job ${jobId} not found`);
    }

    const job = await this.queue.add(
      failedJob.name,
      failedJob.data,
      {
        ...failedJob.opts,
        jobId: undefined, // Let BullMQ generate a new job ID
      }
    );

    return job.id || '';
  }

  /**
   * 设置并发数
   */
  async setConcurrency(concurrency: number): Promise<void> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }
    (this.worker as any).concurrency = concurrency;
  }

  /**
   * 关闭队列和工作器
   */
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }

    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }

  /**
   * 调度未来的区块生成
   */
  async scheduleBlockGeneration(blockNumber: number, reward: number, delayMs: number): Promise<string> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    const job = await this.queue.add(
      'generate-block',
      {
        blockNumber,
        reward,
        timestamp: Date.now(),
      },
      {
        delay: delayMs,
        priority: this.calculatePriority(blockNumber),
        removeOnComplete: {
          count: 100,
        },
        removeOnFail: {
          count: 50,
        },
      }
    );

    return job.id || '';
  }

  /**
   * 根据 ID 获取任务
   */
  async getJobById(jobId: string): Promise<any> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    const jobs = await this.queue.getJobs(['completed', 'failed', 'waiting', 'active', 'delayed']);
    const job = jobs.find(j => j.id === jobId);

    return job || null;
  }

  /**
   * 设置处理函数
   */
  setProcessFunction(fn: ProcessFunction): void {
    this.processFn = fn;
  }
}
