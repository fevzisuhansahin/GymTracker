import { Container } from "@/components/layout/Container";
import { Skeleton } from "@/components/ui/skeleton";

export default function SplitsLoading() {
  return (
    <Container className="py-6 pb-24">
      <div className="flex flex-col gap-6">
        {/* Title + button */}
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>

        {/* Your programs section */}
        <section>
          <Skeleton className="mb-3 h-4 w-28" />
          <div className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Templates section */}
        <section>
          <Skeleton className="mb-1 h-4 w-32" />
          <Skeleton className="mb-3 h-3.5 w-64" />
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-3.5 w-16" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Container>
  );
}
