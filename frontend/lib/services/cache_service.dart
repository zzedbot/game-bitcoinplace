import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';

/// 缓存服务 - 用于性能优化
/// 结合内存缓存 (L1) 和 Hive 持久化缓存 (L2)
class CacheService {
  static final CacheService _instance = CacheService._internal();
  factory CacheService() => _instance;
  CacheService._internal();

  // Hive 箱名称
  static const String _boxName = 'cache_box';
  
  // 内存缓存 (L1)
  final Map<String, _CacheEntry> _memoryCache = {};
  
  // Hive 持久化缓存 (L2)
  Box? _hiveBox;
  bool _isInitialized = false;
  
  // 缓存配置
  final int _maxCacheSize = 100; // 最大缓存条目数
  final Duration _defaultTtl = const Duration(minutes: 5); // 默认过期时间

  /// 初始化 Hive 缓存
  /// 必须在应用启动时调用
  Future<void> initialize() async {
    if (_isInitialized) {
      debugPrint('CacheService already initialized');
      return;
    }

    try {
      await Hive.initFlutter();
      _hiveBox = await Hive.openBox(_boxName);
      _isInitialized = true;
      debugPrint('Hive cache initialized: $_boxName');
      
      // 从 Hive 加载缓存到内存
      await _loadFromHive();
    } catch (e) {
      debugPrint('Hive initialization failed: $e');
      // 降级为纯内存缓存
      _isInitialized = true;
    }
  }

  /// 从 Hive 加载缓存到内存
  Future<void> _loadFromHive() async {
    if (_hiveBox == null) return;

    final keys = _hiveBox!.keys.toList();
    for (final key in keys) {
      final data = _hiveBox!.get(key);
      if (data != null && data is Map) {
        try {
          final value = data['value'];
          final expiresAt = DateTime.parse(data['expiresAt'] as String);
          
          // 只加载未过期的缓存
          if (DateTime.now().isBefore(expiresAt)) {
            _memoryCache[key as String] = _CacheEntry(
              value: value,
              expiresAt: expiresAt,
            );
          } else {
            // 清理过期缓存
            await _hiveBox!.delete(key);
          }
        } catch (e) {
          debugPrint('Failed to load cache entry $key: $e');
        }
      }
    }
    debugPrint('Loaded ${_memoryCache.length} entries from Hive');
  }

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

  /// 设置缓存 (同时写入内存和 Hive)
  Future<void> put<T>(String key, T value, {Duration? ttl}) async {
    // 如果缓存已满，移除最久未使用的条目
    if (_memoryCache.length >= _maxCacheSize) {
      _evictOldest();
    }

    final expiresAt = DateTime.now().add(ttl ?? _defaultTtl);
    _memoryCache[key] = _CacheEntry(
      value: value,
      expiresAt: expiresAt,
    );

    // 持久化到 Hive
    if (_hiveBox != null) {
      try {
        await _hiveBox!.put(key, {
          'value': value,
          'expiresAt': expiresAt.toIso8601String(),
        });
      } catch (e) {
        debugPrint('Hive put failed for $key: $e');
      }
    }

    debugPrint('Cache put: $key (${_memoryCache.length}/$_maxCacheSize)');
  }

  /// 删除缓存 (同时从内存和 Hive 删除)
  Future<void> remove(String key) async {
    _memoryCache.remove(key);
    
    // 从 Hive 删除
    if (_hiveBox != null) {
      try {
        await _hiveBox!.delete(key);
      } catch (e) {
        debugPrint('Hive remove failed for $key: $e');
      }
    }
    
    debugPrint('Cache remove: $key');
  }

  /// 清空缓存 (同时清空内存和 Hive)
  Future<void> clear() async {
    _memoryCache.clear();
    
    // 清空 Hive
    if (_hiveBox != null) {
      try {
        await _hiveBox!.clear();
      } catch (e) {
        debugPrint('Hive clear failed: $e');
      }
    }
    
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
      'hiveInitialized': _isInitialized,
      'hiveBoxName': _hiveBox != null ? _boxName : 'N/A',
      'hiveEntryCount': _hiveBox?.length ?? 0,
      'hiveBoxSize': _hiveBox?.length ?? 0,
    };
  }

  /// 检查 Hive 是否已初始化
  bool get isInitialized => _isInitialized;

  /// 获取 Hive 箱
  Box? get hiveBox => _hiveBox;

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
  Future<void> preload<T>(String key, Future<T> Function() loader, {Duration? ttl}) async {
    if (get<T>(key) != null) {
      return; // 已有缓存
    }

    try {
      final value = await loader();
      await put(key, value, ttl: ttl);
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
    await put(key, value, ttl: ttl);
    return value;
  }

  /// 关闭 Hive 连接 (用于测试或应用关闭)
  Future<void> close() async {
    if (_hiveBox != null) {
      await _hiveBox!.close();
      _hiveBox = null;
      _isInitialized = false;
      debugPrint('Hive cache closed');
    }
  }

  // ==================== 测试支持方法 ====================

  /// 重置缓存服务（用于测试）
  void resetForTest() {
    _memoryCache.clear();
    _isInitialized = false;
    _hiveBox = null;
  }

  /// 强制设置初始化状态（用于测试）
  void setInitializedForTest(bool value) {
    _isInitialized = value;
  }

  /// 获取内存缓存大小（用于测试）
  int get memoryCacheSize => _memoryCache.length;

  /// 检查键是否存在于内存缓存中（用于测试）
  bool containsInMemory(String key) {
    return _memoryCache.containsKey(key);
  }

  /// 获取缓存条目详情（用于测试）
  Map<String, dynamic> getCacheEntryDetails(String key) {
    final entry = _memoryCache[key];
    if (entry == null) {
      return {'exists': false};
    }
    return {
      'exists': true,
      'value': entry.value,
      'expiresAt': entry.expiresAt.toIso8601String(),
      'lastAccessed': entry.lastAccessed.toIso8601String(),
      'isExpired': DateTime.now().isAfter(entry.expiresAt),
    };
  }

  /// 强制设置 Hive 箱（用于测试）
  void setHiveBoxForTest(Box box) {
    _hiveBox = box;
    _isInitialized = true;
  }

  /// 获取内部状态（用于测试）
  Map<String, dynamic> getTestState() {
    return {
      'isInitialized': _isInitialized,
      'memoryCacheSize': _memoryCache.length,
      'hasHiveBox': _hiveBox != null,
      'maxCacheSize': _maxCacheSize,
      'defaultTtl': _defaultTtl,
    };
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
