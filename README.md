# Transaction Reconciliation Engine - KoinX Assignment

A full-stack application designed to reconcile user-reported cryptocurrency transactions with exchange data. It handles discrepancies in timestamps, fractional quantity rounding, asset name variations, and matching deposit/withdrawal logic.

## Project Overview

- **Backend:** Node.js, Express, MongoDB (Mongoose)
- **Frontend:** React, Vite, Tailwind CSS v4

## Matching Logic

The matching engine relies on the following logic to pair transactions:
1. **Asset Matching**: Enforces case-insensitive exact matching and maps common aliases (`bitcoin` -> `btc`, `ethereum` -> `eth`).
2. **Type Mapping**: Flexibly maps transaction types. For example, `TRANSFER_IN` (exchange) securely maps to `TRANSFER_OUT` or `DEPOSIT` (user).
3. **Tolerance Checks**:
   - **Timestamp**: Absolute difference must be $\le$ `TIMESTAMP_TOLERANCE_SECONDS` (default: 300s).
   - **Quantity**: Absolute difference must be $\le$ `QUANTITY_TOLERANCE_PCT` (default: 0.01%).
4. **Classification Engine**:
   - `Matched`: Perfect 1-to-1 match within configured tolerances.
   - `Conflicting`: A candidate match was found (either by asset/type/time), but it exceeds the tolerated time or quantity difference.
   - `Unmatched_User`: User transaction has no counterpart exchange transaction.
   - `Unmatched_Exchange`: Exchange transaction has no counterpart user transaction.

## Key Technical Decisions & Assumptions

Based on the assignment's unclear or edge-case requirements, the following decisions were made:
- **Quantity Tolerance Logic:** The tolerance `0.01` is strictly treated as a percentage (`0.01%`). The engine calculates the threshold using `quantity * (0.01 / 100)`.
- **Negative Data Errors:** Some CSV rows contain negative quantities annotated as "data errors". To resolve this without data loss, the engine uses the absolute magnitude `Math.abs(Math.abs(uTx.quantity) - Math.abs(eTx.quantity))` when calculating deviations.
- **Malformed Rows (No Silently Dropping):** Rows with corrupt timestamps (e.g., `Invalid Date`) or missing `type` strings crash standard MongoDB cast operations. These rows are explicitly flagged with `isValid: false`, saved safely using `null` placeholders, and immediately exported to the final report as `Unmatched` with the exact parsing failure reason attached.
- **Concurrent Runs:** Every upload generates a unique UUID `runId`. All DB schemas (`UserTransaction`, `ExchangeTransaction`, `Report`) are indexed by `runId`. This ensures multiple users can run reconciliations concurrently without data bleeding.
- **CSV Output Export:** Since the assignment requires producing a CSV report, the `GET /report/:runId` endpoint conditionally accepts a `?format=csv` query parameter to output the raw spreadsheet directly.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally on port `27017` or configured via `MONGO_URI`)

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
*(The backend runs on `http://localhost:5000`)*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*(The frontend dashboard runs on `http://localhost:5173`)*

## API Documentation

### `POST /api/reconcile`
Trigger a reconciliation run.
- **Content-Type**: `multipart/form-data`
- **Payload**: `userTransactions` (CSV), `exchangeTransactions` (CSV), `timestampTolerance` (optional), `quantityTolerance` (optional).
- **Returns**: `{ "runId": "uuid", "message": "..." }`

### `GET /api/report/:runId`
Fetch the full reconciliation report with populated transaction details.
- **Query Params**: `status` (Matched, Conflicting, etc.), `page`, `limit`.
- **Note**: Append `?format=csv` to download the final report as a `.csv` file.

### `GET /api/report/:runId/summary`
Fetch aggregated metrics.
- **Returns**: `{ "Matched": 10, "Conflicting": 2, "Unmatched_User": 1, "Unmatched_Exchange": 3 }`

### `GET /api/report/:runId/unmatched`
Fetch only unmatched rows.
- **Returns**: Array of `Report` documents containing `userTransaction` / `exchangeTransaction` sub-documents.
