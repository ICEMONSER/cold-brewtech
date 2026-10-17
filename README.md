# Cold BrewTech — AI Insurance Cash Flow Concierge

**Live:** https://icemonser.github.io/cold-brewtech/

An AI concierge for Thai non-life insurers. It connects claims data to proactive cash-flow forecasting and smarter financial decisions.

Concept: ExpresSO NB Co., Ltd. (Isaree Wongariyaporn, Ramida Khampao).

The website is a complete working app. It is not a mock-up: every number is calculated from data, and every button works. There is no server. All calculation runs in the visitor's browser, and data never leaves the browser.

- **Data:** the app ships with sample data (ข้อมูลสมมติ) for a fictional "บริษัทประกัน A". You can replace each of the five sources with your own CSV.
- **Hosting:** the site is static, so GitHub Pages is enough to run it.

## How the concept maps to the app

| Concept (deck) | What the app does | Where |
|---|---|---|
| **Connect**: Policy + Claims + Actuarial + Payment + Accounting/Bank | Upload one CSV per system, with validation and cross-checks between systems. Download templates or the current data. Switch back to sample data at any time. | ตั้งค่า → แหล่งข้อมูล |
| **Remember**: past claims, payment patterns, seasons | Learns how long each line of business takes from claim report to payment, using paid history. Finds seasonal peaks (for example, flood months for property). Keeps the conversation, saved scenarios and the change log. | Forecast engine, AI Concierge |
| **Understand / Retrieve** | The AI Concierge pulls only the facts needed to answer a question and names the source systems it used. | ภาพรวม → AI Concierge |
| **Reason** | Daily cash forecast for 30/60/90 days with a 90% band. Explains what drives the low point. Scenario "what if claims +X% / receipts late N days". Comparison with the last 30 days and the same period last year. | พยากรณ์เงินสด, จำลองสถานการณ์ |
| **Act** | Alerts when cash is forecast below the minimum reserve. Mitigation actions you can try inside a scenario: credit line, selling investments, deferring payments, collecting premiums faster. Excel/PDF/CSV reports, scheduled reports and an email hand-off. | Every page, รายงาน, ตั้งค่า |

## Funding when underwriting makes a loss

When the underwriting result for the last 30 days is negative, a funding window opens automatically, once per session. You can also open it from the "จัดหาเงินทุน" button on the alert.

1. **Amount needed:** the liquidity gap below the minimum reserve, rounded up to ฿1M. If there is no gap, the amount is the underwriting loss.
2. **If the overdraft (O/D) has enough room left:** the AI recommends drawing on the O/D the day before cash falls below the threshold.
3. **If it doesn't:** the AI compares short-term loan offers by total cost = amount × rate × days/365 + fee. It checks each bank's maximum facility and ranks the options with the cheapest first. You pick one and confirm.
4. **After you confirm:** the loan is added to the forecast: drawdown on the borrowing day, repayment of principal plus interest at the end of the term. It is also listed under ตั้งค่า → บริษัท, where it can be cancelled.

The O/D limit, amount used, interest rates and bank offers can all be edited under ตั้งค่า → บริษัท. The default rates are sample values; replace them with the offers you actually receive.

## The forecast

- **Day 1:** today's bank balance, the latest `balance` row in the ledger.
- **Each later day:** add expected receipts, subtract claim payments and other expected payments.
  - **Expected receipts** are ledger rows with `status=expected`: premium collections, reinsurance recoveries and other receipts.
  - **Claim payments with a schedule** come from the Payment System and are counted on their due date.
  - **Open claims without a schedule** are counted statistically: `reserve × P(paid on that day | still unpaid today)`. `P` comes from the amount-weighted distribution of "report → payment" days in the paid history of that line. A line with fewer than 30 payments uses the pooled distribution.
- **90% band:** ±1.645σ, where `σ² = Σ R²·p(1−p)` over unscheduled claims.
- **Underwriting**, over the last 30 days:
  - Earned premium is taken pro-rata from policies.
  - Incurred claims are paid amounts plus reserves, for losses that occurred in the window.
  - Combined ratio = (incurred + expenses) ÷ earned.

The code is in `frontend/src/engine/`: `forecast.ts`, `analytics.ts`, `concierge.ts`, `reports.ts`, `csv.ts` and `sample.ts`.

## AI Concierge

By default it answers in Thai with deterministic reasoning over the data, so it needs no API key.

| Question type | Example |
|---|---|
| How much cash to prepare | "เดือนนี้ต้องเตรียมเงินเพิ่มเท่าไร?" |
| Liquidity options | "มีวิธีเพิ่มสภาพคล่องอะไรบ้าง?" |
| Deferring payments | "ถ้าเลื่อนจ่ายเคลมบางรายการได้หรือไม่?" |
| Main risk | "ความเสี่ยงหลักคืออะไร?" |
| What-if | "ถ้าเคลมเพิ่ม 15%" |
| Largest claims | "เคลมใหญ่ที่สุด" |
| Comparison with the past | "เทียบกับปีที่แล้ว" |
| Underwriting result | "ผลรับประกันเป็นอย่างไร?" |
| Breakdown by line | "แยกตามประเภท" |
| Report | "สรุปรายงาน" |

Every answer shows its sources and the Retrieve → Reason steps, plus Act buttons: open a scenario, create a report, or open a page.

To have answers phrased by Claude, open ตั้งค่า → บริษัท and enter your own Anthropic API key. The key is stored only in your browser. Only the question and the computed summary figures are sent to `api.anthropic.com`. Raw data files are not sent.

## Data files (CSV)

| File | System | Columns |
|---|---|---|
| policies.csv | Policy System | policy_id, line, start_date, end_date, premium, sum_insured |
| claims.csv | Claims Management System | claim_id, policy_id, line, loss_date, reported_date, status, claimed_amount |
| reserves.csv | Actuarial System | claim_id, reserve_amount, valuation_date |
| payments.csv | Payment System | claim_id, payment_date, amount, status (`paid` / `scheduled`) |
| ledger.csv | Accounting / Bank | date, type, amount, status (`actual` / `expected`), description |

Format rules:

- Dates are `YYYY-MM-DD`. `dd/mm/yyyy` and Buddhist-era years are also accepted.
- `line` can be `motor`, `health` or `property`, or the Thai names.
- `ledger.type` is one of `balance`, `premium_receipt`, `reinsurance_recovery`, `other_receipt`, `expense`, `other_payment`.

Templates can be downloaded from ตั้งค่า → แหล่งข้อมูล.

## Limits of the static version

- **Scheduled reports:** no server sends email on a timer. A scheduled report is prepared the next time someone opens the site after the scheduled time. "ส่งตอนนี้" downloads the Excel file and opens your mail app with a summary.
- **Users and roles:** they are stored per browser and there is no login. A multi-user deployment needs a backend with authentication and a shared database.
- **Saved data:** uploaded data, settings and reports are kept in the browser's local storage. Use ตั้งค่า → บริษัท → "ล้างข้อมูลทั้งหมด" to reset.

## Run locally

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
npm run build:pages    # rebuild the GitHub Pages site (index.html, 404.html, assets/ at the repo root), then commit
```

Stack: React 18, TypeScript and Vite 5. Charts are hand-written SVG. Excel export uses SheetJS. Fonts are self-hosted (Noto Sans Thai, Inter, Crimson Pro).

The earlier FastAPI prototype is kept in `backend/` (see `backend/README.md`). The website does not use it.
