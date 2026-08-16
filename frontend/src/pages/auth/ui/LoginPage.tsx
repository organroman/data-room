import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@shared/validation";
import { authClient } from "@/shared/api/auth-client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  // Already signed in (e.g. navigated here manually) — no reason to show the form.
  if (!sessionPending && session) return <Navigate to="/datarooms" replace />;

  async function onSubmit(values: LoginInput) {
    setIsSubmitting(true);
    const { error } = await authClient.signIn.email({ email: values.email, password: values.password });
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message ?? "Couldn't sign in. Check your email and password.");
      return;
    }
    navigate("/datarooms");
  }

  async function onGoogleSignIn() {
    setIsGoogleSubmitting(true);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: "/datarooms" });
    if (error) {
      toast.error(error.message ?? "Couldn't sign in with Google.");
      setIsGoogleSubmitting(false);
    }
    // On success the browser navigates away to Google, so there's nothing further to do here.
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <img src="/logo.png" alt="" className="mx-auto h-10 w-10" />
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>Sign in to access your data rooms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onGoogleSignIn}
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
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
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
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(form.formState.errors.password)}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-foreground underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
