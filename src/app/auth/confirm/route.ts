import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

/**
 * Token-hash email links (Supabase email templates using
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = type === "recovery" ? "/auth/update-password" : safeNext(searchParams.get("next"));
  const supabase = await getSupabase();
  if (tokenHash && type && supabase) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
