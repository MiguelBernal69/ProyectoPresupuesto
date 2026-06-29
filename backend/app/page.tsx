import { redirect } from "next/navigation";
import { getHomePathByRole, getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  redirect(getHomePathByRole(session.rol));
}
