import { useState } from "react";
import {
  X,
  Mail,
  Plus,
  Trash2,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ClipboardCheck,
} from "lucide-react";
import type { TrainingModule } from "../types";
import { createQuestionnaire, shareQuestionnaire } from "../api/client";

interface ShareModalProps {
  modules: TrainingModule[];
  onClose: () => void;
}

type Step = "emails" | "sending" | "done";

export function ShareModal({ modules, onClose }: ShareModalProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [step, setStep] = useState<Step>("emails");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: string[]; failed: string[]; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const addEmail = () => setEmails((prev) => [...prev, ""]);

  const removeEmail = (index: number) =>
    setEmails((prev) => prev.filter((_, i) => i !== index));

  const updateEmail = (index: number, value: string) =>
    setEmails((prev) => prev.map((e, i) => (i === index ? value : e)));

  const parseBulkEmails = () => {
    const parsed = bulkInput
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);
    if (parsed.length > 0) {
      setEmails(parsed);
      setShowBulk(false);
      setBulkInput("");
    }
  };

  const validEmails = emails.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const handleShare = async () => {
    if (validEmails.length === 0) return;
    setStep("sending");
    setError(null);

    try {
      const title = modules.map((m) => m.topic).join(", ");
      const questionnaire = await createQuestionnaire(title, modules);
      const link = `${window.location.origin}/questionnaire/${questionnaire.id}`;
      const shareResult = await shareQuestionnaire(questionnaire.id, validEmails);
      setResult({ ...shareResult, link });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share");
      setStep("emails");
    }
  };

  const copyLink = async () => {
    if (!result?.link) return;
    await navigator.clipboard.writeText(result.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 glass border-b border-white/10 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20">
              <Send className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-200">Share Assessment</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          {step === "emails" && (
            <div className="space-y-5">
              <p className="text-sm text-slate-400">
                Enter employee email addresses to share the training assessment.
                A questionnaire will be generated and emailed to each employee.
              </p>

              <div className="glass rounded-xl p-4 space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  Modules included
                </p>
                <div className="flex flex-wrap gap-2">
                  {modules.map((m, i) => (
                    <span key={i} className="px-3 py-1 rounded-lg bg-violet-500/15 text-violet-300 text-xs font-medium">
                      {m.topic}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  {modules.reduce((sum, m) => sum + m.assessmentQuestions.length, 0)} questions total
                </p>
              </div>

              {!showBulk ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-400" />
                      Employee Emails
                    </label>
                    <button
                      onClick={() => setShowBulk(true)}
                      className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Paste multiple
                    </button>
                  </div>

                  {emails.map((email, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmail(i, e.target.value)}
                        placeholder="employee@company.com"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-400/50 focus:ring-1 focus:ring-violet-400/30 transition-all text-sm"
                      />
                      {emails.length > 1 && (
                        <button
                          onClick={() => removeEmail(i)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={addEmail}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors px-2 py-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add another email
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">
                    Paste emails (comma, semicolon, or newline separated)
                  </label>
                  <textarea
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder={"john@company.com\njane@company.com\nbob@company.com"}
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-400/50 focus:ring-1 focus:ring-violet-400/30 transition-all text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={parseBulkEmails}
                      className="px-4 py-2 rounded-lg bg-violet-500/20 text-violet-300 text-sm font-medium hover:bg-violet-500/30 transition-colors"
                    >
                      Parse Emails
                    </button>
                    <button
                      onClick={() => { setShowBulk(false); setBulkInput(""); }}
                      className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 text-sm hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-400/30 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-slate-500">
                  {validEmails.length} valid email{validEmails.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={handleShare}
                  disabled={validEmails.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium text-sm hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  Share Assessment
                </button>
              </div>
            </div>
          )}

          {step === "sending" && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-violet-400 mx-auto" />
              <p className="text-slate-300 font-medium">Creating and sharing assessment...</p>
              <p className="text-sm text-slate-500">Sending to {validEmails.length} employee{validEmails.length !== 1 ? "s" : ""}</p>
            </div>
          )}

          {step === "done" && result && (
            <div className="space-y-5">
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-xl font-semibold text-slate-200">Assessment Shared!</h3>
              </div>

              <div className="glass rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-slate-300">Questionnaire Link</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={result.link}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs truncate"
                  />
                  <button
                    onClick={copyLink}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                    title="Copy link"
                  >
                    {copied ? (
                      <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                    title="Open link"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                </div>
              </div>

              {result.sent.length > 0 && (
                <div className="glass rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Sent ({result.sent.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.sent.map((e) => (
                      <span key={e} className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.failed.length > 0 && (
                <div className="glass rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Failed ({result.failed.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.failed.map((e) => (
                      <span key={e} className="px-2 py-1 rounded-lg bg-red-500/10 text-red-300 text-xs">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <a
                  href={`/responses/${result.link.split("/").pop()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Responses
                </a>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-white/10 text-slate-300 text-sm font-medium hover:bg-white/15 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
