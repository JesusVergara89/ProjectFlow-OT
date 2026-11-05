-- Pasos nuevos 38.1 y 38.2 (decimales) sin renumerar nada.
-- La columna "paso" era entera; se cambia a numérica para permitir 38.1 / 38.2.
-- Los proyectos vivos NO se tocan: un 38 sigue siendo 38, un 39 sigue siendo 39.
alter table public.proyectos drop constraint if exists proyectos_paso_check;
alter table public.proyectos alter column paso type numeric using paso::numeric;
alter table public.proyectos alter column paso set default 1;
alter table public.proyectos add  constraint proyectos_paso_check check (paso >= 1 and paso <= 42);
