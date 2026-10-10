-- ============================================================
-- Avisos de WhatsApp: evita repetir el mismo aviso cada día.
-- Corre esto UNA vez en el SQL Editor de Supabase.
-- ============================================================

create table if not exists public.avisos_whatsapp (
  proyecto_id uuid        not null,
  tipo        text        not null,              -- rojo | rosa | ambar | morado | naranja
  enviado_en  timestamptz not null default now(),
  primary key (proyecto_id, tipo)
);

-- Solo el servidor (service_role) la toca. Con la llave pública no se puede ni leer.
alter table public.avisos_whatsapp enable row level security;
