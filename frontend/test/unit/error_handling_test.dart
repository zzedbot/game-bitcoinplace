import 'package:flutter_test/flutter_test.dart';
import 'package:bitcoinplace_client/services/error_handler.dart';
import 'package:bitcoinplace_client/services/loading_service.dart';

void main() {
  group('ErrorHandler', () {
    test('createNetworkError creates correct error type', () {
      final error = ErrorHandler().createNetworkError(
        message: 'Test network error',
        statusCode: 404,
      );

      expect(error.type, ErrorType.network);
      expect(error.message, 'Test network error');
      expect(error.statusCode, 404);
      expect(error.shouldRetry, isTrue);
    });

    test('createAuthError creates correct error type', () {
      final error = ErrorHandler().createAuthError(
        message: 'Token expired',
        statusCode: 401,
      );

      expect(error.type, ErrorType.authentication);
      expect(error.message, 'Token expired');
      expect(error.statusCode, 401);
      expect(error.shouldRetry, isFalse);
    });

    test('createValidationError creates correct error type', () {
      final error = ErrorHandler().createValidationError('Invalid email');

      expect(error.type, ErrorType.validation);
      expect(error.message, 'Invalid email');
    });

    test('createServerError creates correct error type', () {
      final error = ErrorHandler().createServerError(
        message: 'Internal server error',
        statusCode: 500,
        details: 'Database connection failed',
      );

      expect(error.type, ErrorType.server);
      expect(error.message, 'Internal server error');
      expect(error.statusCode, 500);
      expect(error.details, 'Database connection failed');
      expect(error.shouldRetry, isTrue);
    });

    test('userMessage returns friendly message for network error', () {
      final error = ErrorHandler().createNetworkError();
      expect(error.userMessage, '网络连接失败，请检查网络设置');
    });

    test('userMessage returns friendly message for auth error', () {
      final error = ErrorHandler().createAuthError();
      expect(error.userMessage, '登录已过期，请重新登录');
    });

    test('error history is maintained', () {
      final handler = ErrorHandler();
      handler.clearHistory();

      handler.handleError(handler.createNetworkError());
      handler.handleError(handler.createAuthError());
      handler.handleError(handler.createServerError());

      final history = handler.getErrorHistory();
      expect(history.length, 3);
      expect(history.last.type, ErrorType.server);
    });

    test('error history respects max size', () {
      final handler = ErrorHandler();
      handler.clearHistory();

      // Add 51 errors (max is 50)
      for (int i = 0; i < 51; i++) {
        handler.handleError(handler.createNetworkError(message: 'Error $i'));
      }

      final history = handler.getErrorHistory();
      expect(history.length, 50);
      expect(history.first.message, 'Error 1'); // First error (Error 0) was removed
    });
  });

  group('LoadingStatus', () {
    test('default state is idle', () {
      const status = LoadingStatus();
      expect(status.state, LoadingState.idle);
    });

    test('loading status has correct state', () {
      expect(LoadingStatus.loading.state, LoadingState.loading);
    });

    test('loading with progress clamps value', () {
      final status = LoadingStatus.loadingWithProgress(1.5);
      expect(status.progress, 1.0);

      final status2 = LoadingStatus.loadingWithProgress(-0.5);
      expect(status2.progress, 0.0);
    });

    test('success status has correct state', () {
      expect(LoadingStatus.success.state, LoadingState.success);
    });

    test('error status has correct state and message', () {
      final status = LoadingStatus.error('Test error');
      expect(status.state, LoadingState.error);
      expect(status.message, 'Test error');
    });

    test('copyWith creates new instance with updated values', () {
      const original = LoadingStatus();
      final copied = original.copyWith(
        state: LoadingState.loading,
        message: 'Loading...',
        progress: 0.5,
      );

      expect(copied.state, LoadingState.loading);
      expect(copied.message, 'Loading...');
      expect(copied.progress, 0.5);
    });
  });

  group('LoadingNotifier', () {
    test('initial state is idle', () {
      final notifier = LoadingNotifier();
      expect(notifier.state.state, LoadingState.idle);
    });

    test('start changes state to loading', () {
      final notifier = LoadingNotifier();
      notifier.start(message: 'Loading...');
      
      expect(notifier.state.state, LoadingState.loading);
      expect(notifier.state.message, 'Loading...');
    });

    test('updateProgress updates progress value', () {
      final notifier = LoadingNotifier();
      notifier.start();
      notifier.updateProgress(0.5);
      
      expect(notifier.state.progress, 0.5);
    });

    test('complete changes state to success', () {
      final notifier = LoadingNotifier();
      notifier.complete(message: 'Done!');
      
      expect(notifier.state.state, LoadingState.success);
      expect(notifier.state.message, 'Done!');
    });

    test('fail changes state to error', () {
      final notifier = LoadingNotifier();
      notifier.fail('Error occurred');
      
      expect(notifier.state.state, LoadingState.error);
      expect(notifier.state.message, 'Error occurred');
    });

    test('reset changes state to idle', () {
      final notifier = LoadingNotifier();
      notifier.start();
      notifier.reset();
      
      expect(notifier.state.state, LoadingState.idle);
    });
  });
}
