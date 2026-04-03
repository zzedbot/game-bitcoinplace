import 'package:flutter/foundation.dart';

/// 错误类型枚举
enum ErrorType {
  network,
  authentication,
  validation,
  server,
  unknown,
}

/// 错误信息类
class AppError {
  final ErrorType type;
  final String message;
  final String? details;
  final int? statusCode;
  final DateTime timestamp;

  AppError({
    required this.type,
    required this.message,
    this.details,
    this.statusCode,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  @override
  String toString() {
    return 'AppError(type: $type, message: $message, statusCode: $statusCode)';
  }

  /// 创建友好的用户提示消息
  String get userMessage {
    switch (type) {
      case ErrorType.network:
        return '网络连接失败，请检查网络设置';
      case ErrorType.authentication:
        return '登录已过期，请重新登录';
      case ErrorType.validation:
        return message;
      case ErrorType.server:
        return '服务器错误，请稍后重试';
      case ErrorType.unknown:
        return '发生未知错误，请稍后重试';
    }
  }

  /// 是否应该自动重试
  bool get shouldRetry {
    return type == ErrorType.network || type == ErrorType.server;
  }
}

/// 全局错误处理服务
class ErrorHandler {
  static final ErrorHandler _instance = ErrorHandler._internal();
  factory ErrorHandler() => _instance;
  ErrorHandler._internal();

  // 错误回调
  Function(AppError)? onError;
  
  // 错误历史
  final List<AppError> _errorHistory = [];
  static const int _maxHistorySize = 50;

  /// 处理错误
  void handleError(AppError error) {
    debugPrint('Error: $error');
    
    // 添加到历史记录
    _errorHistory.add(error);
    if (_errorHistory.length > _maxHistorySize) {
      _errorHistory.removeAt(0);
    }

    // 通知监听器
    onError?.call(error);
  }

  /// 创建网络错误
  AppError createNetworkError({
    String message = '网络连接失败',
    int? statusCode,
  }) {
    return AppError(
      type: ErrorType.network,
      message: message,
      statusCode: statusCode,
    );
  }

  /// 创建认证错误
  AppError createAuthError({
    String message = '认证失败',
    int? statusCode,
  }) {
    return AppError(
      type: ErrorType.authentication,
      message: message,
      statusCode: statusCode,
    );
  }

  /// 创建验证错误
  AppError createValidationError(String message) {
    return AppError(
      type: ErrorType.validation,
      message: message,
    );
  }

  /// 创建服务器错误
  AppError createServerError({
    String message = '服务器错误',
    int? statusCode,
    String? details,
  }) {
    return AppError(
      type: ErrorType.server,
      message: message,
      details: details,
      statusCode: statusCode,
    );
  }

  /// 创建未知错误
  AppError createUnknownError(dynamic error) {
    return AppError(
      type: ErrorType.unknown,
      message: error.toString(),
    );
  }

  /// 获取错误历史
  List<AppError> getErrorHistory({int? limit}) {
    if (limit == null) return List.unmodifiable(_errorHistory);
    final start = _errorHistory.length - limit;
    return _errorHistory.skip(start < 0 ? 0 : start).toList();
  }

  /// 清除错误历史
  void clearHistory() {
    _errorHistory.clear();
  }

  /// 获取最近的错误
  AppError? getLastError() {
    if (_errorHistory.isEmpty) return null;
    return _errorHistory.last;
  }
}

/// HTTP 错误扩展
extension HttpErrorExtension on dynamic {
  AppError toAppError() {
    if (this is AppError) {
      return this as AppError;
    }
    
    // 处理 HTTP 状态码错误
    if (this is Map && (this as Map).containsKey('statusCode')) {
      final statusCode = (this as Map)['statusCode'] as int?;
      if (statusCode != null) {
        if (statusCode >= 400 && statusCode < 500) {
          if (statusCode == 401 || statusCode == 403) {
            return ErrorHandler().createAuthError(statusCode: statusCode);
          }
          return ErrorHandler().createValidationError(
            (this as Map)['message'] as String? ?? '请求失败',
          );
        } else if (statusCode >= 500) {
          return ErrorHandler().createServerError(
            statusCode: statusCode,
            message: '服务器错误 ($statusCode)',
          );
        }
      }
    }
    
    // 默认未知错误
    return ErrorHandler().createUnknownError(this);
  }
}
