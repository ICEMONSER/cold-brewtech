# Cold BrewTech — AI Insurance Cash Flow Concierge

> An AI-powered concierge that connects claims data to proactive cash-flow forecasting for Thai non-life insurers.
> Concept: ExpresSO NB Co., Ltd. (Isaree Wongariyaporn, Ramida Khampao). Design: “Concept 1 — maroon console”, six screens.

The website has six screens, built to match the six reference screens pixel-for-pixel at 1586 × 992. **The frontend is a standalone static site** — every number on screen is sample data (ข้อมูลสมมติ) from `frontend/src/data.ts` and the page files, so it runs without the backend.

The six screens:

| Screen | Thai label | What it shows |
|---|---|---|
| Overview | ภาพรวม | Alerts, KPIs, 30-day cash forecast, market context, upcoming payments, AI Concierge |
| Cash forecast | พยากรณ์เงินสด | 30/60/90-day projection with 90% band, cash-flow statement |
| Claims analysis | วิเคราะห์เคลม | Service-result waterfall, market loss ratios, claim list, insights |
| Scenario | จำลองสถานการณ์ | “What if insurance service expenses rise X%?” on real FY2025 figures |
| Reports | รายงาน | CSV / PDF export of every table with status and source columns |
| Settings | ตั้งค่า | Alert thresholds, internal data uploads, audit log |

**Data rule used everywhere.** Every number carries one of four statuses:

- `actual`: published by a named public source.
- `forecast`: a third party's published forecast, or this system's own forecast built from company data that was uploaded.
- `derived`: arithmetic on actual figures, with the formula shown.
- `gap`: the data is not public. The UI then shows an empty state that says so instead of a number.

Nothing on screen is invented.

---

## 1. Technology stack

| Layer | Technology | What it does | Why it was chosen |
|---|---|---|---|
| Frontend framework | **React 18 + TypeScript** | Builds the six screens from shared components (sidebar, header, KPI card, gap state, concierge) | Large ecosystem. Types catch data-shape mistakes in financial UIs. |
| Build tool | **Vite 5** | Dev server and production bundle | Fast startup. Zero-config TypeScript. |
| Routing | **React Router 6** | One URL per screen (`/`, `/forecast`, `/claims`, …) | Standard, small |
| Charts | Hand-drawn SVG (`src/components/CashChart.tsx`) | Forecast line + uncertainty band, waterfall, bar charts | Drawn in each card's own pixel space so they line up exactly with the reference design |
| Fonts | Self-hosted via `@fontsource` (Noto Sans Thai, Inter, Crimson Pro) | Thai UI text, numbers, logo wordmark | Works offline and renders the same on every machine |
| Styling | Plain CSS with design tokens (`src/styles.css`) | Maroon palette, Noto Sans Thai, responsive grid | No CSS framework lock-in. Tokens mirror the approved mock-up. |
| Backend API | **Python 3.11+ / FastAPI** | REST endpoints for data, formulas, forecast, scenarios, alerts, uploads, AI | Python is the natural language for actuarial and forecast maths. FastAPI gives typed validation and auto docs at `/docs`. |
| Server | **Uvicorn** | ASGI server for FastAPI | Default, production-grade |
| Storage | **SQLite** (stdlib `sqlite3`) | Settings, audit log, uploaded company CSVs | Zero setup for a pilot. Swap for PostgreSQL when multi-tenant (see §3). |
| Public data | `backend/app/data/public_data.json` | Curated, source-tagged figures | Small, reviewable, version-controlled. Every value has a source ID. |
| AI | **Anthropic Claude API** (default `claude-sonnet-4-6`, configurable) | AI Concierge answers in Thai or English, grounded only in the fact sheet | Strong Thai-language reasoning and instruction-following, which is needed for the citation rules. Falls back to an offline keyword mode when no API key is set. |
| Tests | **pytest** | Checks that the formulas reproduce published figures, plus forecast maths and API | Guards against silent number errors |

## 2. Datasets

All figures were collected from public sources on or before **17 Oct 2026**. Each one is stored with its source ID in `backend/app/data/public_data.json`.

| ID | Source | Link | Used for | Update frequency | Usage notes |
|---|---|---|---|---|---|
| NKI-FH | The Navakij Insurance PCL (SET: NKI), Financial Highlights FY2025 vs FY2024 (restated) | [navakij.co.th](https://www.navakij.co.th/en/financial-information/financial-highlights) | All company KPIs: revenue, service expenses, reinsurance result, CFO/CFI/CFF, combined ratio, liquidity ratio, CAR, equity | Annual on the IR page; quarterly statements via SET | Public IR disclosure. NKI is used only as a demonstration of public data; it is not a client. The **2025 CAR is not yet certified by the auditor.** |
| SRIKRUNG-IPRB-TIRD | Srikrung Broker article citing the IPRB Flash Report FY2024 and the TIRD Non-Life Overview (Dec 2025) | [srikrungbroker.co.th](https://srikrungbroker.co.th/article-non-life-insurance-statistics-2024-2025/) | Market direct premiums 2024/2025, policy counts, premiums by line | Annual (IPRB/TIRD publish monthly flash reports) | **Secondary source.** Replace it with the IPRB/TIRD original when obtained. |
| OIC-2025 | OIC 2025 industry results, via The Thai Press (19 May 2026) | [thethaipress.com](https://www.thethaipress.com/2026/163485) | Non-life premiums (292,785 MTHB), net profit, line growth | Annual press release; OIC monthly statistics | Regulator data reported by the press |
| TIRD-2024 | TIRD, Performance Overview of Thailand's Non-Life Insurance Industry 2024 | [tird.insure](https://www.tird.insure/en/performance-overview-of-thailands-non-life-insurance-industry-2024/) | Market loss ratio by line (2024) | Annual | Quote with attribution |
| MILLIMAN-2026 | Milliman Thailand General Insurance Newsletter, Mar 2026 | [milliman.com (PDF)](https://media.milliman.com/v1/media/edge/images/millimaninc5660-milliman6442-prod27d5-0001/media/Milliman/PDFs/2026-Articles/3-27-26_Thailand-General-Insurance-Newsletter.pdf) | Industry claims incurred 2025 (236.8 BTHB), health growth +18%, southern flood losses | Roughly quarterly | Some line-growth values are read from charts |
| THAIRE-2025 | Thai Re outlook, via Bangkok Biznews (7 Nov 2025) | [bangkokbiznews.com](https://www.bangkokbiznews.com/finance/investment/1206527) | 2026 market premium **forecast** of 298,000–302,000 MTHB | Annual | Always labelled `forecast` |
| BKI-2024 | Bangkok Insurance 56-1 One Report 2024, p.22 | [bangkokinsurance.com (PDF)](https://bangkokinsurance.com/uploaded/documentdownload/1/onereport_2024EN.pdf?ver=1.1) | Regulatory minimum CAR of 140% | Annual | Secondary reference. Confirm against the OIC notification before production use. |

### Real data, derived figures, forecasts and assumptions

| Category | Examples in the app | Where it comes from |
|---|---|---|
| **Actual (real)** | NKI FY2025: insurance revenue ฿3,543.22M, service expenses ฿5,185.61M, combined ratio 118.92%, CFO ฿194.80M. Market: 293,118 MTHB premiums, 70.35M policies. | Public sources above |
| **Derived** | Net cash change ฿168.61M (= CFO + CFI + CFF). Expense growth +43.32%. Expense ÷ revenue proxy 146.35%. Scenario results. | Formulas in §5 applied to actual data |
| **Third-party forecast** | 2026 market premiums of 298,000–302,000 MTHB | Thai Re |
| **System forecast** | 30/60/90-day cash projection | Built **only** from company data you upload (§4). Never shown from public data. |
| **User-set thresholds** | Minimum cash, internal CAR target, liquidity floor | Settings page. Defaults are a regulatory or definitional convention, explained in §5. |
| **Not used by the app** | The deck's business plan: SaaS fees, customer growth (8–30%/yr), TAM 200.75M / SAM 124.05M / SOM 50.74M, ROI 55% | These are the **team's own projections**. They belong in the pitch deck, not the product. |

### Known discrepancies between sources (shown, not hidden)

- **2025 direct premiums:**
  - TIRD/IPRB reports 293,118 MTHB.
  - OIC reports 292,785 MTHB.
  - Milliman reports 292.2 BTHB.

  The differences come from different cut-offs and definitions. The app shows the TIRD figure and keeps the OIC figure alongside it.
- **2024 direct premiums:** IPRB reports 286,458 MTHB and TIRD's article reports 286,557 MTHB.
- **Non-life share of total premiums:** the deck shows 30.4%. OIC 2025 figures give 292,785 ÷ 969,221 = **30.2%**.
- **Claims not checked by this repo:** the deck's “55 non-life companies” and “5 companies closed after COVID” have not been checked against an OIC source. Verify them before citing.

### What public data cannot provide (data gaps)

None of these is published by any insurer:

- Daily or weekly cash balances.
- Claim-level records (IDs, reserves, due dates, status).
- The number of open claims.
- Company claims split by line of business.
- Premium-receivable collection schedules.

The screens that need them show a **“ไม่มีข้อมูลสาธารณะ”** (no public data) state until the insurer uploads its own CSVs. Templates are in `backend/templates/`. CAR **cannot be recalculated** in scenarios, because the capital-available and risk-charge components are not public.

## 3. Costs

These are list prices checked from public pricing write-ups in Oct 2026 and are in USD. **Re-check the vendors' own pricing pages before budgeting.**

| Item | Free tier | Paid / usage pricing | Source |
|---|---|---|---|
| React, Vite, FastAPI, SQLite, pytest | Open source, free | — | — |
| **Claude API**: Sonnet 4.6 (default) | None | $3 / M input tokens, $15 / M output tokens | [Morph pricing summary](https://www.morphllm.com/anthropic-claude-api-pricing) |
| Claude API: Haiku 4.5 (cheaper option) | — | $1 / M input, $5 / M output | same |
| **Frontend hosting: Vercel** | Hobby: $0, **non-commercial use only** | Pro: $20 per developer seat/month, includes $20 of usage | [livemy.app Vercel pricing](https://livemy.app/blog/vercel-pricing) |
| **Backend hosting: Render** | Free web service: spins down after 15 min idle; free Postgres expires after 30 days | Starter web service: $7/month (always on). Pro workspace: $25/month. Bandwidth: $0.15/GB over allowance. | [livemy.app Render pricing](https://livemy.app/blog/render-pricing) |
| Database (when moving off SQLite) | — | Render Postgres pricing was unclear in the sources checked; get a quote | — |

**AI cost per question.** Each question sends about 3,500 input tokens (fact sheet, rules and short history) and returns about 350 output tokens. These are measured prompt sizes, not billing data.

- **Sonnet 4.6:** about $0.016 per question.
- **Haiku 4.5:** about $0.005 per question.

**Estimated monthly operating cost**

| Stage | Setup | Estimate |
|---|---|---|
| Local demo | Run on a laptop, offline AI mode | **$0** |
| Pilot, one insurer (commercial) | Vercel Pro (1 seat) $20 + Render Starter $7 + about 2,000 questions on Sonnet (~$32) | **≈ $59 / month** |
| Pilot on Haiku | Same as above, AI ~$10 | **≈ $37 / month** |
| Production, multi-insurer | Managed Postgres, backups, monitoring, SSO, security review | **Not estimated.** These need vendor quotes. The deck's own budget lines (cloud ฿1.2M/yr, AI API ฿175–200k/yr) are team assumptions. |

## 4. System workflow

```
 PUBLIC SOURCES                       INSURER'S INTERNAL SYSTEMS (upload CSV)
 NKI IR · IPRB/TIRD · OIC ·           Claims mgmt → claims.csv   Payment → payments.csv / scheduled.csv
 Milliman · Thai Re                   Policy/AR → receipts.csv    Bank → opening cash (Settings)
        │ manual curation + source ID          │ validated by required columns
        ▼                                      ▼
  public_data.json  ───────────────►  FastAPI backend  ◄──────────  SQLite (uploads, settings, audit)
                                        │
        ┌───────────────┬───────────────┼────────────────┬──────────────────┐
        ▼               ▼               ▼                ▼                  ▼
   metrics.py      forecast.py     scenario         alert rules        concierge.py
   (formulas)      (needs uploads) (expense shock)  (thresholds)       Retrieve → Reason → Act
        └───────────────┴───────────────┴────────────────┴──────────────────┘
                                        ▼
                         React dashboard (6 screens) + AI Concierge panel
```

1. **Collect.** Public figures are curated by hand into `public_data.json`, each with a status and source ID. There is no scraping: the sources are PDFs and press articles whose terms vary. Internal data arrives as CSV uploads; the backend rejects files with missing columns.
2. **Process.** `metrics.py` computes derived figures and checks them against published totals. For example, the service-result formula reproduces NKI's −670.55 exactly, and a test enforces this.
3. **Forecast.** `forecast.py` runs only when opening cash, payment history and open claims have been uploaded. Otherwise it returns `available: false` with the list of missing inputs.
4. **Calculate scenarios and alerts.** The scenario endpoint applies the expense shock. The alert rules compare published ratios and the forecast with the thresholds set in Settings.
5. **Show on dashboards.** Each card shows its value, a status chip and source IDs, and every page has source links at the bottom.
6. **Answer with AI.** The concierge **retrieves** a fact sheet (public data, derived figures, forecast if available) and **reasons** with Claude under strict rules: use only those facts, tag every number's status and source, say when data is missing. It then **acts** by suggesting up to 3 next steps. Without an API key, a deterministic keyword fallback answers from the same facts.

## 5. Formulas and thresholds

All amounts are in million THB.

**Cash flow**

- `ΔCash = CFO + CFI + CFF`. This is the cash-flow statement identity. The inputs are the three published cash-flow lines. Example: 194.80 − 9.10 − 17.09 = **168.61** (derived).
- `Cash_t = Opening cash + Σ receipts_≤t − Σ scheduled payments_≤t − Σ expected claim payments_≤t`. This is used only with uploaded company data.

**Claim payment forecast** (`forecast.py`)

1. From historical payments, build the amount-weighted empirical distribution `F_L(d)` of days `d` from claim report to payment, per line `L`. A line needs at least 30 payments to get its own curve; otherwise all lines are pooled.
2. For an open claim `i` of age `a` with outstanding reserve `R`, the expected payment on future day `t` is `R × (F(a+t) − F(a+t−1)) / (1 − F(a))`. This is the conditional probability that a claim still unpaid at age `a` is paid on day `t`.
3. Probability of payment within horizon `H`: `p = (F(a+H) − F(a)) / (1 − F(a))`. Variance: `R² × p × (1 − p)`.
4. The 90% band is `±1.645 σ`, scaled by the share of expected outflow realised so far.

Limitations:

- The forecast assumes future settlement speed matches history. It does not model catastrophes; use the scenario page for those.
- Claims older than the longest observed delay are spread evenly across the horizon. This is conservative and is noted in the code.

**Underwriting profitability** (TFRS 17)

- `Insurance service result = Insurance revenue − Insurance service expenses + Net reinsurance result`. For NKI 2025: 3,543.22 − 5,185.61 + 971.84 = **−670.55**, which matches the published figure.
- `Expense ratio (proxy) = Insurance service expenses ÷ Insurance revenue × 100`. This gives 146.35%. It is labelled a **proxy** because under TFRS 17 the service expenses include acquisition costs and are gross of reinsurance, so it is not a pure loss ratio.
- The **combined ratio** is taken as published (118.92%); it is not recomputed because the company's exact definition is not disclosed.
- `YoY growth = (current − previous) ÷ previous × 100`.

**Scenario: expense shock**

- `Δ = Insurance service expenses × shock%`.
- `Scenario service result = base − Δ`, `Scenario CFO = base CFO − Δ`, and `Scenario equity = base equity − Δ`.

Assumptions, which are shown on screen:

- **A1:** the extra cost is paid in cash within the year.
- **A2:** the equity impact is shown before tax.
- **A3:** reinsurance recoveries stay flat.

All three are conservative. CAR is not recomputed (see §2).

**Alert thresholds** (Settings; every change is recorded in the audit log)

| Alert | Rule | Default | Why this default |
|---|---|---|---|
| Combined ratio | `combined ratio > max` → warning | 100% | Above 100%, underwriting loses money by definition |
| Liquidity ratio | `liquidity ratio < min` → warning | 1.0× | Common convention. Adjust to the company's own definition, which is not disclosed. |
| CAR | `< regulatory min` → critical; `< internal target` → warning | 140% / 140% | The regulatory minimum is from BKI-2024. The internal target is the board's decision, so it starts equal to the minimum. |
| Cash below threshold | Forecast `cash_t < threshold` → critical. Only the lower 90% band below it → early warning. | **No default** | There is no public basis for a cash floor. The company must set it, for example as N days of average outflow. |
| Lead time | Alert horizon | 7 days | User preference |

For NKI FY2025, the published-ratio rules fire two warnings:

- Combined ratio 118.92% > 100%.
- Liquidity ratio 0.74× < 1.0×.

## 6. Setup

**Requirements:** Python 3.11+, Node 20+.

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # optional: set ANTHROPIC_API_KEY for Claude answers
uvicorn app.main:app --reload --port 8000
# API docs: http://localhost:8000/docs   ·   tests: python -m pytest -q
```

```bash
# Frontend (second terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173
npm run build                   # production bundle in dist/
```

**Configuration** (`backend/.env`)

| Variable | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | empty | Empty means the offline concierge mode |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | Any current Claude model ID, for example a Haiku model for lower cost |
| `DB_PATH` | `backend/var/coldbrew.sqlite3` | SQLite file location |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated frontend URLs |

**Loading company data (optional).**

1. Go to **Settings → แหล่งข้อมูลภายในบริษัท** (internal data sources).
2. Enter the opening cash.
3. Upload CSVs that follow `backend/templates/*.csv`.
4. Set the minimum cash threshold.

The forecast, claim list and upcoming-payment panels fill in automatically.

**Deploying.**

- **GitHub Pages (live demo):** https://icemonser.github.io/cold-brewtech/ is served from the repository root of `main` (`index.html`, `404.html`, `assets/`). After changing the frontend, run `cd frontend && npm run build:pages` and commit the regenerated root files. GitHub Pages hosts static files only, so the Python backend does not run there.
- **Frontend:** deploy `frontend/dist` to Vercel or any static host. Routes are client-side (`/forecast`, `/claims`, …), so configure the host to serve `index.html` for unknown paths.
- **Backend:** deploy `backend/` to Render or similar with the start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Attach a persistent disk for SQLite, or migrate to Postgres.

**Updating public data.** Edit `backend/app/data/public_data.json`. Give every new figure a `source` ID that exists in `sources`, and a `status`. Then run the tests.

---
*Information only. This is not investment, actuarial or legal advice. Verify figures against the original filings before making decisions.*
