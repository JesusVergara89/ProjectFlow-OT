-- ============================================================
-- Dinero por mes: chulo "Cobrado" + sellos de mes + foto mensual.
-- Corre TODO esto UNA vez en el SQL Editor de Supabase. Es seguro repetirlo.
-- ============================================================

-- 1) Columnas nuevas en proyectos
--    cobrado      : marca manual "ya se cobró" (independiente del flujo).
--    *_mes        : mes (AAAAMM) en que se registró cada tipo de dinero.
alter table public.proyectos add column if not exists cobrado      boolean not null default false;
alter table public.proyectos add column if not exists cobrado_mes  integer;
alter table public.proyectos add column if not exists pagado_mes   integer;
alter table public.proyectos add column if not exists anticipo_mes integer;

-- 2) Foto mensual: al cambiar de mes, el mes anterior queda congelado aquí.
create table if not exists public.cierres_mensuales (
  mes          integer     primary key,             -- AAAAMM
  cobrado      numeric     not null default 0,
  pagado       numeric     not null default 0,
  anticipos    numeric     not null default 0,
  total        numeric     not null default 0,
  cobrado_num  integer     not null default 0,
  pagado_num   integer     not null default 0,
  anticipo_num integer     not null default 0,
  creado       timestamptz not null default now()
);

alter table public.cierres_mensuales enable row level security;

-- Lectura pública (para mostrar el historial en la app, igual que la bitácora);
-- la escritura es solo del servidor (service_role).
drop policy if exists "lectura cierres" on public.cierres_mensuales;
create policy "lectura cierres"
  on public.cierres_mensuales for select
  to anon, authenticated
  using (true);

-- Tiempo real (opcional; ignora el error si ya estaba)
do $$
begin
  begin
    alter publication supabase_realtime add table public.cierres_mensuales;
  exception when others then null;
  end;
end $$;
