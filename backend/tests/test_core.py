"""Unit tests. Synthetic numbers below exist ONLY to test the maths; they are never served by the API."""
import os
import tempfile
from datetime import date

os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "t.sqlite3")
os.environ["ANTHROPIC_API_KEY"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services import metrics  # noqa: E402
from app.services.forecast import forecast  # noqa: E402

client = TestClient(app)


def test_service_result_matches_published_nki_2025():
    r = metrics.insurance_service_result(3543.22, 5185.61, 971.84)
    assert r.value == -670.55  # equals the company's published figure


def test_net_cash_change():
    assert metrics.net_cash_change(194.80, -9.10, -17.09).value == 168.61


def test_expense_shock_10pct():
    per = {"insurance_service_expenses": 5185.61, "insurance_service_result": -670.55, "cfo": 194.80, "equity": 1657.87}
    s = metrics.expense_shock(per, 10)
    assert s.delta == 518.56
    assert s.scenario["cfo"] == round(194.80 - 518.56, 2)


def test_alerts_fire_on_published_ratios():
    s = {"combined_ratio_max_pct": 100, "liquidity_ratio_min_x": 1.0, "car_min_pct": 140, "car_internal_target_pct": 140}
    a = metrics.liquidity_flags({"combined_ratio_pct": 118.92, "liquidity_ratio_x": 0.74, "car_pct": 206.4}, s)
    assert {x["metric"] for x in a} == {"combined_ratio_pct", "liquidity_ratio_x"}


def test_forecast_unavailable_without_internal_data():
    f = forecast({}, 30, date(2026, 1, 1), 40)
    assert f["available"] is False and "opening_cash" in f["missing"]


def test_forecast_math_on_synthetic_data():
    claims = [{"claim_id": f"H{i}", "line": "motor", "reported_date": "2025-12-01", "reserve_amount": 0, "status": "closed"} for i in range(40)]
    pays = [{"claim_id": f"H{i}", "payment_date": "2025-12-11", "amount": 1} for i in range(40)]  # all paid at day 10
    claims.append({"claim_id": "O1", "line": "motor", "reported_date": "2025-12-27", "reserve_amount": 5, "status": "open"})
    f = forecast({"claims": claims, "payments": pays, "opening_cash": 10}, 10, date(2026, 1, 1), 6)
    assert f["available"]
    assert abs(f["expected_claim_payments"] - 5) < 1e-6  # age 5 → paid on day 10 → within horizon
    assert f["trough"]["cash"] == 5.0
    assert f["breach"]["kind"] == "expected"


def test_api_endpoints():
    assert client.get("/api/health").json()["ok"]
    s = client.get("/api/companies/NKI/summary").json()
    assert s["actual"]["combined_ratio_pct"] == 118.92
    assert client.get("/api/companies/NKI/forecast").json()["available"] is False
    r = client.post("/api/concierge/ask", json={"question": "สภาพคล่องเป็นอย่างไร"}).json()
    assert r["mode"] == "offline-fallback" and "0.74" in r["answer"]
    up = client.post("/api/companies/NKI/upload/payments", files={"file": ("p.csv", b"claim_id,payment_date\n")})
    assert up.status_code == 400
