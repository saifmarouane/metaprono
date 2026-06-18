import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/admin-auth";
import { AgentWorkspace } from "@/components/agent/AgentWorkspace";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login?next=/agent");
  }

  if (user.role === "user") {
    redirect("/Dashboard");
  }

  return (
    <AgentWorkspace
      user={{
        email: user.email,
        role: user.role,
      }}
    />
  );
}
