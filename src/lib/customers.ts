import type { Customer } from "@/types";

export type CustomerInput = Pick<Customer, "name" | "phone" | "address">;

export function sanitizeCustomerInput(input: Partial<Record<keyof CustomerInput, unknown>>) {
  return {
    name: typeof input.name === "string" ? input.name.trim() : "",
    phone: typeof input.phone === "string" ? input.phone.trim() : "",
    address: typeof input.address === "string" ? input.address.trim() : ""
  };
}

export function validateCustomerInput(input: CustomerInput) {
  if (!input.name || !input.phone || !input.address) {
    return {
      ok: false,
      message: "Nama, nomor WhatsApp, dan alamat wajib diisi."
    };
  }

  if (!/^[+\d][\d\s()+-]{7,}$/.test(input.phone)) {
    return {
      ok: false,
      message: "Format nomor WhatsApp tidak valid."
    };
  }

  return {
    ok: true,
    message: ""
  };
}
