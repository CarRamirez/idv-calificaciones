import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function verifyAdmin() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return profile;
}

// GET: List roles + users with their roles
export async function GET(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabaseAdmin = createAdminClient();
  const tab = req.nextUrl.searchParams.get("tab");

  if (tab === "users") {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, label")
      .order("full_name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Default: list roles
  const { data, error } = await supabaseAdmin
    .from("roles")
    .select("*")
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: Create role
export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, display_name, permissions } = await req.json();
  if (!name || !display_name) {
    return NextResponse.json({ error: "Nombre y nombre visible son obligatorios" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  const slug = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  const { data: existing } = await supabaseAdmin
    .from("roles").select("id").eq("name", slug).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: `El rol "${slug}" ya existe` }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from("roles")
    .insert({ name: slug, display_name, permissions: permissions || [] })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PUT: Update role or assign role to user
export async function PUT(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const supabaseAdmin = createAdminClient();

  // Assign role to user
  if (body.user_id && body.role) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ role: body.role })
      .eq("id", body.user_id)
      .select("id, full_name, role")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Update role permissions
  if (body.id) {
    const { data, error } = await supabaseAdmin
      .from("roles")
      .update({
        display_name: body.display_name,
        permissions: body.permissions || [],
      })
      .eq("id", body.id)
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
}

// DELETE: Remove role
export async function DELETE(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id, name } = await req.json();
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

  // Prevent deleting built-in roles
  if (["admin", "teacher", "viewer"].includes(name)) {
    return NextResponse.json({ error: "No se pueden eliminar roles del sistema" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  // Check if any users have this role
  const { count } = await supabaseAdmin
    .from("profiles").select("id", { count: "exact", head: true }).eq("role", name);
  if (count && count > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: ${count} usuario(s) tienen este rol. Reasígnalos primero.` },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("roles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
