import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  switch (session.user.role) {
    case "GF":
      redirect("/gf");
    case "EXTERN":
      redirect("/eigene-planung");
    default:
      redirect("/fee");
  }
}
