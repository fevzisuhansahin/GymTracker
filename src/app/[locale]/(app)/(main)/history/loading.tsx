import { Container } from "@/components/layout/Container";
import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <Container className="py-6 pb-24">
      <div className="flex flex-col gap-5">
        {/* Title */}
        <Skeleton className="h-8 w-24" />

        {/* Filter tabs */}
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>

        {/* Workout cards */}
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
              </div>
              <div className="mt-3 flex gap-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
