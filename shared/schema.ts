import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import type { InferSelectModel } from "drizzle-orm";
import { z } from "zod";

const now = () => new Date().toISOString();

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  kind: text("kind", { enum: ["personal", "shared"] }).notNull().default("personal"),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const workspaceMembers = sqliteTable("workspace_members", {
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  metricType: text("metric_type", {
    enum: ["reps", "duration_seconds", "distance_meters", "weight_reps"],
  }).notNull(),
  source: text("source"),
  sourceExternalId: text("source_external_id"),
  demoMediaKind: text("demo_media_kind", { enum: ["gif", "video", "image"] }),
  demoMediaUrl: text("demo_media_url"),
  bodyPart: text("body_part"),
  targetMuscle: text("target_muscle"),
  secondaryMuscles: text("secondary_muscles"),
  equipment: text("equipment"),
  difficulty: text("difficulty"),
  instructionsJson: text("instructions_json"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const routineTemplates = sqliteTable("routine_templates", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const routineTemplateExercises = sqliteTable("routine_template_exercises", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  routineTemplateId: text("routine_template_id").notNull(),
  exerciseId: text("exercise_id").notNull(),
  position: integer("position").notNull().default(0),
  plannedMetricType: text("planned_metric_type", {
    enum: ["reps", "duration_seconds", "distance_meters", "weight_reps"],
  }),
  plannedReps: integer("planned_reps"),
  plannedSeconds: integer("planned_seconds"),
  plannedDistanceM: integer("planned_distance_m"),
  plannedWeightKg: integer("planned_weight_kg"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const scheduledWorkouts = sqliteTable("scheduled_workouts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  routineTemplateId: text("routine_template_id"),
  scheduledDate: text("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time"),
  title: text("title").notNull(),
  notes: text("notes"),
  status: text("status", {
    enum: ["planned", "completed", "skipped", "canceled"],
  }).notNull().default("planned"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const workoutSessions = sqliteTable("workout_sessions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  scheduledWorkoutId: text("scheduled_workout_id"),
  startedAt: text("started_at").notNull().$defaultFn(now),
  completedAt: text("completed_at"),
  sessionNotes: text("session_notes"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const workoutSessionExercises = sqliteTable("workout_session_exercises", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  workoutSessionId: text("workout_session_id").notNull(),
  exerciseId: text("exercise_id").notNull(),
  position: integer("position").notNull().default(0),
  plannedMetricType: text("planned_metric_type", {
    enum: ["reps", "duration_seconds", "distance_meters", "weight_reps"],
  }),
  plannedReps: integer("planned_reps"),
  plannedSeconds: integer("planned_seconds"),
  plannedDistanceM: integer("planned_distance_m"),
  plannedWeightKg: integer("planned_weight_kg"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

export const workoutSessionSets = sqliteTable("workout_session_sets", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  workoutSessionExerciseId: text("workout_session_exercise_id").notNull(),
  setNumber: integer("set_number").notNull().default(1),
  metricType: text("metric_type", {
    enum: ["reps", "duration_seconds", "distance_meters", "weight_reps"],
  }).notNull(),
  targetReps: integer("target_reps"),
  targetSeconds: integer("target_seconds"),
  targetDistanceM: integer("target_distance_m"),
  targetWeightKg: integer("target_weight_kg"),
  actualReps: integer("actual_reps"),
  actualSeconds: integer("actual_seconds"),
  actualDistanceM: integer("actual_distance_m"),
  actualWeightKg: integer("actual_weight_kg"),
  isWarmup: integer("is_warmup", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

// Insert schemas (auto fields omitted)
export const insertProfileSchema = createInsertSchema(profiles).omit({ createdAt: true });
export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({ id: true, createdAt: true });
export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers).omit({ createdAt: true });
export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true, createdAt: true });
export const insertRoutineTemplateSchema = createInsertSchema(routineTemplates).omit({ id: true, createdAt: true });
export const insertRoutineTemplateExerciseSchema = createInsertSchema(routineTemplateExercises).omit({ id: true, createdAt: true });
export const insertScheduledWorkoutSchema = createInsertSchema(scheduledWorkouts).omit({ id: true, createdAt: true });
export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({ id: true, createdAt: true });
export const insertWorkoutSessionExerciseSchema = createInsertSchema(workoutSessionExercises).omit({ id: true, createdAt: true });
export const insertWorkoutSessionSetSchema = createInsertSchema(workoutSessionSets).omit({ id: true, createdAt: true });

// Insert types (derived from the zod insert schemas, so auto fields are omitted)
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type InsertRoutineTemplate = z.infer<typeof insertRoutineTemplateSchema>;
export type InsertRoutineTemplateExercise = z.infer<typeof insertRoutineTemplateExerciseSchema>;
export type InsertScheduledWorkout = z.infer<typeof insertScheduledWorkoutSchema>;
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type InsertWorkoutSessionExercise = z.infer<typeof insertWorkoutSessionExerciseSchema>;
export type InsertWorkoutSessionSet = z.infer<typeof insertWorkoutSessionSetSchema>;

// Select types
export type Profile = InferSelectModel<typeof profiles>;
export type Workspace = InferSelectModel<typeof workspaces>;
export type WorkspaceMember = InferSelectModel<typeof workspaceMembers>;
export type Exercise = InferSelectModel<typeof exercises>;
export type RoutineTemplate = InferSelectModel<typeof routineTemplates>;
export type RoutineTemplateExercise = InferSelectModel<typeof routineTemplateExercises>;
export type ScheduledWorkout = InferSelectModel<typeof scheduledWorkouts>;
export type WorkoutSession = InferSelectModel<typeof workoutSessions>;
export type WorkoutSessionExercise = InferSelectModel<typeof workoutSessionExercises>;
export type WorkoutSessionSet = InferSelectModel<typeof workoutSessionSets>;

export type MetricType = "reps" | "duration_seconds" | "distance_meters" | "weight_reps";
export type WorkoutStatus = "planned" | "completed" | "skipped" | "canceled";
