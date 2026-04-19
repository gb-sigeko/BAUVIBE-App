import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Lade Anmeldung…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
