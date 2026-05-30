import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center" data-testid="page-not-found">
      <h1 className="text-4xl font-bold text-primary">404</h1>
      <p className="text-muted-foreground">This page took a rest day.</p>
      <Link href="/">
        <Button data-testid="button-back-home">Back to Dashboard</Button>
      </Link>
    </div>
  );
}
