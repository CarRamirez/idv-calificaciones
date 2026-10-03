import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const ADMIN_ROLES = ["admin", "directora_anita"];
  const isAdmin = profile && ADMIN_ROLES.includes(profile.role);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const entityType = formData.get("entityType") as string;
  const entityId = formData.get("entityId") as string;

  if (!file || !entityType || !entityId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
  }

  // Validate file size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "Máximo 2MB" }, { status: 400 });
  }

  // For students, only admin can upload
  if (entityType === "student" && !isAdmin) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  // For profiles, admin can upload for anyone, users can upload for themselves
  if (entityType === "profile" && !isAdmin && entityId !== user.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Generate file path
  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${entityType}s/${entityId}.${ext}`;

  // Convert to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage (upsert: overwrite existing)
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Error al subir: ${uploadError.message}` }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = admin.storage.from("avatars").getPublicUrl(filePath);
  // Add cache-buster to force refresh
  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  // Update the record
  if (entityType === "student") {
    const { error: updateError } = await admin
      .from("students")
      .update({ avatar_url: publicUrl })
      .eq("id", entityId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else if (entityType === "profile") {
    const { error: updateError } = await admin
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", entityId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ url: publicUrl });
}
