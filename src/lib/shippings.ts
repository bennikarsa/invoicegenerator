import type { Shipping } from "@/types";

export type ShippingInput = Pick<Shipping, "ekspedisi" | "tarif">;

export function sanitizeShippingInput(input: Partial<Record<keyof ShippingInput, unknown>>) {
  const parsedTarif =
    typeof input.tarif === "number"
      ? input.tarif
      : typeof input.tarif === "string"
        ? Number(input.tarif)
        : Number.NaN;

  return {
    ekspedisi: typeof input.ekspedisi === "string" ? input.ekspedisi.trim() : "",
    tarif: Number.isFinite(parsedTarif) ? Math.floor(parsedTarif) : Number.NaN
  };
}

export function validateShippingInput(input: ShippingInput) {
  if (!input.ekspedisi) {
    return {
      ok: false,
      message: "Nama ekspedisi wajib diisi."
    };
  }

  if (!Number.isInteger(input.tarif) || input.tarif < 0) {
    return {
      ok: false,
      message: "Tarif ongkir harus berupa angka non-negatif."
    };
  }

  return {
    ok: true,
    message: ""
  };
}
