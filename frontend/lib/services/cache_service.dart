import 'package:flutter/foundation.dart';

/// 缓存服务 - 用于性能优化
class CacheService {
  static final CacheService _instance = CacheService._internal();
  factory CacheService() => _instance;
  CacheService._internal();

  // 内存缓存
  final Map<String, _CacheEntry> _memoryCache = {};
  
  // 缓存配置
  final int _maxCacheSize = 100; // 最大缓存条目数
  final Duration _defaultTtl = const Duration(minutes: 5); // 默认过期时间

  /// 获取缓存
  T? get<T>(String key) {
    final entry = _memoryCache[key];
    if (entry == null) {
      return null;
    }

    // 检查是否过期
    if (DateTime.now().isAfter(entry.expiresAt)) {
      _memoryCache.remove(key);
      return null;
    }

    // 更新访问时间
    entry.lastAccessed = DateTime.now();
    
    try {
      return entry.value as T;
    } catch (e) {
      debugPrint('Cache type mismatch for key: $key');
      return null;
    }
  }

  /// 设置缓存
  void put<T>(String key, T value, {Duration? ttl}) {
    // 如果缓存已满，移除最久未使用的条目
    if (_memoryCache.length >= _maxCacheSize) {
      _evictOldest();
    }

    _memoryCache[key] = _CacheEntry(
      value: value,
      expiresAt: DateTime.now().add(ttl ?? _defaultTtl),
    );

    debugPrint('Cache put: $key (${_memoryCache.length}/$_maxCacheSize)');
  }

  /// 删除缓存
  void remove(String key) {
    _memoryCache.remove(key);
    debugPrint('Cache remove: $key');
  }

  /// 清空缓存
  void clear() {
    _memoryCache.clear();
    debugPrint('Cache cleared');
  }

  /// 获取缓存统计信息
  Map<String, dynamic> getStats() {
    final now = DateTime.now();
    final validEntries = _memoryCache.values.where(
      (e) => now.isBefore(e.expiresAt),
    ).length;

    return {
      'totalEntries': _memoryCache.length,
      'validEntries': validEntries,
      'expiredEntries': _memoryCache.length - validEntries,
      'maxSize': _maxCacheSize,
    };
  }

  /// 移除最久未使用的缓存条目
  void _evictOldest() {
    if (_memoryCache.isEmpty) return;

    String? oldestKey;
    DateTime? oldestTime;

    for (final entry in _memoryCache.entries) {
      if (oldestTime == null || entry.value.lastAccessed.isBefore(oldestTime)) {
        oldestTime = entry.value.lastAccessed;
        oldestKey = entry.key;
      }
    }

    if (oldestKey != null) {
      _memoryCache.remove(oldestKey);
      debugPrint('Cache evicted: $oldestKey');
    }
  }

  /// 预加载缓存
  void preload<T>(String key, Future<T> Function() loader, {Duration? ttl}) async {
    if (get<T>(key) != null) {
      return; // 已有缓存
    }

    try {
      final value = await loader();
      put(key, value, ttl: ttl);
    } catch (e) {
      debugPrint('Cache preload failed for $key: $e');
    }
  }

  /// 获取或加载缓存
  Future<T> getOrLoad<T>(
    String key,
    Future<T> Function() loader, {
    Duration? ttl,
  }) async {
    final cached = get<T>(key);
    if (cached != null) {
      debugPrint('Cache hit: $key');
      return cached;
    }

    debugPrint('Cache miss: $key, loading...');
    final value = await loader();
    put(key, value, ttl: ttl);
    return value;
  }
}

class _CacheEntry {
  final dynamic value;
  final DateTime expiresAt;
  DateTime lastAccessed;

  _CacheEntry({
    required this.value,
    required this.expiresAt,
    DateTime? lastAccessed,
  }) : lastAccessed = lastAccessed ?? DateTime.now();
}
