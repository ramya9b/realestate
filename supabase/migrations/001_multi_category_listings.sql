-- =============================================================================
-- 001_multi_category_listings.sql
-- =============================================================================
-- Karnataka land, sites and warehouse platform — foundation schema.
--
-- Basis:  Field confirmation checklist (whiteboard, 23 July 2026), all rows
--         taken as KEEP, including the four fields marked "not on the
--         whiteboard": survey number, standing crop or trees, clear height,
--         power load.
--
-- Model:  Option C — land brokerage. Owner phone and exact location are the
--         revenue, so they live in their own tables and are gated by row
--         permission, never by application code.
--
-- Scope:  Build sheet items F-01 to F-12. Deals, agents, invoices and the
--         0.75% pipeline are Part 2 and land in 002.
--
-- Column comments carry the checklist section each field came from (A/B/C/D).
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

-- Categories in scope per Doc D. Rent and shop detail tables are deliberately
-- absent: the checklist covers only land, sites and warehouses, so their field
-- lists are not yet confirmed. See build sheet F-06.
create type public.listing_category as enum (
  'land', 'site', 'warehouse', 'rent', 'shop'
);

create type public.listing_status as enum (
  'draft',                -- seller still editing
  'pending_verification', -- submitted, documents awaiting staff review
  'verified',             -- live and publicly visible
  'rejected',             -- documents failed review
  'blocked',              -- deal in progress, removed from active results
  'sold'
);

-- Section A — area units. Canonical conversion below is built on the confirmed
-- assumption 1 acre = 40 gunta = 43,560 sqft (checklist section E, item 1).
create type public.area_unit as enum (
  'sqft', 'sq_yard', 'cent', 'gunta', 'acre'
);

-- Section A — price basis.
create type public.price_basis as enum (
  'total', 'per_sqft', 'per_gunta', 'per_acre', 'per_month'
);

-- Section A — zone. Multi-select ("tick any").
create type public.zone_type as enum (
  'residential', 'commercial', 'industrial', 'public_semi_public',
  'green', 'yellow', 'blue', 'grey'
);

-- Sections B and D — water source.
create type public.water_source as enum (
  'borewell', 'municipal', 'both', 'none'
);

-- Section B — land type.
create type public.land_type as enum (
  'green_land', 'dry_land', 'conversion_property'
);

-- Section C — approving authority. Multi-select; list confirmed.
create type public.approving_authority as enum (
  'bda', 'bmrda', 'dtcp', 'panchayat', 'rera'
);

-- Section C — layout amenities. Multi-select.
create type public.layout_amenity as enum (
  'park', 'club_house', 'gym', 'swimming_pool', 'play_ground'
);

create type public.document_type as enum (
  'ec', 'rtc', 'khata', 'mutation'
);

create type public.document_status as enum (
  'pending', 'approved', 'rejected'
);

create type public.media_type as enum (
  'photo', 'video'
);

-- What a payment releases. Prices are configuration, not schema — the amounts
-- are still to be supplied and must not be baked in here.
create type public.unlock_scope as enum (
  'photos', 'video', 'contact', 'combo'
);

create type public.user_role as enum (
  'admin', 'verifier', 'agent', 'seller', 'buyer'
);

-- =============================================================================
-- 2. GEOGRAPHY  (F-01)
-- =============================================================================
-- Village stays free text per the checklist. District and taluk are dropdowns,
-- with taluk filtered by district. Seed rows for the launch district are data,
-- not schema, and arrive separately.

create table public.districts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_kn     text,
  state       text not null default 'Karnataka',
  created_at  timestamptz not null default now(),
  unique (state, name)
);

create table public.taluks (
  id           uuid primary key default gen_random_uuid(),
  district_id  uuid not null references public.districts(id) on delete restrict,
  name         text not null,
  name_kn      text,
  created_at   timestamptz not null default now(),
  unique (district_id, name)
);

create index taluks_district_idx on public.taluks (district_id);

-- =============================================================================
-- 3. PROFILES AND ROLE HELPERS  (P1-25)
-- =============================================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        public.user_role not null default 'seller',
  created_at  timestamptz not null default now()
);

-- SECURITY DEFINER so policies can check a role without recursing into the
-- RLS on profiles itself.
create or replace function public.has_role(check_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = check_role
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'verifier')
  );
$$;

-- =============================================================================
-- 4. LISTINGS — shared fields  (F-02, checklist section A)
-- =============================================================================

create table public.listings (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references auth.users(id) on delete restrict,
  category      public.listing_category not null,
  status        public.listing_status not null default 'draft',

  title         text,

  -- Section A — identification
  survey_number text,

  -- Section A — geography
  state         text not null default 'Karnataka',
  district_id   uuid not null references public.districts(id) on delete restrict,
  taluk_id      uuid not null references public.taluks(id)     on delete restrict,
  village_city  text not null,
  pincode       text,

  -- Section A — approximate location only. The exact pin, plot boundary and
  -- door number live in listing_exact_location and are released on payment.
  approx_lat    numeric(9,6),
  approx_lng    numeric(9,6),

  -- Section A — surroundings
  nearest_landmark            text,
  distance_from_main_road_m   numeric(10,2),  -- metres, per the proposal
  nearest_places              text,
  distance_bus_stand_km       numeric(6,2),
  distance_hospital_km        numeric(6,2),
  distance_market_km          numeric(6,2),

  -- Section A — size. area_sqft is derived so that range filters and sorting
  -- work across mixed units without the caller converting anything.
  area_value    numeric(14,4) not null,
  area_unit     public.area_unit not null,
  area_sqft     numeric(16,4) generated always as (
                  area_value * case area_unit
                    when 'sqft'    then 1
                    when 'sq_yard' then 9
                    when 'cent'    then 435.6
                    when 'gunta'   then 1089
                    when 'acre'    then 43560
                  end
                ) stored,

  -- Section A — price
  price_amount  numeric(16,2) not null,
  price_basis   public.price_basis not null,
  negotiable    boolean not null default false,

  -- Section A — zone, multi-select
  zones         public.zone_type[] not null default '{}',

  description   text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  verified_at   timestamptz,

  constraint pincode_is_six_digits
    check (pincode is null or pincode ~ '^[1-9][0-9]{5}$'),

  -- Confirmed in the checklist: survey number compulsory for land.
  constraint survey_number_required_for_land
    check (category <> 'land' or survey_number is not null),

  constraint area_value_positive  check (area_value  > 0),
  constraint price_amount_positive check (price_amount > 0)
);

comment on column public.listings.distance_from_main_road_m is
  'Section A. Whiteboard did not state the unit; metres confirmed.';
comment on column public.listings.area_sqft is
  'Derived. 1 acre = 40 gunta = 43,560 sqft; 1 cent = 435.6 sqft; 1 sq yard = 9 sqft.';

create index listings_public_browse_idx
  on public.listings (status, district_id, taluk_id, category);
create index listings_survey_number_idx
  on public.listings (survey_number) where survey_number is not null;
create index listings_area_idx  on public.listings (area_sqft);
create index listings_price_idx on public.listings (price_amount);
create index listings_seller_idx on public.listings (seller_id);
create index listings_zones_idx on public.listings using gin (zones);

-- =============================================================================
-- 5. CATEGORY DETAIL TABLES
-- =============================================================================

-- ---- F-03 · Section B — land and plots -------------------------------------
create table public.listing_land (
  listing_id                uuid primary key
                              references public.listings(id) on delete cascade,
  land_type                 public.land_type not null,
  converted_non_agricultural boolean not null default false,
  conversion_order_number   text,
  road_width_ft             numeric(6,2),
  borewells                 integer,
  water_source              public.water_source,
  electricity_connection    boolean,
  fenced                    boolean,
  standing_crop_or_trees    text,

  constraint conversion_order_present_when_converted
    check (converted_non_agricultural = false or conversion_order_number is not null),
  constraint borewells_non_negative check (borewells is null or borewells >= 0)
);

comment on column public.listing_land.standing_crop_or_trees is
  'Section B. Not on the whiteboard — added; affects green-land valuation.';

-- ---- F-04 · Section C — sites and layouts ----------------------------------
create table public.listing_site (
  listing_id            uuid primary key
                          references public.listings(id) on delete cascade,
  project_name          text,
  total_sites_available integer,
  site_number           text,
  site_length_ft        numeric(8,2),
  site_width_ft         numeric(8,2),
  sites_facing_east     integer not null default 0,
  sites_facing_west     integer not null default 0,
  sites_facing_north    integer not null default 0,
  sites_facing_south    integer not null default 0,
  corner_site           boolean not null default false,
  road_width_ft         integer,
  approved_by           public.approving_authority[] not null default '{}',
  amenities             public.layout_amenity[] not null default '{}',

  -- Four widths confirmed in checklist section E, item 4.
  constraint road_width_is_confirmed_value
    check (road_width_ft is null or road_width_ft in (30, 40, 60, 80)),
  constraint facing_counts_non_negative
    check (sites_facing_east  >= 0 and sites_facing_west  >= 0
       and sites_facing_north >= 0 and sites_facing_south >= 0)
);

create index listing_site_approved_by_idx on public.listing_site using gin (approved_by);
create index listing_site_amenities_idx   on public.listing_site using gin (amenities);

-- ---- F-05 · Section D — warehouse ------------------------------------------
-- Entire land area is not repeated here; it uses the shared area field on
-- listings, as the checklist specifies.
create table public.listing_warehouse (
  listing_id             uuid primary key
                           references public.listings(id) on delete cascade,
  converted              boolean not null default false,
  floor_area_sqft        numeric(14,2),   -- covered shed area
  number_of_entries      integer,
  number_of_docks        integer,
  dock_levellers         boolean,
  parking_available      boolean not null default false,
  parking_vehicle_count  integer,
  truck_size_feasible_ft integer,
  water_source           public.water_source,
  drainage_system        boolean,
  road_approach_width_ft numeric(6,2),
  has_canteen            boolean not null default false,
  has_conveyors          boolean not null default false,
  has_wash_rooms         boolean not null default false,
  has_fire_hydrant       boolean not null default false,
  clear_height_ft        numeric(6,2),
  power_load_kva         numeric(10,2),

  -- Confirmed in checklist section E, item 3: longest container or truck the
  -- yard can turn and dock.
  constraint truck_size_is_confirmed_value
    check (truck_size_feasible_ft is null
           or truck_size_feasible_ft in (20, 32, 40)),
  constraint dock_count_non_negative
    check (number_of_docks is null or number_of_docks >= 0)
);

comment on column public.listing_warehouse.clear_height_ft is
  'Section D. Not on the whiteboard — added; every logistics tenant asks for it.';
comment on column public.listing_warehouse.power_load_kva is
  'Section D. Not on the whiteboard — added; decides whether machinery can run.';

create index listing_warehouse_search_idx
  on public.listing_warehouse (number_of_docks, clear_height_ft, power_load_kva);

-- =============================================================================
-- 6. THE REVENUE LOCK  (F-07, F-08)
-- =============================================================================
-- Doc D: "The owner's phone number never goes to the buyer's screen. It stays
-- locked with you until the buyer pays. That lock is your income."
--
-- These two tables carry no public read policy at all. Nothing joins them into
-- a listing query, so a careless select * on listings cannot leak them.

create table public.listing_contacts (
  listing_id   uuid primary key references public.listings(id) on delete cascade,
  owner_name   text not null,
  owner_phone  text not null,
  created_at   timestamptz not null default now()
);

create table public.listing_exact_location (
  listing_id     uuid primary key references public.listings(id) on delete cascade,
  exact_lat      numeric(9,6),
  exact_lng      numeric(9,6),
  door_number    text,
  full_address   text,
  plot_boundary  jsonb,   -- GeoJSON polygon of the surveyed boundary
  created_at     timestamptz not null default now()
);

-- =============================================================================
-- 7. DOCUMENTS  (F-09)
-- =============================================================================
-- Replaces the "E-Khata ☐ Yes ☐ No" tick box. A listing reaches 'verified'
-- only when a member of staff has approved the uploaded papers.

create table public.listing_documents (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references public.listings(id) on delete cascade,
  document_type    public.document_type not null,
  storage_path     text not null,          -- private bucket, never public
  status           public.document_status not null default 'pending',
  reviewed_by      uuid references auth.users(id) on delete set null,
  reviewed_at      timestamptz,
  rejection_reason text,
  uploaded_at      timestamptz not null default now(),

  unique (listing_id, document_type),
  constraint rejection_reason_present_when_rejected
    check (status <> 'rejected' or rejection_reason is not null)
);

create index listing_documents_review_queue_idx
  on public.listing_documents (status, uploaded_at);

-- =============================================================================
-- 8. MEDIA  (F-10)
-- =============================================================================
-- Change 1: the gated file is never delivered. is_free marks the three
-- photographs of the free tier (checklist section E, item 6); everything else
-- is served only through a signed URL after payment.

create table public.listing_media (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  media_type   public.media_type not null,
  storage_path text not null,
  sort_order   integer not null default 0,
  is_free      boolean not null default false,
  created_at   timestamptz not null default now()
);

create index listing_media_listing_idx on public.listing_media (listing_id, sort_order);

-- Enforce the three-photograph free tier in the database rather than the
-- template, so no client change can widen it.
create or replace function public.enforce_free_photo_cap()
returns trigger
language plpgsql
as $$
begin
  if new.is_free and new.media_type = 'photo' then
    if (select count(*) from public.listing_media
         where listing_id = new.listing_id
           and media_type = 'photo'
           and is_free
           and id <> new.id) >= 3 then
      raise exception 'Free tier is capped at 3 photographs per listing';
    end if;
  end if;
  return new;
end;
$$;

create trigger listing_media_free_cap
  before insert or update on public.listing_media
  for each row execute function public.enforce_free_photo_cap();

-- =============================================================================
-- 9. UNLOCK LEDGER  (supports F-12; extended in 002)
-- =============================================================================
-- Present in 001 so the gating policies are complete from the first day rather
-- than retrofitted when payments arrive. Amounts are recorded, never defined —
-- the price list is configuration and is still to be supplied.

create table public.listing_unlocks (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  buyer_id     uuid not null references auth.users(id) on delete cascade,
  scope        public.unlock_scope not null,
  amount_paid  numeric(12,2) not null,
  payment_ref  text,
  unlocked_at  timestamptz not null default now(),

  unique (listing_id, buyer_id, scope)
);

create index listing_unlocks_lookup_idx on public.listing_unlocks (buyer_id, listing_id);

-- True when the current user has paid for something that releases this listing's
-- contact and exact location. 'combo' covers everything.
create or replace function public.has_unlocked(target_listing uuid, needed public.unlock_scope)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.listing_unlocks
    where listing_id = target_listing
      and buyer_id   = auth.uid()
      and scope in (needed, 'combo')
  );
$$;

-- =============================================================================
-- 10. UPDATED-AT
-- =============================================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger listings_touch_updated_at
  before update on public.listings
  for each row execute function public.touch_updated_at();

-- =============================================================================
-- 11. ROW LEVEL SECURITY  (F-12)
-- =============================================================================
-- Every table is deny-by-default. Anonymous callers see verified listings and
-- their free media, and nothing else. This is the control that makes change 1
-- and the paid tier real; it cannot be delegated to the front end.

alter table public.districts              enable row level security;
alter table public.taluks                 enable row level security;
alter table public.profiles               enable row level security;
alter table public.listings               enable row level security;
alter table public.listing_land           enable row level security;
alter table public.listing_site           enable row level security;
alter table public.listing_warehouse      enable row level security;
alter table public.listing_contacts       enable row level security;
alter table public.listing_exact_location enable row level security;
alter table public.listing_documents      enable row level security;
alter table public.listing_media          enable row level security;
alter table public.listing_unlocks        enable row level security;

-- ---- geography: public reference data, staff-managed ------------------------
create policy districts_public_read on public.districts
  for select using (true);
create policy districts_staff_write on public.districts
  for all using (public.is_staff()) with check (public.is_staff());

create policy taluks_public_read on public.taluks
  for select using (true);
create policy taluks_staff_write on public.taluks
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- profiles ---------------------------------------------------------------
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_self_insert on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_admin_all on public.profiles
  for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- ---- listings ---------------------------------------------------------------
-- Verified, blocked and sold listings stay visible; drafts and rejected ones
-- are private to their seller.
create policy listings_public_read on public.listings
  for select using (status in ('verified', 'blocked', 'sold'));
create policy listings_seller_read on public.listings
  for select using (seller_id = auth.uid());
create policy listings_seller_insert on public.listings
  for insert with check (seller_id = auth.uid());
-- A seller may edit only while the listing is not yet live; going live again
-- requires re-verification by staff.
create policy listings_seller_update on public.listings
  for update using (seller_id = auth.uid() and status in ('draft', 'rejected'))
              with check (seller_id = auth.uid() and status in ('draft', 'pending_verification'));
create policy listings_staff_all on public.listings
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- category detail: same visibility as the parent listing -----------------
create policy listing_land_public_read on public.listing_land
  for select using (exists (
    select 1 from public.listings l
    where l.id = listing_id
      and (l.status in ('verified','blocked','sold') or l.seller_id = auth.uid())
  ));
create policy listing_land_seller_write on public.listing_land
  for all using (exists (select 1 from public.listings l
                          where l.id = listing_id and l.seller_id = auth.uid()))
        with check (exists (select 1 from public.listings l
                          where l.id = listing_id and l.seller_id = auth.uid()));
create policy listing_land_staff_all on public.listing_land
  for all using (public.is_staff()) with check (public.is_staff());

create policy listing_site_public_read on public.listing_site
  for select using (exists (
    select 1 from public.listings l
    where l.id = listing_id
      and (l.status in ('verified','blocked','sold') or l.seller_id = auth.uid())
  ));
create policy listing_site_seller_write on public.listing_site
  for all using (exists (select 1 from public.listings l
                          where l.id = listing_id and l.seller_id = auth.uid()))
        with check (exists (select 1 from public.listings l
                          where l.id = listing_id and l.seller_id = auth.uid()));
create policy listing_site_staff_all on public.listing_site
  for all using (public.is_staff()) with check (public.is_staff());

create policy listing_warehouse_public_read on public.listing_warehouse
  for select using (exists (
    select 1 from public.listings l
    where l.id = listing_id
      and (l.status in ('verified','blocked','sold') or l.seller_id = auth.uid())
  ));
create policy listing_warehouse_seller_write on public.listing_warehouse
  for all using (exists (select 1 from public.listings l
                          where l.id = listing_id and l.seller_id = auth.uid()))
        with check (exists (select 1 from public.listings l
                          where l.id = listing_id and l.seller_id = auth.uid()));
create policy listing_warehouse_staff_all on public.listing_warehouse
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- the revenue lock -------------------------------------------------------
-- No anonymous policy exists on either table. Readable only by the seller who
-- owns it, by staff, or by a buyer who has paid.
create policy listing_contacts_paid_read on public.listing_contacts
  for select using (
       public.is_staff()
    or public.has_unlocked(listing_id, 'contact')
    or exists (select 1 from public.listings l
                where l.id = listing_id and l.seller_id = auth.uid())
  );
create policy listing_contacts_seller_write on public.listing_contacts
  for all using (exists (select 1 from public.listings l
                          where l.id = listing_id and l.seller_id = auth.uid()))
        with check (exists (select 1 from public.listings l
                          where l.id = listing_id and l.seller_id = auth.uid()));
create policy listing_contacts_staff_all on public.listing_contacts
  for all using (public.is_staff()) with check (public.is_staff());

create policy listing_exact_location_paid_read on public.listing_exact_location
  for select using (
       public.is_staff()
    or public.has_unlocked(listing_id, 'contact')
    or exists (select 1 from public.listings l
                where l.id = listing_id and l.seller_id = auth.uid())
  );
create policy listing_exact_location_seller_write on public.listing_exact_location
  for all using (exists (select 1 from public.listings l
                          where l.id = listing_id and l.seller_id = auth.uid()))
        with check (exists (select 1 from public.listings l
                          where l.id = listing_id and l.seller_id = auth.uid()));
create policy listing_exact_location_staff_all on public.listing_exact_location
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- documents: never public ------------------------------------------------
create policy listing_documents_seller_read on public.listing_documents
  for select using (exists (select 1 from public.listings l
                             where l.id = listing_id and l.seller_id = auth.uid()));
create policy listing_documents_seller_insert on public.listing_documents
  for insert with check (exists (select 1 from public.listings l
                                  where l.id = listing_id and l.seller_id = auth.uid()));
create policy listing_documents_staff_all on public.listing_documents
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- media: free tier public, the rest paid ---------------------------------
create policy listing_media_free_read on public.listing_media
  for select using (
    is_free and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status in ('verified','blocked','sold')
    )
  );
create policy listing_media_paid_read on public.listing_media
  for select using (
       public.is_staff()
    or (media_type = 'photo' and public.has_unlocked(listing_id, 'photos'))
    or (media_type = 'video' and public.has_unlocked(listing_id, 'video'))
    or exists (select 1 from public.listings l
                where l.id = listing_id and l.seller_id = auth.uid())
  );
create policy listing_media_seller_write on public.listing_media
  for all using (exists (select 1 from public.listings l
                          where l.id = listing_id and l.seller_id = auth.uid()))
        with check (exists (select 1 from public.listings l
                          where l.id = listing_id and l.seller_id = auth.uid()));
create policy listing_media_staff_all on public.listing_media
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- unlocks: a buyer sees only their own -----------------------------------
create policy listing_unlocks_own_read on public.listing_unlocks
  for select using (buyer_id = auth.uid() or public.is_staff());
-- Inserts are never made by the browser. Payment confirmation writes this row
-- from the server with the service role, which bypasses RLS.
create policy listing_unlocks_staff_all on public.listing_unlocks
  for all using (public.is_staff()) with check (public.is_staff());

-- =============================================================================
-- 12. PUBLIC BROWSE VIEW
-- =============================================================================
-- What the search results and the free listing page read. Contains no column
-- from listing_contacts or listing_exact_location, so the free tier cannot leak
-- through a careless join.

create view public.listings_public as
  select
    l.id, l.category, l.status, l.title, l.survey_number,
    l.state,
    l.district_id, d.name as district, d.name_kn as district_kn,
    l.taluk_id,    t.name as taluk,    t.name_kn as taluk_kn,
    l.village_city, l.pincode,
    l.approx_lat, l.approx_lng,
    l.nearest_landmark, l.distance_from_main_road_m, l.nearest_places,
    l.distance_bus_stand_km, l.distance_hospital_km, l.distance_market_km,
    l.area_value, l.area_unit, l.area_sqft,
    l.price_amount, l.price_basis, l.negotiable,
    l.zones, l.description, l.verified_at, l.created_at
  from public.listings l
  join public.districts d on d.id = l.district_id
  join public.taluks    t on t.id = l.taluk_id
  where l.status in ('verified', 'blocked', 'sold');

-- The view runs with the querying user's permissions, so the listings policies
-- above still apply through it.
alter view public.listings_public set (security_invoker = on);

-- =============================================================================
-- End of 001.
--
-- Next migration (002) covers Part 2: agents, deals and the six-stage pipeline,
-- automatic 0.75% invoicing at Agreement, and masked call sessions.
--
-- Not included here, and still needed:
--   * Rent and shop detail tables — no confirmed field list (build sheet F-06).
--   * District, taluk and village seed data for the launch district.
-- =============================================================================
