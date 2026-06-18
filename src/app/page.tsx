import LandingPage from "@/components/landing/LandingPage";
import { getAuthenticatedUser } from "@/lib/admin-auth";
import { getCurrentChatAccess } from "@/lib/chat-users";

export const dynamic = "force-dynamic";

export default async function Home() {
  const authenticatedUser = await getAuthenticatedUser();
  const chatAccess =
    authenticatedUser?.role === "user" ? await getCurrentChatAccess() : null;

  return (
    <LandingPage
      authUser={
        authenticatedUser
          ? {
              email: authenticatedUser.email,
              role: authenticatedUser.role,
              status: chatAccess?.user?.status,
            }
          : null
      }
    />
  );
}
