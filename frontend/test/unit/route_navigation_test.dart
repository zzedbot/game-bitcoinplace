import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:bitcoinplace_client/main.dart';
import 'package:bitcoinplace_client/presentation/screens/onboarding_screen.dart';
import 'package:bitcoinplace_client/presentation/screens/login_screen.dart';
import 'package:bitcoinplace_client/presentation/screens/register_screen.dart';
import 'package:bitcoinplace_client/presentation/screens/home_screen.dart';
import 'package:bitcoinplace_client/presentation/screens/canvas_screen.dart';
import 'package:bitcoinplace_client/presentation/screens/profile_screen.dart';
import 'package:bitcoinplace_client/presentation/screens/color_rights_screen.dart';

/// FE-3.3T 路由跳转测试
/// 测试 go_router 配置、路由跳转和导航逻辑
void main() {
  group('FE-3.3T Route Configuration Tests', () {
    test('FE-3.3T-001: Router is configured', () {
      expect(router, isA<GoRouter>());
      expect(router, isNotNull);
    });

    test('FE-3.3T-002: Initial location is onboarding', () {
      expect(router.initialLocation, equals('/onboarding'));
    });

    test('FE-3.3T-003: Router has 7 routes', () {
      expect(router.routeInformationProvider.value.uri.path, equals('/onboarding'));
      expect(router.routerConfig.routes.length, equals(7));
    });

    test('FE-3.3T-004: Onboarding route is configured', () {
      final onboardingRoute = router.routerConfig.routes.firstWhere(
        (r) => r.path == '/onboarding',
      );
      expect(onboardingRoute, isNotNull);
      expect(onboardingRoute.name, equals('onboarding'));
    });

    test('FE-3.3T-005: Login route is configured', () {
      final loginRoute = router.routerConfig.routes.firstWhere(
        (r) => r.path == '/login',
      );
      expect(loginRoute, isNotNull);
      expect(loginRoute.name, equals('login'));
    });

    test('FE-3.3T-006: Register route is configured', () {
      final registerRoute = router.routerConfig.routes.firstWhere(
        (r) => r.path == '/register',
      );
      expect(registerRoute, isNotNull);
      expect(registerRoute.name, equals('register'));
    });

    test('FE-3.3T-007: Home route is configured', () {
      final homeRoute = router.routerConfig.routes.firstWhere(
        (r) => r.path == '/home',
      );
      expect(homeRoute, isNotNull);
      expect(homeRoute.name, equals('home'));
    });

    test('FE-3.3T-008: Canvas route is configured', () {
      final canvasRoute = router.routerConfig.routes.firstWhere(
        (r) => r.path == '/canvas',
      );
      expect(canvasRoute, isNotNull);
      expect(canvasRoute.name, equals('canvas'));
    });

    test('FE-3.3T-009: Profile route is configured', () {
      final profileRoute = router.routerConfig.routes.firstWhere(
        (r) => r.path == '/profile',
      );
      expect(profileRoute, isNotNull);
      expect(profileRoute.name, equals('profile'));
    });

    test('FE-3.3T-010: ColorRights route is configured', () {
      final colorRightsRoute = router.routerConfig.routes.firstWhere(
        (r) => r.path == '/color-rights',
      );
      expect(colorRightsRoute, isNotNull);
      expect(colorRightsRoute.name, equals('colorRights'));
    });
  });

  group('FE-3.3T Route Navigation Tests', () {
    testWidgets('FE-3.3T-011: Navigate to onboarding screen', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byType(OnboardingScreen), findsOneWidget);
    });

    testWidgets('FE-3.3T-012: Navigate to login screen by path', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      await tester.pumpAndSettle();

      // 使用 GoRouter 导航
      router.go('/login');
      await tester.pumpAndSettle();

      expect(find.byType(LoginScreen), findsOneWidget);
    });

    testWidgets('FE-3.3T-013: Navigate to login screen by name', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      await tester.pumpAndSettle();

      // 使用路由名称导航
      router.goNamed('login');
      await tester.pumpAndSettle();

      expect(find.byType(LoginScreen), findsOneWidget);
    });

    testWidgets('FE-3.3T-014: Navigate to register screen', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      await tester.pumpAndSettle();

      router.go('/register');
      await tester.pumpAndSettle();

      expect(find.byType(RegisterScreen), findsOneWidget);
    });

    testWidgets('FE-3.3T-015: Navigate to home screen', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      await tester.pumpAndSettle();

      router.go('/home');
      await tester.pumpAndSettle();

      expect(find.byType(HomeScreen), findsOneWidget);
    });

    testWidgets('FE-3.3T-016: Navigate to canvas screen', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      await tester.pumpAndSettle();

      router.go('/canvas');
      await tester.pumpAndSettle();

      expect(find.byType(CanvasScreen), findsOneWidget);
    });

    testWidgets('FE-3.3T-017: Navigate to profile screen', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      await tester.pumpAndSettle();

      router.go('/profile');
      await tester.pumpAndSettle();

      expect(find.byType(ProfileScreen), findsOneWidget);
    });

    testWidgets('FE-3.3T-018: Navigate to color rights screen', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      await tester.pumpAndSettle();

      router.go('/color-rights');
      await tester.pumpAndSettle();

      expect(find.byType(ColorRightsScreen), findsOneWidget);
    });

    testWidgets('FE-3.3T-019: Back navigation works', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      await tester.pumpAndSettle();

      // 导航到 login
      router.go('/login');
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsOneWidget);

      // 返回
      router.pop();
      await tester.pumpAndSettle();

      // 应该返回 onboarding
      expect(find.byType(OnboardingScreen), findsOneWidget);
    });

    testWidgets('FE-3.3T-020: Push and pop navigation', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      await tester.pumpAndSettle();

      // Push 到 login
      router.push('/login');
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsOneWidget);

      // Pop 返回
      router.pop();
      await tester.pumpAndSettle();
      expect(find.byType(OnboardingScreen), findsOneWidget);
    });
  });

  group('FE-3.3T Route Guard Tests', () {
    testWidgets('FE-3.3T-021: Unauthenticated user redirected to login', (WidgetTester tester) async {
      // TODO: Implement auth guard test
      // When user is not authenticated and tries to access protected routes
      // Should redirect to login
      expect(true, isTrue, skip: 'Auth guard test pending');
    });

    testWidgets('FE-3.3T-022: Authenticated user redirected from login to home', (WidgetTester tester) async {
      // TODO: Implement authenticated redirect test
      // When user is authenticated and tries to access login
      // Should redirect to home
      expect(true, isTrue, skip: 'Authenticated redirect test pending');
    });

    testWidgets('FE-3.3T-023: Protected routes require authentication', (WidgetTester tester) async {
      // TODO: Implement protected route test
      // Canvas, profile, color-rights should require auth
      expect(true, isTrue, skip: 'Protected route test pending');
    });
  });

  group('FE-3.3T Deep Link Tests', () {
    testWidgets('FE-3.3T-024: Deep link to canvas screen', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      // 模拟深链接
      router.go('/canvas');
      await tester.pumpAndSettle();

      expect(find.byType(CanvasScreen), findsOneWidget);
    });

    testWidgets('FE-3.3T-025: Deep link to profile screen', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      router.go('/profile');
      await tester.pumpAndSettle();

      expect(find.byType(ProfileScreen), findsOneWidget);
    });

    testWidgets('FE-3.3T-026: Invalid route shows error or default', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      await tester.pumpAndSettle();

      // TODO: Test invalid route handling
      expect(true, isTrue, skip: 'Invalid route test pending');
    });
  });

  group('FE-3.3T Route Parameter Tests', () {
    testWidgets('FE-3.3T-027: Route with query parameters', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      // TODO: Test query parameters
      // router.go('/canvas?zone=1');
      expect(true, isTrue, skip: 'Query parameter test pending');
    });

    testWidgets('FE-3.3T-028: Route with path parameters', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: router,
        ),
      );

      // TODO: Test path parameters
      // router.go('/profile/user-123');
      expect(true, isTrue, skip: 'Path parameter test pending');
    });
  });
}
