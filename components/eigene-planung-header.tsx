"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function EigenePlanungHeader({ email, name }: { email: string; name: string }) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4">
        <div>
          <div className="text-sm font-semibold">BAUVIBE · Eigene Planung</div>
          <div className="text-xs text-muted-foreground">
            {name || email}
            {email ? <span className="ml-2 font-mono">({email})</span> : null}
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
          Abmelden
        </Button>
      </div>
    </header>
  );
}
