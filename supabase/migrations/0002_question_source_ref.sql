alter table questions add column if not exists source_ref text unique;

insert into storage.buckets (id, name, public) values ('audio', 'audio', true)
on conflict (id) do nothing;
