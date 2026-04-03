/// 用户模型
class User {
  final String id;
  final String email;
  final String username;
  final int pixelsOwned;
  final int pixelsColored;
  final DateTime createdAt;
  final DateTime lastLoginAt;
  final String? avatarUrl;
  final String? bio;

  User({
    required this.id,
    required this.email,
    required this.username,
    required this.pixelsOwned,
    required this.pixelsColored,
    required this.createdAt,
    required this.lastLoginAt,
    this.avatarUrl,
    this.bio,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      username: json['username'] as String,
      pixelsOwned: json['pixelsOwned'] as int,
      pixelsColored: json['pixelsColored'] as int,
      createdAt: DateTime.parse(json['createdAt'] as String),
      lastLoginAt: DateTime.parse(json['lastLoginAt'] as String),
      avatarUrl: json['avatarUrl'] as String?,
      bio: json['bio'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'username': username,
      'pixelsOwned': pixelsOwned,
      'pixelsColored': pixelsColored,
      'createdAt': createdAt.toIso8601String(),
      'lastLoginAt': lastLoginAt.toIso8601String(),
      'avatarUrl': avatarUrl,
      'bio': bio,
    };
  }
}

/// 染色权模型
class ColorRight {
  final String id;
  final String userId;
  final int x;
  final int y;
  final int zoneId;
  final DateTime acquiredAt;
  final DateTime expiresAt;
  final bool isUsed;
  final DateTime? usedAt;
  final int? usedColor;

  ColorRight({
    required this.id,
    required this.userId,
    required this.x,
    required this.y,
    required this.zoneId,
    required this.acquiredAt,
    required this.expiresAt,
    this.isUsed = false,
    this.usedAt,
    this.usedColor,
  });

  factory ColorRight.fromJson(Map<String, dynamic> json) {
    return ColorRight(
      id: json['id'] as String,
      userId: json['userId'] as String,
      x: json['x'] as int,
      y: json['y'] as int,
      zoneId: json['zoneId'] as int,
      acquiredAt: DateTime.parse(json['acquiredAt'] as String),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      isUsed: json['isUsed'] as bool? ?? false,
      usedAt: json['usedAt'] != null ? DateTime.parse(json['usedAt'] as String) : null,
      usedColor: json['usedColor'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'x': x,
      'y': y,
      'zoneId': zoneId,
      'acquiredAt': acquiredAt.toIso8601String(),
      'expiresAt': expiresAt.toIso8601String(),
      'isUsed': isUsed,
      'usedAt': usedAt?.toIso8601String(),
      'usedColor': usedColor,
    };
  }
}

/// 矿区模型
class Zone {
  final int id;
  final String name;
  final int x;
  final int y;
  final int width;
  final int height;
  final int totalPixels;
  final int coloredPixels;
  final double completionRate;

  Zone({
    required this.id,
    required this.name,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    required this.totalPixels,
    required this.coloredPixels,
    required this.completionRate,
  });

  factory Zone.fromJson(Map<String, dynamic> json) {
    return Zone(
      id: json['id'] as int,
      name: json['name'] as String,
      x: json['x'] as int,
      y: json['y'] as int,
      width: json['width'] as int,
      height: json['height'] as int,
      totalPixels: json['totalPixels'] as int,
      coloredPixels: json['coloredPixels'] as int,
      completionRate: json['completionRate'] as double,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'x': x,
      'y': y,
      'width': width,
      'height': height,
      'totalPixels': totalPixels,
      'coloredPixels': coloredPixels,
      'completionRate': completionRate,
    };
  }
}
