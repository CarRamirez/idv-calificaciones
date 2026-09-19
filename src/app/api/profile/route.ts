import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: fetch profile contact data
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("id");
  if (!profileId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, celular, telefono_emergencia, correo_personal")
    .eq("id", profileId)
    .single();

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ profile });
}

// PUT: update profile contact data
export async function PUT(req: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const body = await req.json();
  const { id, celular, telefono_emergencia, correo_personal } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const admin = createAdminClient();

  // Verify caller has permission (admin, or editing own profile)
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Allow if: admin, or editing own profile, or has admin_profesores permission
  let allowed = false;
  if (callerProfile.role === "admin" || user.id === id) {
    allowed = true;
  } else {
    // Check if custom role has admin_profesores permission
    const { data: roleData } = await admin
      .from("roles")
      .select("permissions")
      .eq("name", callerProfile.role)
      .single();
    if (roleData?.permissions?.includes("admin_profesores")) {
      allowed = true;
    }
  }

  if (!allowed) return NextResponse.json({ error: "No tienes permiso" }, { status: 403 });

  // If non-admin editing an admin, block it
  if (callerProfile.role !== "admin") {
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();
    if (targetProfile?.role === "admin") {
      return NextResponse.json({ error: "No puedes editar administradores" }, { status: 403 });
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({
      celular: celular || null,
      telefono_emergencia: telefono_emergencia || null,
      correo_personal: correo_personal || null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
