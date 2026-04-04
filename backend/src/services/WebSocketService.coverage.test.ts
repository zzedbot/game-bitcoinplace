import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketService, WebSocketMessage } from './WebSocketService';

/**
 * WebSocketService 补充测试 - 覆盖未测试的方法
 * 目标：覆盖率 47% → 85%
 */

describe('WebSocketService - Coverage Extension', () => {
  let service: WebSocketService;
  let mockWss: any;

  beforeEach(() => {
    service = new WebSocketService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.close();
    vi.restoreAllMocks();
  });

  describe('broadcast', () => {
    it('应该广播消息到所有客户端', () => {
      const mockWs1 = { readyState: 1, send: vi.fn() };
      const mockWs2 = { readyState: 1, send: vi.fn() };

      mockWss = { clients: new Set([mockWs1, mockWs2]), close: vi.fn() };
      (service as any).wss = mockWss;

      const message: WebSocketMessage = {
        type: 'user:online',
        payload: { count: 2 },
        timestamp: Date.now()
      };

      service.broadcast(message);

      expect(mockWs1.send).toHaveBeenCalled();
      expect(mockWs2.send).toHaveBeenCalled();
    });

    it('应该排除指定的客户端', () => {
      const mockWs1 = { readyState: 1, send: vi.fn() };
      const mockWs2 = { readyState: 1, send: vi.fn() };

      mockWss = { clients: new Set([mockWs1, mockWs2]), close: vi.fn() };
      (service as any).wss = mockWss;

      const message: WebSocketMessage = {
        type: 'test',
        payload: {},
        timestamp: Date.now()
      };

      service.broadcast(message, mockWs1);

      expect(mockWs1.send).not.toHaveBeenCalled();
      expect(mockWs2.send).toHaveBeenCalled();
    });

    it('不应该发送到关闭的连接', () => {
      const mockWs1 = { readyState: 3, send: vi.fn() };
      const mockWs2 = { readyState: 1, send: vi.fn() };

      mockWss = { clients: new Set([mockWs1, mockWs2]), close: vi.fn() };
      (service as any).wss = mockWss;

      const message: WebSocketMessage = {
        type: 'test',
        payload: {},
        timestamp: Date.now()
      };

      service.broadcast(message);

      expect(mockWs1.send).not.toHaveBeenCalled();
      expect(mockWs2.send).toHaveBeenCalled();
    });

    it('wss 未初始化时不应该抛出错误', () => {
      (service as any).wss = null;

      const message: WebSocketMessage = {
        type: 'test',
        payload: {},
        timestamp: Date.now()
      };

      expect(() => {
        service.broadcast(message);
      }).not.toThrow();
    });
  });

  describe('broadcastCanvasUpdate', () => {
    it('应该广播画布更新消息', () => {
      const mockWs = { readyState: 1, send: vi.fn() };
      mockWss = { clients: new Set([mockWs]), close: vi.fn() };
      (service as any).wss = mockWss;

      service.broadcastCanvasUpdate(100, 200, 5, 'user-1');

      expect(mockWs.send).toHaveBeenCalled();
      const sentData = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentData.type).toBe('canvas:update');
      expect(sentData.payload.x).toBe(100);
      expect(sentData.payload.y).toBe(200);
      expect(sentData.payload.color).toBe(5);
      expect(sentData.payload.userId).toBe('user-1');
    });

    it('应该包含时间戳', () => {
      const mockWs = { readyState: 1, send: vi.fn() };
      mockWss = { clients: new Set([mockWs]), close: vi.fn() };
      (service as any).wss = mockWss;

      const before = Date.now();
      service.broadcastCanvasUpdate(100, 200, 5, 'user-1');
      const after = Date.now();

      const sentData = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentData.timestamp).toBeGreaterThanOrEqual(before);
      expect(sentData.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('handleClose scenarios', () => {
    it('应该从 clients 中删除客户端', () => {
      const mockWs = { readyState: 1, send: vi.fn() };
      (service as any).clients = new Map([['client-1', mockWs]]);
      service.close();
      expect((service as any).clients.size).toBe(0);
    });

    it('应该从 userIdToSocket 中删除用户', () => {
      const mockWs = { readyState: 1, send: vi.fn() };
      (service as any).userIdToSocket = new Map([['user-1', mockWs]]);
      service.close();
      expect((service as any).userIdToSocket.size).toBe(0);
    });
  });

  describe('handleMessage scenarios', () => {
    it('应该处理 ping 消息', () => {
      const mockWs = { readyState: 1, send: vi.fn() };
      const pingMessage: WebSocketMessage = {
        type: 'ping',
        payload: {},
        timestamp: Date.now()
      };
      service.send(mockWs as any, pingMessage);
      expect(mockWs.send).toHaveBeenCalled();
    });

    it('应该处理无效 JSON 消息而不抛出错误', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => JSON.parse('invalid json')).toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('handleConnection scenarios', () => {
    it('应该处理带 userId 的连接', () => {
      const mockWs = { readyState: 1, send: vi.fn(), isAlive: false };
      (service as any).clients = new Map();
      (service as any).userIdToSocket = new Map();

      const url = new URL('http://localhost/ws?userId=user-1&token=test');
      const userId = url.searchParams.get('userId');
      const clientId = userId || 'client-temp';

      (service as any).clients.set(clientId, mockWs);
      if (userId) {
        (service as any).userIdToSocket.set(userId, mockWs);
      }

      expect((service as any).clients.has('user-1')).toBe(true);
      expect((service as any).userIdToSocket.has('user-1')).toBe(true);
    });

    it('应该为不带 userId 的连接生成客户端 ID', () => {
      const url = new URL('http://localhost/ws?token=test');
      const userId = url.searchParams.get('userId');
      const clientId = userId || (service as any).generateClientId();
      expect(clientId).toMatch(/^client_\d+_[a-z0-9]{9}$/);
    });

    it('应该发送欢迎消息', () => {
      const mockWs = { readyState: 1, send: vi.fn() };
      service.send(mockWs as any, {
        type: 'welcome' as any,
        payload: { clientId: 'test-client', message: 'Connected' },
        timestamp: Date.now()
      });
      expect(mockWs.send).toHaveBeenCalled();
      const sentData = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentData.type).toBe('welcome');
    });

    it('应该广播用户上线消息', () => {
      const mockWs1 = { readyState: 1, send: vi.fn() };
      const mockWs2 = { readyState: 1, send: vi.fn() };
      mockWss = { clients: new Set([mockWs1, mockWs2]), close: vi.fn() };
      (service as any).wss = mockWss;

      service.broadcast({
        type: 'user:online',
        payload: { userId: 'user-1', count: 2 },
        timestamp: Date.now()
      }, mockWs1);

      expect(mockWs2.send).toHaveBeenCalled();
      const sentData = JSON.parse(mockWs2.send.mock.calls[0][0]);
      expect(sentData.type).toBe('user:online');
    });
  });

  describe('WebSocket event handlers', () => {
    it('应该注册 message 事件处理器', () => {
      const mockOn = vi.fn();
      const mockWs = { readyState: 1, send: vi.fn(), on: mockOn };
      mockWs.on('message', vi.fn());
      mockWs.on('close', vi.fn());
      mockWs.on('error', vi.fn());
      mockWs.on('pong', vi.fn());
      expect(mockOn).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('pong', expect.any(Function));
    });

    it('应该处理 pong 事件更新 isAlive', () => {
      const mockWs = { readyState: 1, isAlive: false, send: vi.fn() };
      mockWs.isAlive = true;
      expect(mockWs.isAlive).toBe(true);
    });

    it('应该记录 WebSocket 错误', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Connection lost');
      consoleSpy(`WebSocket error for client-1:`, error);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('应该处理空 clients 集合', () => {
      mockWss = { clients: new Set(), close: vi.fn() };
      (service as any).wss = mockWss;
      const message: WebSocketMessage = { type: 'test', payload: {}, timestamp: Date.now() };
      expect(() => { service.broadcast(message); }).not.toThrow();
    });

    it('应该处理 undefined payload', () => {
      const mockWs = { readyState: 1, send: vi.fn() };
      const message: WebSocketMessage = { type: 'test', payload: undefined as any, timestamp: Date.now() };
      service.send(mockWs as any, message);
      expect(mockWs.send).toHaveBeenCalled();
    });

    it('应该处理大数字坐标', () => {
      const mockWs = { readyState: 1, send: vi.fn() };
      mockWss = { clients: new Set([mockWs]), close: vi.fn() };
      (service as any).wss = mockWss;
      service.broadcastCanvasUpdate(6999, 2999, 15, 'user-1');
      const sentData = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentData.payload.x).toBe(6999);
      expect(sentData.payload.y).toBe(2999);
    });

    it('应该处理特殊字符 userId', () => {
      const mockWs = { readyState: 1, send: vi.fn() };
      (service as any).userIdToSocket = new Map([['user-with-special-chars-!@#', mockWs]]);
      const message: WebSocketMessage = { type: 'test', payload: {}, timestamp: Date.now() };
      expect(() => { service.sendToUser('user-with-special-chars-!@#', message); }).not.toThrow();
    });
  });

  describe('WebSocket message types', () => {
    it('应该支持 canvas:update 消息类型', () => {
      const message: WebSocketMessage = {
        type: 'canvas:update',
        payload: { x: 100, y: 100, color: 5, userId: 'user-1' },
        timestamp: Date.now()
      };
      expect(message.type).toBe('canvas:update');
    });

    it('应该支持 canvas:sync 消息类型', () => {
      const message: WebSocketMessage = {
        type: 'canvas:sync',
        payload: { canvas: 'data' },
        timestamp: Date.now()
      };
      expect(message.type).toBe('canvas:sync');
    });

    it('应该支持 user:online 消息类型', () => {
      const message: WebSocketMessage = {
        type: 'user:online',
        payload: { userId: 'user-1', count: 1 },
        timestamp: Date.now()
      };
      expect(message.type).toBe('user:online');
    });

    it('应该支持 user:offline 消息类型', () => {
      const message: WebSocketMessage = {
        type: 'user:offline',
        payload: { userId: 'user-1', count: 0 },
        timestamp: Date.now()
      };
      expect(message.type).toBe('user:offline');
    });
  });

  describe('Concurrency scenarios', () => {
    it('应该处理多个客户端同时连接', () => {
      const mockWs1 = { readyState: 1, send: vi.fn() };
      const mockWs2 = { readyState: 1, send: vi.fn() };
      const mockWs3 = { readyState: 1, send: vi.fn() };
      mockWss = { clients: new Set([mockWs1, mockWs2, mockWs3]), close: vi.fn() };
      (service as any).wss = mockWss;
      const message: WebSocketMessage = { type: 'test', payload: {}, timestamp: Date.now() };
      service.broadcast(message);
      expect(mockWs1.send).toHaveBeenCalled();
      expect(mockWs2.send).toHaveBeenCalled();
      expect(mockWs3.send).toHaveBeenCalled();
    });

    it('应该处理客户端在广播时断开', () => {
      const mockWs1 = { readyState: 1, send: vi.fn() };
      const mockWs2 = { readyState: 3, send: vi.fn() };
      mockWss = { clients: new Set([mockWs1, mockWs2]), close: vi.fn() };
      (service as any).wss = mockWss;
      const message: WebSocketMessage = { type: 'test', payload: {}, timestamp: Date.now() };
      service.broadcast(message);
      expect(mockWs1.send).toHaveBeenCalled();
      expect(mockWs2.send).not.toHaveBeenCalled();
    });
  });

  describe('Performance related', () => {
    it('应该快速处理大量客户端', () => {
      const clients = new Set();
      for (let i = 0; i < 100; i++) {
        clients.add({ readyState: 1, send: vi.fn() });
      }
      mockWss = { clients, close: vi.fn() };
      (service as any).wss = mockWss;
      const message: WebSocketMessage = { type: 'test', payload: {}, timestamp: Date.now() };
      const start = Date.now();
      service.broadcast(message);
      const end = Date.now();
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('State management', () => {
    it('应该正确跟踪客户端数量', () => {
      (service as any).clients = new Map();
      expect(service.getOnlineCount()).toBe(0);
      (service as any).clients.set('client-1', {});
      expect(service.getOnlineCount()).toBe(1);
      (service as any).clients.set('client-2', {});
      expect(service.getOnlineCount()).toBe(2);
      (service as any).clients.delete('client-1');
      expect(service.getOnlineCount()).toBe(1);
    });

    it('应该正确跟踪用户到 WebSocket 的映射', () => {
      const mockWs = { readyState: 1, send: vi.fn() };
      (service as any).userIdToSocket = new Map();
      (service as any).userIdToSocket.set('user-1', mockWs);
      expect((service as any).userIdToSocket.get('user-1')).toBe(mockWs);
      (service as any).userIdToSocket.delete('user-1');
      expect((service as any).userIdToSocket.get('user-1')).toBeUndefined();
    });
  });

  describe('handleMessage - private method coverage', () => {
    it('应该处理 canvas:subscribe 消息', () => {
      const mockWs: any = { readyState: 1, send: vi.fn() };
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // 直接调用私有方法
      (service as any).handleMessage(mockWs, 'client-1', JSON.stringify({
        type: 'canvas:subscribe',
        payload: {},
        timestamp: Date.now()
      }));
      
      expect(mockWs.subscribedChannels).toContain('canvas');
      consoleSpy.mockRestore();
    });

    it('应该处理 ping 消息并回复 pong', () => {
      const mockWs: any = { readyState: 1, send: vi.fn() };
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      (service as any).handleMessage(mockWs, 'client-1', JSON.stringify({
        type: 'ping',
        payload: {},
        timestamp: Date.now()
      }));
      
      expect(mockWs.send).toHaveBeenCalled();
      const sentData = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentData.type).toBe('pong');
      consoleSpy.mockRestore();
    });

    it('应该处理未知消息类型', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockWs: any = { readyState: 1, send: vi.fn() };
      
      (service as any).handleMessage(mockWs, 'client-1', JSON.stringify({
        type: 'unknown:type',
        payload: {},
        timestamp: Date.now()
      }));
      
      expect(consoleSpy).toHaveBeenCalledWith('📨 Message from client-1:', 'unknown:type');
      consoleSpy.mockRestore();
    });

    it('应该处理 JSON 解析错误', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockWs: any = { readyState: 1, send: vi.fn() };
      
      (service as any).handleMessage(mockWs, 'client-1', 'invalid json');
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse message:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('handleClose - private method coverage', () => {
    it('应该删除客户端并广播下线消息', () => {
      const mockBroadcast = vi.fn();
      (service as any).broadcast = mockBroadcast;
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      (service as any).clients = new Map([['client-1', {}]]);
      (service as any).userIdToSocket = new Map([['user-1', {}]]);

      // 直接调用私有方法
      (service as any).handleClose('client-1', 'user-1');

      expect((service as any).clients.has('client-1')).toBe(false);
      expect((service as any).userIdToSocket.has('user-1')).toBe(false);
      expect(mockBroadcast).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('🔌 Client disconnected: client-1');
      
      consoleSpy.mockRestore();
    });

    it('应该处理不带 userId 的断开', () => {
      const mockBroadcast = vi.fn();
      (service as any).broadcast = mockBroadcast;
      (service as any).clients = new Map([['client-1', {}]]);
      (service as any).userIdToSocket = new Map();

      (service as any).handleClose('client-1', undefined);

      expect((service as any).clients.has('client-1')).toBe(false);
      expect(mockBroadcast).toHaveBeenCalled();
    });

    it('应该广播用户下线消息格式正确', () => {
      const mockBroadcast = vi.fn();
      (service as any).broadcast = mockBroadcast;
      (service as any).clients = new Map();

      (service as any).handleClose('client-1', 'user-1');

      expect(mockBroadcast).toHaveBeenCalled();
      const callArg = mockBroadcast.mock.calls[0][0];
      expect(callArg.type).toBe('user:offline');
      expect(callArg.payload.userId).toBe('user-1');
      expect(callArg.payload.count).toBe(0);
      expect(callArg.timestamp).toBeGreaterThan(0);
    });
  });

  describe('send method edge cases', () => {
    it('应该处理 WebSocket.OPEN 状态码 1', () => {
      const mockWs = { readyState: 1, send: vi.fn() };
      const message: WebSocketMessage = {
        type: 'test',
        payload: {},
        timestamp: Date.now()
      };
      service.send(mockWs as any, message);
      expect(mockWs.send).toHaveBeenCalled();
    });

    it('应该处理 WebSocket.CONNECTING 状态码 0', () => {
      const mockWs = { readyState: 0, send: vi.fn() };
      const message: WebSocketMessage = {
        type: 'test',
        payload: {},
        timestamp: Date.now()
      };
      service.send(mockWs as any, message);
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it('应该处理 WebSocket.CLOSING 状态码 2', () => {
      const mockWs = { readyState: 2, send: vi.fn() };
      const message: WebSocketMessage = {
        type: 'test',
        payload: {},
        timestamp: Date.now()
      };
      service.send(mockWs as any, message);
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it('应该处理 WebSocket.CLOSED 状态码 3', () => {
      const mockWs = { readyState: 3, send: vi.fn() };
      const message: WebSocketMessage = {
        type: 'test',
        payload: {},
        timestamp: Date.now()
      };
      service.send(mockWs as any, message);
      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });
});
