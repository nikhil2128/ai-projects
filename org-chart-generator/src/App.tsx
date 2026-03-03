import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import UploadArea from "./components/UploadArea";
import OrgChart from "./components/OrgChart";
import type { OrgChartHandle } from "./components/OrgChart";
import ChartList from "./components/ChartList";
import VersionPanel from "./components/VersionPanel";
import SaveDialog from "./components/SaveDialog";
import type {
  OrgNode,
  AppView,
  OrgChartDocument,
  OrgChartVersion,
} from "./types/org";
import { parseOrgChartImage } from "./utils/api";
import {
  getAllDocuments,
  getDocument,
  saveDocument,
  deleteDocument,
  generateId,
} from "./utils/storage";

export default function App() {
  const [view, setView] = useState<AppView>("home");
  const [documents, setDocuments] = useState<OrgChartDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [displayedVersionId, setDisplayedVersionId] = useState<string | null>(
    null,
  );

  const [parseState, setParseState] = useState<"idle" | "parsing" | "error">(
    "idle",
  );
  const [parseError, setParseError] = useState("");

  const [chartData, setChartData] = useState<OrgNode | null>(null);
  const latestTreeDataRef = useRef<OrgNode | null>(null);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showVersionPanel, setShowVersionPanel] = useState(false);

  const orgChartRef = useRef<OrgChartHandle>(null);

  useEffect(() => {
    setDocuments(getAllDocuments());
  }, []);

  const activeDoc = activeDocId
    ? documents.find((d) => d.id === activeDocId) ?? null
    : null;

  const handleFileSelected = async (file: File) => {
    setParseState("parsing");
    setParseError("");

    try {
      const result = await parseOrgChartImage(file);
      if (result.success && result.data) {
        setChartData(result.data);
        latestTreeDataRef.current = result.data;
        setView("editing");
        setParseState("idle");
      } else {
        setParseError(result.error || "Failed to parse org chart");
        setParseState("error");
      }
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : "Something went wrong",
      );
      setParseState("error");
    }
  };

  const handleSave = (title: string) => {
    const data = latestTreeDataRef.current ?? chartData;
    if (!data) return;

    const versionId = generateId();
    const docId = generateId();
    const now = new Date().toISOString();

    const doc: OrgChartDocument = {
      id: docId,
      title,
      versions: [{ id: versionId, data, createdAt: now }],
      currentVersionId: versionId,
      createdAt: now,
      updatedAt: now,
    };

    saveDocument(doc);
    setActiveDocId(docId);
    setDisplayedVersionId(versionId);
    setDocuments(getAllDocuments());
    setShowSaveDialog(false);
  };

  const handleTreeChange = useCallback(
    (newData: OrgNode) => {
      latestTreeDataRef.current = newData;

      if (!activeDocId) return;

      const doc = getDocument(activeDocId);
      if (!doc) return;

      const versionId = generateId();
      const now = new Date().toISOString();
      const newVersion: OrgChartVersion = {
        id: versionId,
        data: newData,
        createdAt: now,
      };

      const updatedDoc: OrgChartDocument = {
        ...doc,
        versions: [...doc.versions, newVersion],
        currentVersionId: versionId,
        updatedAt: now,
      };

      saveDocument(updatedDoc);
      setDisplayedVersionId(versionId);
      setDocuments(getAllDocuments());
    },
    [activeDocId],
  );

  const handleOpenChart = (docId: string) => {
    const doc = getDocument(docId);
    if (!doc || doc.versions.length === 0) return;

    const latestVersion = doc.versions[doc.versions.length - 1];
    setChartData(latestVersion.data);
    latestTreeDataRef.current = latestVersion.data;
    setActiveDocId(docId);
    setDisplayedVersionId(latestVersion.id);
    setView("editing");
    setShowVersionPanel(false);
  };

  const handleViewVersion = (versionId: string) => {
    if (!activeDoc) return;
    const version = activeDoc.versions.find((v) => v.id === versionId);
    if (!version) return;
    setChartData(version.data);
    latestTreeDataRef.current = version.data;
    setDisplayedVersionId(versionId);
  };

  const handleDownloadVersion = (versionId: string) => {
    if (!activeDoc) return;
    const version = activeDoc.versions.find((v) => v.id === versionId);
    if (!version) return;

    const isCurrent = versionId === displayedVersionId;
    if (!isCurrent) {
      setChartData(version.data);
      latestTreeDataRef.current = version.data;
      setDisplayedVersionId(versionId);
    }

    setTimeout(async () => {
      try {
        await orgChartRef.current?.downloadPng();
      } catch (e) {
        console.error("Download failed:", e);
      }
    }, 400);
  };

  const handleDeleteDocument = (docId: string) => {
    deleteDocument(docId);
    setDocuments(getAllDocuments());
  };

  const handleNavigateHome = () => {
    setView("home");
    setActiveDocId(null);
    setDisplayedVersionId(null);
    setChartData(null);
    latestTreeDataRef.current = null;
    setParseState("idle");
    setParseError("");
    setShowVersionPanel(false);
    setDocuments(getAllDocuments());
  };

  const handleNewChart = () => {
    setView("upload");
    setActiveDocId(null);
    setDisplayedVersionId(null);
    setChartData(null);
    latestTreeDataRef.current = null;
    setParseState("idle");
    setParseError("");
    setShowVersionPanel(false);
  };

  const isSaved = !!activeDocId;
  const chartTitle = activeDoc?.title;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <Header
        view={view}
        chartTitle={chartTitle}
        isSaved={isSaved}
        onNavigateHome={handleNavigateHome}
        onNewChart={handleNewChart}
        onSave={() => setShowSaveDialog(true)}
        showVersionPanel={showVersionPanel}
        onToggleVersionPanel={() => setShowVersionPanel((p) => !p)}
        versionCount={activeDoc?.versions.length ?? 0}
      />

      {view === "home" && (
        <ChartList
          documents={documents}
          onOpen={handleOpenChart}
          onDelete={handleDeleteDocument}
          onNewChart={handleNewChart}
        />
      )}

      {view === "upload" && (
        <>
          {parseState === "error" && (
            <div className="max-w-xl mx-auto mt-8 px-6">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <p className="text-red-800 font-medium mb-1">
                  Unable to parse the image
                </p>
                <p className="text-red-600 text-sm mb-4">{parseError}</p>
                <button
                  onClick={() => {
                    setParseState("idle");
                    setParseError("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {(parseState === "idle" || parseState === "parsing") && (
            <UploadArea
              onFileSelected={handleFileSelected}
              isProcessing={parseState === "parsing"}
            />
          )}
        </>
      )}

      {view === "editing" && chartData && (
        <div className="flex h-[calc(100vh-73px)]">
          <div className="flex-1 overflow-auto">
            <OrgChart
              ref={orgChartRef}
              data={chartData}
              onTreeChange={handleTreeChange}
            />
          </div>

          {showVersionPanel && activeDoc && displayedVersionId && (
            <VersionPanel
              versions={activeDoc.versions}
              activeVersionId={displayedVersionId}
              onViewVersion={handleViewVersion}
              onDownloadVersion={handleDownloadVersion}
              onClose={() => setShowVersionPanel(false)}
            />
          )}
        </div>
      )}

      {showSaveDialog && (
        <SaveDialog
          onSave={handleSave}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
}
