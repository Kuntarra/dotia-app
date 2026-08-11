-- ============================================================
-- Dotia — Schema completo con RLS
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================


-- ============================================================
-- LIMPIEZA (permite re-ejecutar sin errores)
-- ============================================================

drop table if exists public.receptionist_properties cascade;
drop table if exists public.stays                   cascade;
drop table if exists public.guests                  cascade;
drop table if exists public.allocations             cascade;
drop table if exists public.user_profiles           cascade;
drop table if exists public.rooms                   cascade;
drop table if exists public.companies               cascade;
drop table if exists public.properties              cascade;
drop table if exists public.cities                  cascade;

drop function if exists public.handle_new_user()   cascade;
drop function if exists public.get_my_role()       cascade;
drop function if exists public.get_my_company()    cascade;


-- ============================================================
-- EXTENSIONES
-- ============================================================

create extension if not exists "uuid-ossp";


-- ============================================================
-- TABLAS
-- ============================================================

-- Ciudades
create table public.cities (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_at  timestamptz default now()
);

-- Propiedades (hoteles, hostales, deptos, oficinas)
create table public.properties (
  id          uuid primary key default uuid_generate_v4(),
  city_id     uuid not null references public.cities(id),
  name        text not null,
  type        text not null check (type in ('hotel', 'hostal', 'departamento', 'oficina')),
  address     text,
  icon_url    text,
  floors      int,
  services    jsonb not null default '{"wifi":false,"parking":false,"laundry":false,"food":false,"transport":false,"cleaning":false}',
  active      boolean not null default true,
  created_at  timestamptz default now()
);

-- Habitaciones
create table public.rooms (
  id          uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  number      text not null,
  floor       int,
  type        text check (type in ('single', 'double', 'triple', 'suite', 'shared')),
  capacity    int not null default 1,
  created_at  timestamptz default now()
);

-- Empresas clientes
create table public.companies (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  rut             text,
  contact_name    text,
  contact_phone   text,
  contact_email   text,
  active          boolean not null default true,
  created_at      timestamptz default now()
);

-- Perfiles de usuario (extiende auth.users de Supabase)
create table public.user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('admin', 'receptionist', 'client')),
  company_id  uuid references public.companies(id),
  full_name   text,
  created_at  timestamptz default now()
);

-- Asignaciones: qué habitaciones tiene cada empresa en cada período
create table public.allocations (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id),
  room_id     uuid not null references public.rooms(id),
  start_date  date not null,
  end_date    date,
  created_at  timestamptz default now(),
  created_by  uuid references auth.users(id)
);

-- Huéspedes (registro de personas)
create table public.guests (
  id                  uuid primary key default uuid_generate_v4(),
  first_name          text not null,
  last_name_paterno   text not null,
  last_name_materno   text,
  rut                 text,
  phone               text,
  company_id          uuid references public.companies(id),
  created_at          timestamptz default now()
);

-- Estadías (check-in / check-out)
create table public.stays (
  id                  uuid primary key default uuid_generate_v4(),
  guest_id            uuid not null references public.guests(id),
  room_id             uuid not null references public.rooms(id),
  company_id          uuid not null references public.companies(id),
  allocation_id       uuid references public.allocations(id),
  shift_type          text,
  checked_in_at       timestamptz not null default now(),
  checked_out_at      timestamptz,
  estimated_checkout  date,
  notes               text,
  checked_in_by       uuid references auth.users(id),
  checked_out_by      uuid references auth.users(id)
);

-- Recepcionistas asignadas a propiedades
create table public.receptionist_properties (
  user_id     uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  primary key (user_id, property_id)
);


-- ============================================================
-- ÍNDICES
-- ============================================================

create index idx_properties_city      on public.properties(city_id);
create index idx_rooms_property        on public.rooms(property_id);
create index idx_allocations_company   on public.allocations(company_id);
create index idx_allocations_room      on public.allocations(room_id);
create index idx_guests_company        on public.guests(company_id);
create index idx_guests_rut            on public.guests(rut);
create index idx_stays_guest           on public.stays(guest_id);
create index idx_stays_room            on public.stays(room_id);
create index idx_stays_company         on public.stays(company_id);
create index idx_stays_active          on public.stays(checked_out_at) where checked_out_at is null;
create index idx_stays_checkin         on public.stays(checked_in_at desc);


-- ============================================================
-- FUNCIONES HELPER
-- ============================================================

-- Retorna el rol del usuario autenticado actual
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.user_profiles where id = auth.uid();
$$;

-- Retorna el company_id del usuario autenticado actual
create or replace function public.get_my_company()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.user_profiles where id = auth.uid();
$$;


-- ============================================================
-- TRIGGER: crear perfil automáticamente al crear usuario
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- HABILITAR ROW LEVEL SECURITY
-- ============================================================

alter table public.cities                  enable row level security;
alter table public.properties              enable row level security;
alter table public.rooms                   enable row level security;
alter table public.companies               enable row level security;
alter table public.user_profiles           enable row level security;
alter table public.allocations             enable row level security;
alter table public.guests                  enable row level security;
alter table public.stays                   enable row level security;
alter table public.receptionist_properties enable row level security;


-- ============================================================
-- POLÍTICAS RLS
-- ============================================================

-- ── CITIES ──────────────────────────────────────────────────
-- Todos los autenticados leen; solo admin escribe

create policy "cities_select"
  on public.cities for select to authenticated
  using (true);

create policy "cities_admin_write"
  on public.cities for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');


-- ── PROPERTIES ──────────────────────────────────────────────

create policy "properties_admin_all"
  on public.properties for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "properties_receptionist_select"
  on public.properties for select to authenticated
  using (
    public.get_my_role() = 'receptionist'
    and id in (
      select property_id from public.receptionist_properties
      where user_id = auth.uid()
    )
  );

create policy "properties_client_select"
  on public.properties for select to authenticated
  using (
    public.get_my_role() = 'client'
    and id in (
      select r.property_id from public.rooms r
      join public.allocations a on a.room_id = r.id
      where a.company_id = public.get_my_company()
    )
  );


-- ── ROOMS ────────────────────────────────────────────────────

create policy "rooms_admin_all"
  on public.rooms for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "rooms_receptionist_select"
  on public.rooms for select to authenticated
  using (
    public.get_my_role() = 'receptionist'
    and property_id in (
      select property_id from public.receptionist_properties
      where user_id = auth.uid()
    )
  );

create policy "rooms_client_select"
  on public.rooms for select to authenticated
  using (
    public.get_my_role() = 'client'
    and id in (
      select room_id from public.allocations
      where company_id = public.get_my_company()
    )
  );


-- ── COMPANIES ────────────────────────────────────────────────

create policy "companies_admin_all"
  on public.companies for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "companies_client_select"
  on public.companies for select to authenticated
  using (
    public.get_my_role() = 'client'
    and id = public.get_my_company()
  );

create policy "companies_receptionist_select"
  on public.companies for select to authenticated
  using (
    public.get_my_role() = 'receptionist'
    and id in (
      select a.company_id from public.allocations a
      join public.rooms r on r.id = a.room_id
      join public.receptionist_properties rp on rp.property_id = r.property_id
      where rp.user_id = auth.uid()
    )
  );


-- ── USER_PROFILES ────────────────────────────────────────────

create policy "profiles_select"
  on public.user_profiles for select to authenticated
  using (id = auth.uid() or public.get_my_role() = 'admin');

create policy "profiles_admin_write"
  on public.user_profiles for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');


-- ── ALLOCATIONS ──────────────────────────────────────────────

create policy "allocations_admin_all"
  on public.allocations for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "allocations_receptionist_select"
  on public.allocations for select to authenticated
  using (
    public.get_my_role() = 'receptionist'
    and room_id in (
      select r.id from public.rooms r
      join public.receptionist_properties rp on rp.property_id = r.property_id
      where rp.user_id = auth.uid()
    )
  );

create policy "allocations_client_select"
  on public.allocations for select to authenticated
  using (
    public.get_my_role() = 'client'
    and company_id = public.get_my_company()
  );


-- ── GUESTS ───────────────────────────────────────────────────

create policy "guests_admin_all"
  on public.guests for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- Recepcionistas: CRUD sobre huéspedes de las empresas en su propiedad
create policy "guests_receptionist_all"
  on public.guests for all to authenticated
  using (
    public.get_my_role() = 'receptionist'
    and company_id in (
      select a.company_id from public.allocations a
      join public.rooms r on r.id = a.room_id
      join public.receptionist_properties rp on rp.property_id = r.property_id
      where rp.user_id = auth.uid()
    )
  )
  with check (
    public.get_my_role() = 'receptionist'
    and company_id in (
      select a.company_id from public.allocations a
      join public.rooms r on r.id = a.room_id
      join public.receptionist_properties rp on rp.property_id = r.property_id
      where rp.user_id = auth.uid()
    )
  );

create policy "guests_client_select"
  on public.guests for select to authenticated
  using (
    public.get_my_role() = 'client'
    and company_id = public.get_my_company()
  );


-- ── STAYS ────────────────────────────────────────────────────

create policy "stays_admin_all"
  on public.stays for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- Recepcionistas: CRUD sobre estadías en sus propiedades
create policy "stays_receptionist_all"
  on public.stays for all to authenticated
  using (
    public.get_my_role() = 'receptionist'
    and room_id in (
      select r.id from public.rooms r
      join public.receptionist_properties rp on rp.property_id = r.property_id
      where rp.user_id = auth.uid()
    )
  )
  with check (
    public.get_my_role() = 'receptionist'
    and room_id in (
      select r.id from public.rooms r
      join public.receptionist_properties rp on rp.property_id = r.property_id
      where rp.user_id = auth.uid()
    )
  );

create policy "stays_client_select"
  on public.stays for select to authenticated
  using (
    public.get_my_role() = 'client'
    and company_id = public.get_my_company()
  );


-- ── RECEPTIONIST_PROPERTIES ──────────────────────────────────

create policy "rp_admin_all"
  on public.receptionist_properties for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "rp_own_select"
  on public.receptionist_properties for select to authenticated
  using (user_id = auth.uid());


-- ============================================================
-- DATOS INICIALES
-- ============================================================

insert into public.cities (name) values
  ('Iquique'),
  ('Antofagasta'),
  ('Calama');
