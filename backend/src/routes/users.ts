import { FastifyPluginAsync } from 'fastify';
import { UserService } from '../services/UserService';
import { prisma } from '../index';

const userService = new UserService(prisma);

const usersRoutes: FastifyPluginAsync = async (app) => {
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
   * GET /api/v1/users/me
   * 获取当前用户信息
   */
  app.get('/me', async (request, reply) => {
    const userId = request.user.userId;

    const user = await userService.findById(userId);

    if (!user) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'User not found',
        statusCode: 404
      });
    }

    return reply.send({
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      balance: user.balance.toString()
    });
  });

  /**
   * GET /api/v1/users/:id
   * 获取指定用户信息
   */
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await userService.findById(id);

    if (!user) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'User not found',
        statusCode: 404
      });
    }

    // 返回公开信息（不包含邮箱）
    return reply.send({
      id: user.id,
      username: user.username,
      avatar: user.avatar
    });
  });
};

export default usersRoutes;
