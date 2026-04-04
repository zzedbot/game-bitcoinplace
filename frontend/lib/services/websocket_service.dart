import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../config/app_config.dart';

/// WebSocket 消息类型
enum WebSocketMessageType {
  welcome,
  canvasUpdate,
  userOnline,
  userOffline,
  error,
}

/// WebSocket 消息
class WebSocketMessage {
  final WebSocketMessageType type;
  final Map<String, dynamic> payload;
  final DateTime timestamp;

  WebSocketMessage({
    required this.type,
    required this.payload,
    required this.timestamp,
  });

  factory WebSocketMessage.fromJson(Map<String, dynamic> json) {
    final payload = (json['payload'] as Map).cast<String, dynamic>();
    return WebSocketMessage(
      type: WebSocketMessageType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => WebSocketMessageType.error,
      ),
      payload: payload,
      timestamp: DateTime.fromMillisecondsSinceEpoch(json['timestamp'] as int),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type.name,
      'payload': payload,
      'timestamp': timestamp.millisecondsSinceEpoch,
    };
  }
}

/// WebSocket 服务
class WebSocketService {
  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  bool _isConnected = false;
  String? _userId;
  String? _token;

  final _messageController = StreamController<WebSocketMessage>.broadcast();
  final _statusController = StreamController<bool>.broadcast();

  // 自动重连配置
  bool _autoReconnect = true;
  int _maxReconnectAttempts = 5;
  int _currentReconnectAttempts = 0;
  int _baseReconnectDelay = 1000; // 1 秒
  int _maxReconnectDelay = 30000; // 30 秒
  Timer? _reconnectTimer;
  
  // 消息队列
  final List<WebSocketMessage> _messageQueue = [];
  static const int _maxQueueSize = 100;
  
  // 心跳配置
  Timer? _heartbeatTimer;
  static const int _heartbeatInterval = 15000; // 15 秒
  Timer? _connectionTimeoutTimer;
  static const int _connectionTimeout = 10000; // 10 秒

  /// 消息流
  Stream<WebSocketMessage> get messageStream => _messageController.stream;

  /// 连接状态流
  Stream<bool> get statusStream => _statusController.stream;

  /// 是否已连接
  bool get isConnected => _isConnected;

  /// 是否启用自动重连
  bool get autoReconnect => _autoReconnect;
  set autoReconnect(bool value) {
    _autoReconnect = value;
  }

  /// 最大重连次数
  int get maxReconnectAttempts => _maxReconnectAttempts;
  set maxReconnectAttempts(int value) {
    _maxReconnectAttempts = value;
  }

  /// 消息队列长度
  int get queuedMessageCount => _messageQueue.length;

  /// 连接 WebSocket
  Future<void> connect(String userId, String token) async {
    if (_isConnected) {
      await disconnect();
    }

    _userId = userId;
    _token = token;
    _currentReconnectAttempts = 0;

    // 设置连接超时
    _connectionTimeoutTimer?.cancel();
    _connectionTimeoutTimer = Timer(Duration(milliseconds: _connectionTimeout), () {
      if (!_isConnected) {
        _handleConnectionTimeout();
      }
    });

    try {
      final wsUrl = '${AppConfig.wsUrl}?userId=$userId&token=$token';
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));

      _subscription = _channel!.stream.listen(
        (data) {
          // 连接成功，取消超时定时器
          _connectionTimeoutTimer?.cancel();
          
          try {
            final json = jsonDecode(data as String) as Map<String, dynamic>;
            final message = WebSocketMessage.fromJson(json);
            _messageController.add(message);

            if (message.type == WebSocketMessageType.welcome) {
              _isConnected = true;
              _statusController.add(true);
              _startHeartbeat();
              _flushMessageQueue();
            }
          } catch (e) {
            _messageController.add(
              WebSocketMessage(
                type: WebSocketMessageType.error,
                payload: {'error': 'Failed to parse message: $e'},
                timestamp: DateTime.now(),
              ),
            );
          }
        },
        onError: (error) {
          _connectionTimeoutTimer?.cancel();
          _handleError(error);
        },
        onDone: () {
          _connectionTimeoutTimer?.cancel();
          _handleDisconnect();
        },
      );
    } catch (e) {
      _connectionTimeoutTimer?.cancel();
      _handleError(e);
      rethrow;
    }
  }

  /// 处理连接超时
  void _handleConnectionTimeout() {
    _isConnected = false;
    _statusController.add(false);
    _messageController.add(
      WebSocketMessage(
        type: WebSocketMessageType.error,
        payload: {'error': 'Connection timeout after ${_connectionTimeout}ms'},
        timestamp: DateTime.now(),
      ),
    );
    _scheduleReconnect();
  }

  /// 处理错误
  void _handleError(dynamic error) {
    _isConnected = false;
    _statusController.add(false);
    _messageController.add(
      WebSocketMessage(
        type: WebSocketMessageType.error,
        payload: {'error': error.toString()},
        timestamp: DateTime.now(),
      ),
    );
    if (_autoReconnect) {
      _scheduleReconnect();
    }
  }

  /// 处理断开连接
  void _handleDisconnect() {
    _isConnected = false;
    _statusController.add(false);
    _stopHeartbeat();
    if (_autoReconnect && _userId != null) {
      _scheduleReconnect();
    }
  }

  /// 启动心跳
  void _startHeartbeat() {
    _stopHeartbeat();
    _heartbeatTimer = Timer.periodic(Duration(milliseconds: _heartbeatInterval), (_) {
      _sendHeartbeat();
    });
  }

  /// 停止心跳
  void _stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  /// 发送心跳
  void _sendHeartbeat() {
    if (_isConnected && _channel != null) {
      try {
        _channel!.sink.add(jsonEncode({
          'type': 'ping',
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        }));
      } catch (e) {
        // 心跳失败，忽略
      }
    }
  }

  /// 调度重连
  void _scheduleReconnect() {
    if (_currentReconnectAttempts >= _maxReconnectAttempts) {
      _messageController.add(
        WebSocketMessage(
          type: WebSocketMessageType.error,
          payload: {'error': 'Max reconnection attempts ($_maxReconnectAttempts) reached'},
          timestamp: DateTime.now(),
        ),
      );
      return;
    }

    final delay = _calculateBackoffDelay();
    _currentReconnectAttempts++;

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(milliseconds: delay), () {
      if (_userId != null && _token != null) {
        connect(_userId!, _token!);
      }
    });
  }

  /// 计算指数退避延迟
  int _calculateBackoffDelay() {
    final delay = _baseReconnectDelay * (1 << (_currentReconnectAttempts - 1));
    return delay.clamp(_baseReconnectDelay, _maxReconnectDelay);
  }

  /// 缓冲消息
  void _queueMessage(WebSocketMessage message) {
    if (_messageQueue.length >= _maxQueueSize) {
      _messageQueue.removeAt(0); // 移除最旧的消息
    }
    _messageQueue.add(message);
  }

  /// 刷新消息队列
  void _flushMessageQueue() {
    while (_messageQueue.isNotEmpty && _isConnected) {
      final message = _messageQueue.removeAt(0);
      send(message);
    }
  }

  /// 断开连接
  Future<void> disconnect() async {
    // 禁用自动重连
    _autoReconnect = false;
    
    // 取消所有定时器
    _reconnectTimer?.cancel();
    _heartbeatTimer?.cancel();
    _connectionTimeoutTimer?.cancel();
    
    await _subscription?.cancel();
    await _channel?.sink.close();
    _channel = null;
    _subscription = null;
    _isConnected = false;
    if (!_statusController.isClosed) {
      _statusController.add(false);
    }
  }

  /// 发送消息
  void send(WebSocketMessage message) {
    if (_channel != null && _isConnected) {
      _channel!.sink.add(jsonEncode(message.toJson()));
    } else {
      // 未连接时缓冲消息
      _queueMessage(message);
    }
  }

  /// 发送染色事件
  void sendColorUpdate(int x, int y, int color) {
    send(
      WebSocketMessage(
        type: WebSocketMessageType.canvasUpdate,
        payload: {
          'x': x,
          'y': y,
          'color': color,
        },
        timestamp: DateTime.now(),
      ),
    );
  }

  /// 重连（手动触发，忽略次数限制）
  Future<void> reconnect() async {
    _currentReconnectAttempts = 0;
    if (_userId != null && _token != null) {
      await connect(_userId!, _token!);
    }
  }

  /// 关闭服务
  void close() {
    _reconnectTimer?.cancel();
    _heartbeatTimer?.cancel();
    _connectionTimeoutTimer?.cancel();
    _messageController.close();
    _statusController.close();
  }

  // ==================== 测试支持方法 ====================

  /// 模拟连接状态（用于测试）
  void mockConnection(bool connected) {
    _isConnected = connected;
    if (!_statusController.isClosed) {
      _statusController.add(connected);
    }
    if (connected) {
      _startHeartbeat();
    } else {
      _stopHeartbeat();
    }
  }

  /// 发送模拟消息（用于测试）
  void sendMockMessage(WebSocketMessage message) {
    if (!_messageController.isClosed) {
      _messageController.add(message);
    }
  }

  /// 重置服务状态（用于测试）
  void resetForTest() {
    _reconnectTimer?.cancel();
    _heartbeatTimer?.cancel();
    _connectionTimeoutTimer?.cancel();
    _isConnected = false;
    _userId = null;
    _token = null;
    _channel = null;
    _subscription = null;
    _currentReconnectAttempts = 0;
    _messageQueue.clear();
    _autoReconnect = true;
  }

  /// 获取内部状态（用于测试）
  Map<String, dynamic> getTestState() {
    return {
      'isConnected': _isConnected,
      'userId': _userId,
      'token': _token,
      'hasChannel': _channel != null,
      'hasSubscription': _subscription != null,
      'messageControllerClosed': _messageController.isClosed,
      'statusControllerClosed': _statusController.isClosed,
      'autoReconnect': _autoReconnect,
      'maxReconnectAttempts': _maxReconnectAttempts,
      'currentReconnectAttempts': _currentReconnectAttempts,
      'queuedMessageCount': _messageQueue.length,
      'heartbeatActive': _heartbeatTimer != null,
    };
  }

  /// 获取重连配置（用于测试）
  Map<String, dynamic> getReconnectConfig() {
    return {
      'autoReconnect': _autoReconnect,
      'maxReconnectAttempts': _maxReconnectAttempts,
      'baseReconnectDelay': _baseReconnectDelay,
      'maxReconnectDelay': _maxReconnectDelay,
    };
  }

  /// 获取消息队列（用于测试）
  List<WebSocketMessage> getMessageQueue() {
    return List.unmodifiable(_messageQueue);
  }
}

// 单例
final webSocketService = WebSocketService();
