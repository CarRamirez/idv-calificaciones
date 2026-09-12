-- =============================================================
-- MIGRACIÓN: Crear tabla evaluation_periods
-- Control de apertura/cierre de periodos de evaluación
-- Instituto Don Vasco — Sistema de Calificaciones
-- =============================================================

-- 1. Crear tabla
CREATE TABLE IF NOT EXISTS evaluation_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_number INT NOT NULL CHECK (period_number BETWEEN 1 AND 8),
  name TEXT NOT NULL,
  trimester INT NOT NULL CHECK (trimester BETWEEN 0 AND 3),
  is_open BOOLEAN DEFAULT false,
  open_date TIMESTAMPTZ,
  close_date TIMESTAMPTZ,
  school_year_id UUID REFERENCES school_years(id) ON DELETE CASCADE,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period_number, school_year_id)
);

-- 2. RLS
ALTER TABLE evaluation_periods ENABLE ROW LEVEL SECURITY;

-- Lectura para todos los autenticados
CREATE POLICY "Lectura autenticada" ON evaluation_periods
  FOR SELECT TO authenticated USING (true);

-- Solo admin puede modificar
CREATE POLICY "Admin escribe todo" ON evaluation_periods
  FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- 3. Insertar los 8 periodos para el ciclo actual (todos cerrados por defecto)
INSERT INTO evaluation_periods (period_number, name, trimester, is_open, school_year_id)
VALUES
  (1, 'Septiembre',   1, false, (SELECT id FROM school_years WHERE is_current = true)),
  (2, 'Octubre',      1, false, (SELECT id FROM school_years WHERE is_current = true)),
  (3, 'Nov - Dic',    2, false, (SELECT id FROM school_years WHERE is_current = true)),
  (4, 'Ene - Feb',    2, false, (SELECT id FROM school_years WHERE is_current = true)),
  (5, 'Mar - Abr',    3, false, (SELECT id FROM school_years WHERE is_current = true)),
  (6, 'Mayo',         3, false, (SELECT id FROM school_years WHERE is_current = true)),
  (7, 'Junio',        3, false, (SELECT id FROM school_years WHERE is_current = true)),
  (8, 'Julio (Final)',0, false, (SELECT id FROM school_years WHERE is_current = true))
ON CONFLICT (period_number, school_year_id) DO NOTHING;

-- 4. Verificar
SELECT period_number, name, trimester, is_open FROM evaluation_periods
ORDER BY period_number;
