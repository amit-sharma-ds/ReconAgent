# ReconAgent

> **Razorpay AI Buildathon 2026 · Track 04 — AI Finance Controller**

ReconAgent is an explainable reconciliation controller for a Razorpay merchant. It compares Razorpay orders/settlements with a merchant ledger, auto-resolves only safe exact matches, and routes ambiguous items to a human-review queue with a clear audit trail.

## The problem

Finance teams often reconcile settlement records and ledger entries manually. That is slow, error-prone, and makes it easy to either miss money gaps or force an incorrect match.

ReconAgent closes one finance-ops loop:

```text
Razorpay orders / settlements
          +
Merchant ledger
          ↓
Matching engine → exact resolution or human-review exception
          ↓
Explainable audit trail + batch metrics
```

## What it does

- Reconciles a 50-record batch of Razorpay records against ledger entries.
- Uses exact receipt, amount, and date matching for safe auto-resolution.
- Detects fee/amount differences, settlement-date offsets, and missing ledger entries.
- Assigns a confidence score and an explanation to every record.
- Keeps low-confidence or unmatched records visible for review; it never forces a match.
- Shows batch throughput, exact-match rate, exception count, and a match-quality radar chart.
- Includes a demo AI Copilot that explains a reconciliation decision and the safety policy.

## Demo mode vs Razorpay Test API mode

| Mode | Data source | Intended use |
| --- | --- | --- |
| Demo mode | Labelled synthetic batch of 50 settlements and a synthetic merchant ledger | Pitch/demo preview without exposing merchant data |
| Razorpay Test API mode | Orders fetched server-side from the configured Razorpay Test API credentials | Verify the Razorpay integration with real test objects |

The merchant-ledger side remains simulated until a merchant ledger CSV or a ledger API is connected. This is deliberate: a reconciliation result is only financially meaningful when both sources are available.

## Accuracy and guardrails

The displayed demo metrics describe the synthetic labelled batch; they are not a claim of production accuracy.

To validate the system on real data:

1. Prepare a labelled ledger batch with expected outcomes: `exact`, `fee mismatch`, `date mismatch`, or `missing`.
2. Run ReconAgent against the same Razorpay settlement batch.
3. Compare output against the labels and report precision, recall, false-match count, and unresolved exceptions.
4. Keep only high-confidence exact matches eligible for automatic resolution.

The controller does **not** modify a ledger, create a payment, issue a refund, or trigger any other money movement.

## Tech stack

- Next.js 15 / React 19 / TypeScript
- Recharts for dashboard visualizations
- Razorpay Orders API (Test Mode)
- A rule-based, explainable reconciliation engine

## Project structure

```text
app/
  api/reconcile/route.ts   # Demo and Razorpay Test API reconciliation endpoint
  dashboard/page.tsx       # Full interactive dashboard
  page.tsx                 # Product landing page
lib/
  reconcile.ts             # Matching rules, confidence, explanations, audit events
  demo-data.ts             # Labelled synthetic batch and demo ledger
  razorpay.ts              # Server-side Razorpay Test API order loader
scripts/
  seed-razorpay.ts         # Optional Test Mode order seeding utility
public/index.html          # Standalone shareable interactive demo preview
```

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The root route is the product landing page. The full dashboard is at [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

## Configure Razorpay Test Mode

Create `.env.local` in the project root:

```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_secret
```

Never commit `.env.local` or expose these values in a browser/client component.

The dashboard calls:

```text
/api/reconcile?source=demo
/api/reconcile?source=razorpay
```

The Razorpay route fetches orders on the server, so credentials remain private.

### Optional: create a test batch

```bash
npm run razorpay:seed
```

This creates 50 labelled **Razorpay Test Mode** orders and saves fetched rows to `data/settlements.json`. Test Mode only should be used for this command. If Razorpay rate-limits the bulk request, wait before retrying rather than repeatedly submitting the request.

## Merchant ledger input

For the hackathon demo, the ledger is generated in `lib/demo-data.ts`. A production-ready next step is a CSV upload or ledger API connector with this minimal schema:

```csv
id,receipt,amount,date,note
led_001,recon-demo-001,6379,2026-09-01,Merchant ledger entry
```

- `amount` is stored in paise, matching Razorpay's API convention.
- `date` uses `YYYY-MM-DD`.
- `receipt` is the primary reconciliation reference.

## Matching rules

1. **Exact** — receipt, amount, and date all match. Automatically resolved at 100% confidence.
2. **Fuzzy** — a candidate is within an amount tolerance and a one-day date window. It is explained and routed to review.
3. **Unmatched** — no safe candidate exists. It remains in the exception queue.

## Buildathon demo flow

1. Open the shareable preview and choose **Demo mode**.
2. Show the 50-record batch metrics and the radar chart.
3. Open the audit queue and contrast an exact match, a fee/date mismatch, and a missing entry.
4. Ask the Demo AI Copilot why `recon-demo-007` was escalated.
5. Explain the guardrail: ReconAgent surfaces evidence; a finance user owns the final action.
6. Optionally switch to Razorpay Test API mode to demonstrate the real server-side integration.

## Roadmap

- Merchant ledger CSV upload and schema validation
- Persistent reconciliation runs and audit history
- Ground-truth evaluation report (precision, recall, false-match cost)
- Role-based review/approval workflow
- Cash-flow forecast and settlement Q&A

## Security notes

- Use Razorpay Test Mode keys during development and demos.
- Keep API credentials only in server environment variables.
- Treat reconciliation as a decision-support workflow, not an autonomous payment executor.
- Require a human approval before any production bookkeeping change.
