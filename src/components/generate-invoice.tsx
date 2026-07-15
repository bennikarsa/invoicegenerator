"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type { BookBase, Customer, DiscountType, InvoiceDetailForRole, InvoiceSettings, Shipping } from "@/types";
import { buildInvoiceText, calculateInvoiceTotal, formatRupiah } from "@/lib/invoice";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { ShareInvoiceDialog } from "@/components/share-invoice-dialog";

type LookupResponse<TName extends string, TData> =
  | ({ ok: true } & Record<TName, TData>)
  | {
      ok: false;
      message: string;
    };

type InvoiceResponse =
  | {
      ok: true;
      invoice: InvoiceDetailForRole;
      settings: InvoiceSettings;
    }
  | {
      ok: false;
      message: string;
    };

type DraftItem = {
  book_id: string;
  title: string;
  qty: number;
  harga_jual_snapshot: number;
  harga_komunitas_snapshot: number;
};

type SharePayload = {
  invoiceNumber: string;
  phone: string;
  text: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function matchesSearch(values: string[], search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(query));
}

export function GenerateInvoice() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [books, setBooks] = useState<BookBase[]>([]);
  const [shippings, setShippings] = useState<Shipping[]>([]);
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_SETTINGS);
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [bookId, setBookId] = useState("");
  const [bookSearch, setBookSearch] = useState("");
  const [isBookSearchOpen, setIsBookSearchOpen] = useState(false);
  const [shippingId, setShippingId] = useState("");
  const [tanggal, setTanggal] = useState(todayInputValue());
  const [discountType, setDiscountType] = useState<DiscountType>("nominal");
  const [discountValue, setDiscountValue] = useState("0");
  const [discountLabel, setDiscountLabel] = useState("Diskon");
  const [discount2Type, setDiscount2Type] = useState<DiscountType>("nominal");
  const [discount2Value, setDiscount2Value] = useState("0");
  const [discount2Label, setDiscount2Label] = useState("Diskon 2");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState("");
  const [editingInvoiceId, setEditingInvoiceId] = useState("");
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);

  useEffect(() => {
    async function loadData() {
      const [customersResponse, booksResponse, shippingsResponse, settingsResponse] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/books"),
        fetch("/api/shippings"),
        fetch("/api/settings")
      ]);
      const customersResult = (await customersResponse.json()) as LookupResponse<"customers", Customer[]>;
      const booksResult = (await booksResponse.json()) as LookupResponse<"books", BookBase[]>;
      const shippingsResult = (await shippingsResponse.json()) as LookupResponse<"shippings", Shipping[]>;
      const settingsResult = (await settingsResponse.json()) as LookupResponse<"settings", InvoiceSettings>;

      if (customersResult.ok) {
        setCustomers(customersResult.customers);
      }

      if (booksResult.ok) {
        setBooks(booksResult.books);
      }

      if (shippingsResult.ok) {
        setShippings(shippingsResult.shippings);
      }

      if (settingsResult.ok) {
        setSettings(settingsResult.settings);
      }

      const draftId = new URLSearchParams(window.location.search).get("draftId");

      if (!draftId) {
        return;
      }

      const invoiceResponse = await fetch(`/api/invoices/${draftId}`);
      const invoiceResult = (await invoiceResponse.json()) as InvoiceResponse;

      if (!invoiceResult.ok) {
        setError(invoiceResult.message);
        return;
      }

      if (invoiceResult.invoice.status !== "draft") {
        setError("Hanya invoice draft yang bisa diedit.");
        return;
      }

      setEditingInvoiceId(invoiceResult.invoice.id);
      setLastInvoiceNumber(invoiceResult.invoice.invoice_number);
      setCustomerId(invoiceResult.invoice.customer_id);
      setShippingId(invoiceResult.invoice.shipping_id ?? "");
      setTanggal(invoiceResult.invoice.tanggal);
      setDiscountType(invoiceResult.invoice.diskon_type);
      setDiscountValue(String(invoiceResult.invoice.diskon_value));
      setDiscountLabel(invoiceResult.invoice.diskon_label);
      setDiscount2Type(invoiceResult.invoice.diskon_2_type);
      setDiscount2Value(String(invoiceResult.invoice.diskon_2_value));
      setDiscount2Label(invoiceResult.invoice.diskon_2_label);
      setSettings(invoiceResult.settings);
      setItems(
        invoiceResult.invoice.items.map((item) => ({
          book_id: item.book_id,
          title: item.title,
          qty: item.qty,
          harga_jual_snapshot: item.harga_jual_snapshot,
          harga_komunitas_snapshot: item.harga_komunitas_snapshot
        }))
      );
      setMessage(`Mengedit draft ${invoiceResult.invoice.invoice_number}.`);
    }

    loadData();
  }, []);

  const selectedCustomer = customers.find((customer) => customer.id === customerId) ?? null;
  const selectedShipping = shippings.find((shipping) => shipping.id === shippingId) ?? null;
  const customerSearchResults = useMemo(() => {
    if (!customerSearch.trim()) {
      return [];
    }

    return customers
      .filter((customer) => matchesSearch([customer.name, customer.phone, customer.address], customerSearch))
      .slice(0, 8);
  }, [customerSearch, customers]);
  const bookSearchResults = useMemo(() => {
    if (!bookSearch.trim()) {
      return [];
    }

    return books.filter((book) => matchesSearch([book.title], bookSearch)).slice(0, 8);
  }, [bookSearch, books]);
  const discountNumber = Number(discountValue || 0);
  const discount2Number = Number(discount2Value || 0);
  const previewText = useMemo(() => {
    if (!selectedCustomer) {
      return "";
    }

    return buildInvoiceText({
      invoiceNumber: lastInvoiceNumber || "INVYYMMXXX",
      customer: selectedCustomer,
      settings,
      items,
      shipping: selectedShipping,
      discountType,
      discountValue: Number.isFinite(discountNumber) ? discountNumber : 0,
      discountLabel,
      discount2Type,
      discount2Value: Number.isFinite(discount2Number) ? discount2Number : 0,
      discount2Label
    });
  }, [
    discount2Label,
    discount2Number,
    discount2Type,
    discountLabel,
    discountNumber,
    discountType,
    items,
    lastInvoiceNumber,
    selectedCustomer,
    selectedShipping,
    settings
  ]);
  const totals = calculateInvoiceTotal({
    items,
    shipping: selectedShipping,
    discountType,
    discountValue: Number.isFinite(discountNumber) ? discountNumber : 0,
    discountLabel,
    discount2Type,
    discount2Value: Number.isFinite(discount2Number) ? discount2Number : 0,
    discount2Label
  });

  function addBook() {
    const book = books.find((candidate) => candidate.id === bookId);

    if (!book) {
      return;
    }

    setItems((current) => {
      const existing = current.find((item) => item.book_id === book.id);

      if (existing) {
        return current.map((item) => (item.book_id === book.id ? { ...item, qty: item.qty + 1 } : item));
      }

      return [
        ...current,
        {
          book_id: book.id,
          title: book.title,
          qty: 1,
          harga_jual_snapshot: book.harga_jual,
          harga_komunitas_snapshot: book.harga_komunitas
        }
      ];
    });
    setBookId("");
  }

  function updateQty(bookIdValue: string, qty: number) {
    setItems((current) =>
      current.map((item) => (item.book_id === bookIdValue ? { ...item, qty: Math.max(1, qty) } : item))
    );
  }

  function resetInvoiceForm() {
    setCustomerId("");
    setBookId("");
    setShippingId("");
    setTanggal(todayInputValue());
    setDiscountType("nominal");
    setDiscountValue("0");
    setDiscountLabel("Diskon");
    setDiscount2Type("nominal");
    setDiscount2Value("0");
    setDiscount2Label("Diskon 2");
    setItems([]);
    setLastInvoiceNumber("");
    setEditingInvoiceId("");
  }

  async function saveInvoice(status: "draft" | "sent") {
    setIsSaving(true);
    setError("");
    setMessage("");

    const response = await fetch(editingInvoiceId ? `/api/invoices/${editingInvoiceId}` : "/api/invoices", {
      method: editingInvoiceId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customer_id: customerId,
        shipping_id: shippingId || null,
        tanggal,
        diskon_type: discountType,
        diskon_value: discountValue,
        diskon_label: discountLabel,
        diskon_2_type: discount2Type,
        diskon_2_value: discount2Value,
        diskon_2_label: discount2Label,
        status,
        items: items.map((item) => ({
          book_id: item.book_id,
          qty: item.qty
        }))
      })
    });
    const result = (await response.json()) as InvoiceResponse;

    setIsSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setLastInvoiceNumber(result.invoice.invoice_number);
    setEditingInvoiceId(result.invoice.status === "draft" ? result.invoice.id : "");
    setSettings(result.settings);

    if (status === "sent") {
      const text = buildInvoiceText({
        invoiceNumber: result.invoice.invoice_number,
        customer: result.invoice.customer,
        settings: result.settings,
        items: result.invoice.items,
        shipping: result.invoice.shipping,
        discountType: result.invoice.diskon_type,
        discountValue: result.invoice.diskon_value,
        discountLabel: result.invoice.diskon_label,
        discount2Type: result.invoice.diskon_2_type,
        discount2Value: result.invoice.diskon_2_value,
        discount2Label: result.invoice.diskon_2_label
      });
      setSharePayload({
        invoiceNumber: result.invoice.invoice_number,
        phone: result.invoice.customer.phone,
        text
      });
      setMessage("Invoice tersimpan sebagai sent. Pilih cara kirim invoice.");
      return;
    }

    setMessage(`Draft tersimpan: ${result.invoice.invoice_number}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveInvoice("draft");
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <form className="min-w-0 space-y-5 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tanggal</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setTanggal(event.target.value)}
              required
              type="date"
              value={tanggal}
            />
          </label>
          <div className="relative block">
            <span className="text-sm font-medium text-slate-700">Pembeli</span>
            <div className="mt-1 grid grid-cols-[minmax(0,1fr)_44px] gap-2">
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                onChange={(event) => setCustomerId(event.target.value)}
                required
                value={customerId}
              >
                <option value="">Pilih pembeli</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              <button
                aria-label="Cari pembeli"
                className="flex h-10 w-11 items-center justify-center rounded-md border border-slate-300 text-xl leading-none hover:bg-slate-100"
                onClick={() => {
                  setIsCustomerSearchOpen((current) => !current);
                  setCustomerSearch("");
                }}
                type="button"
              >
                🔍
              </button>
            </div>
            {isCustomerSearchOpen ? (
              <div className="absolute left-0 right-0 z-20 mt-2 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
                <div className="grid grid-cols-[minmax(0,1fr)_32px] gap-2">
                  <input
                    autoFocus
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    placeholder="Cari nama, HP, atau alamat"
                    type="search"
                    value={customerSearch}
                  />
                  <button
                    aria-label="Tutup pencarian pembeli"
                    className="rounded-md border border-slate-300 text-sm font-semibold hover:bg-slate-100"
                    onClick={() => setIsCustomerSearchOpen(false)}
                    type="button"
                  >
                    X
                  </button>
                </div>
                <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-slate-100">
                  {customerSearch.trim() ? (
                    customerSearchResults.length > 0 ? (
                      customerSearchResults.map((customer) => (
                        <button
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                          key={customer.id}
                          onClick={() => {
                            setCustomerId(customer.id);
                            setCustomerSearch("");
                            setIsCustomerSearchOpen(false);
                          }}
                          type="button"
                        >
                          <span className="block font-medium text-ink">{customer.name}</span>
                          <span className="block truncate text-xs text-slate-500">{customer.phone}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-slate-500">Pembeli tidak ditemukan.</p>
                    )
                  ) : (
                    <p className="px-3 py-2 text-sm text-slate-500">Ketik kata kunci pembeli.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 rounded-md border border-slate-200 p-3 sm:p-4">
          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0 space-y-2">
              <div className="relative">
                <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-2">
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    onChange={(event) => setBookId(event.target.value)}
                    value={bookId}
                  >
                    <option value="">Pilih buku</option>
                    {books.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title} - {formatRupiah(book.harga_jual)}
                      </option>
                    ))}
                  </select>
                  <button
                    aria-label="Cari buku"
                    className="flex h-10 w-11 items-center justify-center rounded-md border border-slate-300 text-xl leading-none hover:bg-slate-100"
                    onClick={() => {
                      setIsBookSearchOpen((current) => !current);
                      setBookSearch("");
                    }}
                    type="button"
                  >
                    🔍
                  </button>
                </div>
                {isBookSearchOpen ? (
                  <div className="absolute left-0 right-0 z-20 mt-2 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
                    <div className="grid grid-cols-[minmax(0,1fr)_32px] gap-2">
                      <input
                        autoFocus
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        onChange={(event) => setBookSearch(event.target.value)}
                        placeholder="Cari judul buku"
                        type="search"
                        value={bookSearch}
                      />
                      <button
                        aria-label="Tutup pencarian buku"
                        className="rounded-md border border-slate-300 text-sm font-semibold hover:bg-slate-100"
                        onClick={() => setIsBookSearchOpen(false)}
                        type="button"
                      >
                        X
                      </button>
                    </div>
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-slate-100">
                      {bookSearch.trim() ? (
                        bookSearchResults.length > 0 ? (
                          bookSearchResults.map((book) => (
                            <button
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                              key={book.id}
                              onClick={() => {
                                setBookId(book.id);
                                setBookSearch("");
                                setIsBookSearchOpen(false);
                              }}
                              type="button"
                            >
                              <span className="block font-medium text-ink">{book.title}</span>
                              <span className="block text-xs text-slate-500">{formatRupiah(book.harga_jual)}</span>
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-sm text-slate-500">Buku tidak ditemukan.</p>
                        )
                      ) : (
                        <p className="px-3 py-2 text-sm text-slate-500">Ketik judul buku.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium sm:self-end" onClick={addBook} type="button">
              Tambah
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {items.map((item) => (
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_76px_32px] items-center gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_88px_32px]" key={item.book_id}>
                <span className="min-w-0 truncate font-medium text-ink">{item.title}</span>
                <input
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  min="1"
                  onChange={(event) => updateQty(item.book_id, Number(event.target.value))}
                  type="number"
                  value={item.qty}
                />
                <button
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                  onClick={() => setItems((current) => current.filter((candidate) => candidate.book_id !== item.book_id))}
                  type="button"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Ongkir</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setShippingId(event.target.value)}
              value={shippingId}
            >
              <option value="">Tanpa ongkir</option>
              {shippings.map((shipping) => (
                <option key={shipping.id} value={shipping.id}>
                  {shipping.ekspedisi} - {formatRupiah(shipping.tarif)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nama Diskon 1</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setDiscountLabel(event.target.value)}
              placeholder="Diskon"
              type="text"
              value={discountLabel}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tipe Diskon 1</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setDiscountType(event.target.value as DiscountType)}
              value={discountType}
            >
              <option value="nominal">Nominal</option>
              <option value="persen">Persen</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nilai Diskon 1</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              min="0"
              onChange={(event) => setDiscountValue(event.target.value)}
              type="number"
              value={discountValue}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nama Diskon 2</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setDiscount2Label(event.target.value)}
              placeholder="Diskon 2"
              type="text"
              value={discount2Label}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tipe Diskon 2</span>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setDiscount2Type(event.target.value as DiscountType)}
              value={discount2Type}
            >
              <option value="nominal">Nominal</option>
              <option value="persen">Persen</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nilai Diskon 2</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              min="0"
              onChange={(event) => setDiscount2Value(event.target.value)}
              type="number"
              value={discount2Value}
            />
          </label>
        </div>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">{message}</p> : null}
        <div className="flex flex-wrap gap-2">
          {editingInvoiceId ? (
            <span className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
              Edit {lastInvoiceNumber}
            </span>
          ) : null}
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            Simpan Draft
          </button>
          <button
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => saveInvoice("sent")}
            type="button"
          >
            Kirim
          </button>
        </div>
      </form>

      <aside className="min-w-0 rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
          <span className="text-slate-500">Subtotal Produk</span>
          <span className="text-right font-medium">{formatRupiah(totals.subtotal)}</span>
          <span className="text-slate-500">Diskon</span>
          <span className="text-right font-medium">- {formatRupiah(totals.discount)}</span>
          <span className="text-slate-500">Ongkir</span>
          <span className="text-right font-medium">{formatRupiah(totals.shippingCost)}</span>
          <span className="text-slate-500">Total</span>
          <span className="text-right font-bold">{formatRupiah(totals.total)}</span>
        </div>
        <pre className="min-h-[360px] max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-50 sm:min-h-[480px]">
          {previewText || "Pilih pembeli dan buku untuk melihat preview invoice."}
        </pre>
      </aside>
      {sharePayload ? (
        <ShareInvoiceDialog
          invoiceNumber={sharePayload.invoiceNumber}
          onComplete={() => {
            resetInvoiceForm();
            setMessage("Invoice selesai diproses. Form dan preview sudah dikosongkan.");
          }}
          onClose={() => setSharePayload(null)}
          phone={sharePayload.phone}
          text={sharePayload.text}
        />
      ) : null}
    </div>
  );
}
