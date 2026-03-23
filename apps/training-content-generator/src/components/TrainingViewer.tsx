import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Target,
  BookOpen,
  Lightbulb,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  Share2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { TrainingModule, AssessmentQuestion } from "../types";
import { exportToPPT } from "../utils/pptExport";
import { fetchTopicImages } from "../api/client";
import { ShareModal } from "./ShareModal";

interface TrainingViewerProps {
  modules: TrainingModule[];
}

export function TrainingViewer({ modules }: TrainingViewerProps) {
  const [activeModule, setActiveModule] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const module = modules[activeModule]!;

  const handleDownloadPPT = async () => {
    setIsExporting(true);
    try {
      const uniqueQueries = [...new Set(modules.map((mod) => mod.topic))];
      const topicImages = await fetchTopicImages(uniqueQueries);
      await exportToPPT(modules, topicImages);
    } catch (err) {
      console.error("PPT export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-200">
            Training Materials
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {modules.length} module{modules.length !== 1 ? "s" : ""} generated
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-sm hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Share2 className="w-4 h-4" />
            Share Assessment
          </button>
          <button
            onClick={handleDownloadPPT}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium text-sm hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isExporting ? "Generating..." : "Download PPT"}
          </button>
        </div>
      </div>

      {showShareModal && (
        <ShareModal modules={modules} onClose={() => setShowShareModal(false)} />
      )}

      {modules.length > 1 && (
        <ModuleNav
          modules={modules}
          activeIndex={activeModule}
          onChange={setActiveModule}
        />
      )}

      <div className="glass-card p-8 space-y-8">
        <div className="border-b border-white/10 pb-6">
          <div className="flex items-center gap-2 text-sm text-violet-400 mb-2">
            <Clock className="w-4 h-4" />
            <span>{module.estimatedDuration}</span>
          </div>
          <h2 className="text-2xl font-bold gradient-text">{module.topic}</h2>
          <p className="text-slate-300 mt-3 text-lg leading-relaxed">
            {module.overview}
          </p>
        </div>

        <ObjectivesSection objectives={module.learningObjectives} />

        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Training Material
          </h3>
          {module.content.map((section, i) => (
            <ContentSection key={i} section={section} index={i} />
          ))}
        </div>

        <TakeawaysSection takeaways={module.keyTakeaways} />

        <AssessmentSection questions={module.assessmentQuestions} />
      </div>
    </div>
  );
}

function ModuleNav({
  modules,
  activeIndex,
  onChange,
}: {
  modules: TrainingModule[];
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, activeIndex - 1))}
          disabled={activeIndex === 0}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 flex gap-2 overflow-x-auto py-1 scrollbar-none">
          {modules.map((m, i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                i === activeIndex
                  ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg"
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {m.topic}
            </button>
          ))}
        </div>

        <button
          onClick={() =>
            onChange(Math.min(modules.length - 1, activeIndex + 1))
          }
          disabled={activeIndex === modules.length - 1}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function ObjectivesSection({ objectives }: { objectives: string[] }) {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-emerald-400" />
        Learning Objectives
      </h3>
      <ul className="space-y-3">
        {objectives.map((obj, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
              {i + 1}
            </span>
            <span className="text-slate-300">{obj}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContentSection({
  section,
  index,
}: {
  section: { title: string; body: string };
  index: number;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="glass rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
            {index + 1}
          </span>
          <h4 className="font-semibold text-slate-200">{section.title}</h4>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="px-5 pb-5 prose prose-invert prose-sm max-w-none prose-p:text-slate-300 prose-strong:text-slate-100 prose-li:text-slate-300 prose-headings:text-slate-200">
          <ReactMarkdown>{section.body}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function TakeawaysSection({ takeaways }: { takeaways: string[] }) {
  return (
    <div className="glass rounded-xl p-6 border-l-4 border-amber-400/50">
      <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-amber-400" />
        Key Takeaways
      </h3>
      <ul className="space-y-2">
        {takeaways.map((takeaway, i) => (
          <li key={i} className="flex items-start gap-2 text-slate-300">
            <span className="text-amber-400 mt-1">•</span>
            {takeaway}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssessmentSection({
  questions,
}: {
  questions: AssessmentQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const selectAnswer = (qIndex: number, optionIndex: number) => {
    if (showResults) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  };

  const checkAnswers = () => setShowResults(true);

  const resetQuiz = () => {
    setAnswers({});
    setShowResults(false);
  };

  const score = questions.reduce(
    (acc, q, i) => (answers[i] === q.correctAnswer ? acc + 1 : acc),
    0
  );

  const allAnswered = Object.keys(answers).length === questions.length;

  return (
    <div className="glass rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-6">
        <ClipboardCheck className="w-5 h-5 text-cyan-400" />
        Knowledge Check
      </h3>

      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="space-y-3">
            <p className="font-medium text-slate-200">
              {qIndex + 1}. {q.question}
            </p>
            <div className="space-y-2 pl-4">
              {q.options.map((option, oIndex) => {
                const isSelected = answers[qIndex] === oIndex;
                const isCorrect = q.correctAnswer === oIndex;
                let optionStyle =
                  "bg-white/5 border-white/10 hover:bg-white/10";

                if (showResults) {
                  if (isCorrect)
                    optionStyle =
                      "bg-emerald-500/15 border-emerald-400/40 text-emerald-300";
                  else if (isSelected && !isCorrect)
                    optionStyle =
                      "bg-red-500/15 border-red-400/40 text-red-300";
                } else if (isSelected) {
                  optionStyle = "bg-blue-500/15 border-blue-400/40";
                }

                return (
                  <button
                    key={oIndex}
                    onClick={() => selectAnswer(qIndex, oIndex)}
                    disabled={showResults}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border transition-all flex items-center gap-3 ${optionStyle}`}
                  >
                    {showResults && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    )}
                    {showResults && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                    )}
                    {!showResults && (
                      <span
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                          isSelected
                            ? "border-blue-400 bg-blue-400"
                            : "border-slate-500"
                        }`}
                      />
                    )}
                    <span className="text-sm">{option}</span>
                  </button>
                );
              })}
            </div>
            {showResults && answers[qIndex] !== undefined && (
              <p className="text-sm text-slate-400 pl-4 italic">
                {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4">
        {!showResults ? (
          <button
            onClick={checkAnswers}
            disabled={!allAnswered}
            className="px-6 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-400 hover:bg-cyan-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-medium"
          >
            Check Answers
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5">
              <span className="font-semibold text-slate-200">Score:</span>
              <span
                className={`font-bold ${score === questions.length ? "text-emerald-400" : score >= questions.length / 2 ? "text-amber-400" : "text-red-400"}`}
              >
                {score}/{questions.length}
              </span>
            </div>
            <button
              onClick={resetQuiz}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-sm font-medium"
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}
