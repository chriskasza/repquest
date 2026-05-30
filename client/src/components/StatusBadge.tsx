import { Badge } from "@/components/ui/badge";
import type { WorkoutStatus } from "@shared/schema";

const variantByStatus: Record<WorkoutStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  planned: "secondary",
  completed: "success",
  skipped: "warning",
  canceled: "destructive",
};

export function StatusBadge({ status }: { status: WorkoutStatus }) {
  return (
    <Badge variant={variantByStatus[status]} data-testid={`badge-status-${status}`}>
      {status}
    </Badge>
  );
}
