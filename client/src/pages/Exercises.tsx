import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Dumbbell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Exercise } from "@shared/schema";

const ALL = "all";

const metricLabels: Record<string, string> = {
  reps: "Reps",
  duration_seconds: "Duration",
  distance_meters: "Distance",
  weight_reps: "Weight × Reps",
};

export default function Exercises() {
  const [q, setQ] = useState("");
  const [bodyPart, setBodyPart] = useState(ALL);
  const [metricType, setMetricType] = useState(ALL);

  const exercisesQuery = useQuery<Exercise[]>({ queryKey: ["/api/exercises"] });
  const data = exercisesQuery.data ?? [];

  const bodyParts = useMemo(
    () => Array.from(new Set(data.map((e) => e.bodyPart).filter(Boolean))) as string[],
    [data],
  );
  const equipment = (e: Exercise) => e.equipment ?? "—";

  const filtered = data.filter((e) => {
    if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (bodyPart !== ALL && e.bodyPart !== bodyPart) return false;
    if (metricType !== ALL && e.metricType !== metricType) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exercise Catalog</h1>
        <p className="text-sm text-muted-foreground">Browse movements to add to routines.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises"
            className="pl-9"
            data-testid="input-search-exercises"
          />
        </div>
        <Select value={bodyPart} onValueChange={setBodyPart}>
          <SelectTrigger className="sm:w-44" data-testid="select-bodypart">
            <SelectValue placeholder="Body part" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All body parts</SelectItem>
            {bodyParts.map((bp) => (
              <SelectItem key={bp} value={bp}>
                {bp}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={metricType} onValueChange={setMetricType}>
          <SelectTrigger className="sm:w-44" data-testid="select-metrictype">
            <SelectValue placeholder="Metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All metrics</SelectItem>
            {Object.entries(metricLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {exercisesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground" data-testid="text-no-exercises-found">
            No exercises match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ex) => (
            <Card key={ex.id} data-testid={`card-exercise-${ex.id}`}>
              <div className="flex aspect-video items-center justify-center rounded-t-lg bg-muted">
                <Dumbbell className="h-10 w-10 text-muted-foreground" aria-hidden />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{ex.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {ex.bodyPart && <Badge variant="secondary">{ex.bodyPart}</Badge>}
                <Badge variant="outline">{equipment(ex)}</Badge>
                <Badge variant="outline">{metricLabels[ex.metricType]}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
