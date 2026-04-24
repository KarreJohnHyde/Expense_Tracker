#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.pipeline import PipelineOptions, process_image_path
from app.postprocess import SymSpellCorrector


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Process a receipt image and emit JSON")
    parser.add_argument("--input", required=True, help="Path to image")
    parser.add_argument("--psm", type=int, default=6, help="Tesseract PSM mode")
    parser.add_argument("--oem", type=int, default=3, help="Tesseract OEM mode")
    parser.add_argument("--debug", action="store_true", help="Save intermediate images to --debug-dir")
    parser.add_argument("--debug-dir", default="/tmp/ocr-cli-debug", help="Debug output directory")
    parser.add_argument("--mask-qr", action="store_true", help="Mask QR code regions before OCR")
    parser.add_argument("--source-type", default="upload", help="camera/upload/gallery/qr_scanner")
    parser.add_argument("--lang-hints", default="eng", help="Tesseract language hints, comma separated")
    parser.add_argument("--job-id", default=None, help="Optional external job ID")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    options = PipelineOptions(
        psm=args.psm,
        oem=args.oem,
        debug=args.debug,
        mask_qr=args.mask_qr,
        source_type=args.source_type,
        tesseract_lang="+".join([entry.strip() for entry in args.lang_hints.split(",") if entry.strip()]) or "eng",
    )
    debug_dir = Path(args.debug_dir) / (args.job_id or "manual") if args.debug else None

    result = process_image_path(args.input, options=options, job_id=args.job_id, debug_dir=debug_dir)
    corrector = SymSpellCorrector()
    result["corrected_text"] = corrector.correct_text(result["raw_text"])

    print(json.dumps(result, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
