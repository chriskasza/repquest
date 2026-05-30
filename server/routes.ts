import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import {
  storage,
  DEFAULT_USER_ID,
  DEFAULT_WORKSPACE_ID,
} from "./storage";
import {
  insertRoutineTemplateSchema,
  insertRoutineTemplateExerciseSchema,
  insertScheduledWorkoutSchema,
  insertWorkoutSessionSchema,
  insertWorkoutSessionExerciseSchema,
  insertWorkoutSessionSetSchema,
} from "@shared/schema";

function handle<T>(res: Response, fn: () => Promise<T>) {
  return fn()
    .then((data) => res.json(data))
    .catch((err: unknown) => {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "validation", issues: err.issues });
      } else {
        console.error(err);
        res.status(500).json({ error: "internal" });
      }
    });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Exercises
  app.get("/api/exercises", (req, res) =>
    handle(res, () =>
      storage.listExercises({
        q: req.query.q as string | undefined,
        bodyPart: req.query.bodyPart as string | undefined,
        metricType: req.query.metricType as string | undefined,
      }),
    ),
  );

  app.get("/api/exercises/:id", (req: Request, res: Response) =>
    handle(res, async () => {
      const ex = await storage.getExercise(req.params.id);
      if (!ex) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      return ex;
    }),
  );

  // Routines
  app.get("/api/routines", (_req, res) =>
    handle(res, () => storage.listRoutines(DEFAULT_WORKSPACE_ID)),
  );

  app.post("/api/routines", (req, res) =>
    handle(res, () => {
      const input = insertRoutineTemplateSchema.parse({
        ...req.body,
        workspaceId: DEFAULT_WORKSPACE_ID,
        createdBy: DEFAULT_USER_ID,
      });
      return storage.createRoutine(input);
    }),
  );

  app.get("/api/routines/:id", (req, res) =>
    handle(res, async () => {
      const routine = await storage.getRoutine(req.params.id);
      if (!routine) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      return routine;
    }),
  );

  app.post("/api/routines/:id/exercises", (req, res) =>
    handle(res, () => {
      const input = insertRoutineTemplateExerciseSchema.parse({
        ...req.body,
        workspaceId: DEFAULT_WORKSPACE_ID,
        routineTemplateId: req.params.id,
      });
      return storage.addRoutineExercise(input);
    }),
  );

  app.delete("/api/routines/:id/exercises/:exerciseId", (req, res) =>
    handle(res, async () => {
      await storage.removeRoutineExercise(req.params.id, req.params.exerciseId);
      return { ok: true };
    }),
  );

  // Schedule
  app.get("/api/schedule", (req, res) =>
    handle(res, () =>
      storage.listSchedule(DEFAULT_WORKSPACE_ID, {
        date: req.query.date as string | undefined,
        weekOf: req.query.weekOf as string | undefined,
      }),
    ),
  );

  app.post("/api/schedule", (req, res) =>
    handle(res, () => {
      const input = insertScheduledWorkoutSchema.parse({
        ...req.body,
        workspaceId: DEFAULT_WORKSPACE_ID,
        createdBy: DEFAULT_USER_ID,
      });
      return storage.createScheduledWorkout(input);
    }),
  );

  app.patch("/api/schedule/:id", (req, res) =>
    handle(res, async () => {
      const patch = z
        .object({
          status: z.enum(["planned", "completed", "skipped", "canceled"]).optional(),
          notes: z.string().nullable().optional(),
          title: z.string().optional(),
        })
        .parse(req.body);
      const updated = await storage.updateScheduledWorkout(req.params.id, patch);
      if (!updated) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      return updated;
    }),
  );

  // Sessions
  app.get("/api/sessions", (_req, res) =>
    handle(res, () => storage.listSessions(DEFAULT_WORKSPACE_ID)),
  );

  app.post("/api/sessions", (req, res) =>
    handle(res, () => {
      const input = insertWorkoutSessionSchema.parse({
        ...req.body,
        workspaceId: DEFAULT_WORKSPACE_ID,
        createdBy: DEFAULT_USER_ID,
      });
      return storage.createSession(input);
    }),
  );

  app.get("/api/sessions/:id", (req, res) =>
    handle(res, async () => {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      return session;
    }),
  );

  app.post("/api/sessions/:id/exercises", (req, res) =>
    handle(res, () => {
      const input = insertWorkoutSessionExerciseSchema.parse({
        ...req.body,
        workspaceId: DEFAULT_WORKSPACE_ID,
        workoutSessionId: req.params.id,
      });
      return storage.addSessionExercise(input);
    }),
  );

  app.post("/api/sessions/:id/exercises/:exerciseId/sets", (req, res) =>
    handle(res, () => {
      const input = insertWorkoutSessionSetSchema.parse({
        ...req.body,
        workspaceId: DEFAULT_WORKSPACE_ID,
        workoutSessionExerciseId: req.params.exerciseId,
      });
      return storage.addSessionSet(input);
    }),
  );

  app.patch("/api/sessions/:id", (req, res) =>
    handle(res, async () => {
      const patch = z
        .object({
          completedAt: z.string().nullable().optional(),
          sessionNotes: z.string().nullable().optional(),
        })
        .parse(req.body);
      const updated = await storage.updateSession(req.params.id, patch);
      if (!updated) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      return updated;
    }),
  );

  // Workspaces
  app.get("/api/workspaces", (_req, res) =>
    handle(res, () => storage.listWorkspaces(DEFAULT_USER_ID)),
  );

  app.post("/api/workspaces", (req, res) =>
    handle(res, () => {
      const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
      return storage.createWorkspace(name, DEFAULT_USER_ID);
    }),
  );

  return createServer(app);
}
