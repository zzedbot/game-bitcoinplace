import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import { UserService } from './services/UserService';

const prisma = new PrismaClient();
const userService = new UserService(prisma);

const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    }
  });

  // 注册插件
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true
  });

  await app.register(helmet, {
    contentSecurityPolicy: false // 开发环境禁用 CSP
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key'
  });

  // 健康检查
  app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // 注册路由
  await app.register(require('./routes/auth'), { prefix: '/api/v1/auth' });
  await app.register(require('./routes/users'), { prefix: '/api/v1/users' });

  // 全局错误处理
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    
    reply.status(error.statusCode || 500).send({
      error: error.name,
      message: error.message,
      statusCode: error.statusCode || 500
    });
  });

  return app;
};

const start = async () => {
  const app = await buildApp();

  const host = process.env.HOST || '0.0.0.0';
  const port = parseInt(process.env.PORT || '3000', 10);

  try {
    await app.listen({ port, host });
    console.log(`🚀 Server running at http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// 优雅关闭
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 启动服务
if (require.main === module) {
  start();
}

export { buildApp, prisma, userService };
