import { Container } from "./Container";

export function Header() {
  return (
    <header className="border-b bg-background sticky top-0 z-40">
      <Container className="flex h-14 items-center justify-between">
        <span className="text-lg font-bold tracking-tight">GymTracker</span>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          {/* populated after auth is wired */}
          <span>Dashboard</span>
          <span>History</span>
          <span>Programs</span>
        </nav>
      </Container>
    </header>
  );
}
