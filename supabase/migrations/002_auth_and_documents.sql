-- =============================================================================
-- 002_auth_and_documents.sql
-- =============================================================================
-- Seller accounts and ownership-document storage.
--
-- Build sheet P1-07 (document upload) and P1-25 (login and roles). Run after
-- 001_multi_category_listings.sql.
--
-- Authentication is email and password. Phone OTP is the natural choice for
-- this audience, but sending SMS to Indian numbers requires DLT registration,
-- which is weeks away and outside development. Switching later is a Supabase
-- setting plus a different sign-in form — no schema change.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. A profile row for every new account
-- -----------------------------------------------------------------------------
-- Without this, a signed-up user has no profile, so has_role() and is_staff()
-- return false and every policy that depends on them silently denies. New
-- accounts default to 'seller'; staff roles are granted by an administrator.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'seller'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this migration.
insert into public.profiles (id, role)
select u.id, 'seller'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- -----------------------------------------------------------------------------
-- 2. Private bucket for ownership documents
-- -----------------------------------------------------------------------------
-- EC, RTC, Khata and mutation are land ownership records. The bucket is
-- private: a public URL for these would be considerably worse than the phone
-- number exposure this project already had to fix.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-documents',
  'listing-documents',
  false,
  10485760,  -- 10 MB; a scanned RTC is well under this
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Objects are stored as <listing_id>/<document_type>.<ext>, so the first path
-- segment identifies the listing and can be joined back to ownership.

create policy "sellers upload their own listing documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-documents'
    and exists (
      select 1 from public.listings l
      where l.id::text = (storage.foldername(name))[1]
        and l.seller_id = auth.uid()
    )
  );

create policy "sellers read their own listing documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'listing-documents'
    and (
      public.is_staff()
      or exists (
        select 1 from public.listings l
        where l.id::text = (storage.foldername(name))[1]
          and l.seller_id = auth.uid()
      )
    )
  );

create policy "sellers replace their own listing documents"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'listing-documents'
    and exists (
      select 1 from public.listings l
      where l.id::text = (storage.foldername(name))[1]
        and l.seller_id = auth.uid()
    )
  );

create policy "staff manage listing documents"
  on storage.objects for all to authenticated
  using (bucket_id = 'listing-documents' and public.is_staff())
  with check (bucket_id = 'listing-documents' and public.is_staff());

-- -----------------------------------------------------------------------------
-- 3. Submit for verification
-- -----------------------------------------------------------------------------
-- A seller cannot set their own listing to 'verified' — the update policy in
-- 001 restricts them to draft and pending_verification. This function is the
-- only route from draft to review, and it refuses to move a listing that has
-- not supplied all four documents.

create or replace function public.submit_for_verification(target_listing uuid)
returns public.listing_status
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id  uuid;
  doc_count integer;
begin
  select seller_id into owner_id from public.listings where id = target_listing;

  if owner_id is null then
    raise exception 'Listing not found';
  end if;

  if owner_id <> auth.uid() then
    raise exception 'Not your listing';
  end if;

  select count(distinct document_type) into doc_count
  from public.listing_documents
  where listing_id = target_listing;

  if doc_count < 4 then
    raise exception
      'All four documents are required before submission — % of 4 uploaded', doc_count;
  end if;

  update public.listings
     set status = 'pending_verification'
   where id = target_listing;

  return 'pending_verification';
end;
$$;

revoke all on function public.submit_for_verification(uuid) from public;
grant execute on function public.submit_for_verification(uuid) to authenticated;

-- =============================================================================
-- End of 002.
-- =============================================================================
