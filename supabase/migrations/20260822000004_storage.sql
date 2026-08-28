-- Haka på — lagringshinkar för bilder
--
-- Bildkravet i appen (profilbild, omslagsbild) gör att lagringen är en del av
-- kärnflödet, inte ett tillägg. Tre hinkar med olika öppenhet:
--   avatars, activity-covers  — publikt läsbara, syns i flödet
--   chat-images               — privat, nås bara med signerad URL av trådmedlem

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',         'avatars',         true,  5  * 1024 * 1024,
     array['image/jpeg','image/png','image/webp','image/heic']),
  ('activity-covers', 'activity-covers', true,  8  * 1024 * 1024,
     array['image/jpeg','image/png','image/webp','image/heic']),
  ('chat-images',     'chat-images',     false, 10 * 1024 * 1024,
     array['image/jpeg','image/png','image/webp','image/heic','image/gif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Sökvägskonvention: <bucket>/<user_id>/<filnamn>. Första mappnivån är alltid
-- ägarens uuid, vilket gör ägarskapskontrollen till en enkel jämförelse.

create policy "avatarer är publikt läsbara" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "ladda upp egen avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "byt ut egen avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "radera egen avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "omslagsbilder är publikt läsbara" on storage.objects
  for select using (bucket_id = 'activity-covers');

create policy "ladda upp eget omslag" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'activity-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "radera eget omslag" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'activity-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Chattbilder: mappnivå 1 är tråden, nivå 2 avsändaren. Läsning kräver
-- medlemskap i tråden, uppladdning kräver dessutom att du är avsändaren.
create policy "läs chattbilder i dina trådar" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-images'
    and is_thread_member(
          ((storage.foldername(name))[1])::uuid,
          (select auth.uid())
        )
  );

create policy "ladda upp chattbild i dina trådar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and is_thread_member(
          ((storage.foldername(name))[1])::uuid,
          (select auth.uid())
        )
  );

create policy "radera egen chattbild" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
