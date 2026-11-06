-- Mensajería 1-a-1 entre usuarios (con proyecto anexable).
-- Privada: sin políticas públicas, solo el servidor (service_role) lee/escribe.
create table if not exists public.mensajes (
  id uuid primary key default gen_random_uuid(),
  de text not null,
  para text not null,
  texto text not null,
  proyecto_id uuid,
  proyecto_nombre text,
  leido boolean not null default false,
  creado timestamptz not null default now()
);
alter table public.mensajes enable row level security;
create index if not exists mensajes_para_idx on public.mensajes (para, creado desc);
create index if not exists mensajes_de_idx   on public.mensajes (de, creado desc);
