-- Add display name and avatar color to user profiles.
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists avatar_color text not null default 'sky';
