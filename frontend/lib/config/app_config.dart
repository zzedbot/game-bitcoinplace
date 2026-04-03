/// 应用配置
class AppConfig {
  // API 配置
  static const String apiBaseUrl = 'http://localhost:3000/api/v1';
  static const String wsUrl = 'ws://localhost:3000/ws';
  
  // 画布配置
  static const int canvasWidth = 7000;
  static const int canvasHeight = 3000;
  static const int totalPixels = 21_000_000; // 21M
  static const int zoneSize = 1000;
  static const int totalZones = 21;
  static const int totalColors = 16;
  
  // 经济配置
  static const int seasonDays = 60;
  static const int miningDays = 49;
  static const int freeDays = 7;
  static const int frozenDays = 4;
  static const int halvingCycleDays = 7;
  static const int initialOutputPerWindow = 10417;
  static const int blockWindowMinutes = 10;
  
  // Hive 本地缓存
  static const String boxUser = 'user';
  static const String boxToken = 'token';
  static const String boxCanvas = 'canvas';
  
  // 超时配置
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // 重试配置
  static const int maxRetries = 3;
  static const Duration retryDelay = Duration(seconds: 1);
}
