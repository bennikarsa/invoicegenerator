import type { AdminBook } from "@/types";

export type AdminBookInput = Pick<AdminBook, "title" | "harga_modal" | "harga_komunitas" | "harga_jual">;
export type PublicBookInput = Pick<AdminBook, "title" | "harga_komunitas" | "harga_jual">;

function parsePrice(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.floor(parsed) : Number.NaN;
}

export function sanitizeAdminBookInput(input: Partial<Record<keyof AdminBookInput, unknown>>) {
  return {
    title: typeof input.title === "string" ? input.title.trim() : "",
    harga_modal: parsePrice(input.harga_modal),
    harga_komunitas: parsePrice(input.harga_komunitas),
    harga_jual: parsePrice(input.harga_jual)
  };
}

export function validateAdminBookInput(input: AdminBookInput) {
  if (!input.title) {
    return {
      ok: false,
      message: "Judul buku wajib diisi."
    };
  }

  const prices = [input.harga_modal, input.harga_komunitas, input.harga_jual];

  if (prices.some((price) => !Number.isInteger(price) || price < 0)) {
    return {
      ok: false,
      message: "Semua harga harus berupa angka non-negatif."
    };
  }

  return {
    ok: true,
    message: ""
  };
}

export function sanitizePublicBookInput(input: Partial<Record<keyof PublicBookInput, unknown>>) {
  return {
    title: typeof input.title === "string" ? input.title.trim() : "",
    harga_komunitas: parsePrice(input.harga_komunitas),
    harga_jual: parsePrice(input.harga_jual)
  };
}

export function validatePublicBookInput(input: PublicBookInput) {
  if (!input.title) {
    return {
      ok: false,
      message: "Judul buku wajib diisi."
    };
  }

  const prices = [input.harga_komunitas, input.harga_jual];

  if (prices.some((price) => !Number.isInteger(price) || price < 0)) {
    return {
      ok: false,
      message: "Harga komunitas dan harga jual harus berupa angka non-negatif."
    };
  }

  return {
    ok: true,
    message: ""
  };
}
