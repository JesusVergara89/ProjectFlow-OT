-- ============================================================
-- Marcas privadas de "proyecto atrasado" del SÚPER ADMIN.
-- Corre esto UNA vez en el SQL Editor de Supabase.
--
-- PRIVACIDAD: esta tabla NO tiene política de lectura pública, así que la
-- llave anon (la del navegador) NO puede leerla. Solo el servidor, con la
-- llave service_role y validando que seas el súper admin, la lee y escribe.
-- Por eso nadie más —ni otros admins— puede ver estas marcas.
-- ============================================================

create table if not exists public.marcas_super (
  proyecto_id uuid        primary key references public.proyectos(id) on delete cascade,
  atrasado    boolean     not null default true,
  mensaje     text        not null default '',
  actualizado timestamptz not null default now()
);

alter table public.marcas_super enable row level security;

-- A propósito: NO se crea ninguna policy de SELECT para anon/authenticated.
-- Con RLS activo y sin policy, la llave pública no puede leer ni escribir nada.
-- Por si hubiera quedado una de un intento previo, la quitamos:
drop policy if exists "lectura marcas" on public.marcas_super;
