"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("fee@bauvibe.local");
  const [password, setPassword] = useState("Bauvibe2026!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Anmeldung fehlgeschlagen. Bitte Zugangsdaten prüfen.");
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>BAUVIBE</CardTitle>
        <CardDescription>Melden Sie sich mit Ihrem Konto an.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Anmeldung…" : "Anmelden"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Demo: <span className="font-mono">fee@bauvibe.local</span> / <span className="font-mono">Bauvibe2026!</span>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
