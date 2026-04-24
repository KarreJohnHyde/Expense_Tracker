import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import 'ocr_result.dart';
import 'receipt_ocr_service.dart';

class ReceiptCaptureReviewScreen extends StatefulWidget {
  const ReceiptCaptureReviewScreen({
    super.key,
    required this.service,
  });

  final ReceiptOcrService service;

  @override
  State<ReceiptCaptureReviewScreen> createState() => _ReceiptCaptureReviewScreenState();
}

class _QueueEntry {
  _QueueEntry({required this.file});

  final File file;
  bool processing = false;
  bool confirmed = false;
  String? error;
  OcrResult? result;
  final Map<int, TextEditingController> edits = <int, TextEditingController>{};
}

class _ReceiptCaptureReviewScreenState extends State<ReceiptCaptureReviewScreen> {
  final ImagePicker _picker = ImagePicker();
  final List<_QueueEntry> _queue = <_QueueEntry>[];
  bool _qrScannerOpen = false;
  String? _qrText;

  Future<void> _captureFromCamera() async {
    final XFile? picked = await _picker.pickImage(source: ImageSource.camera, imageQuality: 90);
    if (picked == null) return;
    setState(() => _queue.insert(0, _QueueEntry(file: File(picked.path))));
  }

  Future<void> _pickBatchFromGallery() async {
    final List<XFile> files = await _picker.pickMultiImage(imageQuality: 90);
    if (files.isEmpty) return;
    setState(() {
      _queue.insertAll(0, files.map((f) => _QueueEntry(file: File(f.path))));
    });
  }

  Future<void> _processEntry(_QueueEntry entry) async {
    setState(() {
      entry.processing = true;
      entry.error = null;
    });

    try {
      final OcrResult result = await widget.service.uploadAndProcess(entry.file);
      setState(() {
        entry.result = result;
      });
    } catch (err) {
      setState(() => entry.error = err.toString());
    } finally {
      setState(() => entry.processing = false);
    }
  }

  Widget _buildQrScanner() {
    if (!_qrScannerOpen) return const SizedBox.shrink();

    return SizedBox(
      height: 280,
      child: MobileScanner(
        onDetect: (capture) {
          final value = capture.barcodes.isNotEmpty ? capture.barcodes.first.rawValue : null;
          if (value != null && value.isNotEmpty) {
            setState(() => _qrText = value);
          }
        },
      ),
    );
  }

  @override
  void dispose() {
    for (final entry in _queue) {
      for (final controller in entry.edits.values) {
        controller.dispose();
      }
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Receipt OCR Pipeline')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              ElevatedButton.icon(
                onPressed: _captureFromCamera,
                icon: const Icon(Icons.camera_alt_outlined),
                label: const Text('Capture'),
              ),
              ElevatedButton.icon(
                onPressed: _pickBatchFromGallery,
                icon: const Icon(Icons.collections_outlined),
                label: const Text('Media Gallery'),
              ),
              OutlinedButton.icon(
                onPressed: () => setState(() => _qrScannerOpen = !_qrScannerOpen),
                icon: const Icon(Icons.qr_code_scanner),
                label: Text(_qrScannerOpen ? 'Stop QR' : 'Scan QR'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildQrScanner(),
          if (_qrText != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text('QR Payload: $_qrText'),
              ),
            ),
          const SizedBox(height: 16),
          ..._queue.map((entry) {
            final result = entry.result;
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Image.file(entry.file, height: 160, fit: BoxFit.cover),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: <Widget>[
                        ElevatedButton(
                          onPressed: entry.processing ? null : () => _processEntry(entry),
                          child: Text(entry.processing ? 'Processing...' : 'Upload + OCR'),
                        ),
                        CheckboxMenuButton(
                          value: entry.confirmed,
                          onChanged: result == null ? null : (v) => setState(() => entry.confirmed = v ?? false),
                          child: const Text('Confirm before save'),
                        ),
                      ],
                    ),
                    if (entry.error != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(entry.error!, style: const TextStyle(color: Colors.red)),
                      ),
                    if (result != null) ...<Widget>[
                      const SizedBox(height: 8),
                      Text('Total: ${result.total.toStringAsFixed(2)} | Date: ${result.date ?? '-'}'),
                      const SizedBox(height: 6),
                      const Text('Low confidence tokens (<70):'),
                      ...result.words.asMap().entries
                          .where((entry) => entry.value.conf >= 0 && entry.value.conf < 70)
                          .take(12)
                          .map((tokenEntry) {
                        final idx = tokenEntry.key;
                        final token = tokenEntry.value;
                        final controller = entry.edits.putIfAbsent(idx, () => TextEditingController(text: token.text));
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: TextField(
                            controller: controller,
                            decoration: InputDecoration(
                              border: const OutlineInputBorder(),
                              labelText: 'Conf ${token.conf.toStringAsFixed(1)}',
                            ),
                          ),
                        );
                      }),
                    ],
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
