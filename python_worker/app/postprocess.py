from __future__ import annotations

import datetime as dt
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

try:
    from symspellpy import SymSpell, Verbosity
except Exception:  # pragma: no cover - optional dependency
    SymSpell = None
    Verbosity = None

DATE_PATTERNS = [
    re.compile(r"\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b"),
    re.compile(r"\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b"),
]

AMOUNT_PATTERN = re.compile(r"(?:(?:INR|Rs\.?|USD|EUR|GBP|\$|€|£|₹)\s*)?([0-9]{1,3}(?:[ ,][0-9]{2,3})*(?:\.[0-9]{1,2})?)")
LINE_ITEM_PATTERN = re.compile(
    r"^(?P<name>[A-Za-z0-9 .,_\-/]{3,}?)\s+(?P<qty>\d+(?:\.\d+)?)\s+(?P<unit>\d+(?:\.\d{1,2})?)\s+(?P<total>\d+(?:\.\d{1,2})?)$"
)


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

    if decimal <= 0:
        return None

    return float(decimal.quantize(Decimal("0.01")))


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


def extract_totals(raw_text: str) -> Tuple[List[float], Optional[float]]:
    values: List[float] = []
    for match in AMOUNT_PATTERN.finditer(raw_text):
        maybe = normalize_currency(match.group(1))
        if maybe is not None and maybe < 1_000_000:
            values.append(maybe)

    values = sorted(values)
    return values, max(values) if values else None


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