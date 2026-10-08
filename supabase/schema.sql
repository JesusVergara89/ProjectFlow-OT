-- ============================================================
-- Tablero de Proyectos y OT — esquema de Supabase
-- Ejecuta todo esto en el SQL Editor de tu proyecto de Supabase.
-- ============================================================

-- ---------- Proyectos ----------
create table if not exists public.proyectos (
  id           uuid primary key default gen_random_uuid(),
  nombre       text        not null,
  cliente      text        not null,
  tipo         text        not null default '',  -- tipo de servicio (ver src/servicios.js)
  area         text        not null default '',  -- área derivada: ingenieria | planeacion | comercial
  responsable  text        not null default '',
  prioridad    text        not null default 'media' check (prioridad in ('alta','media','baja')),
  monto        numeric     not null default 0 check (monto >= 0),
  estado       text        not null default 'activo' check (estado in ('activo','cerrado')),
  resultado    text        check (resultado in ('no-viable','archivado','cerrado')),
  paso         int         not null default 1 check (paso between 1 and 38),
  creado       timestamptz not null default now(),
  paso_desde   timestamptz not null default now(),
  cerrado_en   timestamptz,
  historial    jsonb       not null default '[]'::jsonb,
  ejemplo      boolean     not null default false
);

-- Si la tabla ya existía, agrega las columnas nuevas (no falla si ya están).
alter table public.proyectos add column if not exists tipo text not null default '';
alter table public.proyectos add column if not exists area text not null default '';

create index if not exists proyectos_estado_paso_idx on public.proyectos (estado, paso);

alter table public.proyectos enable row level security;

-- Permisos: con la llave pública (anon) SOLO se puede LEER.
-- Toda escritura entra por las Netlify Functions con la llave service_role,
-- que ignora RLS. Así nadie puede escribir ni borrar saltándose el login/bitácora.
drop policy if exists "equipo lee proyectos"     on public.proyectos;
drop policy if exists "equipo escribe proyectos" on public.proyectos;
drop policy if exists "lectura proyectos"        on public.proyectos;

create policy "lectura proyectos"
  on public.proyectos for select
  to anon, authenticated
  using (true);

-- ---------- Bitácora (rastro de actividad) ----------
create table if not exists public.bitacora (
  id              bigint generated always as identity primary key,
  creado          timestamptz not null default now(),
  usuario         text        not null,
  nombre          text,
  accion          text        not null,
  proyecto_id     uuid,
  proyecto_nombre text,
  detalle         jsonb       not null default '{}'::jsonb
);

create index if not exists bitacora_creado_idx  on public.bitacora (creado desc);
create index if not exists bitacora_proyecto_idx on public.bitacora (proyecto_id);

alter table public.bitacora enable row level security;

-- La bitácora se puede LEER con la llave pública (para mostrarla en la app),
-- pero solo se ESCRIBE desde el servidor (service_role). Nadie la edita ni borra.
drop policy if exists "lectura bitacora" on public.bitacora;
create policy "lectura bitacora"
  on public.bitacora for select
  to anon, authenticated
  using (true);

-- ---------- Tiempo real ----------
alter publication supabase_realtime add table public.proyectos;
alter publication supabase_realtime add table public.bitacora;
