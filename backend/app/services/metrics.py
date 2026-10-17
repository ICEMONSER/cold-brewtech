"""Deterministic financial formulas. Every function returns plain numbers plus the
formula string, so the UI and the AI concierge can show *how* a figure was made.
All amounts are million THB unless stated."""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class Figure:
    value: Optional[float]
    status: str  # actual | forecast | derived | gap
    formula: str = ""
    source: str = ""
    note: str = ""

    def dict(self):
        return asdict(self)


def net_cash_change(cfo: float, cfi: float, cff: float) -> Figure:
    """ΔCash = CFO + CFI + CFF (indirect-method cash flow statement identity)."""
    return Figure(round(cfo + cfi + cff, 2), "derived", "CFO + CFI + CFF")


def insurance_service_result(revenue: float, expenses: float, net_reinsurance: float) -> Figure:
    """TFRS 17: Insurance service result = insurance revenue − insurance service expenses
    + net income/expense from reinsurance contracts held."""
    return Figure(round(revenue - expenses + net_reinsurance, 2), "derived",
                  "Insurance revenue − Insurance service expenses + Net reinsurance result")


def gross_expense_ratio(revenue: float, expenses: float) -> Figure:
    """Gross insurance-service expense ratio (a loss-ratio *proxy*): expenses ÷ revenue.
    Under TFRS 17 'insurance service expenses' include claims AND acquisition costs, so this is
    higher than a pure loss ratio. It is labelled as a proxy everywhere it is shown."""
    if not revenue:
        return Figure(None, "gap", "Expenses ÷ Revenue", note="Revenue is zero or missing")
    return Figure(round(expenses / revenue * 100, 2), "derived", "Insurance service expenses ÷ Insurance revenue × 100",
                  note="Proxy: includes acquisition costs, gross of reinsurance")


def yoy_growth(current: float, previous: float) -> Figure:
    if not previous:
        return Figure(None, "gap", "(Current − Previous) ÷ Previous")
    return Figure(round((current - previous) / previous * 100, 2), "derived", "(Current − Previous) ÷ Previous × 100")


@dataclass
class ScenarioResult:
    shock_pct: float
    base: dict
    scenario: dict
    delta: float
    assumptions: list

    def dict(self):
        return asdict(self)


def expense_shock(period: dict, shock_pct: float) -> ScenarioResult:
    """What-if: insurance service expenses change by shock_pct.

    Δ = Expenses × shock_pct/100
    Scenario service result = base result − Δ
    Scenario CFO           = base CFO − Δ           (assumption A1)
    Scenario equity        = base equity − Δ        (assumption A2: before tax)
    Reinsurance recoveries are held constant (assumption A3)."""
    exp = period["insurance_service_expenses"]
    delta = round(exp * shock_pct / 100, 2)
    base = {
        "insurance_service_expenses": exp,
        "insurance_service_result": period["insurance_service_result"],
        "cfo": period["cfo"],
        "equity": period["equity"],
    }
    scen = {
        "insurance_service_expenses": round(exp + delta, 2),
        "insurance_service_result": round(period["insurance_service_result"] - delta, 2),
        "cfo": round(period["cfo"] - delta, 2),
        "equity": round(period["equity"] - delta, 2),
    }
    return ScenarioResult(shock_pct, base, scen, delta, [
        "A1: the whole extra expense is paid in cash within the same year (conservative)",
        "A2: equity impact shown before tax and before any capital action",
        "A3: reinsurance recoveries do not increase with the shock (conservative)",
        "CAR cannot be recomputed: it needs capital-available and risk-charge data that is not public",
    ])


def liquidity_flags(period: dict, settings: dict) -> list[dict]:
    """Alert rules on *published* ratios. Thresholds come from Settings (user-editable)."""
    alerts = []
    cr = period.get("combined_ratio_pct")
    if cr is not None and cr > settings["combined_ratio_max_pct"]:
        alerts.append({"level": "warning", "metric": "combined_ratio_pct", "value": cr,
                       "threshold": settings["combined_ratio_max_pct"],
                       "message": f"Combined ratio {cr}% exceeds {settings['combined_ratio_max_pct']}% — underwriting is loss-making"})
    lr = period.get("liquidity_ratio_x")
    if lr is not None and lr < settings["liquidity_ratio_min_x"]:
        alerts.append({"level": "warning", "metric": "liquidity_ratio_x", "value": lr,
                       "threshold": settings["liquidity_ratio_min_x"],
                       "message": f"Liquidity ratio {lr}x is below {settings['liquidity_ratio_min_x']}x"})
    car = period.get("car_pct")
    if car is not None:
        if car < settings["car_min_pct"]:
            level = "critical"
        elif car < settings["car_internal_target_pct"]:
            level = "warning"
        else:
            level = None
        if level:
            alerts.append({"level": level, "metric": "car_pct", "value": car,
                           "threshold": settings["car_internal_target_pct"] if level == "warning" else settings["car_min_pct"],
                           "message": f"CAR {car}% below {'internal target' if level == 'warning' else 'regulatory minimum'}"})
    return alerts
