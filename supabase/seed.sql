insert into chapters (slug, title, description, display_order)
values ('navigation', 'Navigation', 'VOR, GPS, charts, and dead reckoning.', 3)
on conflict (slug) do nothing;

with ch as (select id from chapters where slug = 'navigation')
insert into questions (chapter_id, stem, acs_code, display_order, content_version)
select ch.id,
  'While checking a VOR receiver with a VOT, the CDI centers. The OBS and TO/FROM indicator should read:',
  'PA.VI.B', 1, 'seed-v1'
from ch
on conflict do nothing;
