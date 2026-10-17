"""Cold BrewTech API — FastAPI app. Run: uvicorn app.main:app --reload"""
from __future__ import annotations

import json
from datetime import date

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings as cfg
from .services import concierge, metrics, store
from .services.forecast import forecast as run_forecast

app = FastAPI(title="Cold BrewTech API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=cfg.cors_origins, allow_methods=["*"], allow_headers=["*"])


def public() -> dict:
    with open(cfg.data_file, encoding="utf-8") as f:
        return json.load(f)


def _company(cid: str) -> dict:
    c = public()["companies"].get(cid)
    if not c:
        raise HTTPException(404, f"Unknown company {cid}")
    return c


@app.get("/api/health")
def health():
    return {"ok": True, "ai_mode": "claude" if cfg.anthropic_api_key else "offline-fallback"}


@app.get("/api/sources")
def sources():
    return public()["sources"]


@app.get("/api/market")
def market():
    return public()["market"]


@app.get("/api/companies")
def companies():
    return [{"id": k, "name_th": v["name_th"], "name_en": v["name_en"], "ticker": v["ticker"]}
            for k, v in public()["companies"].items()]


@app.get("/api/companies/{cid}/summary")
def summary(cid: str, period: str = "2025"):
    c = _company(cid)
    cur, prev = c["periods"].get(period), c["periods"].get(str(int(period) - 1))
    if not cur:
        raise HTTPException(404, f"No data for {period}")
    s = store.get_settings()
    derived = {
        "net_cash_change": metrics.net_cash_change(cur["cfo"], cur["cfi"], cur["cff"]).dict(),
        "service_result_check": metrics.insurance_service_result(
            cur["insurance_revenue"], cur["insurance_service_expenses"], cur["net_reinsurance_result"]).dict(),
        "gross_expense_ratio": metrics.gross_expense_ratio(cur["insurance_revenue"], cur["insurance_service_expenses"]).dict(),
    }
    if prev:
        derived["expense_growth"] = metrics.yoy_growth(cur["insurance_service_expenses"], prev["insurance_service_expenses"]).dict()
        derived["revenue_growth"] = metrics.yoy_growth(cur["insurance_revenue"], prev["insurance_revenue"]).dict()
    return {"company": {k: c[k] for k in ("name_th", "name_en", "ticker", "source")}, "period": period,
            "actual": cur, "previous": prev, "derived": derived, "not_public": c["not_public"],
            "alerts": metrics.liquidity_flags(cur, s)}


@app.get("/api/companies/{cid}/forecast")
def forecast(cid: str, horizon: int = 30):
    _company(cid)
    s = store.get_settings()
    return run_forecast(store.company_data(cid), horizon, date.today(), s["min_cash_threshold"])


@app.get("/api/companies/{cid}/claims")
def claims(cid: str):
    _company(cid)
    d = store.company_data(cid)
    if not d.get("claims"):
        return {"available": False, "reason": "Claim-level data is internal. Upload claims.csv to populate."}
    return {"available": True, "rows": d["claims"], "scheduled": d.get("scheduled", [])}


class ScenarioIn(BaseModel):
    company: str = "NKI"
    period: str = "2025"
    expense_shock_pct: float = Field(10, ge=-50, le=100)


@app.post("/api/scenario")
def scenario(body: ScenarioIn):
    c = _company(body.company)
    per = c["periods"].get(body.period)
    if not per:
        raise HTTPException(404, "period not found")
    return {"status": "derived", "source": c["source"], **metrics.expense_shock(per, body.expense_shock_pct).dict()}


@app.get("/api/settings")
def get_settings():
    return {"settings": store.get_settings(), "audit": store.audit_log()}


@app.put("/api/settings")
def put_settings(body: dict):
    return store.put_settings(body)


@app.post("/api/companies/{cid}/upload/{kind}")
async def upload(cid: str, kind: str, file: UploadFile):
    _company(cid)
    try:
        n = store.save_upload(cid, kind, (await file.read()).decode("utf-8-sig"))
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"rows": n, "kind": kind}


class OpeningIn(BaseModel):
    value: float | None


@app.put("/api/companies/{cid}/opening-cash")
def opening_cash(cid: str, body: OpeningIn):
    _company(cid)
    store.set_opening_cash(cid, body.value)
    return {"ok": True}


@app.get("/api/companies/{cid}/alerts")
def alerts(cid: str):
    c = _company(cid)
    s = store.get_settings()
    out = metrics.liquidity_flags(c["periods"]["2025"], s)
    f = run_forecast(store.company_data(cid), 30, date.today(), s["min_cash_threshold"])
    if f.get("available") and f.get("breach"):
        b = f["breach"]
        out.append({"level": "critical" if b["kind"] == "expected" else "warning", "metric": "cash_forecast",
                    "message": f"Day {b['day']} ({b['date']}): cash may fall below threshold", **b})
    return out


class AskIn(BaseModel):
    question: str
    company: str = "NKI"
    history: list[dict] = []
    mode: str = "real"            # "real" | "demo"
    demo_facts: dict | None = None  # sent by the frontend in demo mode (ข้อมูลสมมติ)


@app.post("/api/concierge/ask")
def ask(body: AskIn):
    if body.mode == "demo":
        if not body.demo_facts:
            raise HTTPException(400, "demo_facts required in demo mode")
        return concierge.ask_demo(body.question, body.demo_facts, body.history)
    p = public()
    f = run_forecast(store.company_data(body.company), 30, date.today(), store.get_settings()["min_cash_threshold"])
    facts = concierge.build_facts(p, body.company, {"forecast_30d": f if f.get("available") else {"available": False}})
    return concierge.ask(body.question, facts, body.history)


class DemoScenarioIn(BaseModel):
    shock: float
    delay: int
    reserve: float
    closing: float
    trough: float


@app.post("/api/demo/scenarios")
def save_demo_scenario(body: DemoScenarioIn):
    """Saves a demo-mode scenario to the audit log (marked as assumption data)."""
    store.log_event(f"[ข้อมูลสมมติ] scenario saved: {body.model_dump()}")
    return {"ok": True}
