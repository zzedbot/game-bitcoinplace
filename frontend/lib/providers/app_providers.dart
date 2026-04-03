import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/http_service.dart';
import '../services/websocket_service.dart';

/// HTTP 服务 Provider
final httpServiceProvider = Provider<HttpService>((ref) {
  return httpService;
});

/// WebSocket 服务 Provider
final webSocketServiceProvider = Provider<WebSocketService>((ref) {
  return webSocketService;
});

/// WebSocket 连接状态 Provider
final webSocketStatusProvider = StreamProvider<bool>((ref) {
  final ws = ref.watch(webSocketServiceProvider);
  return ws.statusStream;
});

/// 用户认证状态 Provider
final authStateProvider = StateProvider<bool>((ref) => false);

/// 当前用户 ID Provider
final currentUserIdProvider = StateProvider<String?>((ref) => null);

/// 当前 Token Provider
final currentTokenProvider = StateProvider<String?>((ref) => null);
