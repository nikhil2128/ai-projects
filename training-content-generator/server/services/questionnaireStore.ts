import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

interface AssessmentQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface StoredQuestionnaire {
  id: string;
  title: string;
  createdAt: string;
  modules: {
    topic: string;
    questions: AssessmentQuestion[];
  }[];
}

interface StoredResponse {
  id: string;
  questionnaireId: string;
  employeeEmail: string;
  submittedAt: string;
  answers: Record<string, number>;
  score: number;
  totalQuestions: number;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const QUESTIONNAIRES_FILE = path.join(DATA_DIR, "questionnaires.json");
const RESPONSES_FILE = path.join(DATA_DIR, "responses.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filePath: string, fallback: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function writeJSON<T>(filePath: string, data: T) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function createQuestionnaire(
  title: string,
  modules: { topic: string; questions: AssessmentQuestion[] }[]
): StoredQuestionnaire {
  const questionnaires = readJSON<StoredQuestionnaire[]>(QUESTIONNAIRES_FILE, []);
  const questionnaire: StoredQuestionnaire = {
    id: uuidv4(),
    title,
    createdAt: new Date().toISOString(),
    modules,
  };
  questionnaires.push(questionnaire);
  writeJSON(QUESTIONNAIRES_FILE, questionnaires);
  return questionnaire;
}

export function getQuestionnaire(id: string): StoredQuestionnaire | null {
  const questionnaires = readJSON<StoredQuestionnaire[]>(QUESTIONNAIRES_FILE, []);
  return questionnaires.find((q) => q.id === id) ?? null;
}

export function getAllQuestionnaires(): StoredQuestionnaire[] {
  return readJSON<StoredQuestionnaire[]>(QUESTIONNAIRES_FILE, []);
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

  const responses = readJSON<StoredResponse[]>(RESPONSES_FILE, []);
  const response: StoredResponse = {
    id: uuidv4(),
    questionnaireId,
    employeeEmail,
    submittedAt: new Date().toISOString(),
    answers,
    score,
    totalQuestions,
  };
  responses.push(response);
  writeJSON(RESPONSES_FILE, responses);
  return response;
}

export function getResponses(questionnaireId: string): StoredResponse[] {
  const responses = readJSON<StoredResponse[]>(RESPONSES_FILE, []);
  return responses.filter((r) => r.questionnaireId === questionnaireId);
}
