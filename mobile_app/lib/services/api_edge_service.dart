import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/expense_model.dart';
import 'dart:async';

class ApiEdgeService {
  Database? _db;
  final _expenseStreamController = StreamController<List<Expense>>.broadcast();

  Stream<List<Expense>> get expensesStream => _expenseStreamController.stream;

  Future<void> initDB() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'expenseai_edge.db');

    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE expenses(
            id TEXT PRIMARY KEY,
            description TEXT,
            amount REAL,
            category TEXT,
            date TEXT,
            paymentMethod TEXT,
            receiptImage TEXT
          )
        ''');
      },
    );
    _broadcastExpenses();
  }

  Future<void> _broadcastExpenses() async {
    final expenses = await getExpenses();
    _expenseStreamController.add(expenses);
  }

  Future<List<Expense>> getExpenses() async {
    if (_db == null) return [];
    final List<Map<String, dynamic>> maps = await _db!.query('expenses', orderBy: 'date DESC');
    return maps.map((map) => Expense.fromMap(map)).toList();
  }

  Future<void> addExpense(Expense expense) async {
    if (_db == null) return;
    await _db!.insert(
      'expenses',
      expense.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    await _broadcastExpenses();
  }

  Future<void> deleteExpense(String id) async {
    if (_db == null) return;
    await _db!.delete('expenses', where: 'id = ?', whereArgs: [id]);
    await _broadcastExpenses();
  }

  Future<Map<String, dynamic>> getAnalytics() async {
    final expenses = await getExpenses();
    double total = 0;
    for (var e in expenses) {
      total += e.amount;
    }
    return {
      'totalMonthly': total,
      'transactionCount': expenses.length,
      // Expand as needed mirroring api.ts dynamically
    };
  }

  void dispose() {
    _expenseStreamController.close();
  }
}
