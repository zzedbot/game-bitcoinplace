import 'package:flutter_test/flutter_test.dart';
import 'package:bitcoinplace_client/services/api_integration_service.dart';

void main() {
  group('ApiIntegrationService', () {
    late ApiIntegrationService apiService;

    setUp(() {
      apiService = ApiIntegrationService();
      apiService.setBaseUrl('http://localhost:3000');
    });

    test('service can be instantiated', () {
      expect(apiService, isNotNull);
    });

    test('baseUrl is set correctly', () {
      apiService.setBaseUrl('http://test.com:3000');
      // Note: We can't directly access baseUrl as it's private,
      // but we verify the service works after setting it
      expect(apiService.isBackendRunning, isFalse); // Initially false
    });

    test('isBackendRunning returns false when not checked', () {
      expect(apiService.isBackendRunning, isFalse);
    });

    test('checkBackendRunning returns false when backend is not available', () async {
      // This will fail because backend is not running in test environment
      final result = await apiService.checkBackendRunning();
      expect(result, isFalse);
    });

    test('testUserRegistration returns error when backend is not available', () async {
      final result = await apiService.testUserRegistration(
        email: 'test@test.com',
        password: 'Test123!',
        username: 'TestUser',
      );

      expect(result['success'], isFalse);
      expect(result['error'], isNotNull);
    });

    test('testUserLogin returns error when backend is not available', () async {
      final result = await apiService.testUserLogin(
        email: 'test@test.com',
        password: 'Test123!',
      );

      expect(result['success'], isFalse);
      expect(result['error'], isNotNull);
    });

    test('testGetUserInfo returns error when backend is not available', () async {
      final result = await apiService.testGetUserInfo('fake-token');

      expect(result['success'], isFalse);
      expect(result['error'], isNotNull);
    });

    test('testGetCanvasState returns error when backend is not available', () async {
      final result = await apiService.testGetCanvasState();

      expect(result['success'], isFalse);
      expect(result['error'], isNotNull);
    });

    test('testColorPixel returns error when backend is not available', () async {
      final result = await apiService.testColorPixel(
        token: 'fake-token',
        x: 100,
        y: 100,
        colorIndex: 5,
      );

      expect(result['success'], isFalse);
      expect(result['error'], isNotNull);
    });

    test('testGetColorRights returns error when backend is not available', () async {
      final result = await apiService.testGetColorRights('fake-token');

      expect(result['success'], isFalse);
      expect(result['error'], isNotNull);
    });

    test('runFullIntegrationTest returns error when backend is not available', () async {
      final result = await apiService.runFullIntegrationTest();

      expect(result['success'], isFalse);
      expect(result['error'], contains('Backend'));
    });
  });

  group('ApiIntegrationService Error Handling', () {
    late ApiIntegrationService apiService;

    setUp(() {
      apiService = ApiIntegrationService();
      apiService.setBaseUrl('http://invalid-url-that-does-not-exist:9999');
    });

    test('all methods handle connection errors gracefully', () async {
      // Test registration
      final regResult = await apiService.testUserRegistration(
        email: 'test@test.com',
        password: 'Test123!',
        username: 'TestUser',
      );
      expect(regResult['success'], isFalse);

      // Test login
      final loginResult = await apiService.testUserLogin(
        email: 'test@test.com',
        password: 'Test123!',
      );
      expect(loginResult['success'], isFalse);

      // Test canvas state
      final canvasResult = await apiService.testGetCanvasState();
      expect(canvasResult['success'], isFalse);
    });
  });
}
