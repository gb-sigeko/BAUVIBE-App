"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function KontakteSearchBar({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [value, setValue] = useState(initialQ);

  function apply() {
    const next = new URLSearchParams(sp.toString());
    const v = value.trim();
    if (v) next.set("q", v);
    else next.delete("q");
    router.push(`/kontakte?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
      <div className="min-w-[200px] flex-1 space-y-2">
        <Label htmlFor="kontakte-q">Suche in Organisationen und Kontakten</Label>
        <Input id="kontakte-q" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Name, E-Mail, Telefon" />
      </div>
      <Button type="button" onClick={() => apply()}>
        Filtern
      </Button>
    </div>
  );
}
