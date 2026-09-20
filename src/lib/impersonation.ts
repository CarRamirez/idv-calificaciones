import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Given the real authenticated user's profile, returns the effective profile
 * (which may be the impersonated user's profile if an admin is impersonating).
 *
 * Returns { effectiveProfile, isImpersonating, realProfile }
 */
export async function getEffectiveProfile(
  realUserId: string,
  realProfile: { full_name: string; role: string }
) {
  const cookieStore = cookies();
  const impersonateAs = cookieStore.get("impersonate_as")?.value;
  const impersonateAdminId = cookieStore.get("impersonate_admin_id")?.value;

  if (impersonateAs && impersonateAdminId === realUserId && realProfile.role === "admin") {
    const admin = createAdminClient();
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("full_name, role")
      .eq("id", impersonateAs)
      .single();

    if (targetProfile) {
      return {
        effectiveProfile: targetProfile,
        isImpersonating: true,
        realProfile,
        impersonatedUserId: impersonateAs,
      };
    }
  }

  return {
    effectiveProfile: realProfile,
    isImpersonating: false,
    realProfile,
    impersonatedUserId: null,
  };
}
