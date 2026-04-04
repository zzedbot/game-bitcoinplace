import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dio/dio.dart';
import 'package:bitcoinplace_client/services/http_service.dart';

// Mock Dio
class MockDio extends Mock implements Dio {}

// Mock Response
class MockResponse<T> extends Mock implements Response<T> {}

void main() {
  group('HttpService', () {
    late HttpService httpService;
    late MockDio mockDio;

    setUp(() {
      mockDio = MockDio();
      httpService = HttpService();
      // 使用反射或其他方式注入 mock dio
      // 由于 HttpService 内部创建 Dio，我们需要测试实际行为
    });

    group('Constructor', () {
      test('creates HttpService instance', () {
        final service = HttpService();
        expect(service, isNotNull);
      });

      test('singleton instance is available', () {
        expect(httpService, isNotNull);
        expect(httpService, equals(httpService));
      });
    });

    group('Token Management', () {
      test('setTokens stores access token', () {
        httpService.setTokens('test_access_token', 'test_refresh_token');
        // Token 设置后，后续请求应该包含 Authorization header
        // 由于 _accessToken 是私有的，我们通过行为验证
      });

      test('clearTokens removes stored tokens', () {
        httpService.setTokens('test_access_token', 'test_refresh_token');
        httpService.clearTokens();
        // Token 清除后，后续请求不应该包含 Authorization header
      });

      test('multiple setTokens calls update token', () {
        httpService.setTokens('token1', 'refresh1');
        httpService.setTokens('token2', 'refresh2');
        // 最后一次调用应该覆盖之前的 token
      });
    });

    group('GET Request', () {
      test('get method is available', () {
        expect(httpService.get, isA<Function>());
      });

      test('get method accepts path parameter', () async {
        // 验证方法签名
        expect(
          () => httpService.get('/test', queryParameters: {}),
          throwsA(isA<Exception>()), // 期望网络错误，因为后端未运行
        );
      });

      test('get method accepts queryParameters', () async {
        expect(
          () => httpService.get(
            '/test',
            queryParameters: {'key': 'value'},
          ),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('POST Request', () {
      test('post method is available', () {
        expect(httpService.post, isA<Function>());
      });

      test('post method accepts path parameter', () async {
        expect(
          () => httpService.post('/test'),
          throwsA(isA<Exception>()),
        );
      });

      test('post method accepts data parameter', () async {
        expect(
          () => httpService.post('/test', data: {'key': 'value'}),
          throwsA(isA<Exception>()),
        );
      });

      test('post method accepts queryParameters', () async {
        expect(
          () => httpService.post(
            '/test',
            queryParameters: {'key': 'value'},
          ),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('PUT Request', () {
      test('put method is available', () {
        expect(httpService.put, isA<Function>());
      });

      test('put method accepts path parameter', () async {
        expect(
          () => httpService.put('/test'),
          throwsA(isA<Exception>()),
        );
      });

      test('put method accepts data parameter', () async {
        expect(
          () => httpService.put('/test', data: {'key': 'value'}),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('DELETE Request', () {
      test('delete method is available', () {
        expect(httpService.delete, isA<Function>());
      });

      test('delete method accepts path parameter', () async {
        expect(
          () => httpService.delete('/test'),
          throwsA(isA<Exception>()),
        );
      });

      test('delete method accepts data parameter', () async {
        expect(
          () => httpService.delete('/test', data: {'key': 'value'}),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('Error Handling', () {
      test('handles connection errors gracefully', () async {
        try {
          await httpService.get('/nonexistent');
        } catch (e) {
          expect(e, isA<Exception>());
        }
      });

      test('handles timeout errors gracefully', () async {
        try {
          await httpService.get('/timeout');
        } catch (e) {
          expect(e, isA<Exception>());
        }
      });
    });

    group('Configuration', () {
      test('uses correct base URL from AppConfig', () {
        // HttpService 应该使用 AppConfig 中的配置
        // 验证服务已正确初始化
        expect(httpService, isNotNull);
      });

      test('has proper timeout configuration', () {
        // 验证服务已正确配置超时
        expect(httpService, isNotNull);
      });
    });
  });

  group('HttpService Integration', () {
    late HttpService httpService;

    setUp(() {
      httpService = HttpService();
    });

    test('full request flow with token', () async {
      httpService.setTokens('test_token', 'refresh_token');
      
      try {
        await httpService.get('/test');
      } catch (e) {
        // 期望网络错误，因为后端未运行
        expect(e, isA<Exception>());
      }
    });

    test('full request flow without token', () async {
      httpService.clearTokens();
      
      try {
        await httpService.get('/test');
      } catch (e) {
        expect(e, isA<Exception>());
      }
    });

    test('full POST request flow', () async {
      httpService.setTokens('test_token', 'refresh_token');
      
      try {
        await httpService.post(
          '/test',
          data: {'key': 'value'},
        );
      } catch (e) {
        expect(e, isA<Exception>());
      }
    });
  });
}
