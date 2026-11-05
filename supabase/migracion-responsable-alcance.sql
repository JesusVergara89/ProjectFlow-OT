-- Responsable del alcance (lo asignan Leonardo o German en la fase de alcances).
-- Mismo personal que los servicios. Si se pasa de 3 días, dispara la alerta de Telegram.
alter table public.proyectos add column if not exists responsable_alcance text not null default '';
