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
      invoice_number,
      customer_id,
      shipping_id,
      tanggal,
      diskon_type,
      diskon_value,
      diskon_label,
      diskon_2_type,
      diskon_2_value,
      diskon_2_label,
      status
    )
    values (
      v_invoice_number,
      p_customer_id,
      p_shipping_id,
      p_tanggal,
      p_diskon_type,
      p_diskon_value,
      p_diskon_label,
      p_diskon_2_type,
      p_diskon_2_value,
      p_diskon_2_label,
      p_status
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
    invoice_id,
    book_id,
    qty,
    harga_jual_snapshot,
    harga_komunitas_snapshot,
    harga_modal_snapshot
  )
  select
    v_invoice_id,
    item.book_id,
    item.qty,
    item.harga_jual_snapshot,
    item.harga_komunitas_snapshot,
    item.harga_modal_snapshot
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
