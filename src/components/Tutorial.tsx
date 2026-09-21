"use client";

import { useState } from "react";

type TutorialStep = {
  title: string;
  description: string;
  icon: React.ReactNode;
  tip?: string;
};

const TEACHER_STEPS: TutorialStep[] = [
  {
    title: "Buscar un alumno",
    description:
      "Utiliza la barra de búsqueda en la parte superior de la pantalla. Escribe el nombre del alumno y selecciona el resultado para ver su perfil, calificaciones y grupo asignado.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
    tip: "Puedes buscar por nombre o apellido. Los resultados aparecen conforme escribes.",
  },
  {
    title: "Capturar calificaciones",
    description:
      'Desde el menú "Calificaciones" en la barra de navegación, selecciona "Calificaciones" o ve a "Captura". Elige el grupo y la materia que deseas calificar. Ingresa las calificaciones de cada alumno en el periodo activo y presiona "Guardar".',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
      </svg>
    ),
    tip: "Solo puedes capturar calificaciones durante el periodo activo. Si el periodo está cerrado, contacta al administrador.",
  },
  {
    title: "Imprimir concentrado",
    description:
      'Ve a "Calificaciones" → "Concentrado" en la barra de navegación. Selecciona el grupo que deseas consultar. Verás una tabla con las calificaciones de todos los alumnos por materia. Usa el botón de impresión o exportación para obtener tu documento.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
      </svg>
    ),
    tip: "El concentrado muestra todos los periodos capturados. Puedes usarlo para revisar el avance general del grupo.",
  },
  {
    title: "Ver el directorio",
    description:
      'Desde el Dashboard (Inicio), encontrarás el botón "Directorio" junto al Horario Escolar. Aquí verás los datos de contacto de todos los profesores y personal: teléfono, correo electrónico y un botón para enviar WhatsApp directamente.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
    tip: "Asegúrate de registrar tu propio teléfono y correo en tu perfil para que tus compañeros también puedan contactarte.",
  },
  {
    title: "Consultar el horario",
    description:
      'Desde el Dashboard (Inicio), presiona el botón "Horario Escolar". Aquí podrás ver el horario semanal de clases de todos los grupos, organizado por día y hora.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
    tip: "El horario se actualiza automáticamente cuando el administrador realiza cambios.",
  },
];

const ADMIN_STEPS: TutorialStep[] = [
  {
    title: "Gestionar usuarios",
    description:
      'Desde "Usuarios" en la barra de navegación, accede a Profesores, Alumnos, Grupos y Materias. Puedes crear, editar y eliminar registros según necesites.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
    tip: "Usa la carga masiva para dar de alta múltiples profesores a la vez.",
  },
  {
    title: "Configurar periodos",
    description:
      'En "Periodos", activa o cierra los periodos de evaluación. Solo puede haber un periodo activo a la vez. Los profesores solo pueden capturar calificaciones en el periodo activo.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    title: "Capturar y revisar calificaciones",
    description:
      'Como administrador puedes capturar calificaciones de cualquier grupo y materia. Ve a "Calificaciones" → "Captura" y selecciona grupo y materia. También puedes revisar el concentrado y la boleta de cualquier alumno.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
      </svg>
    ),
  },
  {
    title: "Suplantar identidad",
    description:
      'Desde el perfil de cualquier usuario, usa el botón "Suplantar identidad" para ver el sistema como ese usuario lo ve. Esto es útil para verificar permisos y ayudar a los profesores. La suplantación se muestra con una barra naranja.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    tip: "Recuerda cerrar la suplantación cuando termines para volver a tu perfil de administrador.",
  },
  {
    title: "Directorio y horario",
    description:
      'Desde el Dashboard (Inicio) tienes acceso rápido al "Horario Escolar" y al "Directorio" de contactos de todo el personal.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
];

const STEP_COLORS = [
  { bg: "bg-primary-50", icon: "text-primary-500", ring: "ring-primary-200", progress: "bg-primary-500" },
  { bg: "bg-violet-50", icon: "text-violet-500", ring: "ring-violet-200", progress: "bg-violet-500" },
  { bg: "bg-emerald-50", icon: "text-emerald-500", ring: "ring-emerald-200", progress: "bg-emerald-500" },
  { bg: "bg-orange-50", icon: "text-orange-500", ring: "ring-orange-200", progress: "bg-orange-500" },
  { bg: "bg-sky-50", icon: "text-sky-500", ring: "ring-sky-200", progress: "bg-sky-500" },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
};

export default function Tutorial({ isOpen, onClose, userRole }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps =
    userRole === "admin"
      ? ADMIN_STEPS
      : userRole === "directora_anita"
      ? ADMIN_STEPS
      : TEACHER_STEPS;

  const totalSteps = steps.length;
  const step = steps[currentStep];
  const color = STEP_COLORS[currentStep % STEP_COLORS.length];

  if (!isOpen) return null;

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-3xl shadow-float max-w-lg w-full overflow-hidden animate-scale-in">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 w-full">
          <div
            className={`h-full ${color.progress} transition-all duration-500 ease-out rounded-r-full`}
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tutorial</span>
            <span className="text-[10px] text-gray-300">
              {currentStep + 1} / {totalSteps}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl ${color.bg} flex items-center justify-center mb-4 ring-4 ${color.ring} ring-opacity-30`}>
            <span className={color.icon}>{step.icon}</span>
          </div>

          {/* Title */}
          <h3
            className="text-lg font-extrabold text-gray-900 mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{step.description}</p>

          {/* Tip */}
          {step.tip && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-100 mb-4">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              <p className="text-xs text-amber-700">{step.tip}</p>
            </div>
          )}

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === currentStep
                    ? `w-6 h-2 ${color.progress}`
                    : i < currentStep
                    ? "w-2 h-2 bg-gray-300"
                    : "w-2 h-2 bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 ? (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="btn-secondary flex-1 text-sm"
              >
                Anterior
              </button>
            ) : (
              <button onClick={handleClose} className="btn-secondary flex-1 text-sm">
                Cerrar
              </button>
            )}
            {currentStep < totalSteps - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="btn-primary flex-1 text-sm"
              >
                Siguiente
              </button>
            ) : (
              <button onClick={handleClose} className="btn-primary flex-1 text-sm">
                ¡Entendido!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
