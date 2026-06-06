export type UserRole = "admin" | "komunitas";

export type BookBase = {
  id: string;
  title: string;
  harga_komunitas: number;
  harga_jual: number;
  created_at: string;
};

export type AdminBook = BookBase & {
  harga_modal: number;
};

export type BookForRole<Role extends UserRole> = Role extends "admin" ? AdminBook : BookBase;

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  created_at: string;
};

export type Shipping = {
  id: string;
  ekspedisi: string;
  tarif: number;
  created_at: string;
};

export type InvoiceStatus = "draft" | "sent";
export type DiscountType = "persen" | "nominal";

export type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string;
  shipping_id: string | null;
  tanggal: string;
  diskon_type: DiscountType;
  diskon_value: number;
  status: InvoiceStatus;
  created_at: string;
};

export type InvoiceItemBase = {
  id: string;
  invoice_id: string;
  book_id: string;
  title: string;
  qty: number;
  harga_jual_snapshot: number;
  harga_komunitas_snapshot: number;
};

export type AdminInvoiceItem = InvoiceItemBase & {
  harga_modal_snapshot: number;
};

export type InvoiceItemForRole<Role extends UserRole> = Role extends "admin"
  ? AdminInvoiceItem
  : InvoiceItemBase;

export type InvoiceSettings = {
  header_text: string;
  footer_text: string;
  nama_pengirim: string;
  hp_pengirim: string;
  rekening: string;
};

export type InvoiceDetailForRole<Role extends UserRole = UserRole> = Invoice & {
  customer: Customer;
  shipping: Shipping | null;
  items: InvoiceItemForRole<Role>[];
};
