"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import type { AdminBook, BookBase, UserRole } from "@/types";
import { AUTH_SESSION_KEY, parseAuthSession } from "@/lib/auth";
import { formatRupiah } from "@/lib/invoice";
import { BulkCsvImport } from "@/components/bulk-csv-import";

type BookRow = BookBase | AdminBook;

type BookFormState = {
  title: string;
  harga_modal: string;
  harga_komunitas: string;
  harga_jual: string;
};

type BooksResponse =
  | {
      ok: true;
      role: UserRole;
      books: BookRow[];
    }
  | {
      ok: false;
      message: string;
    };

type BookMutationResponse =
  | {
      ok: true;
      book: AdminBook;
    }
  | {
      ok: false;
      message: string;
    };

const emptyForm: BookFormState = {
  title: "",
  harga_modal: "",
  harga_komunitas: "",
  harga_jual: ""
};

function hasAdminPrice(book: BookRow): book is AdminBook {
  return "harga_modal" in book;
}

export function BooksManager() {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [form, setForm] = useState<BookFormState>(emptyForm);
  const [editingBook, setEditingBook] = useState<BookRow | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchBooks = useCallback(async (searchValue: string) => {
    setIsLoading(true);
    setError("");

    const query = searchValue ? `?search=${encodeURIComponent(searchValue)}` : "";
    const response = await fetch(`/api/books${query}`);
    const result = (await response.json()) as BooksResponse;

    if (result.ok) {
      setRole(result.role);
      setBooks(result.books);
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    setRole(
      (
        parseAuthSession(window.localStorage.getItem(AUTH_SESSION_KEY)) ??
        parseAuthSession(window.sessionStorage.getItem(AUTH_SESSION_KEY))
      )?.role ?? null
    );
    fetchBooks("");
  }, [fetchBooks]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    const url = editingBook ? `/api/books/${editingBook.id}` : "/api/books";
    const method = editingBook ? "PUT" : "POST";
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });
    const result = (await response.json()) as BookMutationResponse;

    setIsSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setForm(emptyForm);
    setEditingBook(null);
    setMessage(editingBook ? "Buku berhasil diperbarui." : "Buku berhasil ditambahkan.");
    await fetchBooks(search);
  }

  async function handleDelete(book: BookRow) {
    const confirmed = window.confirm(`Hapus buku ${book.title}?`);

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    const response = await fetch(`/api/books/${book.id}`, {
      method: "DELETE"
    });
    const result = (await response.json()) as { ok: true } | { ok: false; message: string };

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage("Buku berhasil dihapus.");
    await fetchBooks(search);
  }

  function startEdit(book: BookRow) {
    setEditingBook(book);
    setForm({
      title: book.title,
      harga_modal: hasAdminPrice(book) ? String(book.harga_modal) : "",
      harga_komunitas: String(book.harga_komunitas),
      harga_jual: String(book.harga_jual)
    });
    setMessage("");
    setError("");
  }

  function cancelEdit() {
    setEditingBook(null);
    setForm(emptyForm);
  }

  const isAdmin = role === "admin";
  const bookTemplateColumns = isAdmin
    ? ["Judul", "Harga Dasar", "Harga Komunitas", "Harga Jual"]
    : ["Judul", "Harga Komunitas", "Harga Jual"];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      {role ? (
        <div className="space-y-6">
          <form className="space-y-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
            <h3 className="text-base font-semibold text-ink">{editingBook ? "Edit Buku" : "Tambah Buku"}</h3>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Judul</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
                type="text"
                value={form.title}
              />
            </label>
            {isAdmin ? (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Harga Dasar</span>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  min="0"
                  onChange={(event) => setForm((current) => ({ ...current, harga_modal: event.target.value }))}
                  required
                  type="number"
                  value={form.harga_modal}
                />
              </label>
            ) : null}
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Harga Komunitas</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                min="0"
                onChange={(event) => setForm((current) => ({ ...current, harga_komunitas: event.target.value }))}
                required
                type="number"
                value={form.harga_komunitas}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Harga Jual</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                min="0"
                onChange={(event) => setForm((current) => ({ ...current, harga_jual: event.target.value }))}
                required
                type="number"
                value={form.harga_jual}
              />
            </label>
            <div className="flex gap-2">
              <button
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Menyimpan..." : editingBook ? "Simpan Perubahan" : "Tambah"}
              </button>
              {editingBook ? (
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
            description="Upload CSV dengan kolom Judul, Harga Komunitas, dan Harga Jual. Admin juga bisa memakai kolom Harga Dasar."
            endpoint="/api/books/bulk"
            onImported={() => fetchBooks(search)}
            templateColumns={bookTemplateColumns}
            title="Import Buku dari CSV"
          />
        </div>
      ) : (
        <aside className="rounded-md border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
          Memeriksa role login...
        </aside>
      )}

      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              fetchBooks(search);
            }}
          >
            <input
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul buku"
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
          {isLoading ? <p className="text-sm text-slate-600">Memuat buku...</p> : null}
          {!isLoading && books.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600">
              Belum ada data buku.
            </p>
          ) : null}
          {books.length > 0 ? (
            <>
            <div className="space-y-3 md:hidden">
              {books.map((book) => (
                <article className="rounded-md border border-slate-200 p-3" key={book.id}>
                  <div className="font-semibold text-ink">{book.title}</div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    {isAdmin && hasAdminPrice(book) ? (
                      <>
                        <dt className="text-slate-500">Harga Dasar</dt>
                        <dd className="text-right font-medium text-slate-800">{formatRupiah(book.harga_modal)}</dd>
                      </>
                    ) : null}
                    <dt className="text-slate-500">Harga Komunitas</dt>
                    <dd className="text-right font-medium text-slate-800">{formatRupiah(book.harga_komunitas)}</dd>
                    <dt className="text-slate-500">Harga Jual</dt>
                    <dd className="text-right font-medium text-slate-800">{formatRupiah(book.harga_jual)}</dd>
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-100"
                      onClick={() => startEdit(book)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="flex-1 rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(book)}
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
                    <th className="py-3 pr-4 font-semibold">Judul</th>
                    {isAdmin ? <th className="py-3 pr-4 font-semibold">Harga Dasar</th> : null}
                    <th className="py-3 pr-4 font-semibold">Harga Komunitas</th>
                    <th className="py-3 pr-4 font-semibold">Harga Jual</th>
                    <th className="py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {books.map((book) => (
                    <tr key={book.id}>
                      <td className="break-words py-3 pr-4 font-medium text-ink">{book.title}</td>
                      {isAdmin && hasAdminPrice(book) ? (
                        <td className="py-3 pr-4 text-slate-700">{formatRupiah(book.harga_modal)}</td>
                      ) : null}
                      <td className="py-3 pr-4 text-slate-700">{formatRupiah(book.harga_komunitas)}</td>
                      <td className="py-3 pr-4 text-slate-700">{formatRupiah(book.harga_jual)}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                            onClick={() => startEdit(book)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(book)}
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
