alter table books add column if not exists deleted_at timestamp with time zone;
alter table customers add column if not exists deleted_at timestamp with time zone;
alter table shippings add column if not exists deleted_at timestamp with time zone;

create index if not exists books_deleted_at_idx on books(deleted_at);
create index if not exists customers_deleted_at_idx on customers(deleted_at);
create index if not exists shippings_deleted_at_idx on shippings(deleted_at);
