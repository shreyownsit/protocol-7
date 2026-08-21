import pytest

from app.domain.diff import DiffChangeType
from app.processing.diff_engine import compute_word_diff, diff_engine


def test_word_diff():
    old_text = "Tenant shall pay rent on the first day"
    new_text = "Tenant shall pay monthly rent on the first day"
    diff_ops = compute_word_diff(old_text, new_text)
    assert any(op["op"] == "insert" and "monthly" in op["text"] for op in diff_ops)


def test_diff_engine_comparison():
    clauses_a = [
        {"id": "ca1", "heading": "Rent", "text": "Tenant shall pay $1500 monthly.", "path": "1.0"},
        {"id": "ca2", "heading": "Pets", "text": "No pets allowed.", "path": "2.0"},
    ]
    clauses_b = [
        {"id": "cb1", "heading": "Rent", "text": "Tenant shall pay $1800 monthly.", "path": "1.0"},
        {"id": "cb3", "heading": "Utilities", "text": "Tenant pays water and power.", "path": "3.0"},
    ]

    res = diff_engine.compare_documents("docA", "docB", clauses_a, clauses_b)
    assert res["summary"]["modified"] >= 1  # Rent changed from 1500 to 1800
    assert res["summary"]["added"] >= 1     # Utilities added
    assert res["summary"]["removed"] >= 1   # Pets removed
