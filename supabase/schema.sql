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
  responsable_reporte text  not null default '',  -- quién elabora el reporte (se asigna en el paso 31)
  creado_por   text        not null default '',  -- autor; puede editar el proyecto (además del admin)
  prioridad    text        not null default 'media' check (prioridad in ('alta','media','baja')),
  monto        numeric     not null default 0 check (monto >= 0),
  anticipo     numeric     not null default 0 check (anticipo >= 0),  -- anticipo pagado por el cliente (se descuenta del monto)
  estado       text        not null default 'activo' check (estado in ('activo','cerrado')),
  resultado    text        check (resultado in ('no-viable','archivado','cerrado')),
  paso         int         not null default 1 check (paso between 1 and 42),
  creado       timestamptz not null default now(),
  paso_desde   timestamptz not null default now(),
  cerrado_en   timestamptz,
  historial    jsonb       not null default '[]'::jsonb,
  ejemplo      boolean     not null default false
);

-- Si la tabla ya existía, agrega las columnas nuevas (no falla si ya están).
alter table public.proyectos add column if not exists tipo text not null default '';
alter table public.proyectos add column if not exists area text not null default '';
-- Autor del proyecto: define quién (además del admin) puede editarlo.
alter table public.proyectos add column if not exists creado_por text not null default '';
-- Responsable del reporte (se asigna en el paso 31).
alter table public.proyectos add column if not exists responsable_reporte text not null default '';
-- Anticipo pagado por el cliente (se descuenta del monto para el saldo por cobrar).
alter table public.proyectos add column if not exists anticipo numeric not null default 0 check (anticipo >= 0);

-- El flujo creció a 42 pasos (se dividió Facturación/Cobro, se agregó el paso de suma de
-- cobrados y el paso de autorización de viáticos): amplía el rango permitido (repetible/seguro).
-- La REUBICACIÓN de proyectos en curso va aparte, en supabase/migracion-42-pasos.sql (corre UNA vez).
alter table public.proyectos drop constraint if exists proyectos_paso_check;
alter table public.proyectos add  constraint proyectos_paso_check check (paso between 1 and 42);

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

-- ---------- Perfiles (foto por usuario) ----------
create table if not exists public.perfiles_usuario (
  usuario     text        primary key,
  avatar_url  text,
  actualizado timestamptz not null default now()
);
alter table public.perfiles_usuario enable row level security;
drop policy if exists "lectura perfiles" on public.perfiles_usuario;
create policy "lectura perfiles"
  on public.perfiles_usuario for select
  to anon, authenticated
  using (true);

-- Marca "reporte enviado" (se cobró, pero el reporte puede faltar).
alter table public.proyectos add column if not exists reporte_enviado boolean not null default false;

-- Dinero por mes: estatus "Facturado" + sellos del mes en que se registró cada tipo.
alter table public.proyectos add column if not exists facturado     boolean not null default false;
alter table public.proyectos add column if not exists facturado_mes integer;
alter table public.proyectos add column if not exists pagado_mes    integer;
alter table public.proyectos add column if not exists anticipo_mes  integer;

-- Foto mensual de dinero (se congela al cambiar de mes).
create table if not exists public.cierres_mensuales (
  mes           integer     primary key,
  cobrado       numeric     not null default 0,
  pagado        numeric     not null default 0,
  anticipos     numeric     not null default 0,
  facturado     numeric     not null default 0,
  total         numeric     not null default 0,
  cobrado_num   integer     not null default 0,
  pagado_num    integer     not null default 0,
  anticipo_num  integer     not null default 0,
  facturado_num integer     not null default 0,
  creado        timestamptz not null default now()
);
alter table public.cierres_mensuales enable row level security;
drop policy if exists "lectura cierres" on public.cierres_mensuales;
create policy "lectura cierres"
  on public.cierres_mensuales for select
  to anon, authenticated
  using (true);

-- ---------- Marcas privadas del súper admin (sin lectura pública) ----------
create table if not exists public.marcas_super (
  proyecto_id uuid        primary key references public.proyectos(id) on delete cascade,
  atrasado    boolean     not null default true,
  mensaje     text        not null default '',
  actualizado timestamptz not null default now()
);
alter table public.marcas_super enable row level security;
-- A propósito SIN policy de SELECT: la llave anon no puede leerla; solo el servidor.
drop policy if exists "lectura marcas" on public.marcas_super;

-- ---------- Tiempo real ----------
alter publication supabase_realtime add table public.proyectos;
alter publication supabase_realtime add table public.bitacora;
alter publication supabase_realtime add table public.perfiles_usuario;
