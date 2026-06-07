"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import type { Shipping } from "@/types";
import { formatRupiah } from "@/lib/invoice";

type ShippingFormState = {
  ekspedisi: string;
  tarif: string;
};

type ShippingsResponse =
  | {
      ok: true;
      shippings: Shipping[];
    }
  | {
      ok: false;
      message: string;
    };

type ShippingMutationResponse =
  | {
      ok: true;
      shipping: Shipping;
    }
  | {
      ok: false;
      message: string;
    };

const emptyForm: ShippingFormState = {
  ekspedisi: "",
  tarif: ""
};

export function ShippingsManager() {
  const [shippings, setShippings] = useState<Shipping[]>([]);
  const [form, setForm] = useState<ShippingFormState>(emptyForm);
  const [editingShipping, setEditingShipping] = useState<Shipping | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchShippings = useCallback(async (searchValue: string) => {
    setIsLoading(true);
    setError("");

    const query = searchValue ? `?search=${encodeURIComponent(searchValue)}` : "";
    const response = await fetch(`/api/shippings${query}`);
    const result = (await response.json()) as ShippingsResponse;

    if (result.ok) {
      setShippings(result.shippings);
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchShippings("");
  }, [fetchShippings]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    const url = editingShipping ? `/api/shippings/${editingShipping.id}` : "/api/shippings";
    const method = editingShipping ? "PUT" : "POST";
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ekspedisi: form.ekspedisi,
        tarif: form.tarif
      })
    });
    const result = (await response.json()) as ShippingMutationResponse;

    setIsSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setForm(emptyForm);
    setEditingShipping(null);
    setMessage(editingShipping ? "Ongkir berhasil diperbarui." : "Ongkir berhasil ditambahkan.");
    await fetchShippings(search);
  }

  async function handleDelete(shipping: Shipping) {
    const confirmed = window.confirm(`Hapus ongkir ${shipping.ekspedisi}?`);

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const response = await fetch(`/api/shippings/${shipping.id}`, {
      method: "DELETE"
    });
    const result = (await response.json()) as { ok: true } | { ok: false; message: string };

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage("Ongkir berhasil dihapus.");
    await fetchShippings(search);
  }

  function startEdit(shipping: Shipping) {
    setEditingShipping(shipping);
    setForm({
      ekspedisi: shipping.ekspedisi,
      tarif: String(shipping.tarif)
    });
    setMessage("");
    setError("");
  }

  function cancelEdit() {
    setEditingShipping(null);
    setForm(emptyForm);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <form className="space-y-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <h3 className="text-base font-semibold text-ink">
          {editingShipping ? "Edit Ongkir" : "Tambah Ongkir"}
        </h3>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Ekspedisi</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            onChange={(event) => setForm((current) => ({ ...current, ekspedisi: event.target.value }))}
            required
            type="text"
            value={form.ekspedisi}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Tarif</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            min="0"
            onChange={(event) => setForm((current) => ({ ...current, tarif: event.target.value }))}
            required
            type="number"
            value={form.tarif}
          />
        </label>
        <div className="flex gap-2">
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Menyimpan..." : editingShipping ? "Simpan Perubahan" : "Tambah"}
          </button>
          {editingShipping ? (
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={cancelEdit}
              type="button"
            >
              Batal
            </button>
          ) : null}
        </div>
      </form>

      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              fetchShippings(search);
            }}
          >
            <input
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari ekspedisi"
              type="search"
              value={search}
            />
            <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100" type="submit">
              Cari
            </button>
          </form>
        </div>
        <div className="p-4">
          {error ? <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {message ? <p className="mb-3 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">{message}</p> : null}
          {isLoading ? <p className="text-sm text-slate-600">Memuat ongkir...</p> : null}
          {!isLoading && shippings.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">
              Belum ada data ongkir.
            </p>
          ) : null}
          {shippings.length > 0 ? (
            <>
            <div className="space-y-3 md:hidden">
              {shippings.map((shipping) => (
                <article className="rounded-md border border-slate-200 p-3" key={shipping.id}>
                  <div className="font-semibold text-ink">{shipping.ekspedisi}</div>
                  <div className="mt-2 text-sm text-slate-700">{formatRupiah(shipping.tarif)}</div>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-100"
                      onClick={() => startEdit(shipping)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="flex-1 rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(shipping)}
                      type="button"
                    >
                      Hapus
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden md:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-3 pr-4 font-semibold">Ekspedisi</th>
                    <th className="py-3 pr-4 font-semibold">Tarif</th>
                    <th className="py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shippings.map((shipping) => (
                    <tr key={shipping.id}>
                      <td className="break-words py-3 pr-4 font-medium text-ink">{shipping.ekspedisi}</td>
                      <td className="py-3 pr-4 text-slate-700">{formatRupiah(shipping.tarif)}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                            onClick={() => startEdit(shipping)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(shipping)}
                            type="button"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
