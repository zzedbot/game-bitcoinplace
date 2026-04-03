import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

/// API 集成测试服务
class ApiIntegrationService {
  static final ApiIntegrationService _instance = ApiIntegrationService._internal();
  factory ApiIntegrationService() => _instance;
  ApiIntegrationService._internal();

  String _baseUrl = 'http://localhost:3000';
  bool _isRunning = false;

  /// 设置基础 URL
  void setBaseUrl(String url) {
    _baseUrl = url;
    debugPrint('API Base URL set to: $url');
  }

  /// 检查后端服务是否运行
  Future<bool> checkBackendRunning() async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/health'),
      ).timeout(const Duration(seconds: 5));
      
      _isRunning = response.statusCode == 200;
      debugPrint('Backend health check: ${_isRunning ? "OK" : "FAILED"}');
      return _isRunning;
    } catch (e) {
      debugPrint('Backend health check failed: $e');
      _isRunning = false;
      return false;
    }
  }

  /// 测试用户注册
  Future<Map<String, dynamic>> testUserRegistration({
    required String email,
    required String password,
    required String username,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
          'username': username,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 201) {
        debugPrint('User registration successful: ${data['user']['id']}');
        return {'success': true, 'data': data};
      } else {
        debugPrint('User registration failed: ${data['error']}');
        return {'success': false, 'error': data['error']};
      }
    } catch (e) {
      debugPrint('User registration error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  /// 测试用户登录
  Future<Map<String, dynamic>> testUserLogin({
    required String email,
    required String password,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        debugPrint('User login successful: ${data['user']['id']}');
        return {'success': true, 'data': data};
      } else {
        debugPrint('User login failed: ${data['error']}');
        return {'success': false, 'error': data['error']};
      }
    } catch (e) {
      debugPrint('User login error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  /// 测试获取用户信息
  Future<Map<String, dynamic>> testGetUserInfo(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/api/users/me'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        debugPrint('Get user info successful');
        return {'success': true, 'data': data};
      } else {
        debugPrint('Get user info failed: ${data['error']}');
        return {'success': false, 'error': data['error']};
      }
    } catch (e) {
      debugPrint('Get user info error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  /// 测试获取画布状态
  Future<Map<String, dynamic>> testGetCanvasState() async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/api/canvas/state'),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        debugPrint('Get canvas state successful: ${data['width']}x${data['height']}');
        return {'success': true, 'data': data};
      } else {
        debugPrint('Get canvas state failed');
        return {'success': false, 'error': 'Failed to get canvas state'};
      }
    } catch (e) {
      debugPrint('Get canvas state error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  /// 测试染色操作
  Future<Map<String, dynamic>> testColorPixel({
    required String token,
    required int x,
    required int y,
    required int colorIndex,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/canvas/color'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'x': x,
          'y': y,
          'colorIndex': colorIndex,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        debugPrint('Color pixel successful: ($x, $y)');
        return {'success': true, 'data': data};
      } else {
        debugPrint('Color pixel failed: ${data['error']}');
        return {'success': false, 'error': data['error']};
      }
    } catch (e) {
      debugPrint('Color pixel error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  /// 测试获取染色权
  Future<Map<String, dynamic>> testGetColorRights(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/api/users/color-rights'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      
      if (response.statusCode == 200) {
        debugPrint('Get color rights successful: ${data['colorRights']?.length ?? 0} rights');
        return {'success': true, 'data': data};
      } else {
        debugPrint('Get color rights failed: ${data['error']}');
        return {'success': false, 'error': data['error']};
      }
    } catch (e) {
      debugPrint('Get color rights error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  /// 运行完整的集成测试流程
  Future<Map<String, dynamic>> runFullIntegrationTest() async {
    final results = <String, dynamic>{};
    
    // 1. 检查后端服务
    debugPrint('=== Starting Integration Test ===');
    results['backendCheck'] = await checkBackendRunning();
    if (!results['backendCheck']) {
      return {
        'success': false,
        'error': 'Backend service is not running',
        'results': results,
      };
    }

    // 2. 测试用户注册
    final testEmail = 'test_${DateTime.now().millisecondsSinceEpoch}@bitcoinplace.com';
    final testPassword = 'Test123456!';
    results['registration'] = await testUserRegistration(
      email: testEmail,
      password: testPassword,
      username: 'TestUser',
    );

    if (!results['registration']['success']) {
      return {
        'success': false,
        'error': 'Registration failed',
        'results': results,
      };
    }

    // 3. 测试用户登录
    results['login'] = await testUserLogin(
      email: testEmail,
      password: testPassword,
    );

    if (!results['login']['success']) {
      return {
        'success': false,
        'error': 'Login failed',
        'results': results,
      };
    }

    final token = results['login']['data']['token'];

    // 4. 测试获取用户信息
    results['getUserInfo'] = await testGetUserInfo(token);

    // 5. 测试获取画布状态
    results['getCanvasState'] = await testGetCanvasState();

    // 6. 测试获取染色权
    results['getColorRights'] = await testGetColorRights(token);

    // 7. 测试染色操作
    results['colorPixel'] = await testColorPixel(
      token: token,
      x: 100,
      y: 100,
      colorIndex: 5,
    );

    // 总结
    final successCount = results.values.where((v) => v is Map && v['success'] == true).length;
    final totalCount = results.length;

    debugPrint('=== Integration Test Complete ===');
    debugPrint('Success: $successCount/$totalCount');

    return {
      'success': successCount == totalCount,
      'results': results,
      'summary': {
        'total': totalCount,
        'success': successCount,
        'failed': totalCount - successCount,
      },
    };
  }

  /// 判断后端是否运行
  bool get isBackendRunning => _isRunning;
}
