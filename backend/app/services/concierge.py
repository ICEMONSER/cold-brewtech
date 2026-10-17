"""AI Concierge: Retrieve → Reason → Act (deck slide 'Recommendation').

Retrieve: build a fact sheet from public_data.json, computed formulas, the latest forecast and alerts.
Reason:   send ONLY that fact sheet to Claude with strict grounding rules.
Act:      return the answer, the source IDs used, and suggested follow-up actions.

Without ANTHROPIC_API_KEY the endpoint still works using a deterministic keyword fallback,
so the dashboard is usable offline."""
from __future__ import annotations

import json

from ..config import settings as cfg

SYSTEM_PROMPT = """You are the Cold BrewTech AI Insurance Cash Flow Concierge for a Thai non-life insurer's
Finance, Risk and Actuarial teams. Answer in the user's language (Thai or English).

Rules:
1. Use ONLY the facts in <facts>. Never invent numbers, dates, claims or companies.
2. Every number you state must carry its status — actual, forecast, derived — and its source id in [brackets].
3. If the question needs data that is not in <facts> (e.g. daily cash, claim-level detail), say clearly that
   the data is not available publicly and name the internal system that would provide it
   (Policy, Claims Management, Actuarial, Payment, Accounting/Bank).
4. When you compute something, show the formula in one line.
5. End with at most 3 short suggested actions. You give information, not investment or legal advice.
Keep answers under 180 words."""


def build_facts(public: dict, company_id: str, extra: dict | None = None) -> dict:
    comp = public["companies"].get(company_id, {})
    return {
        "company": {k: comp.get(k) for k in ("name_th", "name_en", "ticker", "source", "periods", "not_public")},
        "market": public["market"],
        "sources": {k: {"title": v["title"], "url": v["url"]} for k, v in public["sources"].items()},
        **(extra or {}),
    }


def _fallback(question: str, facts: dict) -> dict:
    q = question.lower()
    p = facts["company"]["periods"]["2025"]
    lines = []
    if any(w in q for w in ["สภาพคล่อง", "liquid", "เงินสด", "cash", "เตรียมเงิน"]):
        lines.append(f"Liquidity ratio 0.74x in 2025 vs 1.38x in 2024 (actual, [NKI-FH]); "
                     f"operating cash flow ฿{p['cfo']}M (actual, [NKI-FH]).")
        lines.append("Daily cash balances are not public — connect Accounting/Bank data to forecast next month's needs.")
    if any(w in q for w in ["เคลม", "claim", "สินไหม", "loss"]):
        lines.append(f"Insurance service expenses ฿{p['insurance_service_expenses']}M vs revenue "
                     f"฿{p['insurance_revenue']}M (actual, [NKI-FH]); combined ratio {p['combined_ratio_pct']}% (actual).")
        lines.append("Market health loss ratio 65.42% in 2024 (actual, [TIRD-2024]).")
    if any(w in q for w in ["car", "เงินกองทุน", "capital"]):
        lines.append(f"CAR {p['car_pct']}% (actual, not yet audited, [NKI-FH]) vs regulatory minimum 140% [BKI-2024].")
    if not lines:
        lines.append("I can answer about NKI's 2024–2025 published results, Thai non-life market statistics, "
                     "scenarios and alerts. Claim-level and daily data require the insurer's internal systems.")
    return {"answer": "\n".join(lines), "mode": "offline-fallback", "model": None}


def ask(question: str, facts: dict, history: list[dict] | None = None) -> dict:
    if not cfg.anthropic_api_key:
        return _fallback(question, facts)
    try:
        import anthropic
    except ImportError:
        return _fallback(question, facts) | {"note": "anthropic package not installed"}
    client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
    msgs = (history or [])[-6:] + [{
        "role": "user",
        "content": f"<facts>\n{json.dumps(facts, ensure_ascii=False)}\n</facts>\n\nQuestion: {question}",
    }]
    try:
        resp = client.messages.create(model=cfg.claude_model, max_tokens=700, system=SYSTEM_PROMPT, messages=msgs)
    except Exception as e:  # network / auth / rate limit → degrade gracefully
        return _fallback(question, facts) | {"note": f"Claude API error: {type(e).__name__}"}
    text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
    return {"answer": text, "mode": "claude", "model": cfg.claude_model,
            "usage": {"input_tokens": resp.usage.input_tokens, "output_tokens": resp.usage.output_tokens}}
