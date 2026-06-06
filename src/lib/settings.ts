import type { InvoiceSettings } from "@/types";

export const DEFAULT_SETTINGS: InvoiceSettings = {
  header_text: "INVOICE WAR FLP BATCH 17",
  footer_text: "Silahkan transfer ke rekening",
  nama_pengirim: "GERAI FLP",
  hp_pengirim: "",
  rekening: ""
};

export const SETTINGS_KEYS = [
  "header_text",
  "footer_text",
  "nama_pengirim",
  "hp_pengirim",
  "rekening"
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

export type SettingsRow = {
  key: SettingsKey;
  value: string;
};

export function isSettingsKey(value: string): value is SettingsKey {
  return SETTINGS_KEYS.includes(value as SettingsKey);
}

export function rowsToSettings(rows: Array<{ key: string; value: string | null }>) {
  return rows.reduce<InvoiceSettings>(
    (settings, row) => {
      if (isSettingsKey(row.key)) {
        settings[row.key] = row.value ?? "";
      }

      return settings;
    },
    { ...DEFAULT_SETTINGS }
  );
}

export function sanitizeSettings(input: Partial<Record<SettingsKey, unknown>>) {
  return SETTINGS_KEYS.reduce<InvoiceSettings>((settings, key) => {
    const value = input[key];
    settings[key] = typeof value === "string" ? value.trim() : "";
    return settings;
  }, { ...DEFAULT_SETTINGS });
}

export function validateSettings(settings: InvoiceSettings) {
  const missingFields = SETTINGS_KEYS.filter((key) => !settings[key]);

  if (missingFields.length > 0) {
    return {
      ok: false,
      message: "Semua field setting wajib diisi."
    };
  }

  return {
    ok: true,
    message: ""
  };
}
