import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso de Privacidad – Mnemósine",
};

export default function AvisoPrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        Aviso de Privacidad
      </h1>

      <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed space-y-4">
        <p>
          <strong>Instituto Don Vasco (IDV)</strong>, con domicilio en Uruapan,
          Michoacán, México, es responsable del tratamiento de los datos
          personales que nos proporcione, los cuales serán protegidos conforme a
          lo dispuesto por la Ley General de Protección de Datos Personales en
          Posesión de Sujetos Obligados.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">
          Datos personales recabados
        </h2>
        <p>
          Para las finalidades señaladas en el presente aviso de privacidad,
          podemos recabar sus datos personales de distintas formas: cuando usted
          nos los proporciona directamente a través de la plataforma Mnemósine,
          sistema de calificaciones del Instituto Don Vasco.
        </p>
        <p>Los datos personales que recabamos incluyen:</p>
        <p>
          Nombre completo, número de lista, grupo asignado, calificaciones
          académicas, número de control, y en el caso del personal: nombre
          completo, correo electrónico institucional y rol asignado en la
          plataforma.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">
          Finalidad del tratamiento
        </h2>
        <p>
          Los datos personales recabados serán utilizados para: gestión
          académica, registro de calificaciones, generación de boletas y
          concentrados, control administrativo escolar, y comunicación
          institucional.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">
          Medidas de seguridad
        </h2>
        <p>
          Mnemósine implementa medidas de seguridad técnicas, administrativas y
          físicas para proteger sus datos personales contra daño, pérdida,
          alteración, destrucción o acceso no autorizado. El acceso a la
          plataforma está restringido mediante autenticación y roles de usuario
          con permisos diferenciados.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">
          Derechos ARCO
        </h2>
        <p>
          Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al
          tratamiento de sus datos personales (derechos ARCO). Para ejercer
          cualquiera de estos derechos, puede contactar a la dirección del
          Instituto Don Vasco.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">
          Modificaciones al aviso de privacidad
        </h2>
        <p>
          El presente aviso de privacidad puede sufrir modificaciones, cambios o
          actualizaciones. Cualquier modificación será publicada en esta misma
          plataforma.
        </p>

        <p className="text-xs text-slate-400 mt-8">
          Última actualización: Noviembre 2026
        </p>
      </div>
    </div>
  );
}
