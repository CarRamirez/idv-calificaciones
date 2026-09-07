-- ============================================
-- IDV Calificaciones — Schema completo
-- Instituto Don Vasco — Secundaria
-- Ciclo Escolar 2026-2027
-- ============================================

-- Limpiar tablas existentes (por si ya se ejecutó antes)
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS teacher_assignments CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS school_years CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS teacher_has_assignment(UUID, UUID);

-- 1. Ciclos escolares
CREATE TABLE school_years (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Grupos
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grade INT NOT NULL CHECK (grade BETWEEN 1 AND 3),
  letter TEXT NOT NULL,
  school_year_id UUID REFERENCES school_years(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(grade, letter, school_year_id)
);

-- 3. Materias
CREATE TABLE subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  grade INT NOT NULL CHECK (grade BETWEEN 1 AND 3),
  counts_for_avg BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Alumnos
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  curp TEXT,
  list_num INT NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Perfiles de usuario
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Asignaciones profesor-grupo-materia
CREATE TABLE teacher_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(teacher_id, group_id, subject_id)
);

-- 7. Calificaciones
CREATE TABLE grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  period INT NOT NULL CHECK (period BETWEEN 1 AND 3),
  score NUMERIC(3,1) CHECK (score BETWEEN 5.0 AND 10.0),
  absences INT DEFAULT 0,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, subject_id, period)
);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION teacher_has_assignment(p_group_id UUID, p_subject_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_assignments
    WHERE teacher_id = auth.uid()
      AND group_id = p_group_id
      AND subject_id = p_subject_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Lectura para todos los autenticados
CREATE POLICY "Lectura autenticada" ON school_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura autenticada" ON groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura autenticada" ON subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura autenticada" ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura autenticada" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura autenticada" ON teacher_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lectura autenticada" ON grades FOR SELECT TO authenticated USING (true);

-- Admin: escritura total
CREATE POLICY "Admin escribe todo" ON school_years FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Admin escribe todo" ON groups FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Admin escribe todo" ON subjects FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Admin escribe todo" ON students FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Admin escribe todo" ON profiles FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Admin escribe todo" ON teacher_assignments FOR ALL TO authenticated USING (get_user_role() = 'admin') WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Admin escribe calificaciones" ON grades FOR INSERT TO authenticated WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Admin actualiza calificaciones" ON grades FOR UPDATE TO authenticated USING (get_user_role() = 'admin');

-- Profesor: solo sus asignaciones
CREATE POLICY "Profesor escribe calificaciones" ON grades FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'teacher'
    AND teacher_has_assignment(
      (SELECT group_id FROM students WHERE id = student_id),
      subject_id
    )
  );
CREATE POLICY "Profesor actualiza calificaciones" ON grades FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'teacher'
    AND teacher_has_assignment(
      (SELECT group_id FROM students WHERE id = student_id),
      subject_id
    )
  );

-- ============================================
-- Datos iniciales — Instituto Don Vasco
-- ============================================

-- Ciclo escolar
INSERT INTO school_years (name, is_current) VALUES ('2026-2027', true);

-- Grupos: 1°A, 1°B, 2°A, 2°B, 3°A, 3°B, 3°C
INSERT INTO groups (grade, letter, school_year_id) VALUES
  (1, 'A', (SELECT id FROM school_years WHERE name = '2026-2027')),
  (1, 'B', (SELECT id FROM school_years WHERE name = '2026-2027')),
  (2, 'A', (SELECT id FROM school_years WHERE name = '2026-2027')),
  (2, 'B', (SELECT id FROM school_years WHERE name = '2026-2027')),
  (3, 'A', (SELECT id FROM school_years WHERE name = '2026-2027')),
  (3, 'B', (SELECT id FROM school_years WHERE name = '2026-2027')),
  (3, 'C', (SELECT id FROM school_years WHERE name = '2026-2027'));

-- Materias por grado (plan SEP secundaria estándar)
-- 1er grado
INSERT INTO subjects (name, short_name, grade, counts_for_avg, sort_order) VALUES
  ('Español', 'ESP', 1, true, 1),
  ('Matemáticas', 'MAT', 1, true, 2),
  ('Ciencias (Biología)', 'BIO', 1, true, 3),
  ('Geografía', 'GEO', 1, true, 4),
  ('Formación Cívica y Ética', 'FCE', 1, true, 5),
  ('Inglés', 'ING', 1, true, 6),
  ('Educación Física', 'EFI', 1, true, 7),
  ('Artes', 'ART', 1, true, 8),
  ('Tecnología', 'TEC', 1, true, 9),
  ('Tutoría y Educación Socioemocional', 'TUT', 1, false, 10);

-- 2do grado
INSERT INTO subjects (name, short_name, grade, counts_for_avg, sort_order) VALUES
  ('Español', 'ESP', 2, true, 1),
  ('Matemáticas', 'MAT', 2, true, 2),
  ('Ciencias (Física)', 'FIS', 2, true, 3),
  ('Historia', 'HIS', 2, true, 4),
  ('Formación Cívica y Ética', 'FCE', 2, true, 5),
  ('Inglés', 'ING', 2, true, 6),
  ('Educación Física', 'EFI', 2, true, 7),
  ('Artes', 'ART', 2, true, 8),
  ('Tecnología', 'TEC', 2, true, 9),
  ('Tutoría y Educación Socioemocional', 'TUT', 2, false, 10);

-- 3er grado
INSERT INTO subjects (name, short_name, grade, counts_for_avg, sort_order) VALUES
  ('Español', 'ESP', 3, true, 1),
  ('Matemáticas', 'MAT', 3, true, 2),
  ('Ciencias (Química)', 'QUI', 3, true, 3),
  ('Historia', 'HIS', 3, true, 4),
  ('Formación Cívica y Ética', 'FCE', 3, true, 5),
  ('Inglés', 'ING', 3, true, 6),
  ('Educación Física', 'EFI', 3, true, 7),
  ('Artes', 'ART', 3, true, 8),
  ('Tecnología', 'TEC', 3, true, 9),
  ('Tutoría y Educación Socioemocional', 'TUT', 3, false, 10);

