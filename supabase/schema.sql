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

create or replace function public.save_invoice_with_items(
  p_invoice_id uuid,
  p_customer_id uuid,
  p_shipping_id uuid,
  p_tanggal date,
  p_diskon_type text,
  p_diskon_value integer,
  p_diskon_label text,
  p_diskon_2_type text,
  p_diskon_2_value integer,
  p_diskon_2_label text,
  p_status text,
  p_items jsonb
)
returns table (invoice_id uuid, invoice_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_invoice_number text;
  v_existing_status text;
  v_month_code text;
  v_prefix text;
  v_sequence integer;
begin
  if p_status not in ('draft', 'sent') then
    raise exception 'Status invoice tidak valid.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Invoice wajib berisi minimal 1 produk.';
  end if;

  if p_invoice_id is null then
    v_month_code := to_char(p_tanggal, 'YYMM');
    v_prefix := 'INV' || v_month_code;
    perform pg_advisory_xact_lock(hashtext('invoice-number-' || v_month_code));

    select coalesce(max(substring(invoices.invoice_number from char_length(v_prefix) + 1)::integer), 0) + 1
      into v_sequence
      from invoices
      where invoices.invoice_number like v_prefix || '%';

    v_invoice_number := v_prefix || lpad(v_sequence::text, 3, '0');

    insert into invoices (
      invoice_number, customer_id, shipping_id, tanggal,
      diskon_type, diskon_value, diskon_label,
      diskon_2_type, diskon_2_value, diskon_2_label, status
    )
    values (
      v_invoice_number, p_customer_id, p_shipping_id, p_tanggal,
      p_diskon_type, p_diskon_value, p_diskon_label,
      p_diskon_2_type, p_diskon_2_value, p_diskon_2_label, p_status
    )
    returning invoices.id into v_invoice_id;
  else
    select invoices.status, invoices.invoice_number
      into v_existing_status, v_invoice_number
      from invoices
      where invoices.id = p_invoice_id
      for update;

    if not found then
      raise exception 'Invoice tidak ditemukan.';
    end if;

    if v_existing_status <> 'draft' then
      raise exception 'Invoice yang sudah dikirim tidak dapat diedit.';
    end if;

    v_invoice_id := p_invoice_id;
    update invoices
      set customer_id = p_customer_id,
          shipping_id = p_shipping_id,
          tanggal = p_tanggal,
          diskon_type = p_diskon_type,
          diskon_value = p_diskon_value,
          diskon_label = p_diskon_label,
          diskon_2_type = p_diskon_2_type,
          diskon_2_value = p_diskon_2_value,
          diskon_2_label = p_diskon_2_label,
          status = p_status
      where invoices.id = v_invoice_id;

    delete from invoice_items where invoice_items.invoice_id = v_invoice_id;
  end if;

  insert into invoice_items (
    invoice_id, book_id, qty,
    harga_jual_snapshot, harga_komunitas_snapshot, harga_modal_snapshot
  )
  select
    v_invoice_id, item.book_id, item.qty,
    item.harga_jual_snapshot, item.harga_komunitas_snapshot, item.harga_modal_snapshot
  from jsonb_to_recordset(p_items) as item(
    book_id uuid,
    qty integer,
    harga_jual_snapshot integer,
    harga_komunitas_snapshot integer,
    harga_modal_snapshot integer
  );

  return query select v_invoice_id, v_invoice_number;
end;
$$;

revoke all on function public.save_invoice_with_items(
  uuid, uuid, uuid, date, text, integer, text, text, integer, text, text, jsonb
) from public, anon, authenticated;

grant execute on function public.save_invoice_with_items(
  uuid, uuid, uuid, date, text, integer, text, text, integer, text, text, jsonb
) to service_role;
