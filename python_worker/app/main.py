from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from .pipeline import PipelineOptions, load_image_from_blob_path, load_image_from_bytes, process_image_array
from .postprocess import SymSpellCorrector, aggregate_confidence

APP_NAME = "expense-ocr-worker"
MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", 12 * 1024 * 1024))
DEBUG_DIR = Path(os.getenv("OCR_DEBUG_DIR", "/tmp/ocr-debug"))
ENABLE_DEBUG = os.getenv("OCR_DEBUG", "false").lower() == "true"
DEFAULT_TESS_LANG = os.getenv("TESS_LANG", "eng+hin+tam+tel+nld+fra+chi_sim+jpn+kor")
LOW_CONFIDENCE_THRESHOLD = float(os.getenv("LOW_CONFIDENCE_THRESHOLD", "70"))

ocr_requests_total = Counter("ocr_requests_total", "Total OCR requests", ["status"])
ocr_processing_seconds = Histogram("ocr_processing_seconds", "OCR processing duration")
ocr_word_confidence = Histogram("ocr_word_confidence", "Word confidence values")


class ProcessBlobPayload(BaseModel):
    blob_path: str
    source_type: str = "upload"
    job_id: Optional[str] = None
    psm: int = 6
    oem: int = 3
    mask_qr: bool = True
    lang_hints: list[str] = ["eng", "hin", "tam", "tel", "nld", "fra", "chi_sim", "jpn", "kor"]


app = FastAPI(title=APP_NAME, version="1.1.0")
corrector = SymSpellCorrector(os.getenv("SYMSPELL_DICTIONARY_PATH"))


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "service": APP_NAME,
        "tesseract_cmd": os.getenv("TESSERACT_CMD", "tesseract"),
        "tess_lang": DEFAULT_TESS_LANG,
        "symspell_loaded": bool(corrector.symspell),
    }


@app.get("/metrics")
def metrics() -> PlainTextResponse:
    return PlainTextResponse(generate_latest().decode("utf-8"), media_type=CONTENT_TYPE_LATEST)


def resolve_lang(lang_hints: Optional[str], fallback: Optional[list[str]] = None) -> str:
    if lang_hints:
        parts = [entry.strip() for entry in lang_hints.split(",") if entry.strip()]
        if parts:
            return "+".join(parts)

    if fallback:
        clean = [entry.strip() for entry in fallback if entry.strip()]
        if clean:
            return "+".join(clean)

    return DEFAULT_TESS_LANG


def attach_postprocess(result: dict, *, mask_qr: bool, psm: int, oem: int, tess_lang: str) -> dict:
    corrected_text = corrector.correct_text(result["raw_text"])
    result["corrected_text"] = corrected_text
    result["metadata"]["confidence"] = aggregate_confidence(result["words"])
    result["metadata"]["engine"] = "pytesseract"
    result["metadata"]["postprocess"] = {
        "symspell_enabled": bool(corrector.symspell),
        "mask_qr": mask_qr,
        "psm": psm,
        "oem": oem,
        "lang": tess_lang,
    }
    return result


@app.post("/process-image")
async def process_image(
    request: Request,
    file: Optional[UploadFile] = File(default=None),
    blob_path: Optional[str] = Form(default=None),
    source_type: str = Form(default="upload"),
    lang_hints: Optional[str] = Form(default=None),
    job_id: Optional[str] = Form(default=None),
    psm: int = Form(default=6),
    oem: int = Form(default=3),
    mask_qr: bool = Form(default=True),
):
    request_started = time.perf_counter()
    resolved_job_id = job_id or str(uuid4())

    try:
        image = None
        tess_lang = resolve_lang(lang_hints)

        if request.headers.get("content-type", "").startswith("application/json"):
            payload = await request.json()
            blob_path = payload.get("blob_path")
            source_type = payload.get("source_type", source_type)
            psm = int(payload.get("psm", psm))
            oem = int(payload.get("oem", oem))
            mask_qr = bool(payload.get("mask_qr", mask_qr))
            resolved_job_id = payload.get("job_id") or resolved_job_id
            hints = payload.get("lang_hints")
            if isinstance(hints, str):
                tess_lang = resolve_lang(hints)
            elif isinstance(hints, list):
                tess_lang = resolve_lang(None, [str(entry) for entry in hints])

            if blob_path:
                image = load_image_from_blob_path(blob_path)
        elif file is not None:
            content = await file.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="Uploaded file is empty")
            if len(content) > MAX_FILE_BYTES:
                raise HTTPException(status_code=413, detail=f"File too large (> {MAX_FILE_BYTES} bytes)")
            image = load_image_from_bytes(content)
        elif blob_path:
            image = load_image_from_blob_path(blob_path)

        if image is None:
            raise HTTPException(status_code=400, detail="Provide either file upload or blob_path")

        options = PipelineOptions(
            psm=psm,
            oem=oem,
            debug=ENABLE_DEBUG,
            mask_qr=mask_qr,
            source_type=source_type,
            tesseract_lang=tess_lang,
            low_confidence_threshold=LOW_CONFIDENCE_THRESHOLD,
        )
        debug_dir = DEBUG_DIR / resolved_job_id if ENABLE_DEBUG else None
        result = process_image_array(image, options=options, job_id=resolved_job_id, debug_dir=debug_dir)
        result = attach_postprocess(result, mask_qr=mask_qr, psm=psm, oem=oem, tess_lang=tess_lang)

        for word in result["words"]:
            conf = float(word.get("conf", -1))
            if conf >= 0:
                ocr_word_confidence.observe(conf)

        ocr_requests_total.labels(status="success").inc()
        ocr_processing_seconds.observe(time.perf_counter() - request_started)
        return JSONResponse(result)
    except HTTPException:
        ocr_requests_total.labels(status="client_error").inc()
        raise
    except Exception as exc:
        ocr_requests_total.labels(status="error").inc()
        ocr_processing_seconds.observe(time.perf_counter() - request_started)
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {exc}") from exc


@app.post("/process-image-from-path")
def process_image_from_path(payload: ProcessBlobPayload):
    request_started = time.perf_counter()
    resolved_job_id = payload.job_id or str(uuid4())

    try:
        image = load_image_from_blob_path(payload.blob_path)
        options = PipelineOptions(
            psm=payload.psm,
            oem=payload.oem,
            debug=ENABLE_DEBUG,
            mask_qr=payload.mask_qr,
            source_type=payload.source_type,
            tesseract_lang=resolve_lang(None, payload.lang_hints),
            low_confidence_threshold=LOW_CONFIDENCE_THRESHOLD,
        )

        result = process_image_array(image, options=options, job_id=resolved_job_id)
        result = attach_postprocess(
            result,
            mask_qr=payload.mask_qr,
            psm=payload.psm,
            oem=payload.oem,
            tess_lang=options.tesseract_lang,
        )

        ocr_requests_total.labels(status="success").inc()
        ocr_processing_seconds.observe(time.perf_counter() - request_started)
        return JSONResponse(result)
    except Exception as exc:
        ocr_requests_total.labels(status="error").inc()
        raise HTTPException(status_code=500, detail=f"Failed to process blob path: {exc}") from exc
