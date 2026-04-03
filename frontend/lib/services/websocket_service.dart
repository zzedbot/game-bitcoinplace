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
    return WebSocketMessage(
      type: WebSocketMessageType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => WebSocketMessageType.error,
      ),
      payload: json['payload'] as Map<String, dynamic>,
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

  /// 消息流
  Stream<WebSocketMessage> get messageStream => _messageController.stream;

  /// 连接状态流
  Stream<bool> get statusStream => _statusController.stream;

  /// 是否已连接
  bool get isConnected => _isConnected;

  /// 连接 WebSocket
  Future<void> connect(String userId, String token) async {
    if (_isConnected) {
      await disconnect();
    }

    _userId = userId;
    _token = token;

    try {
      final wsUrl = '${AppConfig.wsUrl}?userId=$userId&token=$token';
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));

      _subscription = _channel!.stream.listen(
        (data) {
          try {
            final json = jsonDecode(data as String) as Map<String, dynamic>;
            final message = WebSocketMessage.fromJson(json);
            _messageController.add(message);

            if (message.type == WebSocketMessageType.welcome) {
              _isConnected = true;
              _statusController.add(true);
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
          _isConnected = false;
          _statusController.add(false);
          _messageController.add(
            WebSocketMessage(
              type: WebSocketMessageType.error,
              payload: {'error': error.toString()},
              timestamp: DateTime.now(),
            ),
          );
        },
        onDone: () {
          _isConnected = false;
          _statusController.add(false);
        },
      );
    } catch (e) {
      _isConnected = false;
      _statusController.add(false);
      rethrow;
    }
  }

  /// 断开连接
  Future<void> disconnect() async {
    await _subscription?.cancel();
    await _channel?.sink.close();
    _channel = null;
    _subscription = null;
    _isConnected = false;
    _statusController.add(false);
  }

  /// 发送消息
  void send(WebSocketMessage message) {
    if (_channel != null && _isConnected) {
      _channel!.sink.add(jsonEncode(message.toJson()));
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

  /// 重连
  Future<void> reconnect() async {
    if (_userId != null && _token != null) {
      await connect(_userId!, _token!);
    }
  }

  /// 关闭服务
  void close() {
    _messageController.close();
    _statusController.close();
  }
}

// 单例
final webSocketService = WebSocketService();
