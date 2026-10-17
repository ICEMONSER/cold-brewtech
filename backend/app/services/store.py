"""SQLite persistence for user settings and company-internal uploads (stdlib only)."""
from __future__ import annotations

import csv
import io
import json
import sqlite3
from pathlib import Path

from ..config import settings as cfg

DEFAULT_SETTINGS = {
    # Regulatory / convention defaults — every value is editable on the Settings page.
    "car_min_pct": 140.0,              # OIC minimum CAR (source BKI-2024, confirm with OIC)
    "car_internal_target_pct": 140.0,  # set your board's internal target; equals the minimum until set
    "combined_ratio_max_pct": 100.0,   # >100% = underwriting loss by definition
    "liquidity_ratio_min_x": 1.0,      # convention: liquid assets cover short-term obligations
    "min_cash_threshold": None,        # company must set (million THB); no public basis for a default
    "alert_lead_days": 7,
    "channel_in_app": True,
    "channel_email": False,
}

UPLOAD_KINDS = {
    "claims": ["claim_id", "line", "reported_date", "reserve_amount", "status"],
    "payments": ["claim_id", "payment_date", "amount"],
    "scheduled": ["claim_id", "line", "due_date", "amount", "status"],
    "receipts": ["source", "expected_date", "amount"],
}


def _conn():
    Path(cfg.db_path).parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(cfg.db_path)
    c.execute("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS uploads (company TEXT, kind TEXT, rows TEXT, PRIMARY KEY(company, kind))")
    c.execute("CREATE TABLE IF NOT EXISTS audit (ts TEXT DEFAULT CURRENT_TIMESTAMP, item TEXT, actor TEXT)")
    return c


def get_settings() -> dict:
    with _conn() as c:
        row = c.execute("SELECT v FROM kv WHERE k='settings'").fetchone()
    return {**DEFAULT_SETTINGS, **(json.loads(row[0]) if row else {})}


def put_settings(new: dict, actor: str = "user") -> dict:
    merged = {**get_settings(), **{k: v for k, v in new.items() if k in DEFAULT_SETTINGS}}
    with _conn() as c:
        c.execute("INSERT OR REPLACE INTO kv VALUES ('settings', ?)", (json.dumps(merged),))
        c.execute("INSERT INTO audit(item, actor) VALUES (?, ?)", (json.dumps(new, ensure_ascii=False), actor))
    return merged


def audit_log(limit: int = 20) -> list[dict]:
    with _conn() as c:
        rows = c.execute("SELECT ts, item, actor FROM audit ORDER BY ts DESC LIMIT ?", (limit,)).fetchall()
    return [{"ts": r[0], "item": r[1], "actor": r[2]} for r in rows]


def save_upload(company: str, kind: str, text: str) -> int:
    if kind not in UPLOAD_KINDS:
        raise ValueError(f"unknown kind {kind}")
    reader = csv.DictReader(io.StringIO(text))
    missing = set(UPLOAD_KINDS[kind]) - set(reader.fieldnames or [])
    missing.discard("status")
    if missing:
        raise ValueError(f"missing columns: {sorted(missing)}")
    rows = [dict(r) for r in reader]
    with _conn() as c:
        c.execute("INSERT OR REPLACE INTO uploads VALUES (?, ?, ?)", (company, kind, json.dumps(rows)))
    return len(rows)


def set_opening_cash(company: str, value: float | None):
    with _conn() as c:
        c.execute("INSERT OR REPLACE INTO kv VALUES (?, ?)", (f"opening:{company}", json.dumps(value)))


def company_data(company: str) -> dict:
    out: dict = {}
    with _conn() as c:
        for kind, rows in c.execute("SELECT kind, rows FROM uploads WHERE company=?", (company,)):
            out[kind] = json.loads(rows)
        row = c.execute("SELECT v FROM kv WHERE k=?", (f"opening:{company}",)).fetchone()
    out["opening_cash"] = json.loads(row[0]) if row else None
    return out
