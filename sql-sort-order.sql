-- =====================================================
-- Actualizar sort_order de materias por grado
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- ── 1er Grado ──
UPDATE subjects SET sort_order = 1  WHERE grade = 1 AND LOWER(short_name) = 'esp';
UPDATE subjects SET sort_order = 2  WHERE grade = 1 AND LOWER(short_name) = 'ing';
UPDATE subjects SET sort_order = 3  WHERE grade = 1 AND LOWER(short_name) = 'art';
UPDATE subjects SET sort_order = 4  WHERE grade = 1 AND LOWER(short_name) = 'mat';
UPDATE subjects SET sort_order = 5  WHERE grade = 1 AND LOWER(short_name) = 'bio';
UPDATE subjects SET sort_order = 6  WHERE grade = 1 AND LOWER(short_name) = 'geo';
UPDATE subjects SET sort_order = 7  WHERE grade = 1 AND LOWER(short_name) = 'his';
UPDATE subjects SET sort_order = 8  WHERE grade = 1 AND LOWER(short_name) = 'fce';
UPDATE subjects SET sort_order = 9  WHERE grade = 1 AND LOWER(short_name) = 'tec';
UPDATE subjects SET sort_order = 10 WHERE grade = 1 AND LOWER(short_name) = 'ef';
UPDATE subjects SET sort_order = 11 WHERE grade = 1 AND LOWER(short_name) = 'tut';
UPDATE subjects SET sort_order = 12 WHERE grade = 1 AND LOWER(short_name) = 'vs';
UPDATE subjects SET sort_order = 13 WHERE grade = 1 AND LOWER(short_name) = 'ort';
UPDATE subjects SET sort_order = 14 WHERE grade = 1 AND LOWER(short_name) = 'val';
UPDATE subjects SET sort_order = 15 WHERE grade = 1 AND LOWER(short_name) = 'disc';
UPDATE subjects SET sort_order = 16 WHERE grade = 1 AND LOWER(short_name) = 'aseo';
UPDATE subjects SET sort_order = 17 WHERE grade = 1 AND LOWER(short_name) = 'tar';
UPDATE subjects SET sort_order = 18 WHERE grade = 1 AND LOWER(short_name) = 'inas';
UPDATE subjects SET sort_order = 19 WHERE grade = 1 AND LOWER(short_name) = 'inc';

-- ── 2do Grado ──
UPDATE subjects SET sort_order = 1  WHERE grade = 2 AND LOWER(short_name) = 'esp';
UPDATE subjects SET sort_order = 2  WHERE grade = 2 AND LOWER(short_name) = 'ing';
UPDATE subjects SET sort_order = 3  WHERE grade = 2 AND LOWER(short_name) = 'art';
UPDATE subjects SET sort_order = 4  WHERE grade = 2 AND LOWER(short_name) = 'mat';
UPDATE subjects SET sort_order = 5  WHERE grade = 2 AND LOWER(short_name) = 'fis';
UPDATE subjects SET sort_order = 6  WHERE grade = 2 AND LOWER(short_name) = 'his';
UPDATE subjects SET sort_order = 7  WHERE grade = 2 AND LOWER(short_name) = 'fce';
UPDATE subjects SET sort_order = 8  WHERE grade = 2 AND LOWER(short_name) = 'tec';
UPDATE subjects SET sort_order = 9  WHERE grade = 2 AND LOWER(short_name) = 'ef';
UPDATE subjects SET sort_order = 10 WHERE grade = 2 AND LOWER(short_name) = 'tut';
UPDATE subjects SET sort_order = 11 WHERE grade = 2 AND LOWER(short_name) = 'vs';
UPDATE subjects SET sort_order = 12 WHERE grade = 2 AND LOWER(short_name) = 'ort';
UPDATE subjects SET sort_order = 13 WHERE grade = 2 AND LOWER(short_name) = 'sm';
UPDATE subjects SET sort_order = 14 WHERE grade = 2 AND LOWER(short_name) = 'val';
UPDATE subjects SET sort_order = 15 WHERE grade = 2 AND LOWER(short_name) = 'disc';
UPDATE subjects SET sort_order = 16 WHERE grade = 2 AND LOWER(short_name) = 'aseo';
UPDATE subjects SET sort_order = 17 WHERE grade = 2 AND LOWER(short_name) = 'tar';
UPDATE subjects SET sort_order = 18 WHERE grade = 2 AND LOWER(short_name) = 'inas';
UPDATE subjects SET sort_order = 19 WHERE grade = 2 AND LOWER(short_name) = 'inc';

-- ── 3er Grado ──
UPDATE subjects SET sort_order = 1  WHERE grade = 3 AND LOWER(short_name) = 'esp';
UPDATE subjects SET sort_order = 2  WHERE grade = 3 AND LOWER(short_name) = 'ing';
UPDATE subjects SET sort_order = 3  WHERE grade = 3 AND LOWER(short_name) = 'art';
UPDATE subjects SET sort_order = 4  WHERE grade = 3 AND LOWER(short_name) = 'mat';
UPDATE subjects SET sort_order = 5  WHERE grade = 3 AND LOWER(short_name) = 'qui';
UPDATE subjects SET sort_order = 6  WHERE grade = 3 AND LOWER(short_name) = 'his';
UPDATE subjects SET sort_order = 7  WHERE grade = 3 AND LOWER(short_name) = 'fce';
UPDATE subjects SET sort_order = 8  WHERE grade = 3 AND LOWER(short_name) = 'tec';
UPDATE subjects SET sort_order = 9  WHERE grade = 3 AND LOWER(short_name) = 'ef';
UPDATE subjects SET sort_order = 10 WHERE grade = 3 AND LOWER(short_name) = 'tut';
UPDATE subjects SET sort_order = 11 WHERE grade = 3 AND LOWER(short_name) = 'vs';
UPDATE subjects SET sort_order = 12 WHERE grade = 3 AND LOWER(short_name) = 'ort';
UPDATE subjects SET sort_order = 13 WHERE grade = 3 AND LOWER(short_name) = 'sm';
UPDATE subjects SET sort_order = 14 WHERE grade = 3 AND LOWER(short_name) = 'val';
UPDATE subjects SET sort_order = 15 WHERE grade = 3 AND LOWER(short_name) = 'disc';
UPDATE subjects SET sort_order = 16 WHERE grade = 3 AND LOWER(short_name) = 'aseo';
UPDATE subjects SET sort_order = 17 WHERE grade = 3 AND LOWER(short_name) = 'tar';
UPDATE subjects SET sort_order = 18 WHERE grade = 3 AND LOWER(short_name) = 'inas';
UPDATE subjects SET sort_order = 19 WHERE grade = 3 AND LOWER(short_name) = 'inc';

-- Verificar resultado
SELECT grade, sort_order, short_name, name FROM subjects ORDER BY grade, sort_order;
