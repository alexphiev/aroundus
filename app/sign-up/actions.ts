"use server";

import { createClient } from "@/utils/supabase/server";

export async function handleSignUp(data: {
  email?: string;
  password?: string;
}) {
  const email = data.email;
  const password = data.password;

  if (!email || !password) {
    return { error: "Email and password are required for sign-up." };
  }

  const supabase = await createClient();

  // Supabase Auth by default has email confirmation enabled.
  // The user will be sent a confirmation email.
  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // emailRedirectTo is optional: Supabase sends a confirmation link to the user's email.
      // This link already includes a redirect to your site URL + /auth/callback
      // You can specify a different redirect path here if needed after confirmation.
      // emailRedirectTo: `${new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin}/auth/callback`
    },
  });

  if (error) {
    console.error("Sign-up error:", error.message);
    return { error: error.message || "Could not sign up user." };
  }

  if (
    signUpData.user &&
    signUpData.user.identities &&
    signUpData.user.identities.length === 0
  ) {
    // This case can happen if admin confirmation is required, or if there's an issue
    // where the user is created but not yet confirmed or active.
    return {
      message:
        "Sign up successful, but please check your email for a confirmation link or wait for admin approval.",
    };
  }

  // If user object exists and has an ID, it usually means sign-up initiated successfully.
  // If email confirmation is on, they need to confirm. If off, they might be logged in.
  if (signUpData.user) {
    return {
      message:
        "Sign up successful! Please check your email for a confirmation link.",
    };
  }

  return { error: "An unexpected error occurred during sign up." };
}
