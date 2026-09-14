import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUser } from "@/lib/session";
import { defaultRouteForRole } from "@/lib/role";

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) redirect("/login");

  const user = await getCurrentUser();

  redirect(user ? defaultRouteForRole(user.role) : "/account-disabled");
}
