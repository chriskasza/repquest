import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";

const sqlite = new Database(process.env.DATABASE_URL || "./repquest.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

// Bootstrap tables for local dev (mirrors Supabase design; replace with migrations in prod).
export function initSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'personal',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      source TEXT,
      source_external_id TEXT,
      demo_media_kind TEXT,
      demo_media_url TEXT,
      body_part TEXT,
      target_muscle TEXT,
      secondary_muscles TEXT,
      equipment TEXT,
      difficulty TEXT,
      instructions_json TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS routine_templates (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS routine_template_exercises (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      routine_template_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      planned_metric_type TEXT,
      planned_reps INTEGER,
      planned_seconds INTEGER,
      planned_distance_m INTEGER,
      planned_weight_kg INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scheduled_workouts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      routine_template_id TEXT,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT,
      title TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      scheduled_workout_id TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      session_notes TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workout_session_exercises (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      workout_session_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      planned_metric_type TEXT,
      planned_reps INTEGER,
      planned_seconds INTEGER,
      planned_distance_m INTEGER,
      planned_weight_kg INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workout_session_sets (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      workout_session_exercise_id TEXT NOT NULL,
      set_number INTEGER NOT NULL DEFAULT 1,
      metric_type TEXT NOT NULL,
      target_reps INTEGER,
      target_seconds INTEGER,
      target_distance_m INTEGER,
      target_weight_kg INTEGER,
      actual_reps INTEGER,
      actual_seconds INTEGER,
      actual_distance_m INTEGER,
      actual_weight_kg INTEGER,
      is_warmup INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
}
