-- One statement, one result set. The Supabase editor only displays the last
-- query's output, so everything worth seeing has to arrive together.
-- Send me this whole table.

select 'bucket' as what,
       jsonb_build_object(
         'id', b.id, 'public', b.public, 'type', b.type,
         'file_size_limit', b.file_size_limit,
         'allowed_mime_types', b.allowed_mime_types
       ) as detail
from storage.buckets b
where b.id = 'project-media'

union all

select 'rls',
       jsonb_build_object('enabled', c.relrowsecurity, 'forced', c.relforcerowsecurity)
from pg_class c
where c.relname = 'objects' and c.relnamespace = 'storage'::regnamespace

union all

select 'policy',
       jsonb_build_object(
         'name', p.policyname, 'cmd', p.cmd,
         'permissive', p.permissive,          -- RESTRICTIVE here would be the culprit
         'roles', p.roles::text,
         'using', p.qual, 'with_check', p.with_check
       )
from pg_policies p
where p.schemaname = 'storage' and p.tablename = 'objects'

union all

-- Did anything ever actually land in the bucket?
select 'objects_in_bucket',
       jsonb_build_object('count', count(*))
from storage.objects
where bucket_id = 'project-media';
