-- ============================================
-- Migración: Actualizar materias por grado
-- Instituto Don Vasco — Secundaria
-- Septiembre 2026
-- ============================================

-- 1. Asegurar que la columna counts_for_avg exista
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS counts_for_avg BOOLEAN DEFAULT true;

-- 2. Agregar materias faltantes para 1er grado
-- Historia no existía en 1°
INSERT INTO subjects (name, short_name, grade, counts_for_avg, sort_order)
SELECT 'Historia', 'HIS', 1, true, 10
WHERE NOT EXISTS (
  SELECT 1 FROM subjects WHERE short_name = 'HIS' AND grade = 1
);

-- 3. Agregar materias NO curriculares (no abonan al promedio) para TODOS los grados
-- Vida Saludable
INSERT INTO subjects (name, short_name, grade, counts_for_avg, sort_order) VALUES
  ('Vida Saludable', 'VSAL', 1, false, 20),
  ('Vida Saludable', 'VSAL', 2, false, 20),
  ('Vida Saludable', 'VSAL', 3, false, 20)
ON CONFLICT DO NOTHING;

-- Ortografía
INSERT INTO subjects (name, short_name, grade, counts_for_avg, sort_order) VALUES
  ('Ortografía', 'ORT', 1, false, 21),
  ('Ortografía', 'ORT', 2, false, 21),
  ('Ortografía', 'ORT', 3, false, 21)
ON CONFLICT DO NOTHING;

-- Salud Mental
INSERT INTO subjects (name, short_name, grade, counts_for_avg, sort_order) VALUES
  ('Salud Mental', 'SMEN', 1, false, 22),
  ('Salud Mental', 'SMEN', 2, false, 22),
  ('Salud Mental', 'SMEN', 3, false, 22)
ON CONFLICT DO NOTHING;

-- Valores
INSERT INTO subjects (name, short_name, grade, counts_for_avg, sort_order) VALUES
  ('Valores', 'VAL', 1, false, 23),
  ('Valores', 'VAL', 2, false, 23),
  ('Valores', 'VAL', 3, false, 23)
ON CONFLICT DO NOTHING;

-- 4. Asegurar que Tutoría esté marcada como no curricular
UPDATE subjects SET counts_for_avg = false WHERE short_name = 'TUT';

-- 5. Verificar resultado
SELECT grade, name, short_name, counts_for_avg, sort_order
FROM subjects
ORDER BY grade, sort_order, name;
