import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketService, WebSocketMessage } from './WebSocketService';

// Mock ws module
vi.mock('ws', () => {
  const mockServer = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    clients: new Set(),
    handleUpgrade: vi.fn(),
    emit: vi.fn(),
    close: vi.fn()
  }));
  return { Server: mockServer };
});

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    service = new WebSocketService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.close();
  });

  describe('initialize', () => {
    it('应该初始化 WebSocket 服务', () => {
      const mockServer = {
        on: vi.fn()
      };

      expect(() => {
        service.initialize(mockServer as any);
      }).not.toThrow();
    });
  });

  describe('send', () => {
    it('应该发送消息到客户端', () => {
      const mockWs = {
        readyState: 1, // WebSocket.OPEN
        send: vi.fn()
      };

      const message: WebSocketMessage = {
        type: 'welcome',
        payload: { test: 'data' },
        timestamp: Date.now()
      };

      service.send(mockWs as any, message);

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('不应该发送到关闭的连接', () => {
      const mockWs = {
        readyState: 3, // WebSocket.CLOSED
        send: vi.fn()
      };

      const message: WebSocketMessage = {
        type: 'test',
        payload: {},
        timestamp: Date.now()
      };

      service.send(mockWs as any, message);

      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });

  describe('sendToUser', () => {
    it('应该发送消息到指定用户', () => {
      const mockWs = {
        readyState: 1,
        send: vi.fn()
      };

      (service as any).userIdToSocket = new Map([
        ['user-1', mockWs]
      ]);

      const message: WebSocketMessage = {
        type: 'test',
        payload: { userId: 'user-1' },
        timestamp: Date.now()
      };

      service.sendToUser('user-1', message);

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('应该在用户不在线时不发送', () => {
      (service as any).userIdToSocket = new Map();

      const message: WebSocketMessage = {
        type: 'test',
        payload: {},
        timestamp: Date.now()
      };

      expect(() => {
        service.sendToUser('nonexistent', message);
      }).not.toThrow();
    });
  });

  describe('getOnlineCount', () => {
    it('应该返回在线用户数', () => {
      (service as any).clients = new Map([
        ['client1', {}],
        ['client2', {}],
        ['client3', {}]
      ]);

      const count = service.getOnlineCount();

      expect(count).toBe(3);
    });

    it('空连接时返回 0', () => {
      (service as any).clients = new Map();

      const count = service.getOnlineCount();

      expect(count).toBe(0);
    });
  });

  describe('close', () => {
    it('应该关闭服务并清理连接', () => {
      const mockClose = vi.fn();
      (service as any).wss = { close: mockClose };
      (service as any).clients = new Map([['client1', {}]]);
      (service as any).userIdToSocket = new Map([['user1', {}]]);

      service.close();

      expect(mockClose).toHaveBeenCalled();
      expect((service as any).clients.size).toBe(0);
      expect((service as any).userIdToSocket.size).toBe(0);
    });
  });

  describe('generateClientId', () => {
    it('应该生成唯一的客户端 ID', () => {
      const id1 = (service as any).generateClientId();
      const id2 = (service as any).generateClientId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^client_\d+_[a-z0-9]{9}$/);
    });
  });

  describe('WebSocketMessage type', () => {
    it('应该创建正确的消息格式', () => {
      const message: WebSocketMessage = {
        type: 'canvas:update',
        payload: { x: 100, y: 200, color: 5 },
        timestamp: Date.now()
      };

      expect(message.type).toBe('canvas:update');
      expect(message.payload.x).toBe(100);
      expect(message.payload.y).toBe(200);
      expect(message.payload.color).toBe(5);
      expect(message.timestamp).toBeGreaterThan(0);
    });
  });
});
