import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch ALL grades for a list of student IDs, paginating to bypass
 * Supabase's default 1000-row limit per query.
 *
 * Students are chunked (default 30) and each chunk is paginated
 * in 1000-row pages so no data is silently dropped.
 */
export async function fetchAllGrades(
  supabase: SupabaseClient,
  studentIds: string[],
  options?: {
    chunkSize?: number;
    columns?: string;
    extraFilter?: (query: any) => any;
  }
): Promise<any[]> {
  const chunkSize = options?.chunkSize ?? 30;
  const columns = options?.columns ?? "student_id, subject_id, period, score, absences, comment";
  const pageSize = 1000;
  let allGrades: any[] = [];

  for (let i = 0; i < studentIds.length; i += chunkSize) {
    const chunk = studentIds.slice(i, i + chunkSize);
    let from = 0;

    while (true) {
      let query = supabase
        .from("grades")
        .select(columns)
        .in("student_id", chunk)
        .range(from, from + pageSize - 1);

      if (options?.extraFilter) {
        query = options.extraFilter(query);
      }

      const { data } = await query;
      if (!data || data.length === 0) break;
      allGrades = allGrades.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  return allGrades;
}
