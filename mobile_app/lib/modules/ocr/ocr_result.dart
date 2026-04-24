class OcrWord {
  OcrWord({
    required this.text,
    required this.conf,
    required this.bbox,
  });

  final String text;
  final double conf;
  final Map<String, dynamic> bbox;

  factory OcrWord.fromJson(Map<String, dynamic> json) {
    return OcrWord(
      text: (json['text'] ?? '').toString(),
      conf: (json['conf'] ?? 0).toDouble(),
      bbox: Map<String, dynamic>.from(json['bbox'] ?? <String, dynamic>{}),
    );
  }
}

class OcrResult {
  OcrResult({
    required this.jobId,
    required this.rawText,
    required this.correctedText,
    required this.total,
    required this.date,
    required this.items,
    required this.qr,
    required this.words,
    required this.processingTimeMs,
  });

  final String jobId;
  final String rawText;
  final String correctedText;
  final double total;
  final String? date;
  final List<Map<String, dynamic>> items;
  final List<Map<String, dynamic>> qr;
  final List<OcrWord> words;
  final int processingTimeMs;

  factory OcrResult.fromJson(Map<String, dynamic> json) {
    return OcrResult(
      jobId: (json['job_id'] ?? '').toString(),
      rawText: (json['raw_text'] ?? '').toString(),
      correctedText: (json['corrected_text'] ?? '').toString(),
      total: (json['total'] ?? 0).toDouble(),
      date: json['date']?.toString(),
      items: List<Map<String, dynamic>>.from((json['items'] ?? const <dynamic>[]).map((e) => Map<String, dynamic>.from(e))),
      qr: List<Map<String, dynamic>>.from((json['qr'] ?? const <dynamic>[]).map((e) => Map<String, dynamic>.from(e))),
      words: (json['words'] as List<dynamic>? ?? const <dynamic>[])
          .map((entry) => OcrWord.fromJson(Map<String, dynamic>.from(entry)))
          .toList(),
      processingTimeMs: (json['processing_time_ms'] ?? 0) as int,
    );
  }
}