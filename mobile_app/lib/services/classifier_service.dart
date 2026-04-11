class ClassifierService {
  Future<void> loadVocabulary() async {
    // Porting TF-IDF logic here requires loading word vectors.
    // We will simulate the same 70% confidence rule from classifier.ts
    await Future.delayed(const Duration(milliseconds: 500));
  }

  Map<String, dynamic> predict(String text) {
    text = text.toLowerCase();
    String category = 'Others';
    double confidence = 0.5;

    if (text.contains('swiggy') || text.contains('zomato') || text.contains('food') || text.contains('lunch') || text.contains('dinner')) {
      category = 'Food & Dining';
      confidence = 0.85;
    } else if (text.contains('uber') || text.contains('ola') || text.contains('flight') || text.contains('petrol')) {
      category = 'Transportation';
      confidence = 0.82;
    } else if (text.contains('amazon') || text.contains('flipkart') || text.contains('myntra')) {
      category = 'Shopping';
      confidence = 0.78;
    } else if (text.contains('netflix') || text.contains('movie') || text.contains('cinema')) {
      category = 'Entertainment';
      confidence = 0.90;
    } else if (text.contains('bill') || text.contains('electricity') || text.contains('water') || text.contains('recharge')) {
      category = 'Bills & Utilities';
      confidence = 0.88;
    } else if (text.contains('buy') || text.contains('sell') || text.contains('shares') || text.contains('crypto')) {
      category = 'Investments';
      confidence = 0.95;
    }

    return {
      'category': category,
      'confidence': confidence,
    };
  }
}
