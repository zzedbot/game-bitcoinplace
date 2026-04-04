/// 拍卖状态枚举
enum AuctionStatus {
  active,      // 进行中
  sold,        // 已售出
  expired,     // 已过期
  cancelled,   // 已取消
}

/// 拍卖数据模型
class AuctionModel {
  final String id;
  final String sellerId;
  final String colorRightId;
  final int startingPrice;
  final int currentPrice;
  final int buyNowPrice;
  final AuctionStatus status;
  final DateTime endTime;
  final DateTime createdAt;
  final int? zoneId;
  final int? x;
  final int? y;
  final String? highestBidderId;
  final int? bidCount;

  AuctionModel({
    required this.id,
    required this.sellerId,
    required this.colorRightId,
    required this.startingPrice,
    required this.currentPrice,
    required this.buyNowPrice,
    required this.status,
    required this.endTime,
    required this.createdAt,
    this.zoneId,
    this.x,
    this.y,
    this.highestBidderId,
    this.bidCount,
  });

  /// 从 JSON 创建模型
  factory AuctionModel.fromJson(Map<String, dynamic> json) {
    return AuctionModel(
      id: json['id'] as String,
      sellerId: json['sellerId'] as String,
      colorRightId: json['colorRightId'] as String,
      startingPrice: json['startingPrice'] as int,
      currentPrice: json['currentPrice'] as int,
      buyNowPrice: json['buyNowPrice'] as int,
      status: AuctionStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => AuctionStatus.active,
      ),
      endTime: DateTime.parse(json['endTime'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      zoneId: json['zoneId'] as int?,
      x: json['x'] as int?,
      y: json['y'] as int?,
      highestBidderId: json['highestBidderId'] as String?,
      bidCount: json['bidCount'] as int?,
    );
  }

  /// 转换为 JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sellerId': sellerId,
      'colorRightId': colorRightId,
      'startingPrice': startingPrice,
      'currentPrice': currentPrice,
      'buyNowPrice': buyNowPrice,
      'status': status.name,
      'endTime': endTime.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'zoneId': zoneId,
      'x': x,
      'y': y,
      'highestBidderId': highestBidderId,
      'bidCount': bidCount,
    };
  }

  /// 计算剩余时间
  Duration get timeRemaining {
    return endTime.difference(DateTime.now());
  }

  /// 检查是否已过期
  bool get isExpired {
    return timeRemaining.inSeconds <= 0;
  }

  /// 检查是否可以竞价
  bool get canBid {
    return status == AuctionStatus.active && !isExpired;
  }

  /// 检查是否可以一口价购买
  bool get canBuyout {
    return status == AuctionStatus.active && !isExpired;
  }

  /// 最小竞价金额
  int get minimumBid {
    return currentPrice + 1;
  }

  /// 格式化剩余时间
  String get formattedTimeRemaining {
    final remaining = timeRemaining;
    if (remaining.inSeconds <= 0) {
      return '已结束';
    }
    
    if (remaining.inDays > 0) {
      return '${remaining.inDays}天${remaining.inHours % 24}小时';
    } else if (remaining.inHours > 0) {
      return '${remaining.inHours}小时${remaining.inMinutes % 60}分';
    } else if (remaining.inMinutes > 0) {
      return '${remaining.inMinutes}分${remaining.inSeconds % 60}秒';
    } else {
      return '${remaining.inSeconds}秒';
    }
  }

  @override
  String toString() {
    return 'AuctionModel(id: $id, currentPrice: $currentPrice, status: $status)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is AuctionModel && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
