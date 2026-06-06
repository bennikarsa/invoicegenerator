"use client";

import { FormEvent, useEffect, useState } from "react";

import type { InvoiceSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/settings";

type SettingsResponse =
  | {
      ok: true;
      settings: InvoiceSettings;
    }
  | {
      ok: false;
      message: string;
    };

const fields = [
  {
    key: "header_text",
    label: "Header Invoice",
    type: "text"
  },
  {
    key: "footer_text",
    label: "Footer Invoice",
    type: "textarea"
  },
  {
    key: "nama_pengirim",
    label: "Nama Pengirim",
    type: "text"
  },
  {
    key: "hp_pengirim",
    label: "No HP Pengirim",
    type: "text"
  },
  {
    key: "rekening",
    label: "Rekening Pembayaran",
    type: "textarea"
  }
] as const;

export function SettingsForm() {
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSettings() {
      const response = await fetch("/api/settings");
      const result = (await response.json()) as SettingsResponse;

      if (result.ok) {
        setSettings(result.settings);
      } else {
        setError(result.message);
      }

      setIsLoading(false);
    }

    loadSettings();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(settings)
    });
    const result = (await response.json()) as SettingsResponse;

    setIsSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSettings(result.settings);
    setMessage("Setting berhasil disimpan.");
  }

  function updateField(key: keyof InvoiceSettings, value: string) {
    setSettings((current) => ({
      ...current,
      [key]: value
    }));
  }

  return (
    <form className="max-w-2xl space-y-5 rounded-md border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
      {isLoading ? <p className="text-sm text-slate-600">Memuat setting...</p> : null}
      {fields.map((field) => (
        <label className="block" key={field.key}>
          <span className="text-sm font-medium text-slate-700">{field.label}</span>
          {field.type === "textarea" ? (
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => updateField(field.key, event.target.value)}
              required
              value={settings[field.key]}
            />
          ) : (
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => updateField(field.key, event.target.value)}
              required
              type="text"
              value={settings[field.key]}
            />
          )}
        </label>
      ))}
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">{message}</p> : null}
      <button
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading || isSaving}
        type="submit"
      >
        {isSaving ? "Menyimpan..." : "Simpan Setting"}
      </button>
    </form>
  );
}
