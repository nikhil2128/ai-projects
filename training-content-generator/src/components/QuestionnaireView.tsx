import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Mail,
  Send,
  PartyPopper,
} from "lucide-react";
import { fetchQuestionnaire, submitQuestionnaireResponse } from "../api/client";
import type { Questionnaire } from "../types";

export function QuestionnaireView() {
  const { id } = useParams<{ id: string }>();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchQuestionnaire(id)
      .then(setQuestionnaire)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const allQuestions = questionnaire?.modules.flatMap((m) => m.questions) ?? [];
  const totalQuestions = allQuestions.length;
  const allAnswered = Object.keys(answers).length === totalQuestions;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const selectAnswer = (qIndex: number, optionIndex: number) => {
    if (showResults) return;
    setAnswers((prev) => ({ ...prev, [String(qIndex)]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!id || !isValidEmail || !allAnswered) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await submitQuestionnaireResponse(id, email, answers);
      setResult({ score: response.score, total: response.totalQuestions });
      setShowResults(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading assessment...</span>
        </div>
      </div>
    );
  }

  if (error && !questionnaire) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-200">Assessment Not Found</h2>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!questionnaire) return null;

  let globalIndex = 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">Training Assessment</h1>
            <p className="text-xs text-slate-400">{questionnaire.title}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        {result ? (
          <SubmissionResult score={result.score} total={result.total} questionnaire={questionnaire} allQuestions={allQuestions} answers={answers} />
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card p-6 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-violet-400" />
                  Your Email Address
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-400/50 focus:ring-1 focus:ring-violet-400/30 transition-all"
                />
              </label>
              {email && !isValidEmail && (
                <p className="text-sm text-amber-400">Please enter a valid email address</p>
              )}
            </div>

            <div className="text-sm text-slate-400 flex items-center justify-between">
              <span>{totalQuestions} question{totalQuestions !== 1 ? "s" : ""} total</span>
              <span>{Object.keys(answers).length} / {totalQuestions} answered</span>
            </div>

            {questionnaire.modules.map((mod) => {
              const moduleStartIndex = globalIndex;
              const section = (
                <div key={mod.topic} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <h3 className="text-sm font-semibold text-violet-400 uppercase tracking-wider">
                      {mod.topic}
                    </h3>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  {mod.questions.map((q, qIdx) => {
                    const absIndex = moduleStartIndex + qIdx;
                    return (
                      <QuestionCard
                        key={absIndex}
                        question={q}
                        index={absIndex}
                        selectedAnswer={answers[String(absIndex)]}
                        onSelect={(optionIndex) => selectAnswer(absIndex, optionIndex)}
                        showResults={false}
                      />
                    );
                  })}
                </div>
              );
              globalIndex += mod.questions.length;
              return section;
            })}

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-400/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!allAnswered || !isValidEmail || submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-lg hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {submitting ? "Submitting..." : "Submit Assessment"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  selectedAnswer,
  onSelect,
  showResults,
}: {
  question: { question: string; options: string[]; correctAnswer: number; explanation: string };
  index: number;
  selectedAnswer?: number;
  onSelect: (optionIndex: number) => void;
  showResults: boolean;
}) {
  return (
    <div className="glass-card p-5 space-y-3">
      <p className="font-medium text-slate-200">
        {index + 1}. {question.question}
      </p>
      <div className="space-y-2">
        {question.options.map((option, oIdx) => {
          const isSelected = selectedAnswer === oIdx;
          const isCorrect = question.correctAnswer === oIdx;
          let style = "bg-white/5 border-white/10 hover:bg-white/10";

          if (showResults) {
            if (isCorrect) style = "bg-emerald-500/15 border-emerald-400/40 text-emerald-300";
            else if (isSelected && !isCorrect) style = "bg-red-500/15 border-red-400/40 text-red-300";
          } else if (isSelected) {
            style = "bg-blue-500/15 border-blue-400/40";
          }

          return (
            <button
              key={oIdx}
              onClick={() => onSelect(oIdx)}
              disabled={showResults}
              className={`w-full text-left px-4 py-2.5 rounded-xl border transition-all flex items-center gap-3 ${style}`}
            >
              {showResults && isCorrect && (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              )}
              {showResults && isSelected && !isCorrect && (
                <XCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              )}
              {!showResults && (
                <span
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                    isSelected ? "border-blue-400 bg-blue-400" : "border-slate-500"
                  }`}
                />
              )}
              <span className="text-sm">{option}</span>
            </button>
          );
        })}
      </div>
      {showResults && selectedAnswer !== undefined && (
        <p className="text-sm text-slate-400 italic">{question.explanation}</p>
      )}
    </div>
  );
}

function SubmissionResult({
  score,
  total,
  questionnaire,
  answers,
}: {
  score: number;
  total: number;
  questionnaire: Questionnaire;
  allQuestions: { question: string; options: string[]; correctAnswer: number; explanation: string }[];
  answers: Record<string, number>;
}) {
  const percentage = Math.round((score / total) * 100);
  const passed = percentage >= 70;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card p-8 text-center space-y-4">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${passed ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
          {passed ? (
            <PartyPopper className="w-10 h-10 text-emerald-400" />
          ) : (
            <AlertCircle className="w-10 h-10 text-amber-400" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-slate-200">
          {passed ? "Great Job!" : "Keep Learning!"}
        </h2>
        <div className="flex items-center justify-center gap-4">
          <div className="px-6 py-3 rounded-xl bg-white/5">
            <p className="text-3xl font-bold gradient-text">{score}/{total}</p>
            <p className="text-xs text-slate-400 mt-1">Correct Answers</p>
          </div>
          <div className="px-6 py-3 rounded-xl bg-white/5">
            <p className={`text-3xl font-bold ${passed ? "text-emerald-400" : "text-amber-400"}`}>{percentage}%</p>
            <p className="text-xs text-slate-400 mt-1">Score</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm">
          Your responses have been recorded. Thank you for completing this assessment.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-200">Review Your Answers</h3>
        {(() => {
          let qi = 0;
          return questionnaire.modules.map((mod) => {
            const startIdx = qi;
            const cards = mod.questions.map((q, qIdx) => {
              const absIndex = startIdx + qIdx;
              return (
                <QuestionCard
                  key={absIndex}
                  question={q}
                  index={absIndex}
                  selectedAnswer={answers[String(absIndex)]}
                  onSelect={() => {}}
                  showResults={true}
                />
              );
            });
            qi += mod.questions.length;
            return (
              <div key={mod.topic} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <h4 className="text-sm font-semibold text-violet-400 uppercase tracking-wider">{mod.topic}</h4>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                {cards}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
