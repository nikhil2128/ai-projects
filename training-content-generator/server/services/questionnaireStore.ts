import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db.js";

interface AssessmentQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface StoredQuestionnaire {
  id: string;
  title: string;
  createdAt: string;
  sessionId: string | null;
  modules: {
    topic: string;
    questions: AssessmentQuestion[];
  }[];
}

export interface StoredResponse {
  id: string;
  questionnaireId: string;
  employeeEmail: string;
  submittedAt: string;
  answers: Record<string, number>;
  score: number;
  totalQuestions: number;
}

interface QuestionnaireRow {
  id: string;
  session_id: string | null;
  title: string;
  modules: string;
  created_at: string;
}

interface ResponseRow {
  id: string;
  questionnaire_id: string;
  employee_email: string;
  answers: string;
  score: number;
  total_questions: number;
  submitted_at: string;
}

function rowToQuestionnaire(row: QuestionnaireRow): StoredQuestionnaire {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    sessionId: row.session_id,
    modules: JSON.parse(row.modules),
  };
}

function rowToResponse(row: ResponseRow): StoredResponse {
  return {
    id: row.id,
    questionnaireId: row.questionnaire_id,
    employeeEmail: row.employee_email,
    submittedAt: row.submitted_at,
    answers: JSON.parse(row.answers),
    score: row.score,
    totalQuestions: row.total_questions,
  };
}

export function createQuestionnaire(
  title: string,
  modules: { topic: string; questions: AssessmentQuestion[] }[],
  sessionId?: string
): StoredQuestionnaire {
  const db = getDb();
  const id = uuidv4();

  db.prepare(
    `INSERT INTO questionnaires (id, session_id, title, modules) VALUES (?, ?, ?, ?)`
  ).run(id, sessionId ?? null, title, JSON.stringify(modules));

  const row = db
    .prepare(`SELECT * FROM questionnaires WHERE id = ?`)
    .get(id) as QuestionnaireRow;

  return rowToQuestionnaire(row);
}

export function getQuestionnaire(id: string): StoredQuestionnaire | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM questionnaires WHERE id = ?`)
    .get(id) as QuestionnaireRow | undefined;

  return row ? rowToQuestionnaire(row) : null;
}

export function getAllQuestionnaires(): StoredQuestionnaire[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM questionnaires ORDER BY created_at DESC`)
    .all() as QuestionnaireRow[];

  return rows.map(rowToQuestionnaire);
}

export function submitResponse(
  questionnaireId: string,
  employeeEmail: string,
  answers: Record<string, number>
): StoredResponse {
  const questionnaire = getQuestionnaire(questionnaireId);
  if (!questionnaire) throw new Error("Questionnaire not found");

  const allQuestions = questionnaire.modules.flatMap((m) => m.questions);
  const totalQuestions = allQuestions.length;
  let score = 0;

  allQuestions.forEach((q, i) => {
    if (answers[String(i)] === q.correctAnswer) score++;
  });

  const db = getDb();
  const id = uuidv4();

  db.prepare(
    `INSERT INTO questionnaire_responses (id, questionnaire_id, employee_email, answers, score, total_questions) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, questionnaireId, employeeEmail, JSON.stringify(answers), score, totalQuestions);

  const row = db
    .prepare(`SELECT * FROM questionnaire_responses WHERE id = ?`)
    .get(id) as ResponseRow;

  return rowToResponse(row);
}

export function getResponses(questionnaireId: string): StoredResponse[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM questionnaire_responses WHERE questionnaire_id = ? ORDER BY submitted_at DESC`
    )
    .all(questionnaireId) as ResponseRow[];

  return rows.map(rowToResponse);
}
