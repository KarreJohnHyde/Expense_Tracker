import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models/expense_model.dart';
import '../services/api_edge_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  Widget build(BuildContext context) {
    final edgeService = Provider.of<ApiEdgeService>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('ExpenseAI', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.bell),
            onPressed: () {},
          ).animate(onPlay: (controller) => controller.repeat())
           .shimmer(duration: 2.seconds, color: Colors.cyan),
          const SizedBox(width: 16),
        ],
      ),
      extendBodyBehindAppBar: true,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0f172a), Color(0xFF020617)],
          ),
        ),
        child: SafeArea(
          child: StreamBuilder<List<Expense>>(
            stream: edgeService.expensesStream,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              final expenses = snapshot.data ?? [];
              final total = expenses.fold<double>(0, (sum, e) => sum + e.amount);

              return CustomScrollView(
                physics: const BouncingScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Total Balance',
                            style: TextStyle(color: Colors.white60, fontSize: 16),
                          ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.2),
                          const SizedBox(height: 8),
                          Text(
                            '₹${total.toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 48,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -1,
                            ),
                          ).animate().scale(delay: 200.ms, duration: 600.ms, curve: Curves.easeOutBack),
                          const SizedBox(height: 32),
                          _buildActionGrid(),
                          const SizedBox(height: 32),
                          const Text(
                            'Recent Edge Activity',
                            style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                          ).animate().fadeIn(delay: 500.ms),
                        ],
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final expense = expenses[index];
                          return _buildExpenseTile(expense, index);
                        },
                        childCount: expenses.length,
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddExpenseModal(context),
        backgroundColor: Theme.of(context).colorScheme.primary,
        icon: const Icon(LucideIcons.mic, color: Colors.white),
        label: const Text('Voice Entry', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ).animate().slideY(begin: 1.5, curve: Curves.easeOutCubic, duration: 800.ms).then().shimmer(duration: 2.seconds),
    );
  }

  Widget _buildActionGrid() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _buildActionCard('Scan', LucideIcons.scanLine, Colors.indigoAccent),
        _buildActionCard('Markets', LucideIcons.trendingUp, Colors.tealAccent),
        _buildActionCard('Analytics', LucideIcons.pieChart, Colors.purpleAccent),
        _buildActionCard('Gallery', LucideIcons.image, Colors.orangeAccent),
      ],
    ).animate(interval: 100.ms).fadeIn(duration: 400.ms).slideY(begin: 0.5, curve: Curves.easeOutQuad);
  }

  Widget _buildActionCard(String title, IconData icon, Color color) {
    return Column(
      children: [
        Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: color.withOpacity(0.3), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.1),
                blurRadius: 20,
                spreadRadius: 2,
              )
            ],
          ),
          child: Icon(icon, color: color, size: 32),
        ),
        const SizedBox(height: 8),
        Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
      ],
    );
  }

  Widget _buildExpenseTile(Expense expense, int index) {
    bool isCredit = expense.amount < 0 || expense.category == 'Investments_Sell';
    double displayAmount = expense.amount.abs();

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1e293b).withOpacity(0.5),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isCredit ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isCredit ? LucideIcons.arrowDownLeft : LucideIcons.arrowUpRight,
              color: isCredit ? Colors.greenAccent : Colors.redAccent,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  expense.description,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  '${expense.category} • ${expense.date}',
                  style: const TextStyle(color: Colors.white54, fontSize: 13),
                ),
              ],
            ),
          ),
          Text(
            '${isCredit ? '+' : '-'}₹${displayAmount.toStringAsFixed(2)}',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: isCredit ? Colors.greenAccent : Colors.redAccent,
            ),
          ),
        ],
      ),
    ).animate(delay: (300 + (index * 100)).ms)
     .fadeIn(duration: 400.ms)
     .slideX(begin: 0.1, curve: Curves.easeOutBack);
  }

  void _showAddExpenseModal(BuildContext context) {
    // Scaffold UI for advanced modal animations
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Color(0xFF1e293b),
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 24),
            const Icon(LucideIcons.mic, size: 64, color: Colors.indigoAccent)
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scale(begin: const Offset(1, 1), end: const Offset(1.2, 1.2), duration: 800.ms),
            const SizedBox(height: 24),
            const Text('Listening...', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Try saying: "Spent 500 on Swiggy for dinner"', style: TextStyle(color: Colors.white54)),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }
}
