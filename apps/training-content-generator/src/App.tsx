import { useState } from "react";
import { Header } from "./components/Header";
import { ImageUpload } from "./components/ImageUpload";
import { TopicManager } from "./components/TopicManager";
import { TrainingViewer } from "./components/TrainingViewer";
import { generateContent } from "./api/client";
import type { AppView, TopicItem, TrainingModule } from "./types";
import { Upload, PenLine, AlertCircle } from "lucide-react";

export default function App() {
  const [view, setView] = useState<AppView>("home");
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"image" | "manual">("manual");

  const handleTopicsExtracted = (extracted: string[], preview: string) => {
    setTopics(
      extracted.map((text) => ({ id: crypto.randomUUID(), text }))
    );
    setImagePreview(preview);
    setSource("image");
    setView("topics");
    setError(null);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const topicTexts = topics.map((t) => t.text);
      const result = await generateContent(topicTexts, source);
      setModules(result.modules);
      setView("content");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate content"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    if (view === "content") {
      setView("topics");
    } else if (view === "topics") {
      setView("home");
      setTopics([]);
      setImagePreview(null);
      setSource("manual");
    }
    setError(null);
  };

  const startManualEntry = () => {
    setView("topics");
    setImagePreview(null);
    setSource("manual");
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header view={view} onBack={handleBack} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-400/30 flex items-start gap-3 animate-slide-up">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-medium">Something went wrong</p>
              <p className="text-red-400/80 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {view === "home" && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-4 pt-8 pb-4">
              <h2 className="text-3xl sm:text-4xl font-bold gradient-text">
                Create Training Content
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                Upload an image of whiteboard notes, slides, or diagrams to
                automatically extract topics — or enter topics manually. AI will
                generate comprehensive training materials for your team.
              </p>
            </div>

            <ImageUpload
              onTopicsExtracted={handleTopicsExtracted}
              onError={setError}
              isLoading={isAnalyzing}
              setIsLoading={setIsAnalyzing}
            />

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-sm text-slate-500 uppercase tracking-wider">
                or
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <button
              onClick={startManualEntry}
              className="w-full glass-card p-8 flex items-center gap-6 hover:border-white/20 hover:bg-white/[0.05] transition-all group"
            >
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 group-hover:from-violet-500/30 group-hover:to-purple-500/30 transition-colors">
                <PenLine className="w-10 h-10 text-violet-400" />
              </div>
              <div className="text-left">
                <p className="text-lg font-medium text-slate-200">
                  Enter Topics Manually
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Type in your training topics directly and generate content
                </p>
              </div>
            </button>

            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
                How it works
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: Upload,
                    title: "Upload or Enter",
                    desc: "Upload an image or type training topics",
                    color: "text-blue-400",
                    bg: "from-blue-500/20 to-blue-600/20",
                  },
                  {
                    icon: PenLine,
                    title: "Review & Edit",
                    desc: "Refine the extracted topics before generating",
                    color: "text-violet-400",
                    bg: "from-violet-500/20 to-violet-600/20",
                  },
                  {
                    icon: Upload,
                    title: "Generate & Train",
                    desc: "Get comprehensive training modules with quizzes",
                    color: "text-emerald-400",
                    bg: "from-emerald-500/20 to-emerald-600/20",
                  },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg bg-gradient-to-br ${step.bg} flex-shrink-0`}
                    >
                      <step.icon className={`w-5 h-5 ${step.color}`} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200 text-sm">
                        {step.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === "topics" && (
          <TopicManager
            topics={topics}
            onTopicsChange={setTopics}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            imagePreview={imagePreview}
          />
        )}

        {view === "content" && <TrainingViewer modules={modules} />}
      </main>
    </div>
  );
}
