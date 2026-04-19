"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Briefcase, CalendarDays, Inbox, Users, Building2, LogOut, FileText, Contact, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/types/roles";
import { Button } from "@/components/ui/button";

const links: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: AppRole[];
}> = [
  { href: "/fee", label: "Start (Fee)", icon: LayoutDashboard, roles: ["ADMIN", "BUERO", "SIKOGO", "GF"] },
  { href: "/projects", label: "Projekte", icon: Briefcase, roles: ["ADMIN", "BUERO", "SIKOGO", "GF"] },
  { href: "/kontakte", label: "Kontakte", icon: Contact, roles: ["ADMIN", "BUERO", "SIKOGO", "GF"] },
  { href: "/planung", label: "Wochenplanung", icon: CalendarDays, roles: ["ADMIN", "BUERO", "SIKOGO", "GF"] },
  { href: "/touren", label: "Touren", icon: Map, roles: ["ADMIN", "BUERO", "SIKOGO", "GF"] },
  { href: "/arbeitskorb", label: "Arbeitskorb", icon: Inbox, roles: ["ADMIN", "BUERO", "SIKOGO", "GF"] },
  { href: "/mitarbeiter", label: "Mitarbeiter", icon: Users, roles: ["ADMIN", "BUERO", "SIKOGO", "GF"] },
  { href: "/textbausteine", label: "Textbausteine", icon: FileText, roles: ["ADMIN", "BUERO", "SIKOGO", "GF"] },
  { href: "/gf", label: "GF-Dashboard", icon: Building2, roles: ["ADMIN", "GF"] },
];

export function AppNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const visible = links.filter((l) => l.roles.includes(role));

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
          BV
        </div>
        <div>
          <div className="text-sm font-semibold leading-none">BAUVIBE</div>
          <div className="text-xs text-muted-foreground">SiGeKo OS</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 pb-4">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </Button>
      </div>
    </aside>
  );
}
