from __future__ import annotations

import json
import math
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
import pytesseract

from .postprocess import aggregate_confidence, classify_line_type, extract_date, extract_line_items, extract_totals

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

    # Fallback to adaptive thresholding when Otsu is too sparse or too dense.
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
        results.append(
            {
                "type": "qr" if item.type.upper() == "QRCODE" else "barcode",
                "data": item.data.decode("utf-8", errors="replace"),
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


def run_tesseract(image: np.ndarray, psm: int = 6, oem: int = 3) -> Tuple[str, List[dict]]:
    config = f"--oem {oem} --psm {psm}"
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT, config=config)

    words: List[dict] = []
    raw_tokens: List[str] = []

    for i, token in enumerate(data.get("text", [])):
        token = (token or "").strip()
        conf = float(data.get("conf", ["-1"])[i]) if i < len(data.get("conf", [])) else -1.0
        if not token:
            continue

        word_entry = {
            "text": token,
            "conf": conf,
            "bbox": {
                "x": int(data.get("left", [0])[i]),
                "y": int(data.get("top", [0])[i]),
                "width": int(data.get("width", [0])[i]),
                "height": int(data.get("height", [0])[i]),
            },
        }
        words.append(word_entry)
        raw_tokens.append(token)

    return " ".join(raw_tokens), words


def parse_receipt_fields(raw_text: str) -> Dict[str, object]:
    totals, total = extract_totals(raw_text)
    date = extract_date(raw_text)
    items = extract_line_items(raw_text)

    if not items:
        for line in raw_text.splitlines():
            line_type = classify_line_type(line)
            if line_type != "item":
                continue
            amount_candidates, _ = extract_totals(line)
            if amount_candidates:
                items.append(
                    {
                        "name": line[:60],
                        "qty": 1,
                        "unit_price": amount_candidates[-1],
                        "total_price": amount_candidates[-1],
                        "confidence": 0.55,
                    }
                )

    return {
        "items": items,
        "total": total or (totals[-1] if totals else 0.0),
        "date": date,
        "amount_candidates": totals,
    }


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

    qr_results = decode_qr_and_barcode(image)
    qr_masked = mask_qr_regions(image, qr_results) if opts.mask_qr and qr_results else image

    gray, denoised, binary = denoise_and_binarize(qr_masked)
    rotated_image, rotated_binary, skew_angle = deskew_image(qr_masked, binary)
    segments = segment_components(rotated_binary)

    raw_text, words = run_tesseract(rotated_image, psm=opts.psm, oem=opts.oem)
    fields = parse_receipt_fields(raw_text)

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

    return {
        "job_id": job_id,
        "raw_text": raw_text,
        "words": words,
        "qr": qr_results,
        "items": fields["items"],
        "total": fields["total"],
        "date": fields["date"],
        "processing_time_ms": elapsed_ms,
        "metadata": {
            "skew_angle": round(skew_angle, 4),
            "segments": {k: len(v) for k, v in segments.items()},
            "confidence": aggregate_confidence(words),
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