from app.postprocess import (
    aggregate_confidence,
    build_parsed_fields,
    classify_line_type,
    extract_date,
    extract_invoice_no,
    extract_line_items,
    extract_tax,
    extract_totals,
    normalize_currency,
    parse_qr_payload,
)


def test_normalize_currency_handles_symbols() -> None:
    assert normalize_currency("₹1,234.56") == 1234.56
    assert normalize_currency("USD 44.1") == 44.10


def test_extract_totals_and_date() -> None:
    text = """
    ACME MARKET
    Date: 2026-04-20
    Subtotal 10.00
    Tax 1.80
    Total 11.80
    """
    amounts, total, currency = extract_totals(text)
    assert 11.8 in amounts
    assert total == 11.8
    assert currency is None
    assert extract_date(text) == "2026-04-20"


def test_extract_line_items() -> None:
    text = "MILK 2 1.50 3.00\nBREAD 1 2.20 2.20"
    items = extract_line_items(text)
    assert len(items) == 2
    assert items[0]["name"] == "MILK"
    assert items[0]["total_price"] == 3.0


def test_classify_line_type() -> None:
    assert classify_line_type("Total: 20.10") == "total"
    assert classify_line_type("Coffee 1 5.00 5.00") == "item"


def test_confidence_aggregate() -> None:
    summary = aggregate_confidence([
        {"text": "hello", "conf": 60},
        {"text": "world", "conf": 90},
    ])
    assert summary["avg_word_confidence"] == 75.0


def test_invoice_and_tax_extraction() -> None:
    text = "Invoice # INV-2026/004\\nGST 18.00\\nTotal 118.00"
    assert extract_invoice_no(text) == "INV-2026/004"
    assert extract_tax(text) == 18.0


def test_qr_payload_parser_url() -> None:
    payload = parse_qr_payload("https://merchant.example/pay?am=120.50&pn=ACME")
    assert payload["parsed"]["host"] == "merchant.example"
    assert payload["parsed"]["query"]["pn"] == "ACME"


def test_build_parsed_fields() -> None:
    raw_text = "ACME Store\\nInvoice INV-1001\\nDate 2026-04-21\\nTotal ₹123.45"
    words = [
        {"text": "ACME", "conf": 90},
        {"text": "Store", "conf": 90},
        {"text": "Invoice", "conf": 85},
        {"text": "Total", "conf": 80},
    ]
    parsed, confidences = build_parsed_fields(raw_text, words, [], [])
    assert parsed["merchant"] == "ACME Store"
    assert parsed["invoice_no"] == "INV-1001"
    assert parsed["total"] == 123.45
    assert confidences["total"] > 0
