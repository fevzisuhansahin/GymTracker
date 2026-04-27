-- =========================================================
-- Postgres role-level GRANT'leri.
-- Supabase API erişimi için anon/authenticated/service_role rollerinin
-- public şemasındaki tablolara temel SQL erişimi olması gerekir.
-- RLS policy'leri ikinci katman olarak satır bazında erişimi yine sınırlar.
-- service_role RLS'i bypass eder (Supabase varsayılan davranışı).
-- =========================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;

grant select on all tables in schema public to anon;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

grant execute on all functions in schema public
  to anon, authenticated, service_role;

-- Bu şemada gelecekte oluşturulacak objeler de aynı yetkileri alsın.
alter default privileges in schema public
  grant select, insert, update, delete on tables
  to authenticated, service_role;

alter default privileges in schema public
  grant select on tables to anon;

alter default privileges in schema public
  grant usage, select on sequences
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant execute on functions
  to anon, authenticated, service_role;
