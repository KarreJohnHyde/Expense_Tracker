import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:image/image.dart' as img;

import 'ocr_result.dart';

class ReceiptOcrService {
  ReceiptOcrService({required this.apiBaseUrl, this.authToken});

  final String apiBaseUrl;
  String? authToken;
  List<String> languageHints = const <String>['eng', 'hin', 'tam', 'tel', 'nld', 'fra', 'chi_sim', 'jpn', 'kor'];

  Map<String, String> get _jsonHeaders {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (authToken != null && authToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $authToken';
    }
    return headers;
  }

  Future<Uint8List> preprocess(Uint8List bytes) async {
    final decoded = img.decodeImage(bytes);
    if (decoded == null) return bytes;

    final resized = decoded.width > 2200 ? img.copyResize(decoded, width: 2200) : decoded;
    final gray = img.grayscale(resized);
    final adjusted = img.adjustColor(gray, contrast: 1.15, brightness: 1.08);

    return Uint8List.fromList(img.encodeJpg(adjusted, quality: 90));
  }

  Future<Map<String, dynamic>> createSignedUpload({required String fileName, required String mimeType}) async {
    final response = await http.post(
      Uri.parse('$apiBaseUrl/ocr/upload-url'),
      headers: _jsonHeaders,
      body: jsonEncode({'file_name': fileName, 'mime_type': mimeType}),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to create signed URL: ${response.statusCode} ${response.body}');
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<void> uploadToSignedUrl({
    required Uri uploadUrl,
    required Uint8List bytes,
    required String contentType,
    required Map<String, dynamic> requiredHeaders,
  }) async {
    final request = http.Request('PUT', uploadUrl);
    request.bodyBytes = bytes;
    request.headers['Content-Type'] = contentType;

    requiredHeaders.forEach((key, value) {
      request.headers[key] = value.toString();
    });

    final streamed = await request.send();
    if (streamed.statusCode < 200 || streamed.statusCode >= 300) {
      final body = await streamed.stream.bytesToString();
      throw Exception('Signed upload failed: ${streamed.statusCode} $body');
    }
  }

  Future<OcrResult> processFromS3({
    required String s3Bucket,
    required String s3Key,
    String sourceType = 'upload',
  }) async {
    final response = await http.post(
      Uri.parse('$apiBaseUrl/ocr/process-image'),
      headers: _jsonHeaders,
      body: jsonEncode({
        's3_bucket': s3Bucket,
        's3_key': s3Key,
        'source_type': sourceType,
        'lang_hints': languageHints,
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to process uploaded image: ${response.statusCode} ${response.body}');
    }

    return OcrResult.fromJson(jsonDecode(response.body) as Map<String, dynamic>);
  }

  Future<OcrResult> uploadAndProcess(File imageFile) async {
    final rawBytes = await imageFile.readAsBytes();
    final preprocessed = await preprocess(rawBytes);

    final signed = await createSignedUpload(fileName: imageFile.uri.pathSegments.last, mimeType: 'image/jpeg');
    await uploadToSignedUrl(
      uploadUrl: Uri.parse((signed['upload_url'] ?? '').toString()),
      bytes: preprocessed,
      contentType: 'image/jpeg',
      requiredHeaders: Map<String, dynamic>.from(signed['required_headers'] ?? <String, dynamic>{}),
    );

    return processFromS3(
      s3Bucket: (signed['s3_bucket'] ?? '').toString(),
      s3Key: (signed['s3_key'] ?? '').toString(),
      sourceType: 'gallery',
    );
  }
}
