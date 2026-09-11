import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Obtener perfil para el rol
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // IP del request (Vercel pone el header x-forwarded-for)
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "desconocida";

  const userAgent = req.headers.get("user-agent") || "desconocido";

  // Geolocalización aproximada via header de Vercel
  const city = req.headers.get("x-vercel-ip-city") || null;
  const region = req.headers.get("x-vercel-ip-country-region") || null;
  const country = req.headers.get("x-vercel-ip-country") || null;

  const { error } = await supabase.from("login_logs").insert({
    user_id: user.id,
    email: user.email,
    role: profile?.role || "unknown",
    ip_address: ip,
    user_agent: userAgent,
    city: city ? decodeURIComponent(city) : null,
    region: region ? decodeURIComponent(region) : null,
    country,
  });

  if (error) {
    console.error("Error al registrar login:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
