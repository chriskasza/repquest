import { randomUUID } from "crypto";
import { and, asc, desc, eq, like } from "drizzle-orm";
import { db, initSchema } from "./db";
import {
  exercises,
  routineTemplates,
  routineTemplateExercises,
  scheduledWorkouts,
  workoutSessions,
  workoutSessionExercises,
  workoutSessionSets,
  workspaces,
  type Exercise,
  type InsertRoutineTemplate,
  type InsertRoutineTemplateExercise,
  type InsertScheduledWorkout,
  type InsertWorkoutSession,
  type InsertWorkoutSessionExercise,
  type InsertWorkoutSessionSet,
  type RoutineTemplate,
  type RoutineTemplateExercise,
  type ScheduledWorkout,
  type Workspace,
  type WorkoutSession,
  type WorkoutSessionExercise,
  type WorkoutSessionSet,
} from "@shared/schema";

export const DEFAULT_WORKSPACE_ID = "ws-personal";
export const DEFAULT_USER_ID = "user-demo";

export interface ExerciseFilter {
  q?: string;
  bodyPart?: string;
  metricType?: string;
}

export interface RoutineWithExercises extends RoutineTemplate {
  exercises: (RoutineTemplateExercise & { exercise: Exercise | undefined })[];
}

export interface SessionWithDetail extends WorkoutSession {
  exercises: (WorkoutSessionExercise & {
    exercise: Exercise | undefined;
    sets: WorkoutSessionSet[];
  })[];
}

export interface IStorage {
  listExercises(filter: ExerciseFilter): Promise<Exercise[]>;
  getExercise(id: string): Promise<Exercise | undefined>;

  listRoutines(workspaceId: string): Promise<(RoutineTemplate & { exerciseCount: number })[]>;
  createRoutine(input: InsertRoutineTemplate): Promise<RoutineTemplate>;
  getRoutine(id: string): Promise<RoutineWithExercises | undefined>;
  addRoutineExercise(input: InsertRoutineTemplateExercise): Promise<RoutineTemplateExercise>;
  removeRoutineExercise(routineId: string, exerciseId: string): Promise<void>;

  listSchedule(workspaceId: string, opts: { date?: string; weekOf?: string }): Promise<ScheduledWorkout[]>;
  createScheduledWorkout(input: InsertScheduledWorkout): Promise<ScheduledWorkout>;
  updateScheduledWorkout(id: string, patch: Partial<ScheduledWorkout>): Promise<ScheduledWorkout | undefined>;

  listSessions(workspaceId: string): Promise<WorkoutSession[]>;
  createSession(input: InsertWorkoutSession): Promise<WorkoutSession>;
  getSession(id: string): Promise<SessionWithDetail | undefined>;
  addSessionExercise(input: InsertWorkoutSessionExercise): Promise<WorkoutSessionExercise>;
  addSessionSet(input: InsertWorkoutSessionSet): Promise<WorkoutSessionSet>;
  updateSession(id: string, patch: Partial<WorkoutSession>): Promise<WorkoutSession | undefined>;

  listWorkspaces(userId: string): Promise<Workspace[]>;
  createWorkspace(name: string, userId: string): Promise<Workspace>;
}

const SEED_EXERCISES: Array<Omit<Exercise, "id" | "createdAt">> = [
  { slug: "barbell-squat", name: "Barbell Squat", metricType: "weight_reps", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "legs", targetMuscle: "quadriceps", secondaryMuscles: JSON.stringify(["glutes", "hamstrings"]), equipment: "barbell", difficulty: "intermediate", instructionsJson: JSON.stringify(["Set the bar on your upper back.", "Descend until thighs are parallel.", "Drive up through your heels."]), isActive: true },
  { slug: "romanian-deadlift", name: "Romanian Deadlift", metricType: "weight_reps", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "legs", targetMuscle: "hamstrings", secondaryMuscles: JSON.stringify(["glutes", "lower back"]), equipment: "barbell", difficulty: "intermediate", instructionsJson: JSON.stringify(["Hinge at the hips.", "Keep the bar close to your legs.", "Stand back up squeezing glutes."]), isActive: true },
  { slug: "bench-press", name: "Bench Press", metricType: "weight_reps", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "chest", targetMuscle: "pectorals", secondaryMuscles: JSON.stringify(["triceps", "shoulders"]), equipment: "barbell", difficulty: "intermediate", instructionsJson: JSON.stringify(["Lower the bar to mid-chest.", "Press up to lockout."]), isActive: true },
  { slug: "overhead-press", name: "Overhead Press", metricType: "weight_reps", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "shoulders", targetMuscle: "deltoids", secondaryMuscles: JSON.stringify(["triceps"]), equipment: "barbell", difficulty: "intermediate", instructionsJson: JSON.stringify(["Press the bar overhead.", "Lock out and lower with control."]), isActive: true },
  { slug: "pull-up", name: "Pull-up", metricType: "reps", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "back", targetMuscle: "lats", secondaryMuscles: JSON.stringify(["biceps"]), equipment: "bodyweight", difficulty: "advanced", instructionsJson: JSON.stringify(["Hang from the bar.", "Pull until chin clears the bar."]), isActive: true },
  { slug: "push-up", name: "Push-up", metricType: "reps", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "chest", targetMuscle: "pectorals", secondaryMuscles: JSON.stringify(["triceps", "core"]), equipment: "bodyweight", difficulty: "beginner", instructionsJson: JSON.stringify(["Keep a straight line head to heels.", "Lower chest to floor.", "Press back up."]), isActive: true },
  { slug: "bent-over-row", name: "Bent-over Row", metricType: "weight_reps", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "back", targetMuscle: "lats", secondaryMuscles: JSON.stringify(["biceps", "rear delts"]), equipment: "barbell", difficulty: "intermediate", instructionsJson: JSON.stringify(["Hinge forward.", "Row the bar to your stomach."]), isActive: true },
  { slug: "dumbbell-curl", name: "Dumbbell Curl", metricType: "weight_reps", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "arms", targetMuscle: "biceps", secondaryMuscles: JSON.stringify(["forearms"]), equipment: "dumbbell", difficulty: "beginner", instructionsJson: JSON.stringify(["Curl the dumbbells up.", "Lower with control."]), isActive: true },
  { slug: "plank", name: "Plank", metricType: "duration_seconds", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "core", targetMuscle: "abdominals", secondaryMuscles: JSON.stringify(["shoulders"]), equipment: "bodyweight", difficulty: "beginner", instructionsJson: JSON.stringify(["Hold a straight body on forearms.", "Brace your core."]), isActive: true },
  { slug: "hanging-leg-raise", name: "Hanging Leg Raise", metricType: "reps", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "core", targetMuscle: "abdominals", secondaryMuscles: JSON.stringify(["hip flexors"]), equipment: "bodyweight", difficulty: "advanced", instructionsJson: JSON.stringify(["Hang from a bar.", "Raise legs to horizontal."]), isActive: true },
  { slug: "running", name: "Running", metricType: "distance_meters", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "cardio", targetMuscle: "full body", secondaryMuscles: JSON.stringify([]), equipment: "none", difficulty: "beginner", instructionsJson: JSON.stringify(["Maintain a steady pace.", "Land midfoot."]), isActive: true },
  { slug: "rowing-machine", name: "Rowing Machine", metricType: "distance_meters", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "cardio", targetMuscle: "full body", secondaryMuscles: JSON.stringify(["back", "legs"]), equipment: "machine", difficulty: "beginner", instructionsJson: JSON.stringify(["Drive with the legs.", "Pull the handle to your chest."]), isActive: true },
  { slug: "jump-rope", name: "Jump Rope", metricType: "duration_seconds", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "cardio", targetMuscle: "calves", secondaryMuscles: JSON.stringify(["shoulders"]), equipment: "rope", difficulty: "beginner", instructionsJson: JSON.stringify(["Keep elbows close.", "Jump on the balls of your feet."]), isActive: true },
  { slug: "lunge", name: "Walking Lunge", metricType: "weight_reps", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "legs", targetMuscle: "quadriceps", secondaryMuscles: JSON.stringify(["glutes"]), equipment: "dumbbell", difficulty: "beginner", instructionsJson: JSON.stringify(["Step forward into a lunge.", "Alternate legs."]), isActive: true },
  { slug: "lat-pulldown", name: "Lat Pulldown", metricType: "weight_reps", source: "seed", sourceExternalId: null, demoMediaKind: "image", demoMediaUrl: null, bodyPart: "back", targetMuscle: "lats", secondaryMuscles: JSON.stringify(["biceps"]), equipment: "machine", difficulty: "beginner", instructionsJson: JSON.stringify(["Pull the bar to your chest.", "Control the return."]), isActive: true },
];

class SqliteStorage implements IStorage {
  constructor() {
    initSchema();
    this.seed();
  }

  private seed() {
    const existing = db.select().from(exercises).limit(1).all();
    if (existing.length === 0) {
      const ts = new Date().toISOString();
      for (const ex of SEED_EXERCISES) {
        db.insert(exercises).values({ ...ex, id: randomUUID(), createdAt: ts }).run();
      }
    }
    const ws = db.select().from(workspaces).where(eq(workspaces.id, DEFAULT_WORKSPACE_ID)).all();
    if (ws.length === 0) {
      db.insert(workspaces).values({
        id: DEFAULT_WORKSPACE_ID,
        name: "My Workspace",
        ownerUserId: DEFAULT_USER_ID,
        kind: "personal",
        createdAt: new Date().toISOString(),
      }).run();
    }
  }

  async listExercises(filter: ExerciseFilter): Promise<Exercise[]> {
    const conditions = [eq(exercises.isActive, true)];
    if (filter.q) conditions.push(like(exercises.name, `%${filter.q}%`));
    if (filter.bodyPart) conditions.push(eq(exercises.bodyPart, filter.bodyPart));
    if (filter.metricType) conditions.push(eq(exercises.metricType, filter.metricType as Exercise["metricType"]));
    return db.select().from(exercises).where(and(...conditions)).orderBy(asc(exercises.name)).all();
  }

  async getExercise(id: string): Promise<Exercise | undefined> {
    return db.select().from(exercises).where(eq(exercises.id, id)).get();
  }

  async listRoutines(workspaceId: string) {
    const rows = db.select().from(routineTemplates)
      .where(and(eq(routineTemplates.workspaceId, workspaceId), eq(routineTemplates.isArchived, false)))
      .orderBy(desc(routineTemplates.createdAt)).all();
    return rows.map((r) => {
      const count = db.select().from(routineTemplateExercises)
        .where(eq(routineTemplateExercises.routineTemplateId, r.id)).all().length;
      return { ...r, exerciseCount: count };
    });
  }

  async createRoutine(input: InsertRoutineTemplate): Promise<RoutineTemplate> {
    const row = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    db.insert(routineTemplates).values(row).run();
    return db.select().from(routineTemplates).where(eq(routineTemplates.id, row.id)).get()!;
  }

  async getRoutine(id: string): Promise<RoutineWithExercises | undefined> {
    const routine = db.select().from(routineTemplates).where(eq(routineTemplates.id, id)).get();
    if (!routine) return undefined;
    const links = db.select().from(routineTemplateExercises)
      .where(eq(routineTemplateExercises.routineTemplateId, id))
      .orderBy(asc(routineTemplateExercises.position)).all();
    const withEx = links.map((l) => ({
      ...l,
      exercise: db.select().from(exercises).where(eq(exercises.id, l.exerciseId)).get(),
    }));
    return { ...routine, exercises: withEx };
  }

  async addRoutineExercise(input: InsertRoutineTemplateExercise): Promise<RoutineTemplateExercise> {
    const row = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    db.insert(routineTemplateExercises).values(row).run();
    return db.select().from(routineTemplateExercises).where(eq(routineTemplateExercises.id, row.id)).get()!;
  }

  async removeRoutineExercise(routineId: string, exerciseId: string): Promise<void> {
    db.delete(routineTemplateExercises).where(and(
      eq(routineTemplateExercises.routineTemplateId, routineId),
      eq(routineTemplateExercises.exerciseId, exerciseId),
    )).run();
  }

  async listSchedule(workspaceId: string, opts: { date?: string; weekOf?: string }): Promise<ScheduledWorkout[]> {
    const rows = db.select().from(scheduledWorkouts)
      .where(eq(scheduledWorkouts.workspaceId, workspaceId))
      .orderBy(asc(scheduledWorkouts.scheduledDate)).all();
    if (opts.date) return rows.filter((r) => r.scheduledDate === opts.date);
    if (opts.weekOf) {
      const start = new Date(opts.weekOf);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return rows.filter((r) => {
        const d = new Date(r.scheduledDate);
        return d >= start && d < end;
      });
    }
    return rows;
  }

  async createScheduledWorkout(input: InsertScheduledWorkout): Promise<ScheduledWorkout> {
    const row = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    db.insert(scheduledWorkouts).values(row).run();
    return db.select().from(scheduledWorkouts).where(eq(scheduledWorkouts.id, row.id)).get()!;
  }

  async updateScheduledWorkout(id: string, patch: Partial<ScheduledWorkout>): Promise<ScheduledWorkout | undefined> {
    db.update(scheduledWorkouts).set(patch).where(eq(scheduledWorkouts.id, id)).run();
    return db.select().from(scheduledWorkouts).where(eq(scheduledWorkouts.id, id)).get();
  }

  async listSessions(workspaceId: string): Promise<WorkoutSession[]> {
    return db.select().from(workoutSessions)
      .where(eq(workoutSessions.workspaceId, workspaceId))
      .orderBy(desc(workoutSessions.startedAt)).all();
  }

  async createSession(input: InsertWorkoutSession): Promise<WorkoutSession> {
    const ts = new Date().toISOString();
    const row = { ...input, id: randomUUID(), startedAt: input.startedAt ?? ts, createdAt: ts };
    db.insert(workoutSessions).values(row).run();
    return db.select().from(workoutSessions).where(eq(workoutSessions.id, row.id)).get()!;
  }

  async getSession(id: string): Promise<SessionWithDetail | undefined> {
    const session = db.select().from(workoutSessions).where(eq(workoutSessions.id, id)).get();
    if (!session) return undefined;
    const exRows = db.select().from(workoutSessionExercises)
      .where(eq(workoutSessionExercises.workoutSessionId, id))
      .orderBy(asc(workoutSessionExercises.position)).all();
    const exercisesDetail = exRows.map((er) => ({
      ...er,
      exercise: db.select().from(exercises).where(eq(exercises.id, er.exerciseId)).get(),
      sets: db.select().from(workoutSessionSets)
        .where(eq(workoutSessionSets.workoutSessionExerciseId, er.id))
        .orderBy(asc(workoutSessionSets.setNumber)).all(),
    }));
    return { ...session, exercises: exercisesDetail };
  }

  async addSessionExercise(input: InsertWorkoutSessionExercise): Promise<WorkoutSessionExercise> {
    const row = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    db.insert(workoutSessionExercises).values(row).run();
    return db.select().from(workoutSessionExercises).where(eq(workoutSessionExercises.id, row.id)).get()!;
  }

  async addSessionSet(input: InsertWorkoutSessionSet): Promise<WorkoutSessionSet> {
    const existing = db.select().from(workoutSessionSets)
      .where(eq(workoutSessionSets.workoutSessionExerciseId, input.workoutSessionExerciseId)).all();
    const row = {
      ...input,
      id: randomUUID(),
      setNumber: input.setNumber ?? existing.length + 1,
      createdAt: new Date().toISOString(),
    };
    db.insert(workoutSessionSets).values(row).run();
    return db.select().from(workoutSessionSets).where(eq(workoutSessionSets.id, row.id)).get()!;
  }

  async updateSession(id: string, patch: Partial<WorkoutSession>): Promise<WorkoutSession | undefined> {
    db.update(workoutSessions).set(patch).where(eq(workoutSessions.id, id)).run();
    return db.select().from(workoutSessions).where(eq(workoutSessions.id, id)).get();
  }

  async listWorkspaces(userId: string): Promise<Workspace[]> {
    return db.select().from(workspaces).where(eq(workspaces.ownerUserId, userId))
      .orderBy(asc(workspaces.createdAt)).all();
  }

  async createWorkspace(name: string, userId: string): Promise<Workspace> {
    const row = {
      id: randomUUID(),
      name,
      ownerUserId: userId,
      kind: "personal" as const,
      createdAt: new Date().toISOString(),
    };
    db.insert(workspaces).values(row).run();
    return db.select().from(workspaces).where(eq(workspaces.id, row.id)).get()!;
  }
}

export const storage: IStorage = new SqliteStorage();
