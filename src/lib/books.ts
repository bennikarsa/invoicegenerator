import type { AdminProduct } from "@/types";

export type AdminProductInput = Pick<AdminProduct, "title" | "harga_modal" | "harga_komunitas" | "harga_jual">;
export type PublicProductInput = Pick<AdminProduct, "title" | "harga_komunitas" | "harga_jual">;

function parsePrice(value: unknown) {
  const normalized =
    typeof value === "string"
      ? value.trim().replace(/[^\d-]/g, "")
      : value;
  const parsed = typeof normalized === "number" ? normalized : typeof normalized === "string" ? Number(normalized) : Number.NaN;
  return Number.isFinite(parsed) ? Math.floor(parsed) : Number.NaN;
}

export function sanitizeAdminProductInput(input: Partial<Record<keyof AdminProductInput, unknown>>) {
  return {
    title: typeof input.title === "string" ? input.title.trim() : "",
    harga_modal: parsePrice(input.harga_modal),
    harga_komunitas: parsePrice(input.harga_komunitas),
    harga_jual: parsePrice(input.harga_jual)
  };
}

export function validateAdminProductInput(input: AdminProductInput) {
  if (!input.title) {
    return {
      ok: false,
      message: "Nama produk wajib diisi."
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

export function sanitizePublicProductInput(input: Partial<Record<keyof PublicProductInput, unknown>>) {
  return {
    title: typeof input.title === "string" ? input.title.trim() : "",
    harga_komunitas: parsePrice(input.harga_komunitas),
    harga_jual: parsePrice(input.harga_jual)
  };
}

export function validatePublicProductInput(input: PublicProductInput) {
  if (!input.title) {
    return {
      ok: false,
      message: "Nama produk wajib diisi."
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
