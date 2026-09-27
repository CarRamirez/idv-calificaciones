-- ═══════════════════════════════════════════════════════════════
-- AUDIT LOG: Registrar todos los cambios de calificaciones
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabla de auditoria
CREATE TABLE IF NOT EXISTS grade_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  grade_id    UUID,
  student_id  UUID NOT NULL REFERENCES students(id),
  subject_id  UUID NOT NULL REFERENCES subjects(id),
  period      SMALLINT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_score   NUMERIC,
  new_score   NUMERIC,
  old_absences SMALLINT,
  new_absences SMALLINT,
  changed_by  UUID REFERENCES profiles(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON grade_audit_log (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON grade_audit_log (changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_student    ON grade_audit_log (student_id);

-- 3. Funcion trigger
CREATE OR REPLACE FUNCTION fn_grade_audit() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO grade_audit_log (grade_id, student_id, subject_id, period, action,
                                  new_score, new_absences, changed_by)
    VALUES (NEW.id, NEW.student_id, NEW.subject_id, NEW.period, 'INSERT',
            NEW.score, NEW.absences, NEW.updated_by);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Solo registrar si realmente cambio algo
    IF OLD.score IS DISTINCT FROM NEW.score
       OR OLD.absences IS DISTINCT FROM NEW.absences THEN
      INSERT INTO grade_audit_log (grade_id, student_id, subject_id, period, action,
                                    old_score, new_score, old_absences, new_absences, changed_by)
      VALUES (NEW.id, NEW.student_id, NEW.subject_id, NEW.period, 'UPDATE',
              OLD.score, NEW.score, OLD.absences, NEW.absences, NEW.updated_by);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO grade_audit_log (grade_id, student_id, subject_id, period, action,
                                  old_score, old_absences, changed_by)
    VALUES (OLD.id, OLD.student_id, OLD.subject_id, OLD.period, 'DELETE',
            OLD.score, OLD.absences, OLD.updated_by);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger en la tabla grades
DROP TRIGGER IF EXISTS trg_grade_audit ON grades;
CREATE TRIGGER trg_grade_audit
  AFTER INSERT OR UPDATE OR DELETE ON grades
  FOR EACH ROW EXECUTE FUNCTION fn_grade_audit();

-- 5. RLS: solo lectura para admins autenticados
ALTER TABLE grade_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read audit" ON grade_audit_log;
CREATE POLICY "Admin read audit" ON grade_audit_log
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'directora_anita')
    )
  );
