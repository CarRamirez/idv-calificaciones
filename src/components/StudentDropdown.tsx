"use client";

import { useRouter } from "next/navigation";
import { formatStudentName } from "@/lib/format-name";

type Student = { id: string; full_name: string; list_num: number };

type Props = {
  classmates: Student[];
  currentId: string;
};

export default function StudentDropdown({ classmates, currentId }: Props) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="student-select" className="text-xs font-medium text-slate-500 whitespace-nowrap">
        Alumno:
      </label>
      <select
        id="student-select"
        value={currentId}
        onChange={(e) => router.push(`/boleta/${e.target.value}`)}
        className="input-field text-sm py-1.5 pr-8 max-w-xs sm:max-w-sm"
      >
        {classmates.map((s) => (
          <option key={s.id} value={s.id}>
            {s.list_num}. {formatStudentName(s.full_name)}
          </option>
        ))}
      </select>
      <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
        {classmates.findIndex((s) => s.id === currentId) + 1} / {classmates.length}
      </span>
    </div>
  );
}
