import { useState } from "react";
import Header from "./components/Header";
import ModelList from "./components/ModelList";
import ModelBuilder from "./components/ModelBuilder";
import EntryList from "./components/EntryList";
import EntryForm from "./components/EntryForm";
import type {
  ContentModel,
  ContentEntry,
  AppView,
  FieldDefinition,
  EntrySaveAction,
} from "./types";
import {
  createModel,
  updateModel,
  fetchModel,
  createEntry,
  updateEntry,
  publishEntry,
} from "./utils/api";

interface AppState {
  view: AppView;
  activeModel: ContentModel | null;
  activeEntry: ContentEntry | null;
}

export default function App() {
  const [state, setState] = useState<AppState>({
    view: "models",
    activeModel: null,
    activeEntry: null,
  });

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
    if (action === "publish") {
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
    if (action === "publish") {
      await publishEntry(state.activeEntry.id);
    }
    if (state.activeModel) {
      const freshModel = await fetchModel(state.activeModel.id);
      navigate("entries", freshModel, null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <Header
        onNavigateHome={() => navigate("models", null, null)}
        breadcrumb={breadcrumb}
      />

      {state.view === "models" && (
        <ModelList
          onCreateModel={() => navigate("model-builder", null, null)}
          onEditModel={(model) => navigate("model-edit", model, null)}
          onViewEntries={(model) => navigate("entries", model, null)}
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
          onCreateEntry={() => navigate("entry-form", state.activeModel, null)}
          onEditEntry={(entry) =>
            navigate("entry-form", state.activeModel, entry)
          }
        />
      )}

      {state.view === "entry-form" && state.activeModel && (
        <EntryForm
          model={state.activeModel}
          initial={state.activeEntry ?? undefined}
          onSave={
            state.activeEntry ? handleUpdateEntry : handleCreateEntry
          }
          onCancel={() => navigate("entries", state.activeModel, null)}
        />
      )}
    </div>
  );
}
