import { useEffect, useState } from "react";
import Header from "./components/Header";
import ModelList from "./components/ModelList";
import ModelBuilder from "./components/ModelBuilder";
import EntryList from "./components/EntryList";
import EntryForm from "./components/EntryForm";
import LocalizationSettings from "./components/LocalizationSettings";
import LoginPage from "./components/LoginPage";
import type {
  AuthUser,
  ContentModel,
  ContentEntry,
  AppView,
  FieldDefinition,
  EntrySaveAction,
  LocalizationSettings as LocalizationSettingsType,
} from "./types";
import {
  getStoredToken,
  clearStoredToken,
  getMe,
  createModel,
  updateModel,
  fetchModel,
  createEntry,
  updateEntry,
  publishEntry,
  fetchLocalizationSettings,
  updateLocalizationSettings,
} from "./utils/api";

interface AppState {
  view: AppView;
  activeModel: ContentModel | null;
  activeEntry: ContentEntry | null;
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [state, setState] = useState<AppState>({
    view: "models",
    activeModel: null,
    activeEntry: null,
  });
  const [localizationSettings, setLocalizationSettings] =
    useState<LocalizationSettingsType>({
      defaultLocale: "en-US",
      enabledLocales: ["en-US"],
      availableLocales: [],
    });

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }

    getMe()
      .then(setUser)
      .catch(() => {
        clearStoredToken();
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchLocalizationSettings().then(setLocalizationSettings).catch(console.error);
  }, [user]);

  const handleLogin = (loggedInUser: AuthUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    clearStoredToken();
    setUser(null);
    setState({ view: "models", activeModel: null, activeEntry: null });
  };

  const navigate = (
    view: AppView,
    model?: ContentModel | null,
    entry?: ContentEntry | null,
  ) => {
    setState({
      view,
      activeModel: model ?? state.activeModel,
      activeEntry: entry ?? null,
    });
  };

  const breadcrumb = (() => {
    const crumbs: { label: string; onClick?: () => void }[] = [];

    if (state.view === "model-builder") {
      crumbs.push({ label: "Models", onClick: () => navigate("models") });
      crumbs.push({ label: "New Model" });
    } else if (state.view === "settings") {
      crumbs.push({ label: "Models", onClick: () => navigate("models") });
      crumbs.push({ label: "Localization Settings" });
    } else if (state.view === "model-edit" && state.activeModel) {
      crumbs.push({ label: "Models", onClick: () => navigate("models") });
      crumbs.push({ label: `Edit: ${state.activeModel.name}` });
    } else if (state.view === "entries" && state.activeModel) {
      crumbs.push({ label: "Models", onClick: () => navigate("models") });
      crumbs.push({ label: state.activeModel.name });
    } else if (state.view === "entry-form" && state.activeModel) {
      crumbs.push({ label: "Models", onClick: () => navigate("models") });
      crumbs.push({
        label: state.activeModel.name,
        onClick: () => navigate("entries", state.activeModel),
      });
      crumbs.push({
        label: state.activeEntry ? "Edit Entry" : "New Entry",
      });
    }

    return crumbs;
  })();

  const handleCreateModel = async (data: {
    name: string;
    description: string;
    fields: FieldDefinition[];
  }) => {
    await createModel(data);
    navigate("models", null, null);
  };

  const handleUpdateModel = async (data: {
    name: string;
    description: string;
    fields: FieldDefinition[];
  }) => {
    if (!state.activeModel) return;
    const updated = await updateModel(state.activeModel.id, data);
    navigate("entries", updated, null);
  };

  const handleCreateEntry = async (
    values: Record<string, unknown>,
    action: EntrySaveAction,
  ) => {
    if (!state.activeModel) return;
    const created = await createEntry(state.activeModel.id, values);
    if (action === "publish" && user?.role === "approver") {
      await publishEntry(created.id);
    }
    const freshModel = await fetchModel(state.activeModel.id);
    navigate("entries", freshModel, null);
  };

  const handleUpdateEntry = async (
    values: Record<string, unknown>,
    action: EntrySaveAction,
  ) => {
    if (!state.activeEntry) return;
    await updateEntry(state.activeEntry.id, values);
    if (action === "publish" && user?.role === "approver") {
      await publishEntry(state.activeEntry.id);
    }
    if (state.activeModel) {
      const freshModel = await fetchModel(state.activeModel.id);
      navigate("entries", freshModel, null);
    }
  };

  const handlePublishEntry = async () => {
    if (!state.activeEntry) return;
    await publishEntry(state.activeEntry.id);
    if (state.activeModel) {
      const freshModel = await fetchModel(state.activeModel.id);
      navigate("entries", freshModel, null);
    }
  };

  const handleUpdateLocalizationSettings = async (enabledLocales: string[]) => {
    const updated = await updateLocalizationSettings(enabledLocales);
    setLocalizationSettings(updated);
    navigate("models", null, null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <Header
        user={user}
        onNavigateHome={() => navigate("models", null, null)}
        onOpenSettings={() => navigate("settings", null, null)}
        onLogout={handleLogout}
        breadcrumb={breadcrumb}
      />

      {state.view === "models" && (
        <ModelList
          onCreateModel={() => navigate("model-builder", null, null)}
          onEditModel={(model) => navigate("model-edit", model, null)}
          onViewEntries={(model) => navigate("entries", model, null)}
        />
      )}

      {state.view === "settings" && (
        <LocalizationSettings
          settings={localizationSettings}
          onSave={handleUpdateLocalizationSettings}
          onCancel={() => navigate("models", null, null)}
        />
      )}

      {state.view === "model-builder" && (
        <ModelBuilder
          onSave={handleCreateModel}
          onCancel={() => navigate("models", null, null)}
        />
      )}

      {state.view === "model-edit" && state.activeModel && (
        <ModelBuilder
          initial={state.activeModel}
          onSave={handleUpdateModel}
          onCancel={() => navigate("entries", state.activeModel, null)}
        />
      )}

      {state.view === "entries" && state.activeModel && (
        <EntryList
          model={state.activeModel}
          user={user}
          onCreateEntry={() => navigate("entry-form", state.activeModel, null)}
          onEditEntry={(entry) =>
            navigate("entry-form", state.activeModel, entry)
          }
        />
      )}

      {state.view === "entry-form" && state.activeModel && (
        <EntryForm
          model={state.activeModel}
          localizationSettings={localizationSettings}
          initial={state.activeEntry ?? undefined}
          user={user}
          onSave={
            state.activeEntry ? handleUpdateEntry : handleCreateEntry
          }
          onPublish={
            user.role === "approver" && state.activeEntry
              ? handlePublishEntry
              : undefined
          }
          onCancel={() => navigate("entries", state.activeModel, null)}
        />
      )}
    </div>
  );
}
