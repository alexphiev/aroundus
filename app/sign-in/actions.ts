"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function handleSignIn(
  data: FormData | { email?: string; password?: string }
) {
  let email, password;
  if (data instanceof FormData) {
    email = data.get("email") as string;
    password = data.get("password") as string;
  } else {
    email = data.email;
    password = data.password;
  }

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Sign-in error:", error.message);
    return { error: error.message || "Could not authenticate user." };
  }

  // redirect('/') // Redirect is handled client-side after successful sign-in for better UX
  return { success: true };
}
