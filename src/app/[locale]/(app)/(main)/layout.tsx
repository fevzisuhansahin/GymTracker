import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { getCurrentUserWithProfile } from "@/lib/supabase/queries/profile";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUserWithProfile();

  return (
    <>
      <Header
        displayName={session?.profile?.display_name ?? ""}
        username={session?.profile?.username ?? ""}
        avatarUrl={session?.profile?.avatar_url ?? null}
      />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <MobileNav username={session?.profile?.username ?? ""} />
    </>
  );
}
