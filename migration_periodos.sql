-- =============================================================
-- MIGRACIÓN: Expandir periodos de 3 a 8 sub-periodos
-- Instituto Don Vasco — Sistema de Calificaciones
-- =============================================================
-- Mapeo de sub-periodos:
--   1 = Septiembre        (1er Trimestre)
--   2 = Octubre           (1er Trimestre)
--   3 = Nov - Dic         (2do Trimestre)
--   4 = Ene - Feb         (2do Trimestre)
--   5 = Mar - Abr         (3er Trimestre)
--   6 = Mayo              (3er Trimestre)
--   7 = Junio             (3er Trimestre)
--   8 = Julio (Final)     (Solo referencia, NO promedia)
--
-- Promedio Final = promedio de los 3 trimestres
-- =============================================================

-- 1. Eliminar calificaciones existentes (estructura anterior incompatible)
DELETE FROM grades;

-- 2. Eliminar constraint anterior de period (1-3)
ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_period_check;

-- 3. Agregar nuevo constraint (1-8)
ALTER TABLE grades ADD CONSTRAINT grades_period_check CHECK (period BETWEEN 1 AND 8);

-- 4. Verificar
SELECT conname, consrc
FROM pg_constraint
WHERE conrelid = 'grades'::regclass AND contype = 'c';
