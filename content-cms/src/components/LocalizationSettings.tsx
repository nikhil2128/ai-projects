import { useMemo, useState } from "react";
import type { LocalizationSettings as LocalizationSettingsType } from "../types";

interface LocalizationSettingsProps {
  settings: LocalizationSettingsType;
  onSave: (enabledLocales: string[]) => Promise<void>;
  onCancel: () => void;
}

export default function LocalizationSettings({
  settings,
  onSave,
  onCancel,
}: LocalizationSettingsProps) {
  const [enabledLocales, setEnabledLocales] = useState<string[]>(
    settings.enabledLocales,
  );
  const [saving, setSaving] = useState(false);

  const selectedCount = useMemo(
    () => enabledLocales.length,
    [enabledLocales.length],
  );

  const toggleLocale = (localeCode: string) => {
    if (localeCode === settings.defaultLocale) {
      return;
    }

    setEnabledLocales((prev) =>
      prev.includes(localeCode)
        ? prev.filter((code) => code !== localeCode)
        : [...prev, localeCode],
    );
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(enabledLocales);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Localization Settings
          </h1>
          <p className="text-slate-500 mt-1">
            Enable the locales that should be available across all localized
            fields in every content model and entry.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Locales"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 font-medium">
            {selectedCount} locale{selectedCount !== 1 ? "s" : ""} enabled
          </span>
          <span className="text-slate-500">
            Default locale:{" "}
            <span className="font-medium text-slate-700">
              {settings.defaultLocale}
            </span>
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-3">
          The default locale is always enabled and is used as the primary locale
          for required localized fields.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settings.availableLocales.map((locale) => {
          const checked = enabledLocales.includes(locale.code);
          const isDefault = locale.code === settings.defaultLocale;

          return (
            <label
              key={locale.code}
              className={`flex items-start gap-3 rounded-2xl border p-4 transition-all ${
                checked
                  ? "border-violet-300 bg-violet-50/50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={isDefault || saving}
                onChange={() => toggleLocale(locale.code)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-60"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-slate-800">{locale.label}</p>
                  {isDefault && (
                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-700">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1">{locale.code}</p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
