import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuctionService } from '../services/AuctionService';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

interface CreateAuctionBody {
  colorRightId: string;
  startingPrice: number;
  buyNowPrice?: number;
  durationHours: number;
}

interface PlaceBidBody {
  amount: number;
}

interface BuyoutBody {
  // empty, just need to POST
}

export async function auctionRoutes(fastify: FastifyInstance, options: any) {
  const prisma = new PrismaClient();
  const auctionService = new AuctionService(prisma, 0.05);

  /**
   * GET /auctions
   * 获取拍卖列表
   */
  fastify.get('/auctions', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    
    const filters: any = {};
    if (query.status) filters.status = query.status;
    if (query.type) filters.type = query.type;
    if (query.sellerId) filters.sellerId = query.sellerId;
    if (query.buyerId) filters.buyerId = query.buyerId;
    if (query.minPrice) filters.minPrice = parseInt(query.minPrice);
    if (query.maxPrice) filters.maxPrice = parseInt(query.maxPrice);

    const limit = parseInt(query.limit) || 20;
    const offset = parseInt(query.offset) || 0;

    const auctions = await auctionService.getAuctions(filters, limit, offset);
    const stats = await auctionService.getStats();

    return {
      success: true,
      data: auctions,
      pagination: {
        limit,
        offset,
        total: stats.totalAuctions,
      },
    };
  });

  /**
   * GET /auctions/:id
   * 获取拍卖详情
   */
  fastify.get('/auctions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as any;
    
    try {
      const auction = await auctionService.getAuctionById(parseInt(params.id));
      return {
        success: true,
        data: auction,
      };
    } catch (error: any) {
      return reply.code(404).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /auctions
   * 创建拍卖 (需要认证)
   */
  fastify.post('/auctions', {
    preHandler: [authenticate],
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as CreateAuctionBody;
      const user = (request as any).user;

      try {
        const auction = await auctionService.createAuction(
          user.id,
          'COLOR_RIGHT',
          body.colorRightId,
          BigInt(body.startingPrice),
          body.durationHours,
          body.buyNowPrice ? BigInt(body.buyNowPrice) : undefined
        );

        return {
          success: true,
          data: auction,
        };
      } catch (error: any) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }
    },
  });

  /**
   * POST /auctions/:id/bid
   * 竞价 (需要认证)
   */
  fastify.post('/auctions/:id/bid', {
    preHandler: [authenticate],
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as any;
      const body = request.body as PlaceBidBody;
      const user = (request as any).user;

      try {
        const result = await auctionService.placeBid(
          parseInt(params.id),
          user.id,
          BigInt(body.amount)
        );

        return {
          success: true,
          data: {
            auction: result.auction,
            bid: result.bid,
          },
        };
      } catch (error: any) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }
    },
  });

  /**
   * POST /auctions/:id/buyout
   * 一口价购买 (需要认证)
   */
  fastify.post('/auctions/:id/buyout', {
    preHandler: [authenticate],
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as any;
      const user = (request as any).user;

      try {
        const auction = await auctionService.buyout(
          parseInt(params.id),
          user.id
        );

        return {
          success: true,
          data: auction,
        };
      } catch (error: any) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }
    },
  });

  /**
   * DELETE /auctions/:id
   * 取消拍卖 (需要认证，仅限卖家)
   */
  fastify.delete('/auctions/:id', {
    preHandler: [authenticate],
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const params = request.params as any;
      const user = (request as any).user;

      try {
        const auction = await auctionService.cancelAuction(
          parseInt(params.id),
          user.id
        );

        return {
          success: true,
          data: auction,
        };
      } catch (error: any) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }
    },
  });

  /**
   * GET /auctions/stats
   * 获取拍卖统计
   */
  fastify.get('/auctions/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = await auctionService.getStats();
    return {
      success: true,
      data: stats,
    };
  });

  /**
   * POST /auctions/process-expired
   * 处理到期拍卖 (管理员任务)
   */
  fastify.post('/auctions/process-expired', async (request: FastifyRequest, reply: FastifyReply) => {
    const count = await auctionService.processExpiredAuctions();
    return {
      success: true,
      data: {
        processed: count,
      },
    };
  });
}
