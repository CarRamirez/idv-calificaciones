import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthUser() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();
  return profile;
}

// GET: List announcements (latest first, max 50)
export async function GET() {
  const profile = await getAuthUser();
  if (!profile) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .select("id, content, category, author_name, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: Create announcement
export async function POST(req: NextRequest) {
  const profile = await getAuthUser();
  if (!profile) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { content, category } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "El contenido es requerido" }, { status: 400 });
  }

  const validCategories = ["general", "academico", "administrativo"];
  const finalCategory = validCategories.includes(category) ? category : "general";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .insert({
      author_id: profile.id,
      author_name: profile.full_name,
      content: content.trim(),
      category: finalCategory,
    })
    .select("id, content, category, author_name, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE: Remove announcement (any authenticated user can delete)
export async function DELETE(req: NextRequest) {
  const profile = await getAuthUser();
  if (!profile) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Falta ID" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
