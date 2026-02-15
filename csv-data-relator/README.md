# CSV Data Relator

Full-stack TypeScript app to merge multiple CSV files by Employee ID.

## What it does

- Accepts multiple CSV files with different schemas.
- Finds Employee ID in each file and joins rows across files.
- Detects data format per cell and transforms values:
  - Numeric strings like `"50,000"` become numbers (`50000`).
  - Date values are normalized to `YYYY-MM-DD`.
- Produces a single merged CSV and downloadable output from UI.

## Project structure

- `backend`: Express + TypeScript API
- `frontend`: React + Vite + TypeScript UI

## Run locally

From project root:

```bash
npm run install:all
```

### 1) Backend

```bash
npm run dev:backend
```

Runs on `http://localhost:4000`.

### 2) Frontend

```bash
npm run dev:frontend
```

Runs on `http://localhost:5175`.

## API

### `POST /api/merge-csv`

- Form-data field: `files` (multiple `.csv` files)
- Response:
  - `headers`: merged columns
  - `rows`: merged row objects
  - `csvText`: merged CSV text for download
  - `message`: status string

## Notes on transformations

- Employee ID is detected case-insensitively from header variants like `employee id` / `employee_id` / `empid`.
- Numeric text values are converted into numbers (for example `45,000.50` -> `45000.5`).
- Date-like values are normalized to `YYYY-MM-DD` for common formats:
  - `YYYY-MM-DD`, `YYYY/MM/DD`
  - `DD-MM-YYYY`, `DD/MM/YYYY`
