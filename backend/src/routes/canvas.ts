import { FastifyPluginAsync } from 'fastify';
import { colorRightService } from '../services/ColorRightService';
import { prisma } from '../index';

const service = colorRightService(prisma);

interface ColorBody {
  colorRightId: string;
  color: number;
}

const canvasRoutes: FastifyPluginAsync = async (app) => {
  // 所有路由都需要认证
  app.addHook('preHandler', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (error) {
      reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        statusCode: 401
      });
    }
  });

  /**
   * GET /api/v1/canvas/rights
   * 获取当前用户的染色权列表
   */
  app.get('/rights', async (request, reply) => {
    const userId = request.user.userId;
    const { used, limit = '50', offset = '0' } = request.query as any;

    const rights = await service.getUserColorRights(
      userId,
      used === 'true' ? true : used === 'false' ? false : undefined,
      parseInt(limit),
      parseInt(offset)
    );

    return reply.send({
      rights: rights.map(r => ({
        id: r.id,
        x: r.x,
        y: r.y,
        zoneIndex: r.zoneIndex,
        used: r.used,
        color: r.color,
        createdAt: r.createdAt
      })),
      total: rights.length
    });
  });

  /**
   * GET /api/v1/canvas/rights/:id
   * 获取单个染色权详情
   */
  app.get('/rights/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const right = await service.getColorRight(id);

    if (!right) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'ColorRight not found',
        statusCode: 404
      });
    }

    // 只能查看自己的染色权
    if (right.userId !== userId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Not your color right',
        statusCode: 403
      });
    }

    return reply.send({
      id: right.id,
      x: right.x,
      y: right.y,
      zoneIndex: right.zoneIndex,
      used: right.used,
      color: right.color,
      createdAt: right.createdAt
    });
  });

  /**
   * POST /api/v1/canvas/color
   * 使用染色权进行染色
   */
  app.post<{ Body: ColorBody }>('/color', {
    schema: {
      body: {
        type: 'object',
        required: ['colorRightId', 'color'],
        properties: {
          colorRightId: { type: 'string', format: 'uuid' },
          color: { type: 'integer', minimum: 0, maximum: 15 }
        }
      }
    }
  }, async (request, reply) => {
    const userId = request.user.userId;
    const { colorRightId, color } = request.body;

    try {
      const updatedRight = await service.useColorRight(colorRightId, userId, color);

      // TODO: 通过 WebSocket 广播染色事件
      // app.io.emit('canvas:update', { x: updatedRight.x, y: updatedRight.y, color });

      return reply.send({
        success: true,
        colorRight: {
          id: updatedRight.id,
          x: updatedRight.x,
          y: updatedRight.y,
          color: updatedRight.color,
          used: updatedRight.used
        }
      });
    } catch (error: any) {
      if (error.message === 'ColorRight not found') {
        return reply.status(404).send({
          error: 'NotFound',
          message: error.message,
          statusCode: 404
        });
      }
      if (error.message === 'Not the owner of this color right') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: error.message,
          statusCode: 403
        });
      }
      if (error.message.includes('Color must be')) {
        return reply.status(400).send({
          error: 'BadRequest',
          message: error.message,
          statusCode: 400
        });
      }
      throw error;
    }
  });

  /**
   * GET /api/v1/canvas/check/:x/:y
   * 检查某位置是否可以染色
   */
  app.get('/check/:x/:y', async (request, reply) => {
    const { x, y } = request.params as { x: string; y: string };
    const userId = request.user.userId;

    const result = await service.canColorAt(userId, parseInt(x), parseInt(y));

    return reply.send({
      x: parseInt(x),
      y: parseInt(y),
      canColor: result.can,
      reason: result.reason,
      colorRight: result.colorRight ? {
        id: result.colorRight.id,
        used: result.colorRight.used,
        color: result.colorRight.color
      } : null
    });
  });

  /**
   * GET /api/v1/canvas/zone/:zoneIndex/stats
   * 获取矿区统计信息
   */
  app.get('/zone/:zoneIndex/stats', async (request, reply) => {
    const { zoneIndex } = request.params as { zoneIndex: string };
    const index = parseInt(zoneIndex);

    if (index < 0 || index >= 21) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Zone index must be between 0 and 20',
        statusCode: 400
      });
    }

    const stats = await service.getZoneStats(index);

    return reply.send({
      zoneIndex: index,
      ...stats
    });
  });
};

export default canvasRoutes;
