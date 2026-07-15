create extension if not exists pgcrypto;

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  harga_modal integer not null check (harga_modal >= 0),
  harga_komunitas integer not null check (harga_komunitas >= 0),
  harga_jual integer not null check (harga_jual >= 0),
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  address text not null,
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone
);

create table if not exists shippings (
  id uuid primary key default gen_random_uuid(),
  ekspedisi text not null,
  tarif integer not null check (tarif >= 0),
  created_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_id uuid not null references customers(id) on update cascade on delete restrict,
  shipping_id uuid references shippings(id) on update cascade on delete set null,
  tanggal date not null,
  diskon_type text not null check (diskon_type in ('persen', 'nominal')),
  diskon_value integer not null default 0 check (diskon_value >= 0),
  diskon_label text not null default 'Diskon',
  diskon_2_type text not null default 'nominal' check (diskon_2_type in ('persen', 'nominal')),
  diskon_2_value integer not null default 0 check (diskon_2_value >= 0),
  diskon_2_label text not null default 'Diskon 2',
  status text not null check (status in ('draft', 'sent', 'done', 'void')),
  created_at timestamp with time zone not null default now()
);

alter table invoices add column if not exists diskon_label text not null default 'Diskon';
alter table invoices add column if not exists diskon_2_type text not null default 'nominal';
alter table invoices add column if not exists diskon_2_value integer not null default 0;
alter table invoices add column if not exists diskon_2_label text not null default 'Diskon 2';

alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check check (status in ('draft', 'sent', 'done', 'void'));
alter table invoices drop constraint if exists invoices_diskon_2_type_check;
alter table invoices add constraint invoices_diskon_2_type_check check (diskon_2_type in ('persen', 'nominal'));
alter table invoices drop constraint if exists invoices_diskon_2_value_check;
alter table invoices add constraint invoices_diskon_2_value_check check (diskon_2_value >= 0);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on update cascade on delete cascade,
  book_id uuid not null references books(id) on update cascade on delete restrict,
  qty integer not null check (qty > 0),
  harga_jual_snapshot integer not null check (harga_jual_snapshot >= 0),
  harga_komunitas_snapshot integer not null check (harga_komunitas_snapshot >= 0),
  harga_modal_snapshot integer not null check (harga_modal_snapshot >= 0)
);

create table if not exists settings (
  key text primary key,
  value text not null
);

create index if not exists books_title_idx on books using gin (to_tsvector('simple', title));
create index if not exists customers_name_idx on customers using gin (to_tsvector('simple', name));
create index if not exists customers_phone_idx on customers(phone);
create index if not exists shippings_ekspedisi_idx on shippings using gin (to_tsvector('simple', ekspedisi));
create index if not exists invoices_status_tanggal_idx on invoices(status, tanggal);
create index if not exists invoices_customer_id_idx on invoices(customer_id);
create index if not exists invoices_invoice_number_idx on invoices(invoice_number);
create index if not exists invoice_items_invoice_id_idx on invoice_items(invoice_id);
create index if not exists invoice_items_book_id_idx on invoice_items(book_id);

alter table books add column if not exists deleted_at timestamp with time zone;
alter table customers add column if not exists deleted_at timestamp with time zone;
alter table shippings add column if not exists deleted_at timestamp with time zone;

create index if not exists books_deleted_at_idx on books(deleted_at);
create index if not exists customers_deleted_at_idx on customers(deleted_at);
create index if not exists shippings_deleted_at_idx on shippings(deleted_at);

insert into settings (key, value)
values
  ('header_text', 'INVOICE WAR FLP BATCH 17'),
  ('footer_text', 'Silahkan transfer ke rekening'),
  ('nama_pengirim', 'GERAI FLP'),
  ('hp_pengirim', '-'),
  ('rekening', '-')
on conflict (key) do nothing;
