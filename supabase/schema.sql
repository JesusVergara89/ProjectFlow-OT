-- Ejecuta este script en Supabase: SQL Editor > New query > Run.

create table if not exists public.proyectos (
  id           uuid primary key default gen_random_uuid(),
  nombre       text        not null,
  cliente      text        not null,
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

create index if not exists proyectos_estado_paso_idx on public.proyectos (estado, paso);

-- Seguridad: solo usuarios con sesión iniciada leen y escriben.
alter table public.proyectos enable row level security;

drop policy if exists "equipo lee proyectos" on public.proyectos;
drop policy if exists "equipo escribe proyectos" on public.proyectos;

create policy "equipo lee proyectos"
  on public.proyectos for select
  to authenticated
  using (true);

create policy "equipo escribe proyectos"
  on public.proyectos for all
  to authenticated
  using (true)
  with check (true);

-- Tiempo real: avisa a todas las pantallas abiertas cuando alguien cambia un proyecto.
alter publication supabase_realtime add table public.proyectos;
