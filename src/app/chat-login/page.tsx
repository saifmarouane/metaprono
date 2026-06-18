import { redirect } from "next/navigation";

type ChatLoginRedirectPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function ChatLoginRedirectPage({
  searchParams,
}: ChatLoginRedirectPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (params?.error) {
    query.set("error", params.error);
  }

  if (params?.next) {
    query.set("next", params.next);
  }

  redirect(`/login${query.toString() ? `?${query.toString()}` : ""}`);
}
