import { Container } from "@/components/layout/Container";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <Container className="py-6 pb-24">
      <div className="flex flex-col gap-6">
        {/* Greeting */}
        <header>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-9 w-48" />
        </header>

        {/* Active split / CTA card */}
        <div className="rounded-lg border bg-card p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-40" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-md" />
            <Skeleton className="h-11 flex-1 rounded-md" />
          </div>
        </div>

        {/* Recent workouts */}
        <section>
          <Skeleton className="mb-2 h-4 w-32" />
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-14 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Container>
  );
}
