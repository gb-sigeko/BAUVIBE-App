import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppNav } from "@/components/nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "EXTERN") redirect("/eigene-planung");

  return (
    <div className="flex min-h-screen">
      <AppNav role={session.user.role} />
      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  );
}
