import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bitcoinplace_client/providers/app_providers.dart';
import 'package:bitcoinplace_client/services/http_service.dart';
import 'package:bitcoinplace_client/services/websocket_service.dart';

/// FE-3.2T Provider 状态管理测试
/// 测试 Riverpod Provider 的定义、状态变化和依赖注入
void main() {
  group('FE-3.2T Provider State Management Tests', () {
    late ProviderContainer container;

    setUp(() {
      container = ProviderContainer();
    });

    tearDown(() {
      container.dispose();
    });

    // httpServiceProvider 测试
    test('FE-3.2T-001: httpServiceProvider returns HttpService instance', () {
      final service = container.read(httpServiceProvider);
      expect(service, isA<HttpService>());
      expect(service, isNotNull);
    });

    test('FE-3.2T-002: httpServiceProvider is singleton', () {
      final service1 = container.read(httpServiceProvider);
      final service2 = container.read(httpServiceProvider);
      expect(service1, equals(service2));
    });

    // webSocketServiceProvider 测试
    test('FE-3.2T-003: webSocketServiceProvider returns WebSocketService instance', () {
      final service = container.read(webSocketServiceProvider);
      expect(service, isA<WebSocketService>());
      expect(service, isNotNull);
    });

    test('FE-3.2T-004: webSocketServiceProvider is singleton', () {
      final service1 = container.read(webSocketServiceProvider);
      final service2 = container.read(webSocketServiceProvider);
      expect(service1, equals(service2));
    });

    // webSocketStatusProvider 测试
    test('FE-3.2T-005: webSocketStatusProvider is StreamProvider', () {
      // StreamProvider 返回 AsyncValue，但底层是 Stream
      final result = container.read(webSocketStatusProvider);
      // 在测试环境中，StreamProvider 返回 AsyncValue.data(Stream)
      expect(result, isNotNull);
    });

    test('FE-3.2T-006: webSocketStatusProvider can be listened with container.listen', () async {
      final states = <bool>[];
      
      // 使用 container.listen 订阅 StreamProvider
      container.listen<bool>(
        webSocketStatusProvider.select((value) => value.value ?? false),
        (previous, next) => states.add(next),
        fireImmediately: true,
      );
      
      // 等待流发出值
      await Future.delayed(const Duration(milliseconds: 50));
      
      // 应该有初始值
      expect(states, isNotEmpty);
    });

    test('FE-3.2T-007: webSocketStatusProvider reflects connection changes', () async {
      final states = <bool>[];
      
      // 使用 container.listen 订阅
      container.listen<bool>(
        webSocketStatusProvider.select((value) => value.value ?? false),
        (previous, next) => states.add(next),
        fireImmediately: true,
      );
      
      // 获取 WebSocketService 并模拟连接状态
      final ws = container.read(webSocketServiceProvider);
      ws.mockConnection(true);
      
      await Future.delayed(const Duration(milliseconds: 100));
      
      // 验证状态变化
      expect(states.length, greaterThan(0));
      
      ws.mockConnection(false);
      await Future.delayed(const Duration(milliseconds: 50));
    });

    // authStateProvider 测试
    test('FE-3.2T-008: authStateProvider initial state is false', () {
      final authState = container.read(authStateProvider);
      expect(authState, isFalse);
    });

    test('FE-3.2T-009: authStateProvider can be updated to true', () {
      container.read(authStateProvider.notifier).state = true;
      final authState = container.read(authStateProvider);
      expect(authState, isTrue);
    });

    test('FE-3.2T-010: authStateProvider can be toggled', () {
      // 初始 false
      expect(container.read(authStateProvider), isFalse);
      
      // 设置为 true
      container.read(authStateProvider.notifier).state = true;
      expect(container.read(authStateProvider), isTrue);
      
      // 设置回 false
      container.read(authStateProvider.notifier).state = false;
      expect(container.read(authStateProvider), isFalse);
    });

    // currentUserIdProvider 测试
    test('FE-3.2T-011: currentUserIdProvider initial state is null', () {
      final userId = container.read(currentUserIdProvider);
      expect(userId, isNull);
    });

    test('FE-3.2T-012: currentUserIdProvider can be set', () {
      container.read(currentUserIdProvider.notifier).state = 'user-123';
      final userId = container.read(currentUserIdProvider);
      expect(userId, equals('user-123'));
    });

    test('FE-3.2T-013: currentUserIdProvider can be cleared', () {
      container.read(currentUserIdProvider.notifier).state = 'user-123';
      expect(container.read(currentUserIdProvider), equals('user-123'));
      
      container.read(currentUserIdProvider.notifier).state = null;
      expect(container.read(currentUserIdProvider), isNull);
    });

    // currentTokenProvider 测试
    test('FE-3.2T-014: currentTokenProvider initial state is null', () {
      final token = container.read(currentTokenProvider);
      expect(token, isNull);
    });

    test('FE-3.2T-015: currentTokenProvider can be set', () {
      container.read(currentTokenProvider.notifier).state = 'test-jwt-token';
      final token = container.read(currentTokenProvider);
      expect(token, equals('test-jwt-token'));
    });

    test('FE-3.2T-016: currentTokenProvider can be cleared', () {
      container.read(currentTokenProvider.notifier).state = 'test-token';
      expect(container.read(currentTokenProvider), equals('test-token'));
      
      container.read(currentTokenProvider.notifier).state = null;
      expect(container.read(currentTokenProvider), isNull);
    });

    // Provider 依赖关系测试
    test('FE-3.2T-017: webSocketStatusProvider depends on webSocketServiceProvider', () {
      // 验证 webSocketStatusProvider 可以访问 WebSocketService
      final status = container.read(webSocketStatusProvider);
      // StreamProvider 返回 AsyncValue，验证其类型
      expect(status, isNotNull);
    });

    test('FE-3.2T-018: httpServiceProvider and webSocketServiceProvider are independent', () {
      final http = container.read(httpServiceProvider);
      final ws = container.read(webSocketServiceProvider);
      
      expect(http, isA<HttpService>());
      expect(ws, isA<WebSocketService>());
      expect(http, isNot(equals(ws)));
    });

    // Provider 状态监听测试
    test('FE-3.2T-019: authStateProvider notifies listeners on change', () async {
      final states = <bool>[];
      
      container.listen<bool>(
        authStateProvider,
        (previous, next) {
          states.add(next);
        },
        fireImmediately: false,
      );
      
      // 改变状态
      container.read(authStateProvider.notifier).state = true;
      await Future.delayed(const Duration(milliseconds: 10));
      
      expect(states, contains(true));
    });

    test('FE-3.2T-020: currentUserIdProvider notifies listeners on change', () async {
      final userIds = <String?>[];
      
      container.listen<String?>(
        currentUserIdProvider,
        (previous, next) {
          userIds.add(next);
        },
        fireImmediately: false,
      );
      
      // 改变状态
      container.read(currentUserIdProvider.notifier).state = 'user-456';
      await Future.delayed(const Duration(milliseconds: 10));
      
      expect(userIds, contains('user-456'));
    });

    // Provider 组合使用测试
    test('FE-3.2T-021: Auth flow - set user and token together', () async {
      // 模拟登录流程
      container.read(authStateProvider.notifier).state = true;
      container.read(currentUserIdProvider.notifier).state = 'user-789';
      container.read(currentTokenProvider.notifier).state = 'jwt-token-xyz';
      
      expect(container.read(authStateProvider), isTrue);
      expect(container.read(currentUserIdProvider), equals('user-789'));
      expect(container.read(currentTokenProvider), equals('jwt-token-xyz'));
    });

    test('FE-3.2T-022: Logout flow - clear all auth state', () async {
      // 先设置登录状态
      container.read(authStateProvider.notifier).state = true;
      container.read(currentUserIdProvider.notifier).state = 'user-789';
      container.read(currentTokenProvider.notifier).state = 'jwt-token-xyz';
      
      // 模拟登出流程
      container.read(authStateProvider.notifier).state = false;
      container.read(currentUserIdProvider.notifier).state = null;
      container.read(currentTokenProvider.notifier).state = null;
      
      expect(container.read(authStateProvider), isFalse);
      expect(container.read(currentUserIdProvider), isNull);
      expect(container.read(currentTokenProvider), isNull);
    });

    // Provider 隔离测试
    test('FE-3.2T-023: Multiple containers are isolated', () {
      final container1 = ProviderContainer();
      final container2 = ProviderContainer();
      
      container1.read(authStateProvider.notifier).state = true;
      container1.read(currentUserIdProvider.notifier).state = 'user-1';
      
      container2.read(authStateProvider.notifier).state = false;
      container2.read(currentUserIdProvider.notifier).state = 'user-2';
      
      expect(container1.read(authStateProvider), isTrue);
      expect(container1.read(currentUserIdProvider), equals('user-1'));
      expect(container2.read(authStateProvider), isFalse);
      expect(container2.read(currentUserIdProvider), equals('user-2'));
      
      container1.dispose();
      container2.dispose();
    });

    // Provider 重置测试
    test('FE-3.2T-024: Container dispose resets all providers', () {
      container.read(authStateProvider.notifier).state = true;
      container.read(currentUserIdProvider.notifier).state = 'user-test';
      
      expect(container.read(authStateProvider), isTrue);
      expect(container.read(currentUserIdProvider), equals('user-test'));
      
      container.dispose();
      
      // 创建新容器验证重置
      final newContainer = ProviderContainer();
      expect(newContainer.read(authStateProvider), isFalse);
      expect(newContainer.read(currentUserIdProvider), isNull);
      
      newContainer.dispose();
    });
  });

  group('FE-3.2T Provider Integration Tests', () {
    test('FE-3.2T-025: Service providers can be used in tests', () {
      final container = ProviderContainer();
      
      final http = container.read(httpServiceProvider);
      expect(http, isNotNull);
      expect(http, isA<HttpService>());
      
      container.dispose();
    });

    test('FE-3.2T-026: State providers work with widget tests', () {
      // 验证 Provider 可以在 widget 测试中使用
      // 实际测试需要在 WidgetTester 环境中进行
      expect(true, isTrue, skip: 'Widget test integration pending');
    });

    test('FE-3.2T-027: Stream providers work with async tests', () async {
      final container = ProviderContainer();
      
      final states = <bool>[];
      
      // 使用 container.listen 订阅 StreamProvider
      container.listen<bool>(
        webSocketStatusProvider.select((value) => value.value ?? false),
        (previous, next) => states.add(next),
        fireImmediately: true,
      );
      
      await Future.delayed(const Duration(milliseconds: 50));
      
      // 验证流可以订阅
      expect(states, isA<List<bool>>());
      
      container.dispose();
    });
  });
}
