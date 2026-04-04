import 'dart:async';
import '../services/http_service.dart';
import '../services/cache_service.dart';

/// 染色权状态枚举
enum ColorRightStatus {
  available,  // 可用
  used,       // 已使用
  expired,    // 已过期
}

/// 染色权模型
class ColorRight {
  final String id;
  final int zoneX;
  final int zoneY;
  final DateTime expiresAt;
  final ColorRightStatus status;
  final bool isUsed;

  ColorRight({
    required this.id,
    required this.zoneX,
    required this.zoneY,
    required this.expiresAt,
    this.status = ColorRightStatus.available,
    this.isUsed = false,
  });

  /// 从 JSON 创建
  factory ColorRight.fromJson(Map<String, dynamic> json) {
    return ColorRight(
      id: json['id'] as String,
      zoneX: json['zoneX'] as int,
      zoneY: json['zoneY'] as int,
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      status: ColorRightStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => ColorRightStatus.available,
      ),
      isUsed: json['isUsed'] as bool? ?? false,
    );
  }

  /// 转换为 JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'zoneX': zoneX,
      'zoneY': zoneY,
      'expiresAt': expiresAt.toIso8601String(),
      'status': status.name,
      'isUsed': isUsed,
    };
  }

  /// 检查是否过期
  bool get isExpired => DateTime.now().isAfter(expiresAt);

  /// 检查是否在指定坐标的区域内
  bool containsPoint(int x, int y) {
    // 每个区域 1000x1000
    final zoneStartX = zoneX * 1000;
    final zoneStartY = zoneY * 1000;
    final zoneEndX = zoneStartX + 1000;
    final zoneEndY = zoneStartY + 1000;

    return x >= zoneStartX &&
        x < zoneEndX &&
        y >= zoneStartY &&
        y < zoneEndY;
  }
}

/// 染色权服务
/// 负责管理用户的染色权，包括检查、获取和使用
class ColorRightService {
  final HttpService _httpService;
  final CacheService _cacheService;
  
  // 内存缓存
  Map<String, ColorRight> _colorRights = {};
  Map<String, bool> _zoneRightsCache = {};
  bool _initialized = false;

  ColorRightService({
    required HttpService httpService,
    required CacheService cacheService,
  })  : _httpService = httpService,
        _cacheService = cacheService;

  /// 初始化服务
  Future<void> initialize() async {
    if (_initialized) return;
    
    // 从缓存加载染色权
    await _loadFromCache();
    _initialized = true;
  }

  /// 从缓存加载染色权
  Future<void> _loadFromCache() async {
    final cached = await _cacheService.get('color_rights');
    if (cached != null) {
      // TODO: 解析缓存数据
    }
  }

  /// 检查指定坐标是否有染色权
  Future<bool> hasColorRight(int x, int y) async {
    // 先检查内存缓存
    final zoneKey = '${x ~/ 1000}_${y ~/ 1000}';
    if (_zoneRightsCache.containsKey(zoneKey)) {
      return _zoneRightsCache[zoneKey]!;
    }

    // 检查可用的染色权
    final availableRights = _colorRights.values.where(
      (right) => right.status == ColorRightStatus.available && !right.isExpired,
    );

    // 检查是否有覆盖该坐标的染色权
    for (final right in availableRights) {
      if (right.containsPoint(x, y)) {
        _zoneRightsCache[zoneKey] = true;
        return true;
      }
    }

    // 从服务器检查
    try {
      final hasRight = await _checkFromServer(x, y);
      _zoneRightsCache[zoneKey] = hasRight;
      return hasRight;
    } catch (e) {
      // 服务器检查失败，返回 false
      return false;
    }
  }

  /// 从服务器检查染色权
  Future<bool> _checkFromServer(int x, int y) async {
    final response = await _httpService.get(
      '/api/canvas/check-right?x=$x&y=$y',
    );
    
    if (response['success'] == true) {
      return response['hasRight'] as bool;
    }
    
    return false;
  }

  /// 获取用户的所有染色权
  Future<List<ColorRight>> getColorRights({ColorRightStatus? status}) async {
    // 如果指定了状态过滤
    if (status != null) {
      return _colorRights.values
          .where((right) => right.status == status)
          .toList();
    }

    // 返回所有染色权
    return _colorRights.values.toList();
  }

  /// 刷新染色权列表
  Future<void> refreshColorRights() async {
    try {
      final response = await _httpService.get('/api/user/color-rights');
      
      if (response['success'] == true) {
        final rightsData = response['data'] as List;
        _colorRights.clear();
        
        for (final data in rightsData) {
          final right = ColorRight.fromJson(data as Map<String, dynamic>);
          _colorRights[right.id] = right;
        }

        // 缓存到本地
        await _saveToCache();
        
        // 清空区域缓存
        _zoneRightsCache.clear();
      }
    } catch (e) {
      // 使用缓存数据
    }
  }

  /// 保存到缓存
  Future<void> _saveToCache() async {
    final rightsJson = _colorRights.values.map((r) => r.toJson()).toList();
    await _cacheService.put('color_rights', rightsJson);
  }

  /// 使用染色权
  Future<bool> useColorRight(String id) async {
    try {
      final response = await _httpService.post(
        '/api/user/color-rights/$id/use',
        {},
      );

      if (response['success'] == true) {
        // 更新本地状态
        if (_colorRights.containsKey(id)) {
          final right = _colorRights[id]!;
          _colorRights[id] = ColorRight(
            id: right.id,
            zoneX: right.zoneX,
            zoneY: right.zoneY,
            expiresAt: right.expiresAt,
            status: ColorRightStatus.used,
            isUsed: true,
          );
        }
        
        // 清空区域缓存
        _zoneRightsCache.clear();
        
        return true;
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  /// 清除缓存
  void clearCache() {
    _zoneRightsCache.clear();
  }

  /// 获取可用的染色权数量
  int get availableCount {
    return _colorRights.values.where(
      (right) => right.status == ColorRightStatus.available && !right.isExpired,
    ).length;
  }

  /// 获取已过期的染色权数量
  int get expiredCount {
    return _colorRights.values.where(
      (right) => right.isExpired,
    ).length;
  }

  /// 获取已使用的染色权数量
  int get usedCount {
    return _colorRights.values.where(
      (right) => right.isUsed,
    ).length;
  }
}
