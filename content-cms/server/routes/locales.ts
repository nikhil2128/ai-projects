import { Router, type Request, type Response } from "express";
import * as store from "../store.js";

interface Locale {
  code: string;
  name: string;
}

const AVAILABLE_LOCALES: Locale[] = [
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "es-ES", name: "Spanish (Spain)" },
  { code: "es-MX", name: "Spanish (Mexico)" },
  { code: "fr-FR", name: "French (France)" },
  { code: "fr-CA", name: "French (Canada)" },
  { code: "de-DE", name: "German" },
  { code: "it-IT", name: "Italian" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "pt-PT", name: "Portuguese (Portugal)" },
  { code: "nl-NL", name: "Dutch" },
  { code: "pl-PL", name: "Polish" },
  { code: "ru-RU", name: "Russian" },
  { code: "ja-JP", name: "Japanese" },
  { code: "ko-KR", name: "Korean" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "zh-TW", name: "Chinese (Traditional)" },
  { code: "ar-SA", name: "Arabic (Saudi Arabia)" },
  { code: "hi-IN", name: "Hindi" },
  { code: "tr-TR", name: "Turkish" },
  { code: "sv-SE", name: "Swedish" },
  { code: "da-DK", name: "Danish" },
  { code: "fi-FI", name: "Finnish" },
  { code: "nb-NO", name: "Norwegian" },
  { code: "th-TH", name: "Thai" },
  { code: "vi-VN", name: "Vietnamese" },
  { code: "id-ID", name: "Indonesian" },
  { code: "ms-MY", name: "Malay" },
  { code: "uk-UA", name: "Ukrainian" },
  { code: "cs-CZ", name: "Czech" },
  { code: "ro-RO", name: "Romanian" },
  { code: "el-GR", name: "Greek" },
  { code: "he-IL", name: "Hebrew" },
  { code: "hu-HU", name: "Hungarian" },
  { code: "bg-BG", name: "Bulgarian" },
  { code: "ca-ES", name: "Catalan" },
  { code: "hr-HR", name: "Croatian" },
  { code: "sk-SK", name: "Slovak" },
  { code: "sl-SI", name: "Slovenian" },
];

const validCodes = new Set(AVAILABLE_LOCALES.map((l) => l.code));

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const enabled = store.getEnabledLocales();
  res.json({
    success: true,
    data: {
      available: AVAILABLE_LOCALES,
      enabled,
      defaultLocale: "en-US",
    },
  });
});

router.put("/", (req: Request, res: Response) => {
  const { enabled } = req.body;

  if (!Array.isArray(enabled)) {
    res.status(400).json({
      success: false,
      error: "enabled must be an array of locale codes",
    });
    return;
  }

  const validEnabled = enabled.filter(
    (code: unknown) => typeof code === "string" && validCodes.has(code),
  );

  if (!validEnabled.includes("en-US")) {
    validEnabled.unshift("en-US");
  }

  store.setEnabledLocales(validEnabled);

  res.json({
    success: true,
    data: {
      available: AVAILABLE_LOCALES,
      enabled: validEnabled,
      defaultLocale: "en-US",
    },
  });
});

export default router;
