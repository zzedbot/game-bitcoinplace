import { FastifyInstance, FastifyRequest } from 'fastify';
import { Server } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';

export interface WebSocketMessage {
  type: 'canvas:update' | 'canvas:sync' | 'user:online' | 'user:offline';
  payload: any;
  timestamp: number;
}

export class WebSocketService {
  private wss: Server | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private userIdToSocket: Map<string, WebSocket> = new Map();

  /**
   * 初始化 WebSocket 服务
   */
  initialize(server: any) {
    this.wss = new Server({
      noServer: true,
      pingInterval: 30000,
      pingPong: true
    });

    // 处理 WebSocket 连接
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    // 处理服务器升级事件
    server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      const pathname = parse(request.url || '').pathname;
      
      if (pathname === '/ws') {
        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          this.wss?.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    // 心跳检测
    setInterval(() => {
      this.wss?.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    console.log('✅ WebSocket service initialized on /ws');
  }

  /**
   * 处理 WebSocket 连接
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage) {
    const url = parse(request.url || '', true);
    const token = url.query.token as string;
    const userId = url.query.userId as string;

    // TODO: 验证 JWT token
    // const isValid = verifyToken(token);
    // if (!isValid) { ws.close(); return; }

    ws.isAlive = true;
    const clientId = userId || this.generateClientId();
    
    this.clients.set(clientId, ws);
    if (userId) {
      this.userIdToSocket.set(userId, ws);
    }

    console.log(`🔌 Client connected: ${clientId}`);

    // 发送欢迎消息
    this.send(ws, {
      type: 'welcome',
      payload: { clientId, message: 'Connected to BitcoinPlace' },
      timestamp: Date.now()
    });

    // 广播用户上线
    this.broadcast({
      type: 'user:online',
      payload: { userId, count: this.clients.size },
      timestamp: Date.now()
    }, ws);

    // 处理消息
    ws.on('message', (data) => {
      this.handleMessage(ws, clientId, data.toString());
    });

    // 处理关闭
    ws.on('close', () => {
      this.handleClose(clientId, userId);
    });

    // 处理错误
    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
    });

    // 处理 pong
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(ws: WebSocket, clientId: string, data: string) {
    try {
      const message = JSON.parse(data) as WebSocketMessage;
      console.log(`📨 Message from ${clientId}:`, message.type);

      switch (message.type) {
        case 'ping':
          this.send(ws, {
            type: 'pong',
            payload: { timestamp: Date.now() },
            timestamp: Date.now()
          });
          break;

        case 'canvas:subscribe':
          // 订阅画布更新
          (ws as any).subscribedChannels = (ws as any).subscribedChannels || [];
          (ws as any).subscribedChannels.push('canvas');
          break;

        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * 处理客户端断开
   */
  private handleClose(clientId: string, userId?: string) {
    this.clients.delete(clientId);
    if (userId) {
      this.userIdToSocket.delete(userId);
    }

    console.log(`🔌 Client disconnected: ${clientId}`);

    // 广播用户下线
    this.broadcast({
      type: 'user:offline',
      payload: { userId, count: this.clients.size },
      timestamp: Date.now()
    });
  }

  /**
   * 发送消息到单个客户端
   */
  send(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * 广播消息到所有客户端
   */
  broadcast(message: WebSocketMessage, excludeWs?: WebSocket) {
    const data = JSON.stringify(message);
    this.wss?.clients.forEach((ws) => {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  /**
   * 发送消息到指定用户
   */
  sendToUser(userId: string, message: WebSocketMessage) {
    const ws = this.userIdToSocket.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      this.send(ws, message);
    }
  }

  /**
   * 广播画布更新
   */
  broadcastCanvasUpdate(x: number, y: number, color: number, userId: string) {
    this.broadcast({
      type: 'canvas:update',
      payload: { x, y, color, userId },
      timestamp: Date.now()
    });
  }

  /**
   * 获取在线用户数
   */
  getOnlineCount(): number {
    return this.clients.size;
  }

  /**
   * 生成客户端 ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 关闭 WebSocket 服务
   */
  close() {
    this.wss?.close();
    this.clients.clear();
    this.userIdToSocket.clear();
  }
}

export const webSocketService = new WebSocketService();
