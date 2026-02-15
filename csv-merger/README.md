# CSV Merger

A full-stack TypeScript application that accepts multiple CSV files, analyzes their structure, detects relationships, and merges them into a single clean output file.

## Features

- **Multi-file upload** with drag-and-drop support
- **Automatic column detection** — finds common keys (e.g., employee_id) across files
- **Smart type inference** — detects numbers, dates, booleans, and strings
- **Data transformation** — converts string-encoded numbers to actual numbers, normalizes dates
- **Merge & join** — combines all files on the common key with a full outer join
- **Clean preview** — shows the merged data in a sortable table
- **CSV download** — export the merged result as a clean CSV file
- **Step-by-step UI** — upload → analyze → result workflow

## Tech Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React + TypeScript + Vite     |
| Backend  | Express + TypeScript          |
| CSV      | PapaParse                     |
| Icons    | Lucide React                  |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Install & Run

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in a separate terminal)
cd frontend
npm install
npm run dev
```

- Backend runs on `http://localhost:3001`
- Frontend runs on `http://localhost:5173`

## Example

Upload these two CSV files:

**employees.csv**
```
Employee ID,Employee Name,Date of Birth,Date of Joining
E001,John Doe,1990-05-15,2020-01-10
E002,Jane Smith,1985-11-22,2019-06-01
E003,Bob Wilson,1992-03-08,2021-09-15
```

**salaries.csv**
```
Employee ID,Salary Amount,Department
E001,"75000",Engineering
E002,"82000",Marketing
E003,"68000",Engineering
```

**Merged output:**
```
Employee ID,Employee Name,Date of Birth,Date of Joining,Salary Amount,Department
E001,John Doe,1990-05-15,2020-01-10,75000,Engineering
E002,Jane Smith,1985-11-22,2019-06-01,82000,Marketing
E003,Bob Wilson,1992-03-08,2021-09-15,68000,Engineering
```

Notice that `Salary Amount` (originally a string `"75000"`) is automatically converted to the number `75000`.
