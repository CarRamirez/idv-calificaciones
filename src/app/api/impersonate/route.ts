import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST — start impersonation
export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verify the caller is an admin
  const admin = createAdminClient();
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || callerProfile.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden usar esta función" }, { status: 403 });
  }

  const body = await request.json();
  const targetId = body.targetId as string;

  if (!targetId) {
    return NextResponse.json({ error: "Falta targetId" }, { status: 400 });
  }

  // Verify target user exists
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", targetId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Set impersonation cookie
  const cookieStore = cookies();
  cookieStore.set("impersonate_as", targetId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour max
  });
  cookieStore.set("impersonate_admin_id", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });

  return NextResponse.json({
    ok: true,
    impersonating: {
      id: targetProfile.id,
      name: targetProfile.full_name,
      role: targetProfile.role,
    },
  });
}

// DELETE — stop impersonation
export async function DELETE() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const cookieStore = cookies();
  cookieStore.set("impersonate_as", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  cookieStore.set("impersonate_admin_id", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
