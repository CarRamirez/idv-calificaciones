-- =====================================================
-- PASO 1: Diagnóstico — ver short_names y sort_order actuales
-- Ejecutar PRIMERO este SELECT para verificar los short_names reales
-- =====================================================
SELECT grade, sort_order, short_name, name, counts_for_avg
FROM subjects
ORDER BY grade, sort_order NULLS LAST, name;

-- =====================================================
-- PASO 2: Actualizar sort_order por grado
-- Usa short_name Y name como fallback para mayor robustez
-- =====================================================

-- ── 1er Grado (19 materias) ──
UPDATE subjects SET sort_order = 1  WHERE grade = 1 AND (LOWER(short_name) = 'esp'  OR LOWER(name) LIKE '%español%');
UPDATE subjects SET sort_order = 2  WHERE grade = 1 AND (LOWER(short_name) = 'ing'  OR LOWER(name) LIKE '%inglés%' OR LOWER(name) LIKE '%ingles%');
UPDATE subjects SET sort_order = 3  WHERE grade = 1 AND (LOWER(short_name) = 'art'  OR LOWER(name) LIKE '%artes%');
UPDATE subjects SET sort_order = 4  WHERE grade = 1 AND (LOWER(short_name) = 'mat'  OR LOWER(name) LIKE '%matemáticas%' OR LOWER(name) LIKE '%matematicas%');
UPDATE subjects SET sort_order = 5  WHERE grade = 1 AND (LOWER(short_name) = 'bio'  OR LOWER(name) LIKE '%biología%' OR LOWER(name) LIKE '%biologia%');
UPDATE subjects SET sort_order = 6  WHERE grade = 1 AND (LOWER(short_name) = 'geo'  OR LOWER(name) LIKE '%geografía%' OR LOWER(name) LIKE '%geografia%');
UPDATE subjects SET sort_order = 7  WHERE grade = 1 AND (LOWER(short_name) = 'his'  OR LOWER(name) LIKE '%historia%');
UPDATE subjects SET sort_order = 8  WHERE grade = 1 AND (LOWER(short_name) = 'fce'  OR LOWER(name) LIKE '%cívica%' OR LOWER(name) LIKE '%civica%');
UPDATE subjects SET sort_order = 9  WHERE grade = 1 AND (LOWER(short_name) = 'tec'  OR LOWER(name) LIKE '%tecnología%' OR LOWER(name) LIKE '%tecnologia%');
UPDATE subjects SET sort_order = 10 WHERE grade = 1 AND (LOWER(short_name) = 'ef'   OR LOWER(name) LIKE '%educación física%' OR LOWER(name) LIKE '%educacion fisica%' OR LOWER(name) LIKE '%deportes%');
UPDATE subjects SET sort_order = 11 WHERE grade = 1 AND (LOWER(short_name) = 'tut'  OR LOWER(name) LIKE '%tutoría%' OR LOWER(name) LIKE '%tutoria%');
UPDATE subjects SET sort_order = 12 WHERE grade = 1 AND (LOWER(short_name) = 'vs'   OR LOWER(name) LIKE '%vida saludable%' OR LOWER(name) LIKE '%v. saludable%');
UPDATE subjects SET sort_order = 13 WHERE grade = 1 AND (LOWER(short_name) = 'ort'  OR LOWER(name) LIKE '%ortografía%' OR LOWER(name) LIKE '%ortografia%');
UPDATE subjects SET sort_order = 14 WHERE grade = 1 AND (LOWER(short_name) = 'val'  OR LOWER(name) LIKE '%valores%');
UPDATE subjects SET sort_order = 15 WHERE grade = 1 AND (LOWER(short_name) = 'disc' OR LOWER(name) LIKE '%disciplina%');
UPDATE subjects SET sort_order = 16 WHERE grade = 1 AND (LOWER(short_name) = 'aseo' OR LOWER(name) LIKE '%aseo%');
UPDATE subjects SET sort_order = 17 WHERE grade = 1 AND (LOWER(short_name) = 'tar'  OR LOWER(name) LIKE '%tareas%' OR LOWER(name) LIKE '%tardanzas%');
UPDATE subjects SET sort_order = 18 WHERE grade = 1 AND (LOWER(short_name) = 'inas' OR LOWER(name) LIKE '%inasistencias%');
UPDATE subjects SET sort_order = 19 WHERE grade = 1 AND (LOWER(short_name) = 'inc'  OR LOWER(name) LIKE '%incidencias%');

-- ── 2do Grado (19 materias) ──
UPDATE subjects SET sort_order = 1  WHERE grade = 2 AND (LOWER(short_name) = 'esp'  OR LOWER(name) LIKE '%español%');
UPDATE subjects SET sort_order = 2  WHERE grade = 2 AND (LOWER(short_name) = 'ing'  OR LOWER(name) LIKE '%inglés%' OR LOWER(name) LIKE '%ingles%');
UPDATE subjects SET sort_order = 3  WHERE grade = 2 AND (LOWER(short_name) = 'art'  OR LOWER(name) LIKE '%artes%');
UPDATE subjects SET sort_order = 4  WHERE grade = 2 AND (LOWER(short_name) = 'mat'  OR LOWER(name) LIKE '%matemáticas%' OR LOWER(name) LIKE '%matematicas%');
UPDATE subjects SET sort_order = 5  WHERE grade = 2 AND (LOWER(short_name) = 'fis'  OR LOWER(name) LIKE '%física%' OR LOWER(name) LIKE '%fisica%');
UPDATE subjects SET sort_order = 6  WHERE grade = 2 AND (LOWER(short_name) = 'his'  OR LOWER(name) LIKE '%historia%');
UPDATE subjects SET sort_order = 7  WHERE grade = 2 AND (LOWER(short_name) = 'fce'  OR LOWER(name) LIKE '%cívica%' OR LOWER(name) LIKE '%civica%');
UPDATE subjects SET sort_order = 8  WHERE grade = 2 AND (LOWER(short_name) = 'tec'  OR LOWER(name) LIKE '%tecnología%' OR LOWER(name) LIKE '%tecnologia%');
UPDATE subjects SET sort_order = 9  WHERE grade = 2 AND (LOWER(short_name) = 'ef'   OR LOWER(name) LIKE '%educación física%' OR LOWER(name) LIKE '%educacion fisica%' OR LOWER(name) LIKE '%deportes%');
UPDATE subjects SET sort_order = 10 WHERE grade = 2 AND (LOWER(short_name) = 'tut'  OR LOWER(name) LIKE '%tutoría%' OR LOWER(name) LIKE '%tutoria%');
UPDATE subjects SET sort_order = 11 WHERE grade = 2 AND (LOWER(short_name) = 'vs'   OR LOWER(name) LIKE '%vida saludable%' OR LOWER(name) LIKE '%v. saludable%');
UPDATE subjects SET sort_order = 12 WHERE grade = 2 AND (LOWER(short_name) = 'ort'  OR LOWER(name) LIKE '%ortografía%' OR LOWER(name) LIKE '%ortografia%');
UPDATE subjects SET sort_order = 13 WHERE grade = 2 AND (LOWER(short_name) = 'sm'   OR LOWER(name) LIKE '%salud mental%' OR LOWER(name) LIKE '%s. mental%');
UPDATE subjects SET sort_order = 14 WHERE grade = 2 AND (LOWER(short_name) = 'val'  OR LOWER(name) LIKE '%valores%');
UPDATE subjects SET sort_order = 15 WHERE grade = 2 AND (LOWER(short_name) = 'disc' OR LOWER(name) LIKE '%disciplina%');
UPDATE subjects SET sort_order = 16 WHERE grade = 2 AND (LOWER(short_name) = 'aseo' OR LOWER(name) LIKE '%aseo%');
UPDATE subjects SET sort_order = 17 WHERE grade = 2 AND (LOWER(short_name) = 'tar'  OR LOWER(name) LIKE '%tareas%' OR LOWER(name) LIKE '%tardanzas%');
UPDATE subjects SET sort_order = 18 WHERE grade = 2 AND (LOWER(short_name) = 'inas' OR LOWER(name) LIKE '%inasistencias%');
UPDATE subjects SET sort_order = 19 WHERE grade = 2 AND (LOWER(short_name) = 'inc'  OR LOWER(name) LIKE '%incidencias%');

-- ── 3er Grado (19 materias) ──
UPDATE subjects SET sort_order = 1  WHERE grade = 3 AND (LOWER(short_name) = 'esp'  OR LOWER(name) LIKE '%español%');
UPDATE subjects SET sort_order = 2  WHERE grade = 3 AND (LOWER(short_name) = 'ing'  OR LOWER(name) LIKE '%inglés%' OR LOWER(name) LIKE '%ingles%');
UPDATE subjects SET sort_order = 3  WHERE grade = 3 AND (LOWER(short_name) = 'art'  OR LOWER(name) LIKE '%artes%');
UPDATE subjects SET sort_order = 4  WHERE grade = 3 AND (LOWER(short_name) = 'mat'  OR LOWER(name) LIKE '%matemáticas%' OR LOWER(name) LIKE '%matematicas%');
UPDATE subjects SET sort_order = 5  WHERE grade = 3 AND (LOWER(short_name) = 'qui'  OR LOWER(name) LIKE '%química%' OR LOWER(name) LIKE '%quimica%');
UPDATE subjects SET sort_order = 6  WHERE grade = 3 AND (LOWER(short_name) = 'his'  OR LOWER(name) LIKE '%historia%');
UPDATE subjects SET sort_order = 7  WHERE grade = 3 AND (LOWER(short_name) = 'fce'  OR LOWER(name) LIKE '%cívica%' OR LOWER(name) LIKE '%civica%');
UPDATE subjects SET sort_order = 8  WHERE grade = 3 AND (LOWER(short_name) = 'tec'  OR LOWER(name) LIKE '%tecnología%' OR LOWER(name) LIKE '%tecnologia%');
UPDATE subjects SET sort_order = 9  WHERE grade = 3 AND (LOWER(short_name) = 'ef'   OR LOWER(name) LIKE '%educación física%' OR LOWER(name) LIKE '%educacion fisica%' OR LOWER(name) LIKE '%deportes%');
UPDATE subjects SET sort_order = 10 WHERE grade = 3 AND (LOWER(short_name) = 'tut'  OR LOWER(name) LIKE '%tutoría%' OR LOWER(name) LIKE '%tutoria%');
UPDATE subjects SET sort_order = 11 WHERE grade = 3 AND (LOWER(short_name) = 'vs'   OR LOWER(name) LIKE '%vida saludable%' OR LOWER(name) LIKE '%v. saludable%');
UPDATE subjects SET sort_order = 12 WHERE grade = 3 AND (LOWER(short_name) = 'ort'  OR LOWER(name) LIKE '%ortografía%' OR LOWER(name) LIKE '%ortografia%');
UPDATE subjects SET sort_order = 13 WHERE grade = 3 AND (LOWER(short_name) = 'sm'   OR LOWER(name) LIKE '%salud mental%' OR LOWER(name) LIKE '%s. mental%');
UPDATE subjects SET sort_order = 14 WHERE grade = 3 AND (LOWER(short_name) = 'val'  OR LOWER(name) LIKE '%valores%');
UPDATE subjects SET sort_order = 15 WHERE grade = 3 AND (LOWER(short_name) = 'disc' OR LOWER(name) LIKE '%disciplina%');
UPDATE subjects SET sort_order = 16 WHERE grade = 3 AND (LOWER(short_name) = 'aseo' OR LOWER(name) LIKE '%aseo%');
UPDATE subjects SET sort_order = 17 WHERE grade = 3 AND (LOWER(short_name) = 'tar'  OR LOWER(name) LIKE '%tareas%' OR LOWER(name) LIKE '%tardanzas%');
UPDATE subjects SET sort_order = 18 WHERE grade = 3 AND (LOWER(short_name) = 'inas' OR LOWER(name) LIKE '%inasistencias%');
UPDATE subjects SET sort_order = 19 WHERE grade = 3 AND (LOWER(short_name) = 'inc'  OR LOWER(name) LIKE '%incidencias%');

-- =====================================================
-- PASO 3: Verificar resultado
-- =====================================================
SELECT grade, sort_order, short_name, name, counts_for_avg
FROM subjects
ORDER BY grade, sort_order NULLS LAST;
