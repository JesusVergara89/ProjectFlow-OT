-- ============================================================
-- Migración: foto de perfil + marca de "reporte enviado"
-- Corre TODO esto UNA vez en el SQL Editor de Supabase.
-- Es seguro aunque tu SQL esté atrasado: usa "if not exists" y
-- bloques que ignoran el error si algo ya existía.
-- ============================================================

-- ---------- 1) Foto de perfil por usuario ----------
create table if not exists public.perfiles_usuario (
  usuario     text        primary key,       -- coincide con APP_USERS[].usuario (minúsculas)
  avatar_url  text,                            -- enlace público a la imagen en Storage
  actualizado timestamptz not null default now()
);

alter table public.perfiles_usuario enable row level security;

-- Con la llave pública (anon) SOLO se puede LEER (para mostrar las fotos).
-- La foto se guarda únicamente desde el servidor (service_role, en /api/perfil).
drop policy if exists "lectura perfiles" on public.perfiles_usuario;
create policy "lectura perfiles"
  on public.perfiles_usuario for select
  to anon, authenticated
  using (true);

-- ---------- 2) Marca "reporte enviado" en proyectos ----------
-- Permite registrar si ya se mandó el reporte, aunque el proyecto ya se haya cobrado.
alter table public.proyectos
  add column if not exists reporte_enviado boolean not null default false;

-- ---------- 3) Tiempo real (ignora el error si ya estaban agregadas) ----------
do $$
begin
  begin
    alter publication supabase_realtime add table public.perfiles_usuario;
  exception when duplicate_object then null; when others then null;
  end;
end $$;
