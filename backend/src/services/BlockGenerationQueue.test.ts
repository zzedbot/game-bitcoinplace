import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BlockGenerationQueue } from './BlockGenerationQueue';
import { Queue, Worker } from 'bullmq';

// Mock BullMQ
vi.mock('bullmq', () => {
  return {
    Queue: vi.fn(() => ({
      add: vi.fn(),
      getJobs: vi.fn(),
      close: vi.fn(),
      drain: vi.fn(),
      obliterate: vi.fn(),
    })),
    Worker: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
    })),
  };
});

describe('BlockGenerationQueue', () => {
  let queue: BlockGenerationQueue;
  let mockQueue: any;
  let mockWorker: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue = new Queue('block-generation', { connection: { host: 'localhost' } });
    mockWorker = new Worker('block-generation', vi.fn(), { connection: { host: 'localhost' } });
    queue = new BlockGenerationQueue();
    (queue as any).queue = mockQueue;
    (queue as any).worker = mockWorker;
  });

  afterEach(async () => {
    await queue.close();
  });

  describe('BE-5.4T-001: initialize creates queue and worker', () => {
    it('should create Queue instance', async () => {
      // Act
      await queue.initialize();

      // Assert
      expect(Queue).toHaveBeenCalledWith('block-generation', expect.any(Object));
    });

    it('should create Worker instance', async () => {
      // Act
      await queue.initialize();

      // Assert
      expect(Worker).toHaveBeenCalledWith('block-generation', expect.any(Function), expect.any(Object));
    });

    it('should register job handler', async () => {
      // Act
      await queue.initialize();

      // Assert
      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });
  });

  describe('BE-5.4T-002: addBlockJob adds job to queue', () => {
    it('should add job with correct data', async () => {
      // Arrange
      const blockNumber = 1;
      const reward = 10417;
      mockQueue.add.mockResolvedValue({ id: 'job1' });

      // Act
      const jobId = await queue.addBlockJob(blockNumber, reward);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith(
        'generate-block',
        {
          blockNumber,
          reward,
          timestamp: expect.any(Number),
        },
        expect.any(Object)
      );
      expect(jobId).toBe('job1');
    });

    it('should set job priority', async () => {
      // Arrange
      mockQueue.add.mockResolvedValue({ id: 'job1' });

      // Act
      await queue.addBlockJob(1, 10417);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          priority: expect.any(Number),
        })
      );
    });

    it('should set job timeout', async () => {
      // Arrange
      mockQueue.add.mockResolvedValue({ id: 'job1' });

      // Act
      await queue.addBlockJob(1, 10417);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          removeOnComplete: expect.any(Object),
          removeOnFail: expect.any(Object),
        })
      );
    });
  });

  describe('BE-5.4T-003: processBlock processes block generation', () => {
    it('should call allocation service', async () => {
      // Arrange
      const mockJob = {
        data: { blockNumber: 1, reward: 10417 },
        updateProgress: vi.fn(),
      };
      const mockProcessFn = vi.fn().mockResolvedValue({ success: true });
      (queue as any).processFn = mockProcessFn;

      // Act
      await (queue as any).processBlock(mockJob);

      // Assert
      expect(mockProcessFn).toHaveBeenCalledWith(1, 10417);
    });

    it('should update job progress', async () => {
      // Arrange
      const mockJob = {
        data: { blockNumber: 1, reward: 10417 },
        updateProgress: vi.fn(),
      };
      const mockProcessFn = vi.fn().mockResolvedValue({ success: true });
      (queue as any).processFn = mockProcessFn;

      // Act
      await (queue as any).processBlock(mockJob);

      // Assert
      expect(mockJob.updateProgress).toHaveBeenCalled();
    });

    it('should handle processing errors', async () => {
      // Arrange
      const mockJob = {
        data: { blockNumber: 1, reward: 10417 },
        updateProgress: vi.fn(),
      };
      const mockProcessFn = vi.fn().mockRejectedValue(new Error('Processing failed'));
      (queue as any).processFn = mockProcessFn;

      // Act & Assert
      await expect((queue as any).processBlock(mockJob)).rejects.toThrow();
    });
  });

  describe('BE-5.4T-004: getQueueStats returns queue statistics', () => {
    it('should return job counts', async () => {
      // Arrange
      mockQueue.getJobs.mockResolvedValue([
        { id: '1', name: 'generate-block' },
        { id: '2', name: 'generate-block' },
        { id: '3', name: 'generate-block', failedReason: 'Error' },
      ]);

      // Act
      const stats = await queue.getQueueStats();

      // Assert
      expect(stats.totalJobs).toBe(3);
    });

    it('should separate completed and failed jobs', async () => {
      // Arrange
      mockQueue.getJobs.mockResolvedValue([
        { id: '1', failedReason: undefined },
        { id: '2', failedReason: undefined },
        { id: '3', failedReason: 'Error' },
      ]);

      // Act
      const stats = await queue.getQueueStats();

      // Assert
      expect(stats.completedJobs).toBe(2);
      expect(stats.failedJobs).toBe(1);
    });
  });

  describe('BE-5.4T-005: pause pauses queue processing', () => {
    it('should call worker.pause', async () => {
      // Act
      await queue.pause();

      // Assert
      expect(mockWorker.pause).toHaveBeenCalled();
    });
  });

  describe('BE-5.4T-006: resume resumes queue processing', () => {
    it('should call worker.resume', async () => {
      // Act
      await queue.resume();

      // Assert
      expect(mockWorker.resume).toHaveBeenCalled();
    });
  });

  describe('BE-5.4T-007: drain removes all jobs', () => {
    it('should call queue.drain', async () => {
      // Act
      await queue.drain();

      // Assert
      expect(mockQueue.drain).toHaveBeenCalled();
    });
  });

  describe('BE-5.4T-008: retryFailedJob retries failed job', () => {
    it('should re-add failed job', async () => {
      // Arrange
      const failedJob = {
        id: 'failed1',
        data: { blockNumber: 1, reward: 10417 },
        opts: { priority: 1 },
      };
      mockQueue.getJobs.mockResolvedValue([failedJob]);
      mockQueue.add.mockResolvedValue({ id: 'retry1' });

      // Act
      const result = await queue.retryFailedJob('failed1');

      // Assert
      expect(mockQueue.add).toHaveBeenCalled();
      expect(result).toBe('retry1');
    });

    it('should throw if job not found', async () => {
      // Arrange
      mockQueue.getJobs.mockResolvedValue([]);

      // Act & Assert
      await expect(queue.retryFailedJob('nonexistent')).rejects.toThrow();
    });
  });

  describe('BE-5.4T-009: setConcurrency sets worker concurrency', () => {
    it('should update concurrency setting', async () => {
      // Arrange
      const concurrency = 5;

      // Act
      await queue.setConcurrency(concurrency);

      // Assert
      expect(mockWorker.concurrency).toBe(concurrency);
    });
  });

  describe('BE-5.4T-010: close shuts down queue and worker', async () => {
    it('should close queue', async () => {
      // Act
      await queue.close();

      // Assert
      expect(mockQueue.close).toHaveBeenCalled();
    });

    it('should close worker', async () => {
      // Act
      await queue.close();

      // Assert
      expect(mockWorker.close).toHaveBeenCalled();
    });
  });

  describe('BE-5.4T-011: scheduleBlockGeneration schedules future block', () => {
    it('should add delayed job', async () => {
      // Arrange
      const delayMs = 60000; // 1 minute
      mockQueue.add.mockResolvedValue({ id: 'scheduled1' });

      // Act
      const jobId = await queue.scheduleBlockGeneration(1, 10417, delayMs);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          delay: delayMs,
        })
      );
      expect(jobId).toBe('scheduled1');
    });
  });

  describe('BE-5.4T-012: getJobById retrieves specific job', async () => {
    it('should return job by id', async () => {
      // Arrange
      const mockJob = { id: 'job1', data: { blockNumber: 1 } };
      mockQueue.getJobs.mockResolvedValue([mockJob]);

      // Act
      const job = await queue.getJobById('job1');

      // Assert
      expect(job).toEqual(mockJob);
    });

    it('should return null if not found', async () => {
      // Arrange
      mockQueue.getJobs.mockResolvedValue([]);

      // Act
      const job = await queue.getJobById('nonexistent');

      // Assert
      expect(job).toBeNull();
    });
  });
});
