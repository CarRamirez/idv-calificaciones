export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      <span className="ml-3 text-sm text-slate-500">Cargando…</span>
    </div>
  );
}
