alter table invoices add column if not exists diskon_label text not null default 'Diskon';
alter table invoices add column if not exists diskon_2_type text not null default 'nominal';
alter table invoices add column if not exists diskon_2_value integer not null default 0;
alter table invoices add column if not exists diskon_2_label text not null default 'Diskon 2';

alter table invoices drop constraint if exists invoices_diskon_2_type_check;
alter table invoices add constraint invoices_diskon_2_type_check check (diskon_2_type in ('persen', 'nominal'));

alter table invoices drop constraint if exists invoices_diskon_2_value_check;
alter table invoices add constraint invoices_diskon_2_value_check check (diskon_2_value >= 0);
