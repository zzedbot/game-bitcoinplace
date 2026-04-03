import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'presentation/screens/home_screen.dart';
import 'presentation/screens/login_screen.dart';
import 'presentation/screens/register_screen.dart';
import 'presentation/screens/canvas_screen.dart';
import 'presentation/screens/profile_screen.dart';
import 'presentation/screens/color_rights_screen.dart';
import 'presentation/screens/onboarding_screen.dart';

/// 路由配置
final GoRouter router = GoRouter(
  initialLocation: '/onboarding',
  routes: [
    GoRoute(
      path: '/onboarding',
      name: 'onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/login',
      name: 'login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/register',
      name: 'register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/home',
      name: 'home',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/canvas',
      name: 'canvas',
      builder: (context, state) => const CanvasScreen(),
    ),
    GoRoute(
      path: '/profile',
      name: 'profile',
      builder: (context, state) => const ProfileScreen(),
    ),
    GoRoute(
      path: '/color-rights',
      name: 'colorRights',
      builder: (context, state) => const ColorRightsScreen(),
    ),
  ],
);

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // TODO: 初始化 Hive 本地缓存
  // await Hive.initFlutter();
  // await Hive.openBox(AppConfig.boxUser);
  // await Hive.openBox(AppConfig.boxToken);
  
  runApp(
    const ProviderScope(
      child: BitcoinPlaceApp(),
    ),
  );
}

class BitcoinPlaceApp extends StatelessWidget {
  const BitcoinPlaceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'BitcoinPlace',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.orange,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      routerConfig: router,
    );
  }
}
