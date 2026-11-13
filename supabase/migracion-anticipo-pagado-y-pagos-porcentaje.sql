-- ============================================================
-- Migración: "anticipo pagado" + pagos diferidos por porcentaje
-- Ejecuta todo esto UNA vez en el SQL Editor de Supabase.
-- Es repetible/seguro (usa IF NOT EXISTS).
-- ============================================================

-- 1) ¿El anticipo YA se pagó? Un anticipo puede estar acordado pero sin cobrar.
--    Solo cuando está en true suma como ingreso del mes y descuenta del saldo.
alter table public.proyectos
  add column if not exists anticipo_pagado boolean not null default false;

-- Compatibilidad: hasta ahora capturar un anticipo significaba que ya había
-- entrado. Marca como pagados los anticipos existentes para no cambiar las
-- cifras históricas ya reportadas. (Corre solo esta vez; es idempotente.)
update public.proyectos
  set anticipo_pagado = true
  where anticipo > 0 and anticipo_pagado = false;

-- 2) Pagos diferidos: modo de reparto y porcentajes por pago.
--    pagos_modo: 'iguales' (actual, por defecto) | 'porcentaje'
--    pagos_porc: arreglo de números, un porcentaje por pago (alineado a pagos_meses)
alter table public.proyectos
  add column if not exists pagos_modo text not null default 'iguales';

alter table public.proyectos
  add column if not exists pagos_porc jsonb not null default '[]'::jsonb;
