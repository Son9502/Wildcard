export type PersonaId =
  | "magician"
  | "empress"
  | "chariot"
  | "hierophant"
  | "justice"
  | "hermit";

export interface Task {
  id: string;
  userId: string;
  title: string;
  dueAt: string | null;
  personaId: PersonaId | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ScheduleEvent {
  id: string;
  userId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
}

export interface Confidant {
  id: string;
  userId: string;
  name: string;
  lastContactAt: string | null;
  followUpsOwed: string[];
  questionsQueued: string[];
  createdAt: string;
}

export type EventLogType =
  | "task_completed"
  | "persona_session_completed"
  | "confidant_contacted";

export interface EventLogEntry {
  id: string;
  userId: string;
  type: EventLogType;
  personaId: PersonaId | null;
  taskId: string | null;
  confidantId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface PersonaProgression {
  userId: string;
  personaId: PersonaId;
  rank: number;
  xp: number;
  evolvedAt: string | null;
}
