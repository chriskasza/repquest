import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Play, Dumbbell, Clock, CalendarCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { todayIso, startOfWeek, formatDuration } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { ScheduledWorkout, WorkoutSession, RoutineTemplate } from "@shared/schema";

type RoutineSummary = RoutineTemplate & { exerciseCount: number };

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);

  const today = todayIso();
  const weekOf = startOfWeek(new Date()).toISOString().slice(0, 10);

  const todayQuery = useQuery<ScheduledWorkout[]>({ queryKey: [`/api/schedule?date=${today}`] });
  const weekQuery = useQuery<ScheduledWorkout[]>({ queryKey: [`/api/schedule?weekOf=${weekOf}`] });
  const sessionsQuery = useQuery<WorkoutSession[]>({ queryKey: ["/api/sessions"] });
  const routinesQuery = useQuery<RoutineSummary[]>({ queryKey: ["/api/routines"] });

  const startSession = useMutation({
    mutationFn: async (routineTemplateId: string | null) => {
      const res = await apiRequest("POST", "/api/sessions", { scheduledWorkoutId: null, routineTemplateId });
      return (await res.json()) as WorkoutSession;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      navigate(`/workout/${session.id}`);
    },
  });

  const weekWorkouts = weekQuery.data ?? [];
  const completedThisWeek = weekWorkouts.filter((w) => w.status === "completed").length;
  const plannedThisWeek = weekWorkouts.length;
  const completionPct = plannedThisWeek > 0 ? Math.round((completedThisWeek / plannedThisWeek) * 100) : 0;
  const recentSessions = (sessionsQuery.data ?? []).slice(0, 3);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Let's get a rep in today.</p>
        </div>
        <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
          <SheetTrigger asChild>
            <Button data-testid="button-start-workout">
              <Play className="h-4 w-4" /> Start Workout
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Pick a routine</SheetTitle>
              <SheetDescription>Start from a template or an empty session.</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                data-testid="button-start-empty"
                onClick={() => startSession.mutate(null)}
                disabled={startSession.isPending}
              >
                Empty session
              </Button>
              {(routinesQuery.data ?? []).map((r) => (
                <Button
                  key={r.id}
                  variant="outline"
                  className="w-full justify-start"
                  data-testid={`button-start-routine-${r.id}`}
                  onClick={() => startSession.mutate(r.id)}
                  disabled={startSession.isPending}
                >
                  {r.name}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" /> Today's Workouts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayQuery.isLoading ? (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            ) : (todayQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-today">
                Nothing scheduled today. Tap Start Workout to train freestyle.
              </p>
            ) : (
              todayQuery.data!.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                  data-testid={`row-today-${w.id}`}
                >
                  <div>
                    <p className="font-medium">{w.title}</p>
                    {w.scheduledTime && (
                      <p className="text-xs text-muted-foreground">{w.scheduledTime}</p>
                    )}
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weekQuery.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="text-3xl font-bold" data-testid="text-week-completion">
                  {completedThisWeek}
                  <span className="text-base font-normal text-muted-foreground"> / {plannedThisWeek}</span>
                </div>
                <p className="text-sm text-muted-foreground">workouts completed</p>
                <Progress value={completionPct} data-testid="progress-week" />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionsQuery.isLoading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-sessions">
              No sessions yet — your history will show up here.
            </p>
          ) : (
            recentSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/workout/${s.id}`)}
                className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left hover:bg-muted"
                data-testid={`row-recent-${s.id}`}
              >
                <div className="flex items-center gap-3">
                  <Dumbbell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {new Date(s.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.completedAt ? "Completed" : "In progress"}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDuration(s.startedAt, s.completedAt)}
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
