-- ============================================================
-- Migración: el flujo pasó de 38 a 40 pasos.
-- Se insertaron dos pasos nuevos en la fase de Reporte:
--   31  Se asigna responsable de reporte   (nuevo)
--   34  Se entrega reporte a calidad        (nuevo)
--
-- Reubica los proyectos EN CURSO a la nueva numeración.
-- CORRE ESTE ARCHIVO UNA SOLA VEZ, después de aplicar schema.sql
-- (que ya amplía el rango de 'paso' a 1..40). Volver a correrlo
-- movería los pasos otra vez: NO lo ejecutes dos veces.
--
-- Mapeo de la numeración vieja -> nueva:
--   31 (elabora reporte)        -> 32
--   32 (¿servicios adicionales?)-> 33
--   33 (revisa reporte)         -> 35
--   34 (¿cumple calidad?)       -> 36
--   35 (entrega al cliente)     -> 37
--   36 (factura)                -> 38
--   37 (programa pago)          -> 39
--   38 (paga y cierre)          -> 40
-- (los pasos 1..30 no cambian; 31 y 34 nuevos quedan vacíos de proyectos)
-- El orden importa: primero +2 (33..38) y luego +1 (31..32) para que no choquen.
-- ============================================================

update public.proyectos set paso = paso + 2 where paso between 33 and 38;
update public.proyectos set paso = paso + 1 where paso between 31 and 32;

-- Nota: el campo 'historial' (jsonb) conserva los números viejos de cada
-- avance. Es solo un registro visual del pasado; no afecta el flujo actual.
-- Si quieres también recorrer el historial, pídelo y te paso el UPDATE de jsonb.
