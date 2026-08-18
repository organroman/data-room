import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signupSchema, type SignupInput } from "@shared/validation";
import { authClient } from "@/shared/api/auth-client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function SignupPage() {
  const navigate = useNavigate();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const form = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  if (!sessionPending && session) return <Navigate to="/datarooms" replace />;

  async function onSubmit(values: SignupInput) {
    setIsSubmitting(true);
    // Better Auth treats social and email/password sign-up/sign-in as the same call, but for
    // email+password specifically signUp is a distinct step (it needs the name + creates the
    // account) — see server/src/auth/auth.ts.
    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    });
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message ?? "Couldn't create your account. Please try again.");
      return;
    }
    navigate("/datarooms");
  }

  async function onGoogleSignUp() {
    setIsGoogleSubmitting(true);
    // Must be absolute — see LoginPage.tsx's onGoogleSignIn for why a relative callbackURL
    // resolves against the backend origin instead of the frontend.
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/datarooms`,
    });
    if (error) {
      toast.error(error.message ?? "Couldn't sign up with Google.");
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <img src="/logo.png" alt="" className="mx-auto h-10 w-10" />
          <CardTitle className="text-xl">Create an account</CardTitle>
          <CardDescription>Set up a data room to start sharing documents securely.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onGoogleSignUp}
            disabled={isGoogleSubmitting}
          >
            <img src="/google-logo.svg" alt="" className="size-4" />
            Continue with Google
          </Button>

          <div className="relative text-center text-sm after:absolute after:inset-x-0 after:top-1/2 after:z-0 after:border-t after:border-border">
            <span className="relative z-10 bg-card px-2 text-muted-foreground">or</span>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="signup-name">Name</Label>
              <Input
                id="signup-name"
                autoComplete="name"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(form.formState.errors.email)}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(form.formState.errors.password)}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
