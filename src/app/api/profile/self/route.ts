import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PUT: Update own profile
export async function PUT(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { full_name, label, new_password } = await req.json();

  if (!full_name?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Update profile (name and label only — role stays unchanged)
  const updates: Record<string, any> = {
    full_name: full_name.trim().toUpperCase(),
  };
  if (label !== undefined) {
    updates.label = label.trim() || null;
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  // Update password if provided
  if (new_password && new_password.length >= 6) {
    const { error: passError } = await admin.auth.admin.updateUserById(user.id, {
      password: new_password,
    });
    if (passError) {
      return NextResponse.json({ error: passError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
