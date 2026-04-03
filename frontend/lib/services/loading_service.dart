import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 加载状态枚举
enum LoadingState {
  idle,
  loading,
  success,
  error,
}

/// 加载状态模型
class LoadingStatus {
  final LoadingState state;
  final String? message;
  final double? progress;

  const LoadingStatus({
    this.state = LoadingState.idle,
    this.message,
    this.progress,
  });

  LoadingStatus copyWith({
    LoadingState? state,
    String? message,
    double? progress,
  }) {
    return LoadingStatus(
      state: state ?? this.state,
      message: message ?? this.message,
      progress: progress ?? this.progress,
    );
  }

  /// 创建加载状态
  static const LoadingStatus loading = LoadingStatus(state: LoadingState.loading);
  
  /// 创建带进度的加载状态
  static LoadingStatus loadingWithProgress(double progress) {
    return LoadingStatus(
      state: LoadingState.loading,
      progress: progress.clamp(0.0, 1.0),
    );
  }
  
  /// 创建成功状态
  static const LoadingStatus success = LoadingStatus(state: LoadingState.success);
  
  /// 创建错误状态
  static LoadingStatus error(String message) {
    return LoadingStatus(
      state: LoadingState.error,
      message: message,
    );
  }
}

/// 加载状态通知器
class LoadingNotifier extends StateNotifier<LoadingStatus> {
  LoadingNotifier() : super(const LoadingStatus());

  void start({String? message}) {
    state = state.copyWith(state: LoadingState.loading, message: message);
  }

  void updateProgress(double progress) {
    state = state.copyWith(
      state: LoadingState.loading,
      progress: progress.clamp(0.0, 1.0),
    );
  }

  void complete({String? message}) {
    state = LoadingStatus.success.copyWith(message: message);
    
    // 自动重置为 idle
    Future.delayed(const Duration(seconds: 2), () {
      state = const LoadingStatus();
    });
  }

  void fail(String message) {
    state = LoadingStatus.error(message);
  }

  void reset() {
    state = const LoadingStatus();
  }
}

/// 全局加载状态提供者
final loadingNotifierProvider = StateNotifierProvider<LoadingNotifier, LoadingStatus>(
  (ref) => LoadingNotifier(),
);

/// 加载状态助手类
class LoadingHelper {
  /// 显示加载指示器
  static Widget buildLoader({String? message}) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          if (message != null) ...[
            const SizedBox(height: 16),
            Text(
              message,
              style: const TextStyle(color: Colors.grey),
            ),
          ],
        ],
      ),
    );
  }

  /// 显示错误状态
  static Widget buildError({
    required String message,
    VoidCallback? onRetry,
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.error_outline,
            size: 48,
            color: Colors.red,
          ),
          const SizedBox(height: 16),
          Text(
            message,
            style: const TextStyle(color: Colors.red),
            textAlign: TextAlign.center,
          ),
          if (onRetry != null) ...[
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('重试'),
            ),
          ],
        ],
      ),
    );
  }

  /// 显示空状态
  static Widget buildEmpty({
    required String message,
    IconData icon = Icons.inbox,
    Widget? action,
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 48,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            message,
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 16,
            ),
            textAlign: TextAlign.center,
          ),
          if (action != null) ...[
            const SizedBox(height: 16),
            action,
          ],
        ],
      ),
    );
  }

  /// 根据状态构建组件
  static Widget buildByState<T>({
    required LoadingStatus status,
    required Widget Function() onSuccess,
    String? loadingMessage,
    Widget Function(String)? onError,
    Widget Function()? onIdle,
  }) {
    switch (status.state) {
      case LoadingState.loading:
        return buildLoader(message: loadingMessage ?? status.message);
      case LoadingState.error:
        if (onError != null && status.message != null) {
          return onError(status.message!);
        }
        return buildError(message: status.message ?? '发生错误');
      case LoadingState.success:
        return onSuccess();
      case LoadingState.idle:
        if (onIdle != null) {
          return onIdle();
        }
        return onSuccess();
    }
  }
}

/// 异步加载扩展
extension AsyncValueExtension<T> on Future<T> {
  /// 带加载状态的异步操作
  Future<T> withLoading(
    LoadingNotifier notifier, {
    String? loadingMessage,
    String? successMessage,
  }) async {
    try {
      notifier.start(message: loadingMessage);
      final result = await this;
      notifier.complete(message: successMessage);
      return result;
    } catch (e) {
      notifier.fail(e.toString());
      rethrow;
    }
  }
}
