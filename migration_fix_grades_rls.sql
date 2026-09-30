-- =============================================================
-- MIGRACIÓN: Corregir RLS de grades para todos los roles
-- Permite que teacher, admin y directora_anita puedan registrar
-- calificaciones de las materias que tienen asignadas.
-- =============================================================

-- 1. Agregar columna comment si no existe
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grades' AND column_name = 'comment'
  ) THEN
    ALTER TABLE grades ADD COLUMN comment TEXT;
  END IF;
END $$;

-- 2. Ampliar CHECK de score para materias tipo counter (disciplina, etc.)
--    Permite scores de 0 a 999 (o NULL)
ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_score_check;
ALTER TABLE grades ADD CONSTRAINT grades_score_check CHECK (score >= 0 AND score <= 999);

-- 3. Eliminar políticas existentes de escritura en grades
DROP POLICY IF EXISTS "Admin escribe calificaciones" ON grades;
DROP POLICY IF EXISTS "Admin actualiza calificaciones" ON grades;
DROP POLICY IF EXISTS "Profesor escribe calificaciones" ON grades;
DROP POLICY IF EXISTS "Profesor actualiza calificaciones" ON grades;

-- 4. Nueva política unificada: cualquier rol autenticado con asignación puede escribir
--    Admin y directora_anita pueden escribir sin restricción de asignación
--    Teacher solo puede escribir en sus asignaciones
CREATE POLICY "Insertar calificaciones" ON grades
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('admin', 'directora_anita')
    OR (
      get_user_role() = 'teacher'
      AND teacher_has_assignment(
        (SELECT group_id FROM students WHERE id = student_id),
        subject_id
      )
    )
  );

CREATE POLICY "Actualizar calificaciones" ON grades
  FOR UPDATE TO authenticated
  USING (
    get_user_role() IN ('admin', 'directora_anita')
    OR (
      get_user_role() = 'teacher'
      AND teacher_has_assignment(
        (SELECT group_id FROM students WHERE id = student_id),
        subject_id
      )
    )
  );

-- 5. Verificar
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'grades';
