import { Dumbbell } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-center gap-2">
          <Dumbbell className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold tracking-tight">GymTracker</span>
        </div>
        {children}
      </div>
    </main>
  );
}
