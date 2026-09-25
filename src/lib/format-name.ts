/**
 * Formatea el nombre de un alumno al estilo:
 * "APELLIDO1 / APELLIDO2 * NOMBRE(S)"
 *
 * Maneja apellidos compuestos como "De Santiago", "De La Cruz", etc.
 *
 * Ejemplos:
 *   "Aboytes Rodríguez José"           → "ABOYTES / RODRÍGUEZ * JOSÉ"
 *   "De Santiago Maldonado Paulina"     → "DE SANTIAGO / MALDONADO * PAULINA"
 *   "Mancera De Santiago Ethan"         → "MANCERA / DE SANTIAGO * ETHAN"
 *   "Gomez Palomino Karol de Jesus"     → "GOMEZ / PALOMINO * KAROL DE JESUS"
 */

const PREPOSITIONS = new Set(["de", "del", "la", "los", "las"]);

function isPrep(word: string): boolean {
  return PREPOSITIONS.has(word.toLowerCase());
}

/** Consume a surname starting at idx: optional prepositions + a root word */
function consumeSurname(parts: string[], startIdx: number): number {
  let i = startIdx;
  while (i < parts.length && isPrep(parts[i])) {
    i++;
  }
  if (i < parts.length) {
    i++; // consume the root word
  }
  return i;
}

export function formatStudentName(fullName: string): string {
  if (!fullName) return "";

  const parts = fullName.trim().split(/\s+/);

  if (parts.length < 3) {
    if (parts.length === 2) {
      return `${parts[0].toUpperCase()} * ${parts[1].toUpperCase()}`;
    }
    return fullName.toUpperCase();
  }

  let idx = 0;

  // Apellido Paterno
  const paternoEnd = consumeSurname(parts, idx);
  const apellidoPaterno =
    paternoEnd <= parts.length - 2
      ? parts.slice(idx, paternoEnd).join(" ")
      : parts[idx];
  idx = paternoEnd <= parts.length - 2 ? paternoEnd : idx + 1;

  // Apellido Materno
  const maternoEnd = consumeSurname(parts, idx);
  const apellidoMaterno =
    maternoEnd <= parts.length - 1
      ? parts.slice(idx, maternoEnd).join(" ")
      : parts[idx];
  idx = maternoEnd <= parts.length - 1 ? maternoEnd : idx + 1;

  // Nombre(s)
  const nombres = parts.slice(idx).join(" ");

  return `${apellidoPaterno.toUpperCase()} / ${apellidoMaterno.toUpperCase()} * ${nombres.toUpperCase()}`;
}
