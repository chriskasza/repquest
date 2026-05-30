import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CalendarDays } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { startOfWeek, weekDays, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScheduledWorkout, RoutineTemplate } from "@shared/schema";

type RoutineSummary = RoutineTemplate & { exerciseCount: number };

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  scheduledDate: z.string().min(1, "Date is required"),
  routineTemplateId: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const isoFor = (d: Date) => d.toISOString().slice(0, 10);

export default function Schedule() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const weekStart = startOfWeek(new Date());
  const days = weekDays(weekStart);
  const [selectedDate, setSelectedDate] = useState(isoFor(new Date()));

  const weekOf = isoFor(weekStart);
  const weekQuery = useQuery<ScheduledWorkout[]>({ queryKey: [`/api/schedule?weekOf=${weekOf}`] });
  const routinesQuery = useQuery<RoutineSummary[]>({ queryKey: ["/api/routines"] });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", scheduledDate: selectedDate, routineTemplateId: undefined },
  });

  const create = useMutation({
    mutationFn: async (values: FormValues) => {
      await apiRequest("POST", "/api/schedule", {
        title: values.title,
        scheduledDate: values.scheduledDate,
        routineTemplateId: values.routineTemplateId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedule?weekOf=${weekOf}`] });
      toast({ title: "Workout scheduled" });
      form.reset({ title: "", scheduledDate: selectedDate, routineTemplateId: undefined });
      setOpen(false);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ScheduledWorkout["status"] }) =>
      apiRequest("PATCH", `/api/schedule/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/schedule?weekOf=${weekOf}`] }),
  });

  const dayWorkouts = (weekQuery.data ?? []).filter((w) => w.scheduledDate === selectedDate);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-sm text-muted-foreground">Plan your training week.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-schedule-workout">
              <Plus className="h-4 w-4" /> Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule workout</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="space-y-4" data-testid="form-schedule">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Leg Day" data-testid="input-schedule-title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-schedule-date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="routineTemplateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Routine (optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-schedule-routine">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(routinesQuery.data ?? []).map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={create.isPending} data-testid="button-submit-schedule">
                    Schedule
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-7 gap-1.5" data-testid="week-strip">
        {days.map((d) => {
          const iso = isoFor(d);
          const active = iso === selectedDate;
          return (
            <button
              key={iso}
              onClick={() => setSelectedDate(iso)}
              data-testid={`button-day-${iso}`}
              className={cn(
                "flex flex-col items-center rounded-md border py-2 text-xs transition-colors",
                active ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-muted",
              )}
            >
              <span>{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
              <span className="text-base font-semibold">{d.getDate()}</span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-3 py-4">
          {weekQuery.isLoading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : dayWorkouts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground" data-testid="text-no-day-workouts">
              <CalendarDays className="mx-auto mb-2 h-6 w-6" />
              Nothing scheduled for this day.
            </p>
          ) : (
            dayWorkouts.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
                data-testid={`row-schedule-${w.id}`}
              >
                <div>
                  <p className="font-medium">{w.title}</p>
                  <p className="text-xs text-muted-foreground">{w.scheduledTime ?? "Any time"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={w.status} />
                  {w.status === "planned" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: w.id, status: "completed" })}
                      data-testid={`button-complete-${w.id}`}
                    >
                      Done
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
