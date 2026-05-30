import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Check, Dumbbell } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import type {
  Exercise,
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSessionSet,
} from "@shared/schema";

interface SessionDetail extends WorkoutSession {
  exercises: (WorkoutSessionExercise & {
    exercise: Exercise | undefined;
    sets: WorkoutSessionSet[];
  })[];
}

export default function ActiveWorkout() {
  const [, params] = useRoute("/workout/:sessionId");
  const sessionId = params?.sessionId ?? "";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);

  const sessionKey = [`/api/sessions/${sessionId}`];
  const sessionQuery = useQuery<SessionDetail>({ queryKey: sessionKey, enabled: !!sessionId });
  const catalogQuery = useQuery<Exercise[]>({ queryKey: ["/api/exercises"], enabled: pickerOpen });

  const addExercise = useMutation({
    mutationFn: async (ex: Exercise) => {
      const position = sessionQuery.data?.exercises.length ?? 0;
      await apiRequest("POST", `/api/sessions/${sessionId}/exercises`, {
        exerciseId: ex.id,
        position,
        plannedMetricType: ex.metricType,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKey }),
  });

  const addSet = useMutation({
    mutationFn: async (link: SessionDetail["exercises"][number]) => {
      await apiRequest("POST", `/api/sessions/${sessionId}/exercises/${link.id}/sets`, {
        metricType: link.exercise?.metricType ?? "reps",
        setNumber: link.sets.length + 1,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKey }),
  });

  const finish = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/sessions/${sessionId}`, { completedAt: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKey });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "Workout finished. Nice work!" });
      navigate("/history");
    },
  });

  if (sessionQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const session = sessionQuery.data;
  if (!session) {
    return <p className="text-center text-sm text-muted-foreground" data-testid="text-session-missing">Session not found.</p>;
  }

  const exercises = session.exercises;
  const completedCount = exercises.filter((e) => e.sets.length > 0).length;
  const progress = exercises.length > 0 ? Math.round((completedCount / exercises.length) * 100) : 0;
  const isDone = !!session.completedAt;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Active Workout</h1>
          <p className="text-sm text-muted-foreground">
            {completedCount} / {exercises.length} exercises started
          </p>
        </div>
        {!isDone && (
          <Button onClick={() => finish.mutate()} disabled={finish.isPending} data-testid="button-finish-workout">
            <Check className="h-4 w-4" /> Finish
          </Button>
        )}
      </div>

      <Progress value={progress} data-testid="progress-workout" />

      <div className="space-y-4">
        {exercises.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground" data-testid="text-no-workout-exercises">
              <Dumbbell className="mx-auto mb-2 h-6 w-6" />
              Add an exercise to start logging sets.
            </CardContent>
          </Card>
        ) : (
          exercises.map((link) => (
            <Card key={link.id} data-testid={`card-workout-exercise-${link.id}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{link.exercise?.name ?? "Exercise"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 text-xs text-muted-foreground">
                  <span>Set</span>
                  <span>Reps</span>
                  <span>Weight (kg)</span>
                </div>
                {link.sets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sets logged yet.</p>
                ) : (
                  link.sets.map((s) => (
                    <SetRow key={s.id} set={s} sessionId={sessionId} exerciseLinkId={link.id} />
                  ))
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => addSet.mutate(link)}
                  disabled={addSet.isPending || isDone}
                  data-testid={`button-add-set-${link.id}`}
                >
                  <Plus className="h-4 w-4" /> Add Set
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {!isDone && (
        <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full" data-testid="button-add-workout-exercise">
              <Plus className="h-4 w-4" /> Add Exercise
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
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
                    onClick={() => {
                      addExercise.mutate(ex);
                      setPickerOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left hover:bg-muted"
                    data-testid={`button-add-ex-${ex.id}`}
                  >
                    <span className="font-medium">{ex.name}</span>
                    <span className="text-xs text-muted-foreground">{ex.bodyPart}</span>
                  </button>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function SetRow({
  set,
  sessionId,
  exerciseLinkId,
}: {
  set: WorkoutSessionSet;
  sessionId: string;
  exerciseLinkId: string;
}) {
  const [reps, setReps] = useState(set.actualReps?.toString() ?? "");
  const [weight, setWeight] = useState(set.actualWeightKg?.toString() ?? "");

  // Inputs are local-only in the scaffold; a PATCH set endpoint will persist later.
  return (
    <div className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2" data-testid={`row-set-${set.id}`}>
      <span className="text-sm text-muted-foreground">{set.setNumber}</span>
      <Input
        inputMode="numeric"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        placeholder="0"
        data-testid={`input-reps-${set.id}`}
      />
      <Input
        inputMode="numeric"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        placeholder="0"
        data-testid={`input-weight-${set.id}`}
      />
    </div>
  );
}
