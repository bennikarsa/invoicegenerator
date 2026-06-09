"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import type { Customer } from "@/types";
import { BulkCsvImport } from "@/components/bulk-csv-import";

type CustomerFormState = Pick<Customer, "name" | "phone" | "address">;

type CustomersResponse =
  | {
      ok: true;
      customers: Customer[];
    }
  | {
      ok: false;
      message: string;
    };

type CustomerMutationResponse =
  | {
      ok: true;
      customer: Customer;
    }
  | {
      ok: false;
      message: string;
    };

const emptyForm: CustomerFormState = {
  name: "",
  phone: "",
  address: ""
};

export function CustomersManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCustomers = useCallback(async (searchValue: string) => {
    setIsLoading(true);
    setError("");

    const query = searchValue ? `?search=${encodeURIComponent(searchValue)}` : "";
    const response = await fetch(`/api/customers${query}`);
    const result = (await response.json()) as CustomersResponse;

    if (result.ok) {
      setCustomers(result.customers);
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers("");
  }, [fetchCustomers]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers";
    const method = editingCustomer ? "PUT" : "POST";
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });
    const result = (await response.json()) as CustomerMutationResponse;

    setIsSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setForm(emptyForm);
    setEditingCustomer(null);
    setMessage(editingCustomer ? "Pembeli berhasil diperbarui." : "Pembeli berhasil ditambahkan.");
    await fetchCustomers(search);
  }

  async function handleDelete(customer: Customer) {
    const confirmed = window.confirm(`Hapus pembeli ${customer.name}?`);

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const response = await fetch(`/api/customers/${customer.id}`, {
      method: "DELETE"
    });
    const result = (await response.json()) as { ok: true } | { ok: false; message: string };

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage("Pembeli berhasil dihapus.");
    await fetchCustomers(search);
  }

  function startEdit(customer: Customer) {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      address: customer.address
    });
    setMessage("");
    setError("");
  }

  function cancelEdit() {
    setEditingCustomer(null);
    setForm(emptyForm);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="space-y-6">
        <form className="space-y-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
          <h3 className="text-base font-semibold text-ink">
            {editingCustomer ? "Edit Pembeli" : "Tambah Pembeli"}
          </h3>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nama</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              type="text"
              value={form.name}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nomor WhatsApp</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              required
              type="tel"
              value={form.phone}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Alamat</span>
            <textarea
              className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              required
              value={form.address}
            />
          </label>
          <div className="flex gap-2">
            <button
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Menyimpan..." : editingCustomer ? "Simpan Perubahan" : "Tambah"}
            </button>
            {editingCustomer ? (
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
        <BulkCsvImport
          description="Upload CSV dengan kolom Nama, WhatsApp, dan Alamat. Nomor WhatsApp sebaiknya diformat sebagai teks."
          endpoint="/api/customers/bulk"
          onImported={() => fetchCustomers(search)}
          templateColumns={["Nama", "WhatsApp", "Alamat"]}
          title="Import Pembeli dari CSV"
        />
      </div>

      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              fetchCustomers(search);
            }}
          >
            <input
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, nomor, atau alamat"
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
          {isLoading ? <p className="text-sm text-slate-600">Memuat pembeli...</p> : null}
          {!isLoading && customers.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">
              Belum ada data pembeli.
            </p>
          ) : null}
          {customers.length > 0 ? (
            <>
            <div className="space-y-3 md:hidden">
              {customers.map((customer) => (
                <article className="rounded-md border border-slate-200 p-3" key={customer.id}>
                  <div className="font-semibold text-ink">{customer.name}</div>
                  <dl className="mt-3 grid grid-cols-[96px_minmax(0,1fr)] gap-2 text-sm">
                    <dt className="text-slate-500">WhatsApp</dt>
                    <dd className="min-w-0 break-words text-slate-800">{customer.phone}</dd>
                    <dt className="text-slate-500">Alamat</dt>
                    <dd className="min-w-0 break-words text-slate-800">{customer.address}</dd>
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-100"
                      onClick={() => startEdit(customer)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="flex-1 rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(customer)}
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
                    <th className="py-3 pr-4 font-semibold">Nama</th>
                    <th className="py-3 pr-4 font-semibold">WhatsApp</th>
                    <th className="py-3 pr-4 font-semibold">Alamat</th>
                    <th className="py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="break-words py-3 pr-4 font-medium text-ink">{customer.name}</td>
                      <td className="break-words py-3 pr-4 text-slate-700">{customer.phone}</td>
                      <td className="break-words py-3 pr-4 text-slate-700">{customer.address}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                            onClick={() => startEdit(customer)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(customer)}
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
