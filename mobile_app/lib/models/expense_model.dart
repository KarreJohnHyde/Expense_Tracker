class Expense {
  final String id;
  final String description;
  final double amount;
  final String category;
  final String date;
  final String? paymentMethod;
  final String? receiptImage;

  Expense({
    required this.id,
    required this.description,
    required this.amount,
    required this.category,
    required this.date,
    this.paymentMethod,
    this.receiptImage,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'description': description,
      'amount': amount,
      'category': category,
      'date': date,
      'paymentMethod': paymentMethod,
      'receiptImage': receiptImage,
    };
  }

  factory Expense.fromMap(Map<String, dynamic> map) {
    return Expense(
      id: map['id'],
      description: map['description'],
      amount: map['amount'],
      category: map['category'],
      date: map['date'],
      paymentMethod: map['paymentMethod'],
      receiptImage: map['receiptImage'],
    );
  }
}
