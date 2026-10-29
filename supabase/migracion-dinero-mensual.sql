-- ============================================================
-- Dinero por mes: chulo "Cobrado" + sellos de mes + foto mensual.
-- Corre TODO esto UNA vez en el SQL Editor de Supabase. Es seguro repetirlo.
-- ============================================================

-- 1) Columnas nuevas en proyectos
--    facturado    : estatus "ya aceptaron la factura pero no han pagado". NO suma dinero.
--    *_mes        : mes (AAAAMM) en que se registró el dinero (pagado / anticipo).
alter table public.proyectos add column if not exists facturado     boolean not null default false;
alter table public.proyectos add column if not exists facturado_mes integer;
alter table public.proyectos add column if not exists pagado_mes    integer;
alter table public.proyectos add column if not exists anticipo_mes  integer;

-- 2) Foto mensual: al cambiar de mes, el mes anterior queda congelado aquí.
create table if not exists public.cierres_mensuales (
  mes           integer     primary key,             -- AAAAMM
  cobrado       numeric     not null default 0,      -- dinero que entró (pagado + anticipos)
  pagado        numeric     not null default 0,
  anticipos     numeric     not null default 0,
  facturado     numeric     not null default 0,      -- facturado pendiente de pago
  total         numeric     not null default 0,
  cobrado_num   integer     not null default 0,
  pagado_num    integer     not null default 0,
  anticipo_num  integer     not null default 0,
  facturado_num integer     not null default 0,
  creado        timestamptz not null default now()
);
-- Por si la tabla ya existía sin estas columnas:
alter table public.cierres_mensuales add column if not exists facturado     numeric not null default 0;
alter table public.cierres_mensuales add column if not exists facturado_num integer not null default 0;

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
