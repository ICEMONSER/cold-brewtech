"""Short-horizon cash forecast. Runs ONLY on company-internal data uploaded by the insurer
(claims, claim payments, scheduled payments, expected receipts, opening cash). Public data is
annual and cannot drive a daily forecast, so with no uploads this returns available=False.

Method (claim payment timing):
  1. From historical payments, build the empirical distribution F_L(d) of days d from
     claim report date to payment, amount-weighted, per line of business L.
  2. For each open claim i of line L, age a_i days, outstanding reserve R_i, the probability
     that it is paid within the next H days, given it is still unpaid today, is
         p_i = (F_L(a_i + H) − F_L(a_i)) / (1 − F_L(a_i))
  3. Expected payment of claim i on future day t:  R_i × (F_L(a_i+t) − F_L(a_i+t−1)) / (1 − F_L(a_i)).
  4. Variance (claim paid in full or not within H): R_i² × p_i × (1 − p_i). 90% band = ±1.645 σ.
  5. Scheduled (approved) payments and expected receipts are added on their exact dates.
  Cash_t = Opening cash + Σ receipts_≤t − Σ scheduled_≤t − Σ expected claim payments_≤t
"""
from __future__ import annotations

import math
from collections import defaultdict
from datetime import date, timedelta

MIN_HISTORY = 30  # payments per line needed to trust a line-specific curve; otherwise pool all lines


def _ecdf(delays_weights: list[tuple[int, float]], max_day: int) -> list[float]:
    total = sum(w for _, w in delays_weights) or 1.0
    mass = [0.0] * (max_day + 2)
    for d, w in delays_weights:
        mass[min(max(d, 0), max_day + 1)] += w
    cdf, run = [], 0.0
    for m in mass:
        run += m
        cdf.append(run / total)
    return cdf


def forecast(data: dict, horizon: int, today: date, threshold: float | None) -> dict:
    claims = data.get("claims", [])
    payments = data.get("payments", [])
    scheduled = data.get("scheduled", [])
    receipts = data.get("receipts", [])
    opening = data.get("opening_cash")

    missing = []
    if opening is None:
        missing.append("opening_cash")
    if not payments:
        missing.append("payments (history)")
    if not claims:
        missing.append("claims (open reserves)")
    if missing:
        return {"available": False, "missing": missing,
                "reason": "A daily forecast needs company-internal data. Public sources only publish annual totals."}

    reported = {c["claim_id"]: (c["line"], date.fromisoformat(c["reported_date"])) for c in claims}
    by_line: dict[str, list[tuple[int, float]]] = defaultdict(list)
    pooled: list[tuple[int, float]] = []
    for p in payments:
        if p["claim_id"] not in reported:
            continue
        line, rep = reported[p["claim_id"]]
        d = (date.fromisoformat(p["payment_date"]) - rep).days
        by_line[line].append((d, float(p["amount"])))
        pooled.append((d, float(p["amount"])))
    if not pooled:
        return {"available": False, "missing": ["payments linked to claims"],
                "reason": "No payment rows match an uploaded claim_id."}

    max_day = max(d for d, _ in pooled) + horizon + 1
    cdf_pool = _ecdf(pooled, max_day)
    cdfs = {l: _ecdf(v, max_day) if len(v) >= MIN_HISTORY else cdf_pool for l, v in by_line.items()}

    daily_claims = [0.0] * horizon
    var_total = 0.0
    by_line_total: dict[str, float] = defaultdict(float)
    for c in claims:
        if c.get("status", "open") != "open":
            continue
        R = float(c["reserve_amount"])
        F = cdfs.get(c["line"], cdf_pool)
        a = min((today - date.fromisoformat(c["reported_date"])).days, max_day - horizon - 1)
        surv = 1 - F[a]
        if surv <= 1e-9:
            # past the longest observed delay: treat as due within horizon, spread evenly (flagged)
            for t in range(horizon):
                daily_claims[t] += R / horizon
            by_line_total[c["line"]] += R
            continue
        for t in range(1, horizon + 1):
            amt = R * (F[a + t] - F[a + t - 1]) / surv
            daily_claims[t - 1] += amt
            by_line_total[c["line"]] += amt
        p = (F[a + horizon] - F[a]) / surv
        var_total += R * R * p * (1 - p)

    sigma = math.sqrt(var_total)
    sched_day = [0.0] * horizon
    for s in scheduled:
        k = (date.fromisoformat(s["due_date"]) - today).days
        if 0 <= k < horizon:
            sched_day[k] += float(s["amount"])
    rec_day = [0.0] * horizon
    for r in receipts:
        k = (date.fromisoformat(r["expected_date"]) - today).days
        if 0 <= k < horizon:
            rec_day[k] += float(r["amount"])

    series, cash, cum_claims = [], float(opening), 0.0
    breach = None
    for t in range(horizon):
        cash += rec_day[t] - sched_day[t] - daily_claims[t]
        cum_claims += daily_claims[t]
        # band widens with share of expected claim outflow realised so far
        share = cum_claims / (sum(daily_claims) or 1)
        band = 1.645 * sigma * math.sqrt(share)
        row = {"date": (today + timedelta(days=t + 1)).isoformat(), "cash": round(cash, 2),
               "low": round(cash - band, 2), "high": round(cash + band, 2),
               "inflow": round(rec_day[t], 2), "outflow": round(sched_day[t] + daily_claims[t], 2)}
        series.append(row)
        if threshold is not None and breach is None and row["low"] < threshold:
            breach = {"date": row["date"], "day": t + 1, "expected_cash": row["cash"],
                      "low_band": row["low"], "shortfall_expected": round(max(threshold - row["cash"], 0), 2),
                      "kind": "expected" if row["cash"] < threshold else "early-warning (90% band)"}

    trough = min(series, key=lambda r: r["cash"])
    return {"available": True, "status": "forecast", "horizon_days": horizon, "opening_cash": opening,
            "series": series, "trough": trough, "threshold": threshold, "breach": breach,
            "expected_claim_payments": round(sum(daily_claims), 2),
            "expected_claim_payments_by_line": {k: round(v, 2) for k, v in by_line_total.items()},
            "scheduled_payments": round(sum(sched_day), 2), "expected_receipts": round(sum(rec_day), 2),
            "sigma_90": round(1.645 * sigma, 2)}
