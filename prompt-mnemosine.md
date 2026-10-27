# Prompt para recrear Mnemósine — Sistema de Gestión de Calificaciones

> **Instrucción**: Copia y pega este prompt en un nuevo chat de Claude para recrear el sistema Mnemósine desde cero. Ajusta las secciones marcadas con `[CONFIGURAR]` según tu entorno.

---

## Contexto del proyecto

Quiero que me ayudes a construir **Mnemósine**, un sistema web de gestión de calificaciones para el **Instituto Don Vasco**, una escuela secundaria mexicana ubicada en Morelos #115, Centro, Apaseo El Grande, Guanajuato. El sistema debe manejar calificaciones, boletas, concentrados, horarios, reportes y comunicación con padres de familia.

## Stack tecnológico

- **Framework**: Next.js 14 (App Router) con TypeScript
- **Base de datos y auth**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Estilos**: Tailwind CSS 3.4 con tema personalizado
- **Hosting**: Vercel (auto-deploy desde GitHub)
- **Librerías clave**:
  - `@supabase/ssr` ^0.12.6 — cliente Supabase para SSR con cookies
  - `@supabase/supabase-js` ^2.115.0
  - `exceljs` ^4.4.0 — generación de archivos Excel
  - `nodemailer` ^10.0.12 — envío de emails vía Gmail SMTP
  - `zod` ^4.5.4 — validación de datos

## Variables de entorno `[CONFIGURAR]`

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=tu-app-password-de-gmail
```

---

## Esquema de base de datos (Supabase/PostgreSQL)

### Tablas principales

```sql
-- Ciclos escolares
CREATE TABLE school_years (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,           -- ej: "2026-2027"
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Grupos
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_year_id UUID REFERENCES school_years(id),
  grade INTEGER NOT NULL CHECK (grade IN (1, 2, 3)),
  letter TEXT NOT NULL,          -- 'A', 'B', 'C', o 'Bajas'
  parent_email TEXT,             -- correo grupal de padres
  parent_cc TEXT[],              -- correos CC adicionales
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Materias
CREATE TABLE subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,            -- nombre completo
  short_name TEXT NOT NULL,      -- abreviatura (ESP, MAT, ING, etc.)
  grade INTEGER NOT NULL,
  counts_for_avg BOOLEAN DEFAULT true,  -- si cuenta para promedio
  sort_order INTEGER DEFAULT 0,
  input_type TEXT DEFAULT 'score',      -- 'score' | 'counter' | 'counter_max'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Perfiles de usuario (extensión de auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'teacher',  -- 'admin' | 'directora_anita' | 'teacher' | 'viewer'
  custom_permissions TEXT[],             -- permisos extra: 'tareas', etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alumnos
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id),
  full_name TEXT NOT NULL,       -- formato: "Apellido1 Apellido2 Nombre(s)"
  status TEXT DEFAULT 'activo',  -- 'activo' | 'baja'
  sort_key TEXT,                 -- para ordenamiento personalizado
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asignaciones maestro-materia-grupo
CREATE TABLE teacher_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id),
  subject_id UUID REFERENCES subjects(id),
  group_id UUID REFERENCES groups(id),
  UNIQUE(teacher_id, subject_id, group_id)
);

-- Calificaciones
CREATE TABLE grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  subject_id UUID REFERENCES subjects(id),
  period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 8),
  score NUMERIC,                 -- calificación o conteo de incidencias
  absences INTEGER DEFAULT 0,
  comment TEXT,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, subject_id, period)
);

-- Periodos de evaluación
CREATE TABLE evaluation_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_year_id UUID REFERENCES school_years(id),
  period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 8),
  name TEXT NOT NULL,            -- 'Septiembre', 'Octubre', 'Nov-Dic', etc.
  is_open BOOLEAN DEFAULT false,
  open_date TIMESTAMPTZ,
  close_date TIMESTAMPTZ,
  UNIQUE(school_year_id, period_number)
);

-- Presencia/actividad de usuarios
CREATE TABLE presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  last_active TIMESTAMPTZ DEFAULT now(),
  page TEXT
);

-- Log de auditoría
CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notificaciones de tareas
CREATE TABLE homework_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sent_by UUID REFERENCES profiles(id),
  group_id UUID REFERENCES groups(id),
  message TEXT,
  recipients TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Anuncios del dashboard
CREATE TABLE announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES profiles(id),
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS (Row Level Security)

```sql
-- Función helper para obtener rol del usuario
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Función para verificar asignación de maestro
CREATE OR REPLACE FUNCTION teacher_has_assignment(p_subject_id UUID, p_group_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM teacher_assignments
    WHERE teacher_id = auth.uid()
    AND subject_id = p_subject_id
    AND group_id = p_group_id
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Política de grades: todos autenticados leen, admin escribe todo,
-- maestros solo escriben sus asignaciones
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read grades"
  ON grades FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage all grades"
  ON grades FOR ALL TO authenticated
  USING (get_user_role() IN ('admin', 'directora_anita'))
  WITH CHECK (get_user_role() IN ('admin', 'directora_anita'));

CREATE POLICY "Teachers can manage their assigned grades"
  ON grades FOR ALL TO authenticated
  USING (teacher_has_assignment(subject_id, (
    SELECT group_id FROM students WHERE id = student_id
  )))
  WITH CHECK (teacher_has_assignment(subject_id, (
    SELECT group_id FROM students WHERE id = student_id
  )));

-- Aplicar políticas similares a todas las tablas:
-- SELECT: todos los autenticados pueden leer
-- INSERT/UPDATE/DELETE: solo admin, o con lógica específica
```

### Datos semilla — Periodos

```sql
-- 8 periodos por ciclo escolar
INSERT INTO evaluation_periods (school_year_id, period_number, name) VALUES
  ('<school_year_id>', 1, 'Septiembre'),
  ('<school_year_id>', 2, 'Octubre'),
  ('<school_year_id>', 3, 'Nov-Dic'),
  ('<school_year_id>', 4, 'Ene-Feb'),
  ('<school_year_id>', 5, 'Marzo'),
  ('<school_year_id>', 6, 'Abril'),
  ('<school_year_id>', 7, 'Mayo'),
  ('<school_year_id>', 8, 'Junio');
```

### Datos semilla — Materias por grado

**1er Grado** (curriculares — `counts_for_avg = true`):
Español (ESP), Inglés (ING), Artes (ART), Matemáticas (MAT), Biología (BIO), Geografía (GEO), Historia (HIS), FCE, Tecnología (TEC), Ed. Física (EF)

**2do Grado** (curriculares):
Español (ESP), Inglés (ING), Artes (ART), Matemáticas (MAT), Física (FIS), Historia (HIS), FCE, Tecnología (TEC), Ed. Física (EF)

**3er Grado** (curriculares):
Español (ESP), Inglés (ING), Artes (ART), Matemáticas (MAT), Química (QUI), Historia (HIS), FCE, Tecnología (TEC), Ed. Física (EF)

**Todos los grados** (no curriculares — `counts_for_avg = false`):
Tutoría (TUT), Vida Saludable (VS), Ortografía (ORT), Salud Mental (SM), Valores (VAL), Disciplina (DISC), Aseo (ASEO)

**Todos los grados** (incidencias — `counts_for_avg = false`, `input_type = 'counter'`):
Tareas (TAR), Inasistencias (INAS), Incumplimientos (INC)

### Grupos del ciclo actual

7 grupos: **1°A**, **1°B**, **2°A**, **2°B**, **3°A**, **3°B**, **3°C**
(Grupo especial "Bajas" por grado para alumnos dados de baja)

---

## Arquitectura del sistema

### Clientes Supabase (3 variantes)

1. **Cliente del navegador** (`src/lib/supabase/client.ts`):
   ```typescript
   import { createBrowserClient } from "@supabase/ssr";
   export const createClient = () =>
     createBrowserClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
     );
   ```

2. **Cliente del servidor** (`src/lib/supabase/server.ts`):
   - Usa `createServerClient` de `@supabase/ssr`
   - Lee/escribe cookies para mantener sesión
   - **Es síncrono** (no necesita `await`)
   - Respeta RLS (usa anon key + cookies del usuario)

3. **Cliente admin** (`src/lib/supabase/admin.ts`):
   - Usa `createClient` de `@supabase/supabase-js` con `SUPABASE_SERVICE_ROLE_KEY`
   - **Bypass de RLS** — solo usar en server-side para operaciones administrativas
   - `auth: { persistSession: false }`

### Sistema de impersonación (`src/lib/impersonation.ts`)

Permite que un admin vea el sistema como si fuera otro usuario:

```typescript
export async function getEffectiveProfile(realUserId: string, realProfile: any) {
  // Lee cookies 'impersonate_as' e 'impersonate_admin_id'
  // Solo funciona si realProfile.role === 'admin'
  // Retorna { effectiveProfile, isImpersonating, realProfile }
}
```

### Roles y permisos

| Rol | Acceso |
|-----|--------|
| `admin` | Todo. Puede impersonar otros usuarios. |
| `directora_anita` | Dashboard, concentrados, boletas, periodos (lectura). |
| `teacher` | Solo sus materias/grupos asignados. Captura de calificaciones. |
| `viewer` | Solo lectura de dashboard y reportes. |

Los permisos adicionales (`custom_permissions`) en el perfil permiten otorgar capacidades específicas como `'tareas'` (enviar notificaciones de tareas) a roles que normalmente no las tienen.

### Middleware

El middleware de Next.js debe:
1. Refrescar la sesión de Supabase en cada request
2. Redirigir a `/login` si no hay sesión autenticada (excepto rutas públicas)
3. Proteger rutas admin

---

## Lógica de calificaciones (CRÍTICO)

### Estructura de trimestres

```
1er Trimestre: Periodos 1 (Sep) y 2 (Oct)
2do Trimestre: Periodos 3 (Nov-Dic) y 4 (Ene-Feb)
3er Trimestre: Periodos 5 (Mar), 6 (Abr), 7 (May), 8 (Jun)
```

### Cálculo de promedios

1. **Promedio trimestral por materia**: promedio simple de los periodos del trimestre que tengan calificación
2. **Promedio curricular (final) por materia**: promedio de los promedios trimestrales disponibles
3. **Promedio general del alumno**: promedio de los promedios curriculares de materias con `counts_for_avg = true`

```typescript
// Ejemplo del cálculo
const TRIMESTERS = [
  { periods: [1, 2] },      // 1er Trimestre
  { periods: [3, 4] },      // 2do Trimestre
  { periods: [5, 6, 7, 8] } // 3er Trimestre
];

function getSubjectCurricular(periodScores: Record<number, number>): number | null {
  const trimAvgs: number[] = [];
  for (const t of TRIMESTERS) {
    const scores = t.periods
      .map(p => periodScores[p])
      .filter((s): s is number => s != null);
    if (scores.length > 0) {
      trimAvgs.push(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
  }
  if (trimAvgs.length === 0) return null;
  return trimAvgs.reduce((a, b) => a + b, 0) / trimAvgs.length;
}
```

### Materias de incidencias (penalizaciones)

Las materias **TAR** (Tareas), **INAS** (Inasistencias) e **INC** (Incumplimientos):
- `counts_for_avg = false` — NO cuentan para el promedio
- `input_type = 'counter'` — el score es un conteo (0, 1, 2, 3...)
- Se suman a través de todos los periodos para mostrar totales
- Se excluyen del conteo de "progreso de captura" del dashboard

### Alumno en riesgo

Un alumno está **en riesgo** cuando su promedio general (calculado con la fórmula de arriba) es **menor a 6**.

### Semáforo de colores

```
Rojo:     score < 7   (reprobando o en riesgo)
Amarillo: score < 8   (regular)
Verde:    score >= 8   (bien)
```

---

## Módulos / Páginas del sistema

### 1. Login (`/login`)
- Autenticación con email/password vía Supabase Auth
- Redirige al dashboard tras login exitoso
- Interfaz limpia con branding del Instituto

### 2. Dashboard (`/dashboard`)
- **Solo admin/directora/viewer**
- Componentes:
  - `PeriodBanner`: muestra el periodo activo actual
  - `AnnouncementWall`: anuncios y avisos fijados
  - `CaptureAlerts`: progreso de captura por maestro (% completado, detalles pendientes)
  - `PerformanceStats`: rendimiento por grupo (promedio, alumnos en riesgo expandibles, materias más reprobadas, totales de incidencias)
  - `PeriodsTimeline`: línea de tiempo visual de periodos
  - Links rápidos: Calificaciones, Horario, Concentrados, Directorio, Servicios Escolares, WiFi Docentes

### 3. Captura de calificaciones (`/captura`)
- **Paso 1** (`/captura`): Selector de grupo y materia
  - Maestros ven solo sus asignaciones
  - Admin ve todo, organizado por grado (1°=azul, 2°=esmeralda, 3°=púrpura)
  - Separa materias curriculares de no-curriculares
- **Paso 2** (`/captura/[groupId]/[subjectId]`): Grid de captura
  - Columnas: una por cada periodo del trimestre activo
  - Filas: un alumno por fila, ordenados alfabéticamente
  - Cada celda: campo de score + inasistencias + comentario
  - Los periodos cerrados aparecen bloqueados (admin puede desbloquear)
  - Modal de confirmación si hay datos faltantes al guardar
  - Guardado masivo con upsert a tabla `grades`

### 4. Concentrado (`/concentrados`)
- **Vista general** de todas las calificaciones de un grupo
- Filtros: grupo, materia, modo de vista (mes/trimestre/general)
- Tabla con todos los alumnos × materias × periodos
- Promedios trimestrales y finales calculados
- Filas de incidencias (TAR/INAS/INC) en rojo al final
- **Exportación a Excel** con múltiples hojas y formato condicional

### 5. Boleta (`/boleta`)
- Boleta individual de un alumno o de todo el grupo
- Muestra todas las materias con scores por trimestre
- Promedio trimestral, promedio final por materia, promedio general
- Semáforo de colores
- Total de inasistencias

### 6. Horario (`/horario`)
- Horario escolar visual con datos hardcodeados (no de DB)
- Selector de grupo con tabs por grado
- Grid de lunes a viernes × 7 módulos (7:30-13:30)
- Colores por materia
- Responsive: vista compacta en móvil

### 7. Periodos (`/periodos`)
- **Solo admin**
- Gestión de periodos de evaluación: abrir/cerrar, fechas, notificación por email a maestros

### 8. Servicios Escolares (`/servicios-escolares`)
- Generación de constancias (en construcción)
- Opciones: constancia de estudios, calificaciones, buena conducta, traslado

### 9. Directorio (`/directorio`)
- Lista de personal del instituto

### 10. Tareas (`/tareas`)
- Envío de notificaciones de tareas/avisos a padres por email
- Requiere rol admin o permiso `tareas`
- Selección de grupo, mensaje personalizado
- Historial de envíos

### 11. Administración de alumnos (`/admin/alumnos`)
- **Solo admin**
- CRUD de alumnos: alta, baja, cambio de grupo
- Importación masiva

---

## Generación de Excel (API Routes)

### Patrón general
Todas las rutas de Excel usan `exceljs` y retornan `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

### `/api/captura/[groupId]/[subjectId]/excel` — Excel de una materia
- Una hoja por trimestre + hoja "Resumen Anual"
- Columnas: alumno, periodos del trimestre, promedio trimestral
- Formato condicional semáforo (rojo <7, amarillo <8, verde >=8)
- Comentarios de celdas como notas de Excel
- Workbook creator: "Mnemosine — Instituto Don Vasco"

### `/api/concentrado/[groupId]/excel` — Concentrado de un grupo
- Hoja general + una por trimestre
- Todas las materias del grupo
- Filas de incidencias (TAR/INAS/INC) en rojo al final

### `/api/concentrados/excel` — Concentrado con filtros
- Parámetros: `groupId`, `filterMode` (month|trimester|general), `period`, `trimester`, `subjectId`
- El Excel más complejo: adapta las hojas según el filtro seleccionado

---

## API del Dashboard (`/api/dashboard/stats`)

Endpoint GET que retorna:

```typescript
{
  activePeriod: { period_number, name } | null,
  captureAlerts: [{
    teacherId, teacherName, pct,
    totalCaptured, totalExpected,
    pendingDetails: ["1°A ESP (15/28)", ...]
  }],
  performanceByGroup: [{
    groupId, grade, letter, label,
    studentCount, avgScore,
    atRiskCount,
    atRiskStudents: [{ id, name, avg }],
    failingSubjects: [{ name, count }],
    penaltyTotals: [{ name, total }]
  }],
  periodsTimeline: [{ period_number, name, is_open, effectively_open, open_date, close_date }]
}
```

**Nota importante**: Usa paginación para superar el límite de 1000 filas de Supabase:

```typescript
async function fetchPaginated(supabase, queryBuilder) {
  const pageSize = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data } = await queryBuilder().range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
```

---

## Componentes clave

### Navbar
- Barra de navegación responsive con menú hamburguesa en móvil
- Sistema de timeout de sesión (10 min, advertencia a los 9.5 min, extensión de 5 min)
- Heartbeat de presencia (`/api/presence`) cada 30 segundos
- Widget de clima vía Open-Meteo API con geolocalización
- Búsqueda global (`/api/search`)
- Selector de tema (claro/oscuro/auto) con skins de color
- Dropdown de usuarios conectados (solo admin)
- Marca de agua SVG superpuesta con nombre de usuario
- Links de navegación filtrados por rol y permisos

### ThemeProvider
- Contexto de React para modo (light/dark/auto) y color/skin
- Persiste preferencias en localStorage
- Aplica clases CSS dinámicamente

### PerformanceStats
- Cards por grupo con colores por grado (1°=azul, 2°=esmeralda, 3°=púrpura)
- Promedio del grupo con semáforo
- Contador de alumnos en riesgo expandible (click para ver nombres y promedios)
- Top 3 materias más reprobadas
- Totales de incidencias (Tareas, Inasistencias, Incumplimientos)

---

## Sistema de emails

Usa **nodemailer** con Gmail SMTP. Dos tipos de email:

1. **Notificación de tareas** (`sendHomeworkEmail`):
   - From: "Prefectura IDV"
   - Para padres del grupo seleccionado
   - Template HTML con formato del mensaje

2. **Notificación de periodo** (`sendPeriodNotification`):
   - Notifica a maestros cuando un periodo se abre
   - Template HTML con header degradado, tarjetas de fechas, botón CTA al dashboard
   - Footer con dirección de la escuela

---

## Formato de nombres de alumnos

Los nombres se almacenan como "Apellido1 Apellido2 Nombre(s)" y se formatean para mostrar como:
`APELLIDO1 / APELLIDO2 * NOMBRE(S)`

Maneja apellidos compuestos con preposiciones: de, del, la, los, las.
Ejemplo: "De Santiago Maldonado Paulina" → "DE SANTIAGO / MALDONADO * PAULINA"

---

## Diseño y UI

### Tema de Tailwind personalizado

- **Colores**: primary (azul), accent (naranja), coral, mint, violet, sky
- **Grados**: 1°=azul, 2°=esmeralda, 3°=púrpura
- **Sombras personalizadas**: glow, soft, card, float
- **Animaciones**: fade-in, slide-up, slide-down, scale-in, bounce-soft, shimmer
- **Componentes recurrentes**: `.card` (rounded-xl, shadow, bg-white), `.card-interactive` (con hover effects)
- **Responsive**: mobile-first, breakpoints sm/md/lg
- **Interfaz en español** — todo el texto de la UI está en español

### Patrones de UI

- Loading states con pulse/shimmer
- Empty states con mensajes descriptivos
- Modals de confirmación para acciones destructivas
- Toast notifications para feedback
- Dropdowns con click-outside para cerrar
- Tabs para filtros (grupo, trimestre, vista)

---

## Orden de materias (sort_order)

Las materias se ordenan en este orden para todos los reportes y vistas:

```
1. ESP  (Español)
2. ING  (Inglés)
3. ART  (Artes)
4. MAT  (Matemáticas)
5. BIO/FIS/QUI (ciencia del grado: Bio=1°, Fís=2°, Quí=3°)
6. GEO  (solo 1er grado)
7. HIS  (Historia — posición 6 en 2° y 3°)
8. FCE
9. TEC  (Tecnología)
10. EF   (Ed. Física)
11-16. No curriculares: TUT, VS, ORT, SM, VAL, DISC, ASEO
17-19. Incidencias: TAR, INAS, INC
```

---

## Notas de implementación importantes

1. **`createServerSupabaseClient()` es síncrono** — no uses `await` al llamarlo
2. **`createAdminClient()`** usa service role key y bypasea RLS — solo server-side
3. **`getEffectiveProfile()`** valida cookies de impersonación — solo funciona con role='admin'
4. **Siempre paginación** para queries que pueden exceder 1000 filas
5. **Los periodos tienen doble check**: `is_open` (toggle manual) + `open_date`/`close_date` (rango de fechas). Un periodo está `effectively_open` solo si ambas condiciones se cumplen.
6. **Admin puede capturar en periodos cerrados** — el bloqueo solo aplica a maestros
7. **Las incidencias (TAR/INAS/INC) se suman**, no se promedian
8. **Excluir TAR/INAS/INC/TUT del progreso de captura** en el dashboard
9. **Grades usan UPSERT** con constraint `(student_id, subject_id, period)`

---

## Estructura de archivos sugerida

```
src/
├── app/
│   ├── layout.tsx              # Layout principal con Navbar
│   ├── globals.css             # Estilos globales + Tailwind
│   ├── login/page.tsx          # Autenticación
│   ├── dashboard/page.tsx      # Dashboard admin (server component)
│   ├── captura/
│   │   ├── page.tsx            # Selector grupo/materia
│   │   └── [groupId]/[subjectId]/page.tsx  # Grid de captura
│   ├── concentrados/page.tsx   # Vista concentrado
│   ├── boleta/page.tsx         # Boletas
│   ├── horario/page.tsx        # Horario escolar
│   ├── periodos/page.tsx       # Gestión de periodos
│   ├── tareas/page.tsx         # Notificaciones de tareas
│   ├── servicios-escolares/page.tsx
│   ├── directorio/page.tsx
│   ├── admin/
│   │   └── alumnos/page.tsx
│   └── api/
│       ├── dashboard/stats/route.ts
│       ├── admin/periods/route.ts
│       ├── admin/periods/notify/route.ts
│       ├── captura/[groupId]/[subjectId]/excel/route.ts
│       ├── concentrado/[groupId]/excel/route.ts
│       ├── concentrados/excel/route.ts
│       ├── tareas/send/route.ts
│       ├── auth/permissions/route.ts
│       ├── presence/route.ts
│       └── search/route.ts
├── components/
│   ├── Navbar.tsx
│   ├── ThemeProvider.tsx
│   ├── Tutorial.tsx
│   ├── PerformanceStats.tsx
│   ├── CaptureAlerts.tsx
│   ├── PeriodsTimeline.tsx
│   ├── PeriodBanner.tsx
│   ├── AnnouncementWall.tsx
│   ├── BoletaView.tsx
│   ├── BoletaAllGroup.tsx
│   ├── ConcentradoFiltered.tsx
│   └── ConcentradoTable.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client (síncrono)
│   │   └── admin.ts            # Admin client (bypass RLS)
│   ├── impersonation.ts        # Sistema de impersonación
│   ├── email.ts                # Funciones de envío de email
│   └── format-name.ts          # Formateo de nombres
└── middleware.ts                # Auth middleware
```

---

## Instrucciones para recrear

Empieza en este orden:

1. **Setup**: Crear proyecto Next.js 14 con TypeScript y Tailwind. Instalar dependencias.
2. **Base de datos**: Crear las tablas en Supabase, configurar RLS, insertar datos semilla.
3. **Auth y middleware**: Configurar los 3 clientes Supabase, el middleware de auth, y la página de login.
4. **Layout y Navbar**: Layout principal con la Navbar completa (sesión, tema, navegación).
5. **Dashboard**: La página principal admin con todos sus componentes y la API de stats.
6. **Captura**: El flujo completo de captura de calificaciones (selector → grid → guardado).
7. **Concentrado y Boleta**: Vistas de consulta con las fórmulas de promediación.
8. **Exportación Excel**: Las 3 rutas API de generación de Excel.
9. **Otros módulos**: Horario, periodos, tareas, servicios escolares, directorio.
10. **Pulido**: Impersonación, presencia, búsqueda, tutorial, estados vacíos.

En cada paso, prioriza que funcione correctamente antes de agregar detalles visuales. La lógica de calificaciones (trimestres, promedios, at-risk) es la parte más crítica y debe implementarse exactamente como se describe arriba.
