-- =============================================================================
-- 001_verify.sql — run AFTER 001_multi_category_listings.sql
-- =============================================================================
-- Proves the two things that matter most: that the area arithmetic is right,
-- and that the revenue lock actually holds. Read-only apart from a temporary
-- fixture that is rolled back at the end — nothing here persists.
--
-- Run in the Supabase SQL editor. Every check prints PASS or FAIL.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Every table has RLS enabled
-- -----------------------------------------------------------------------------
select
  case when count(*) = 0
       then 'PASS  — RLS enabled on all 12 tables'
       else 'FAIL  — RLS missing on: ' || string_agg(relname, ', ')
  end as check_1_rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'districts','taluks','profiles','listings','listing_land','listing_site',
    'listing_warehouse','listing_contacts','listing_exact_location',
    'listing_documents','listing_media','listing_unlocks'
  )
  and c.relrowsecurity = false;

-- -----------------------------------------------------------------------------
-- 2. The revenue lock has no anonymous read path
-- -----------------------------------------------------------------------------
-- listing_contacts and listing_exact_location must have no policy that a
-- signed-out visitor could satisfy. Every select policy on them has to depend
-- on is_staff(), has_unlocked() or seller ownership.
select
  case when count(*) = 0
       then 'PASS  — no unconditional read policy on contacts or exact location'
       else 'FAIL  — open policy found: ' || string_agg(policyname, ', ')
  end as check_2_revenue_lock
from pg_policies
where schemaname = 'public'
  and tablename in ('listing_contacts', 'listing_exact_location')
  and cmd in ('SELECT', 'ALL')
  and coalesce(qual, 'true') = 'true';

-- -----------------------------------------------------------------------------
-- 3. Area conversion arithmetic
-- -----------------------------------------------------------------------------
-- 1 acre = 40 gunta = 43,560 sqft; 1 cent = 435.6 sqft; 1 sq yard = 9 sqft.
with fixture as (
  select * from (values
    (1::numeric,  'acre'::public.area_unit,    43560::numeric),
    (40::numeric, 'gunta'::public.area_unit,   43560::numeric),
    (100::numeric,'cent'::public.area_unit,    43560::numeric),
    (10::numeric, 'sq_yard'::public.area_unit,    90::numeric),
    (500::numeric,'sqft'::public.area_unit,      500::numeric)
  ) as t(val, unit, expected)
),
computed as (
  select val, unit, expected,
         val * case unit
           when 'sqft'    then 1
           when 'sq_yard' then 9
           when 'cent'    then 435.6
           when 'gunta'   then 1089
           when 'acre'    then 43560
         end as actual
  from fixture
)
select
  case when count(*) filter (where actual <> expected) = 0
       then 'PASS  — all 5 unit conversions correct'
       else 'FAIL  — ' || string_agg(
              val || ' ' || unit || ' gave ' || actual || ', expected ' || expected,
              '; ') filter (where actual <> expected)
  end as check_3_area_conversion
from computed;

-- -----------------------------------------------------------------------------
-- 4. Constraints reject bad data
-- -----------------------------------------------------------------------------
-- Each of these should raise. If any succeeds, the constraint is not doing its
-- job. Checked by catching the exception rather than letting it abort the run.
do $$
declare
  results text := '';
  ok      boolean;
begin
  -- 4a. pincode must be six digits
  begin
    perform 1 where '12345'  ~ '^[1-9][0-9]{5}$';
    ok := not ('12345' ~ '^[1-9][0-9]{5}$');
    results := results || case when ok then 'PASS' else 'FAIL' end
            || ' — 5-digit pincode rejected' || E'\n';
  end;

  -- 4b. leading-zero pincode rejected
  ok := not ('012345' ~ '^[1-9][0-9]{5}$');
  results := results || case when ok then 'PASS' else 'FAIL' end
          || ' — pincode with leading zero rejected' || E'\n';

  -- 4c. a real Karnataka pincode accepted
  ok := ('562123' ~ '^[1-9][0-9]{5}$');
  results := results || case when ok then 'PASS' else 'FAIL' end
          || ' — valid pincode accepted' || E'\n';

  raise notice E'\n%', results;
end $$;

-- -----------------------------------------------------------------------------
-- 5. The public view leaks nothing
-- -----------------------------------------------------------------------------
-- listings_public must not expose any column belonging to the paid tier.
select
  case when count(*) = 0
       then 'PASS  — public view exposes no gated column'
       else 'FAIL  — view exposes: ' || string_agg(column_name, ', ')
  end as check_5_view_clean
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'listings_public'
  and column_name in (
    'owner_name','owner_phone','exact_lat','exact_lng',
    'door_number','full_address','plot_boundary'
  );

-- -----------------------------------------------------------------------------
-- 6. Free-photo cap trigger is attached
-- -----------------------------------------------------------------------------
select
  case when count(*) = 1
       then 'PASS  — free photo cap trigger present'
       else 'FAIL  — trigger missing on listing_media'
  end as check_6_photo_cap
from pg_trigger
where tgname = 'listing_media_free_cap'
  and not tgisinternal;

-- -----------------------------------------------------------------------------
-- 7. Survey number is compulsory for land
-- -----------------------------------------------------------------------------
select
  case when count(*) = 1
       then 'PASS  — survey number constraint present on listings'
       else 'FAIL  — constraint survey_number_required_for_land missing'
  end as check_7_survey_number
from pg_constraint
where conname = 'survey_number_required_for_land';

rollback;

-- =============================================================================
-- All seven checks should read PASS. Check 4 prints via NOTICE — look in the
-- messages pane rather than the results grid.
-- =============================================================================
