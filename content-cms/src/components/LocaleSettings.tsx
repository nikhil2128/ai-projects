import { useEffect, useState } from "react";
import type { LocaleSettings as LocaleSettingsData } from "../types";
import { fetchLocaleSettings, updateLocaleSettings } from "../utils/api";

interface LocaleSettingsProps {
  onBack: () => void;
}

export default function LocaleSettings({ onBack }: LocaleSettingsProps) {
  const [settings, setSettings] = useState<LocaleSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchLocaleSettings();
        if (active) setSettings(data);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const toggleLocale = async (code: string) => {
    if (!settings || code === settings.defaultLocale) return;

    const isEnabled = settings.enabled.includes(code);
    const nextEnabled = isEnabled
      ? settings.enabled.filter((c) => c !== code)
      : [...settings.enabled, code];

    setSaving(true);
    try {
      const updated = await updateLocaleSettings(nextEnabled);
      setSettings(updated);
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = settings?.enabled.length ?? 0;

  const filtered = settings?.available.filter(
    (locale) =>
      locale.name.toLowerCase().includes(search.toLowerCase()) ||
      locale.code.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
        <p className="text-slate-400">Loading locale settings...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
        <p className="text-red-500">Failed to load locale settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Localization Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enable locales for your content. Fields marked as "localizable" in
            content models will accept values in each enabled locale.
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shrink-0"
        >
          Back
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              Enabled Locales
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {enabledCount} locale{enabledCount !== 1 ? "s" : ""} enabled
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-xs text-slate-400">Saving...</span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-50 text-violet-700 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              Default: {settings.defaultLocale}
            </span>
          </div>
        </div>

        {enabledCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {settings.enabled.map((code) => {
              const locale = settings.available.find((l) => l.code === code);
              return (
                <span
                  key={code}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg"
                >
                  <span className="font-mono text-xs text-slate-500">
                    {code}
                  </span>
                  <span className="text-slate-400">·</span>
                  {locale?.name ?? code}
                  {code === settings.defaultLocale && (
                    <span className="text-xs text-violet-600 font-medium ml-1">
                      (default)
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Available Locales
          </h2>
          <div className="relative">
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search locales..."
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all w-56"
            />
          </div>
        </div>

        <div className="grid gap-1 max-h-[28rem] overflow-auto pr-1">
          {(filtered ?? []).map((locale) => {
            const isEnabled = settings.enabled.includes(locale.code);
            const isDefault = locale.code === settings.defaultLocale;
            return (
              <button
                key={locale.code}
                onClick={() => toggleLocale(locale.code)}
                disabled={isDefault || saving}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-all ${
                  isEnabled
                    ? "bg-violet-50 border border-violet-200"
                    : "hover:bg-slate-50 border border-transparent"
                } ${isDefault ? "cursor-default" : "cursor-pointer"} disabled:opacity-70`}
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isEnabled
                      ? "border-violet-500 bg-violet-500"
                      : "border-slate-300"
                  }`}
                >
                  {isEnabled && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-700">
                    {locale.name}
                  </span>
                  <span className="ml-2 text-xs font-mono text-slate-400">
                    {locale.code}
                  </span>
                </div>
                {isDefault && (
                  <span className="text-xs font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                    Default
                  </span>
                )}
              </button>
            );
          })}
          {filtered?.length === 0 && (
            <p className="text-sm text-slate-400 py-4 text-center">
              No locales match your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
