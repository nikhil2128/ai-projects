
# Buggy Task System (Intentional)

This project intentionally contains a **complex concurrency bug**.

## Run
npm install
npm run dev

## Reproduce Bug
1. POST /tasks { "title": "Test" }
2. Fire concurrent POST /tasks/:id/reassign { "userId": "A" | "B" }
3. Observe inconsistent assignedTo values
