import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EigenePlanungHeader } from "@/components/eigene-planung-header";

export default async function EigenePlanungLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "EXTERN") redirect("/fee");

  return (
    <div className="min-h-screen bg-background">
      <EigenePlanungHeader email={session.user.email ?? ""} name={session.user.name ?? ""} />
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
