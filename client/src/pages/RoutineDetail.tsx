import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, GripVertical, Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Exercise, RoutineTemplate, RoutineTemplateExercise } from "@shared/schema";

interface RoutineWithExercises extends RoutineTemplate {
  exercises: (RoutineTemplateExercise & { exercise: Exercise | undefined })[];
}

function metricSummary(link: RoutineTemplateExercise): string {
  if (link.plannedReps) return `${link.plannedReps} reps`;
  if (link.plannedSeconds) return `${link.plannedSeconds}s`;
  if (link.plannedDistanceM) return `${link.plannedDistanceM}m`;
  return "—";
}

export default function RoutineDetail() {
  const [, params] = useRoute("/routines/:id");
  const id = params?.id ?? "";
  const { toast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);

  const routineQuery = useQuery<RoutineWithExercises>({ queryKey: [`/api/routines/${id}`], enabled: !!id });
  const catalogQuery = useQuery<Exercise[]>({ queryKey: ["/api/exercises"], enabled: pickerOpen });

  const addExercise = useMutation({
    mutationFn: async (exercise: Exercise) => {
      const position = routineQuery.data?.exercises.length ?? 0;
      await apiRequest("POST", `/api/routines/${id}/exercises`, {
        exerciseId: exercise.id,
        position,
        plannedMetricType: exercise.metricType,
        plannedReps: exercise.metricType === "reps" || exercise.metricType === "weight_reps" ? 10 : null,
        plannedSeconds: exercise.metricType === "duration_seconds" ? 30 : null,
        plannedDistanceM: exercise.metricType === "distance_meters" ? 1000 : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/routines/${id}`] });
      toast({ title: "Exercise added" });
    },
  });

  const removeExercise = useMutation({
    mutationFn: (exerciseId: string) =>
      apiRequest("DELETE", `/api/routines/${id}/exercises/${exerciseId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/routines/${id}`] }),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/routines" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-routines">
        <ArrowLeft className="h-4 w-4" /> Routines
      </Link>

      {routineQuery.isLoading ? (
        <Skeleton className="h-10 w-48" />
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{routineQuery.data?.name}</h1>
            {routineQuery.data?.description && (
              <p className="text-sm text-muted-foreground">{routineQuery.data.description}</p>
            )}
          </div>
          <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
            <SheetTrigger asChild>
              <Button data-testid="button-add-exercise">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Add exercise</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                {catalogQuery.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  (catalogQuery.data ?? []).map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => addExercise.mutate(ex)}
                      className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left hover:bg-muted"
                      data-testid={`button-pick-exercise-${ex.id}`}
                    >
                      <span className="font-medium">{ex.name}</span>
                      <Badge variant="outline">{ex.bodyPart}</Badge>
                    </button>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exercises</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {routineQuery.isLoading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : (routineQuery.data?.exercises ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground" data-testid="text-no-exercises">
              No exercises yet. Use Add to build this routine.
            </p>
          ) : (
            routineQuery.data!.exercises.map((link, i) => (
              <div
                key={link.id}
                className="flex items-center gap-3 rounded-md border border-border p-3"
                data-testid={`row-routine-exercise-${link.id}`}
              >
                <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground" aria-label="reorder" />
                <span className="w-6 text-sm text-muted-foreground">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-medium">{link.exercise?.name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{metricSummary(link)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeExercise.mutate(link.exerciseId)}
                  data-testid={`button-remove-exercise-${link.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
