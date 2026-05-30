import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ListChecks } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import type { RoutineTemplate } from "@shared/schema";

type RoutineSummary = RoutineTemplate & { exerciseCount: number };

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export default function Routines() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const routinesQuery = useQuery<RoutineSummary[]>({ queryKey: ["/api/routines"] });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
  });

  const createRoutine = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest("POST", "/api/routines", values);
      return (await res.json()) as RoutineTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routines"] });
      toast({ title: "Routine created" });
      form.reset();
      setOpen(false);
    },
    onError: () => toast({ title: "Could not create routine", variant: "destructive" }),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Routines</h1>
          <p className="text-sm text-muted-foreground">Reusable workout templates.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-routine">
              <Plus className="h-4 w-4" /> New Routine
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New routine</DialogTitle>
              <DialogDescription>Give your template a name and optional description.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((v) => createRoutine.mutate(v))}
                className="space-y-4"
                data-testid="form-new-routine"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Push Day" data-testid="input-routine-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Chest, shoulders, triceps" data-testid="input-routine-description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createRoutine.isPending} data-testid="button-submit-routine">
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {routinesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (routinesQuery.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground" data-testid="text-no-routines">
            No routines yet. Create your first template to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {routinesQuery.data!.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer transition-colors hover:border-primary"
              onClick={() => navigate(`/routines/${r.id}`)}
              data-testid={`card-routine-${r.id}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" /> {r.name}
                  </span>
                  <Badge variant="secondary" data-testid={`badge-count-${r.id}`}>
                    {r.exerciseCount} {r.exerciseCount === 1 ? "exercise" : "exercises"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              {r.description && (
                <CardContent className="text-sm text-muted-foreground">{r.description}</CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
