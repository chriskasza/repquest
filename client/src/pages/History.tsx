import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { WorkoutSession } from "@shared/schema";

export default function History() {
  const [, navigate] = useLocation();
  const sessionsQuery = useQuery<WorkoutSession[]>({ queryKey: ["/api/sessions"] });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-sm text-muted-foreground">Every session you've logged.</p>
      </div>

      <Card>
        <CardContent className="space-y-3 py-4">
          {sessionsQuery.isLoading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : (sessionsQuery.data ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground" data-testid="text-no-history">
              No sessions logged yet.
            </p>
          ) : (
            sessionsQuery.data!.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/workout/${s.id}`)}
                className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left hover:bg-muted"
                data-testid={`row-history-${s.id}`}
              >
                <div className="flex items-center gap-3">
                  <Dumbbell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {new Date(s.startedAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDuration(s.startedAt, s.completedAt)}</p>
                  </div>
                </div>
                <Badge variant={s.completedAt ? "success" : "secondary"}>
                  {s.completedAt ? "completed" : "in progress"}
                </Badge>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
