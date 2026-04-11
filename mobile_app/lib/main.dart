import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/dashboard_screen.dart';
import 'services/api_edge_service.dart';
import 'services/classifier_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Edge Services
  final apiService = ApiEdgeService();
  await apiService.initDB();
  
  final classifier = ClassifierService();
  await classifier.loadVocabulary();

  runApp(
    MultiProvider(
      providers: [
        Provider<ApiEdgeService>.value(value: apiService),
        Provider<ClassifierService>.value(value: classifier),
      ],
      child: const MobileExpenseApp(),
    ),
  );
}

class MobileExpenseApp extends StatelessWidget {
  const MobileExpenseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ExpenseAI Mobile',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.dark, // Defaulting to the rich dark aesthetics
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.dark(
          primary: const Color(0xFF6366f1), // Indigo 500
          secondary: const Color(0xFF22d3ee), // Cyan 400
          background: const Color(0xFF0f172a), // Slate 900
          surface: const Color(0xFF1e293b), // Slate 800
        ),
        scaffoldBackgroundColor: const Color(0xFF020617), // Slate 950
        cardTheme: CardTheme(
          color: const Color(0xFF0f172a).withOpacity(0.8),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF1e293b), width: 1),
          ),
        ),
      ),
      home: const DashboardScreen(),
    );
  }
}
