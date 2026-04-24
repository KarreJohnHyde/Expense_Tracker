from __future__ import annotations

import json
import math
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import pytesseract

from .postprocess import (
    aggregate_confidence,
    build_parsed_fields,
    classify_line_type,
    extract_line_items,
    extract_totals,
    normalize_ocr_token,
    parse_qr_payload,
)

try:
    from pyzbar.pyzbar import decode as decode_barcode
except Exception:  # pragma: no cover - optional dependency
    decode_barcode = None

try:
    import boto3
except Exception:  # pragma: no cover - optional dependency
    boto3 = None


@dataclass
class PipelineOptions:
    psm: int = 6
    oem: int = 3
    debug: bool = False
    mask_qr: bool = True
    source_type: str = "upload"
    tesseract_lang: str = "eng"
    low_confidence_threshold: float = 70.0


if os.getenv("TESSERACT_CMD"):
    pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_CMD")


def load_image_from_path(path: str) -> np.ndarray:
    image = cv2.imread(path)
    if image is None:
        raise ValueError(f"Unable to decode image at {path}")
    return image


def load_image_from_bytes(content: bytes) -> np.ndarray:
    array = np.frombuffer(content, np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode uploaded image bytes")
    return image


def load_image_from_blob_path(blob_path: str) -> np.ndarray:
    if blob_path.startswith("http://") or blob_path.startswith("https://"):
        import requests

        response = requests.get(blob_path, timeout=30)
        response.raise_for_status()
        return load_image_from_bytes(response.content)

    if blob_path.startswith("s3://"):
        if boto3 is None:
            raise RuntimeError("boto3 is required for s3:// paths")
        _, rest = blob_path.split("s3://", 1)
        bucket, key = rest.split("/", 1)
        s3 = boto3.client("s3")
        obj = s3.get_object(Bucket=bucket, Key=key)
        return load_image_from_bytes(obj["Body"].read())

    if blob_path.startswith("gs://"):
        from google.cloud import storage

        _, rest = blob_path.split("gs://", 1)
        bucket, key = rest.split("/", 1)
        storage_client = storage.Client()
        blob = storage_client.bucket(bucket).blob(key)
        return load_image_from_bytes(blob.download_as_bytes())

    return load_image_from_path(blob_path)


def order_points(points: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    s = points.sum(axis=1)
    rect[0] = points[np.argmin(s)]
    rect[2] = points[np.argmax(s)]

    diff = np.diff(points, axis=1)
    rect[1] = points[np.argmin(diff)]
    rect[3] = points[np.argmax(diff)]
    return rect


def perspective_correct_receipt(image: np.ndarray) -> Tuple[np.ndarray, bool]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 60, 180)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:10]
    for contour in contours:
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) != 4:
            continue

        pts = order_points(approx.reshape(4, 2).astype("float32"))
        (tl, tr, br, bl) = pts

        width_a = np.linalg.norm(br - bl)
        width_b = np.linalg.norm(tr - tl)
        max_w = int(max(width_a, width_b))

        height_a = np.linalg.norm(tr - br)
        height_b = np.linalg.norm(tl - bl)
        max_h = int(max(height_a, height_b))

        if max_w < 200 or max_h < 200:
            continue

        dst = np.array(
            [
                [0, 0],
                [max_w - 1, 0],
                [max_w - 1, max_h - 1],
                [0, max_h - 1],
            ],
            dtype="float32",
        )

        transform = cv2.getPerspectiveTransform(pts, dst)
        warped = cv2.warpPerspective(image, transform, (max_w, max_h))
        return warped, True

    return image, False


def denoise_and_binarize(image: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    median = cv2.medianBlur(gray, 3)
    smooth = cv2.bilateralFilter(median, 9, 75, 75)

    _, otsu = cv2.threshold(smooth, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    adaptive = cv2.adaptiveThreshold(
        smooth,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        11,
    )

    nonzero_ratio = float(np.count_nonzero(otsu == 0)) / (otsu.shape[0] * otsu.shape[1])
    binary = adaptive if nonzero_ratio < 0.01 or nonzero_ratio > 0.7 else otsu
    return gray, smooth, binary


def estimate_skew_angle(binary: np.ndarray) -> float:
    edges = cv2.Canny(binary, 50, 150)
    lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=100,
        minLineLength=max(binary.shape[1] // 4, 40),
        maxLineGap=20,
    )

    angles = []
    if lines is not None:
        for line in lines[:, 0]:
            x1, y1, x2, y2 = line
            angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
            if -45 < angle < 45:
                angles.append(angle)

    if angles:
        return float(np.median(angles))

    coords = np.column_stack(np.where(binary < 128))
    if len(coords) == 0:
        return 0.0

    rect = cv2.minAreaRect(coords)
    angle = rect[-1]
    if angle < -45:
        angle = 90 + angle
    return float(angle)


def deskew_image(image: np.ndarray, binary: np.ndarray) -> Tuple[np.ndarray, np.ndarray, float]:
    angle = estimate_skew_angle(binary)
    if abs(angle) < 0.3:
        return image, binary, 0.0

    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)

    rotated_image = cv2.warpAffine(image, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    rotated_binary = cv2.warpAffine(binary, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated_image, rotated_binary, angle


def decode_qr_and_barcode(image: np.ndarray) -> List[dict]:
    if decode_barcode is None:
        return []

    decoded = decode_barcode(image)
    results: List[dict] = []
    for item in decoded:
        rect = item.rect
        decoded_text = item.data.decode("utf-8", errors="replace")
        payload = parse_qr_payload(decoded_text)
        results.append(
            {
                "type": "qr" if item.type.upper() == "QRCODE" else "barcode",
                "data": decoded_text,
                "format": item.type,
                "decoded_text": payload["decoded_text"],
                "parsed_payload": payload["parsed"],
                "bbox": {
                    "x": int(rect.left),
                    "y": int(rect.top),
                    "width": int(rect.width),
                    "height": int(rect.height),
                },
            }
        )
    return results


def mask_qr_regions(image: np.ndarray, qr_results: List[dict]) -> np.ndarray:
    masked = image.copy()
    for qr in qr_results:
        bbox = qr.get("bbox") or {}
        x, y, w, h = bbox.get("x", 0), bbox.get("y", 0), bbox.get("width", 0), bbox.get("height", 0)
        cv2.rectangle(masked, (x, y), (x + w, y + h), (255, 255, 255), thickness=-1)
    return masked


def segment_components(binary: np.ndarray) -> Dict[str, List[dict]]:
    inverted = 255 - binary
    num_labels, _, stats, _ = cv2.connectedComponentsWithStats(inverted, connectivity=8)

    components = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if area < 25:
            continue
        components.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h), "area": int(area)})

    contours, _ = cv2.findContours(inverted, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    lines = []
    words = []
    chars = []

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w * h < 50:
            continue
        ratio = w / max(h, 1)
        entry = {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}
        if ratio > 8:
            lines.append(entry)
        elif ratio > 1.3:
            words.append(entry)
        else:
            chars.append(entry)

    return {
        "connected_components": components,
        "line_segments": lines,
        "word_segments": words,
        "char_segments": chars,
    }


def run_tesseract(image: np.ndarray, psm: int = 6, oem: int = 3, lang: str = "eng") -> Tuple[str, List[dict], str]:
    config = f"--oem {oem} --psm {psm}"
    used_lang = lang or "eng"

    try:
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT, config=config, lang=used_lang)
        raw_text = pytesseract.image_to_string(image, config=config, lang=used_lang)
    except Exception:
        # Fallback to English if one or more requested language packs are unavailable.
        used_lang = "eng"
        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT, config=config, lang=used_lang)
        raw_text = pytesseract.image_to_string(image, config=config, lang=used_lang)

    words: List[dict] = []
    for i, token in enumerate(data.get("text", [])):
        token = (token or "").strip()
        conf = float(data.get("conf", ["-1"])[i]) if i < len(data.get("conf", [])) else -1.0
        if not token:
            continue

        line_id = int(data.get("line_num", [0])[i]) if i < len(data.get("line_num", [])) else 0

        word_entry = {
            "text": token,
            "normalized_text": normalize_ocr_token(token),
            "conf": conf,
            "confidence": round(min(max(conf, 0), 100) / 100.0, 4),
            "line_id": line_id,
            "bbox": {
                "x": int(data.get("left", [0])[i]),
                "y": int(data.get("top", [0])[i]),
                "width": int(data.get("width", [0])[i]),
                "height": int(data.get("height", [0])[i]),
            },
        }
        words.append(word_entry)

    return raw_text, words, used_lang


def infer_line_items_from_layout(words: List[dict]) -> List[dict]:
    rows: Dict[int, List[dict]] = {}
    for word in words:
        line_id = int(word.get("line_id", 0))
        rows.setdefault(line_id, []).append(word)

    inferred_items: List[dict] = []
    for _, tokens in sorted(rows.items(), key=lambda entry: entry[0]):
        ordered = sorted(tokens, key=lambda token: token.get("bbox", {}).get("x", 0))
        line_text = " ".join(str(token.get("text", "")).strip() for token in ordered).strip()
        if classify_line_type(line_text) != "item":
            continue

        amounts, _, _ = extract_totals(line_text)
        if not amounts:
            continue

        inferred_items.append(
            {
                "name": line_text[:120],
                "qty": 1,
                "unit_price": amounts[-1],
                "total_price": amounts[-1],
                "confidence": round(sum(token.get("confidence", 0.0) for token in ordered) / max(len(ordered), 1), 4),
            }
        )

    return inferred_items


def maybe_write_debug(debug_dir: Path, image_map: Dict[str, np.ndarray]) -> None:
    debug_dir.mkdir(parents=True, exist_ok=True)
    for name, image in image_map.items():
        cv2.imwrite(str(debug_dir / f"{name}.png"), image)


def process_image_array(
    image: np.ndarray,
    *,
    options: Optional[PipelineOptions] = None,
    job_id: Optional[str] = None,
    debug_dir: Optional[Path] = None,
) -> Dict[str, object]:
    started = time.perf_counter()
    opts = options or PipelineOptions()

    processing_log: List[str] = []

    corrected_perspective, perspective_applied = perspective_correct_receipt(image)
    processing_log.append(f"perspective_correction: applied={str(perspective_applied).lower()}")

    qr_results = decode_qr_and_barcode(corrected_perspective)
    processing_log.append(f"qr_decode: count={len(qr_results)}")

    qr_masked = mask_qr_regions(corrected_perspective, qr_results) if opts.mask_qr and qr_results else corrected_perspective
    processing_log.append(f"mask_qr: enabled={str(opts.mask_qr).lower()}, applied={str(bool(opts.mask_qr and qr_results)).lower()}")

    gray, denoised, binary = denoise_and_binarize(qr_masked)
    processing_log.append("denoise: median_blur=3,bilateral=9/75/75")
    processing_log.append("binarize: otsu_with_adaptive_fallback")

    rotated_image, rotated_binary, skew_angle = deskew_image(qr_masked, binary)
    processing_log.append(f"deskew: angle={round(skew_angle, 4)}")

    segments = segment_components(rotated_binary)
    processing_log.append(
        "segment: "
        f"lines={len(segments['line_segments'])},words={len(segments['word_segments'])},chars={len(segments['char_segments'])}"
    )

    raw_text, words, used_lang = run_tesseract(rotated_image, psm=opts.psm, oem=opts.oem, lang=opts.tesseract_lang)
    processing_log.append(f"ocr: engine=pytesseract,lang={used_lang},requested={opts.tesseract_lang},psm={opts.psm},oem={opts.oem}")

    items = extract_line_items(raw_text)
    if not items:
        items = infer_line_items_from_layout(words)

    parsed_fields, confidences = build_parsed_fields(raw_text, words, qr_results, items)

    low_confidence = [
        word
        for word in words
        if float(word.get("conf", -1)) >= 0 and float(word.get("conf", 0)) < opts.low_confidence_threshold
    ]

    if opts.debug and debug_dir:
        maybe_write_debug(
            debug_dir,
            {
                "01_gray": gray,
                "02_denoised": denoised,
                "03_binary": binary,
                "04_deskewed": rotated_binary,
            },
        )
        (debug_dir / "segments.json").write_text(json.dumps(segments, indent=2), encoding="utf-8")

    elapsed_ms = int((time.perf_counter() - started) * 1000)

    raw_tokens = [
        {
            "text": word["text"],
            "bbox": word["bbox"],
            "confidence": word["confidence"],
            "line_id": word["line_id"],
        }
        for word in words
    ]

    return {
        "job_id": job_id,
        "source_type": opts.source_type,
        "raw_text": raw_text,
        "raw_tokens": raw_tokens,
        "words": words,
        "qr": qr_results,
        "qr_payload": qr_results[0] if qr_results else None,
        "parsed_fields": parsed_fields,
        "confidences": confidences,
        "items": parsed_fields.get("line_items", items),
        "total": parsed_fields.get("total", 0),
        "date": parsed_fields.get("date"),
        "processing_log": processing_log,
        "processing_time_ms": elapsed_ms,
        "metadata": {
            "skew_angle": round(skew_angle, 4),
            "segments": {k: len(v) for k, v in segments.items()},
            "confidence": aggregate_confidence(words),
            "low_confidence_threshold": opts.low_confidence_threshold,
            "low_confidence_tokens": low_confidence,
            "char_classification_hook": {
                "status": "not_enabled",
                "supported": ["svm_hog", "cnn_savedmodel"],
            },
        },
    }


def process_image_path(
    path: str,
    *,
    options: Optional[PipelineOptions] = None,
    job_id: Optional[str] = None,
    debug_dir: Optional[Path] = None,
) -> Dict[str, object]:
    image = load_image_from_path(path)
    return process_image_array(image, options=options, job_id=job_id, debug_dir=debug_dir)
