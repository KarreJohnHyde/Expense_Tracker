from __future__ import annotations

import datetime as dt
import json
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

try:
    from symspellpy import SymSpell, Verbosity
except Exception:  # pragma: no cover - optional dependency
    SymSpell = None
    Verbosity = None

DATE_PATTERNS = [
    re.compile(r"\b(\d{4})[-/.\s](\d{1,2})[-/.\s](\d{1,2})\b"),
    re.compile(r"\b(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2,4})\b"),
]

# Keep special characters in raw text and parse currency/amount separately.
AMOUNT_WITH_CURRENCY_PATTERN = re.compile(
    r"(?P<currency>INR|Rs\.?|USD|EUR|GBP|AUD|CAD|SGD|JPY|\$|€|£|₹)?\s*(?P<amount>\d{1,3}(?:[ ,]\d{2,3})*(?:\.\d{1,2})?)",
    flags=re.IGNORECASE,
)

INVOICE_PATTERN = re.compile(r"(?i)\b(?:invoice|inv|bill)\s*[:#]?\s*([A-Z0-9\-/]+)\b")
TAX_PATTERN = re.compile(r"(?i)\b(?:tax|vat|gst|cgst|sgst)\b[^\d]*(\d{1,3}(?:[ ,]\d{3})*(?:\.\d{1,2})?)")
LINE_ITEM_PATTERN = re.compile(
    r"^(?P<name>[^\d].{2,}?)\s+(?P<qty>\d+(?:\.\d+)?)\s+(?P<unit>\d+(?:\.\d{1,2})?)\s+(?P<total>\d+(?:\.\d{1,2})?)$"
)

CURRENCY_CODE_MAP = {
    "$": "USD",
    "₹": "INR",
    "€": "EUR",
    "£": "GBP",
    "rs": "INR",
    "inr": "INR",
    "usd": "USD",
    "eur": "EUR",
    "gbp": "GBP",
    "aud": "AUD",
    "cad": "CAD",
    "sgd": "SGD",
    "jpy": "JPY",
}

OCR_NORMALIZATION_RULES = {
    "O0": "0",
    "l1": "1",
    "I1": "1",
}


def normalize_currency(value: str) -> Optional[float]:
    cleaned = value.strip().replace(",", "").replace(" ", "")
    cleaned = re.sub(r"[^0-9.]", "", cleaned)
    if cleaned.count(".") > 1:
        first = cleaned.find(".")
        cleaned = cleaned[: first + 1] + cleaned[first + 1 :].replace(".", "")

    if not cleaned:
        return None

    try:
        decimal = Decimal(cleaned)
    except InvalidOperation:
        return None

    if decimal < 0:
        return None

    return float(decimal.quantize(Decimal("0.01")))


def normalize_ocr_token(token: str) -> str:
    normalized = token
    for source, target in OCR_NORMALIZATION_RULES.items():
        normalized = normalized.replace(source, target)
    return normalized


def extract_date(raw_text: str) -> Optional[str]:
    text = raw_text.replace("\n", " ")

    for pattern in DATE_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue

        groups = match.groups()
        try:
            if len(groups[0]) == 4:
                year, month, day = int(groups[0]), int(groups[1]), int(groups[2])
            else:
                day, month = int(groups[0]), int(groups[1])
                year = int(groups[2])
                if year < 100:
                    year += 2000
            return dt.date(year, month, day).isoformat()
        except Exception:
            continue

    return None


def extract_totals(raw_text: str) -> Tuple[List[float], Optional[float], Optional[str]]:
    values: List[float] = []
    inferred_currency = None

    for match in AMOUNT_WITH_CURRENCY_PATTERN.finditer(raw_text):
        amount = normalize_currency(match.group("amount") or "")
        if amount is not None and amount < 1_000_000:
            values.append(amount)
            currency = (match.group("currency") or "").lower().strip().rstrip(".")
            if currency and inferred_currency is None:
                inferred_currency = CURRENCY_CODE_MAP.get(currency)

    values = sorted(values)
    return values, max(values) if values else None, inferred_currency


def extract_tax(raw_text: str) -> Optional[float]:
    match = TAX_PATTERN.search(raw_text)
    if not match:
        return None
    return normalize_currency(match.group(1))


def extract_invoice_no(raw_text: str) -> Optional[str]:
    match = INVOICE_PATTERN.search(raw_text)
    return match.group(1) if match else None


def extract_line_items(raw_text: str) -> List[dict]:
    items: List[dict] = []

    for line in raw_text.splitlines():
        line = re.sub(r"\s+", " ", line.strip())
        if not line:
            continue

        match = LINE_ITEM_PATTERN.match(line)
        if not match:
            continue

        qty = normalize_currency(match.group("qty"))
        unit = normalize_currency(match.group("unit"))
        total = normalize_currency(match.group("total"))

        items.append(
            {
                "name": match.group("name").strip(),
                "qty": qty,
                "unit_price": unit,
                "total_price": total,
                "confidence": 0.75,
            }
        )

    return items


def classify_line_type(line: str) -> str:
    normalized = line.strip().lower()
    if not normalized:
        return "blank"
    if "total" in normalized:
        return "total"
    if re.search(r"\b(qty|quantity|pcs|item)\b", normalized):
        return "item"
    if re.search(r"\b(subtotal|tax|vat|gst|cgst|sgst)\b", normalized):
        return "meta"
    if re.search(r"\d", normalized) and re.search(r"[a-z]", normalized):
        return "item"
    return "text"


def infer_vendor(raw_text: str) -> Optional[str]:
    for line in raw_text.splitlines():
        candidate = re.sub(r"\s+", " ", line.strip())
        if len(candidate) < 3:
            continue
        if re.search(r"\b(total|subtotal|tax|invoice|bill|date|qty)\b", candidate, flags=re.IGNORECASE):
            continue
        return candidate[:120]
    return None


def parse_qr_payload(decoded_text: str) -> dict:
    payload = {
        "decoded_text": decoded_text,
        "parsed": None,
    }

    try:
        payload["parsed"] = json.loads(decoded_text)
        return payload
    except Exception:
        pass

    if decoded_text.startswith("http://") or decoded_text.startswith("https://"):
        parsed = urlparse(decoded_text)
        payload["parsed"] = {
            "url": decoded_text,
            "host": parsed.netloc,
            "path": parsed.path,
            "query": {k: v[0] if len(v) == 1 else v for k, v in parse_qs(parsed.query).items()},
        }
        return payload

    if decoded_text.lower().startswith("upi://"):
        parsed = urlparse(decoded_text)
        payload["parsed"] = {
            "scheme": parsed.scheme,
            "action": parsed.netloc,
            "params": {k: v[0] if len(v) == 1 else v for k, v in parse_qs(parsed.query).items()},
        }
        return payload

    if decoded_text.upper().startswith("BEGIN:VCARD"):
        fields: Dict[str, str] = {}
        for line in decoded_text.splitlines():
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            fields[key] = value
        payload["parsed"] = fields

    return payload


def confidence_for_field(words: Iterable[dict], keyword: str) -> float:
    key = keyword.lower()
    candidates = []
    for word in words:
        text = str(word.get("text", "")).lower()
        conf = float(word.get("conf", -1))
        if conf < 0:
            continue
        if key in text:
            candidates.append(conf)

    if not candidates:
        return 0.0

    # Normalize Tesseract-style confidence [0,100] to [0,1].
    return round(min(max(sum(candidates) / len(candidates), 0), 100) / 100.0, 4)


class SymSpellCorrector:
    def __init__(self, dictionary_path: Optional[str] = None) -> None:
        self.symspell = None

        if SymSpell is None:
            return

        dictionary_file = Path(dictionary_path) if dictionary_path else Path(__file__).resolve().parents[1] / "data" / "domain_dictionary.txt"
        if not dictionary_file.exists():
            return

        self.symspell = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
        self.symspell.load_dictionary(str(dictionary_file), term_index=0, count_index=1)

    def correct_text(self, text: str) -> str:
        if not self.symspell:
            return text

        corrected_tokens = []
        for token in text.split():
            if token.isnumeric() or len(token) <= 2:
                corrected_tokens.append(token)
                continue

            suggestions = self.symspell.lookup(token, Verbosity.CLOSEST, max_edit_distance=2)
            corrected_tokens.append(suggestions[0].term if suggestions else token)

        return " ".join(corrected_tokens)


def aggregate_confidence(words: Iterable[dict]) -> dict:
    confidences = [float(w.get("conf", 0)) for w in words if float(w.get("conf", 0)) >= 0]
    if not confidences:
        return {"avg_word_confidence": 0.0, "min_word_confidence": 0.0, "max_word_confidence": 0.0}

    return {
        "avg_word_confidence": round(sum(confidences) / len(confidences), 2),
        "min_word_confidence": round(min(confidences), 2),
        "max_word_confidence": round(max(confidences), 2),
    }


def build_parsed_fields(raw_text: str, words: List[dict], qr_results: List[dict], line_items: List[dict]) -> Tuple[dict, dict]:
    amounts, total, currency = extract_totals(raw_text)
    parsed_date = extract_date(raw_text)
    invoice_no = extract_invoice_no(raw_text)
    tax = extract_tax(raw_text)
    merchant = infer_vendor(raw_text)

    parsed_fields = {
        "merchant": merchant,
        "date": parsed_date,
        "invoice_no": invoice_no,
        "total": total or (amounts[-1] if amounts else 0.0),
        "tax": tax,
        "currency": currency,
        "line_items": line_items,
        "raw_text": raw_text,
    }

    confidences = {
        "merchant": confidence_for_field(words, merchant or "") if merchant else 0.0,
        "date": confidence_for_field(words, parsed_date or "") if parsed_date else 0.0,
        "invoice_no": confidence_for_field(words, invoice_no or "") if invoice_no else 0.0,
        "total": confidence_for_field(words, "total"),
        "tax": confidence_for_field(words, "tax"),
        "qr": 1.0 if qr_results else 0.0,
    }

    return parsed_fields, confidences