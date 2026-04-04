import { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Get token from headers
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401);
      throw new Error('Authorization header required');
    }

    const token = authHeader.substring(7);

    // TODO: Implement JWT verification
    // For now, mock user for testing
    if (token === 'mock-token' || token === 'test-token') {
      (request as any).user = {
        id: 'user1',
        email: 'user@example.com',
        username: 'testuser',
      };
      return;
    }

    // In production, verify JWT token here
    // const decoded = verifyJwt(token);
    // request.user = decoded;

    reply.code(401);
    throw new Error('Invalid token');
  } catch (error: any) {
    reply.code(401);
    throw error;
  }
}

export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    if (token === 'mock-token' || token === 'test-token') {
      (request as any).user = {
        id: 'user1',
        email: 'user@example.com',
        username: 'testuser',
      };
    }
  }
}
