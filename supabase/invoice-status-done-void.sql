alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check check (status in ('draft', 'sent', 'done', 'void'));
