import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Check, Cloud } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Workspace } from "@shared/schema";

const profileSchema = z.object({ displayName: z.string().min(1, "Display name is required") });
type ProfileValues = z.infer<typeof profileSchema>;

export default function Settings() {
  const { user, setDisplayName } = useAuth();
  const { toast } = useToast();
  const [newWorkspace, setNewWorkspace] = useState("");

  const workspacesQuery = useQuery<Workspace[]>({ queryKey: ["/api/workspaces"] });

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: user?.displayName ?? "" },
  });

  const createWorkspace = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest("POST", "/api/workspaces", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      toast({ title: "Workspace created" });
      setNewWorkspace("");
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Profile and workspace preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => {
                setDisplayName(v.displayName);
                toast({ title: "Profile updated" });
              })}
              className="space-y-4"
              data-testid="form-profile"
            >
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input data-testid="input-display-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" data-testid="button-save-profile">
                <Check className="h-4 w-4" /> Save
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspaces</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspacesQuery.isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            (workspacesQuery.data ?? []).map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
                data-testid={`row-workspace-${w.id}`}
              >
                <span className="font-medium">{w.name}</span>
                <Badge variant="secondary">{w.kind}</Badge>
              </div>
            ))
          )}
          <div className="flex gap-2">
            <Input
              value={newWorkspace}
              onChange={(e) => setNewWorkspace(e.target.value)}
              placeholder="New workspace name"
              data-testid="input-new-workspace"
            />
            <Button
              onClick={() => newWorkspace.trim() && createWorkspace.mutate(newWorkspace.trim())}
              disabled={createWorkspace.isPending}
              data-testid="button-create-workspace"
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border border-border p-3" data-testid="row-supabase-status">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Supabase</p>
                <p className="text-xs text-muted-foreground">Auth & sync wired in a later milestone.</p>
              </div>
            </div>
            <Badge variant="warning">Not connected</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
