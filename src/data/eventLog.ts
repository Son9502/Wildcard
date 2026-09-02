import { supabase } from "../lib/supabase";
import type { EventLogEntry, EventLogType, PersonaId } from "../types";

function fromRow(row: any): EventLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    personaId: row.persona_id,
    taskId: row.task_id,
    confidantId: row.confidant_id,
    payload: row.payload ?? {},
    createdAt: row.created_at,
  };
}

export async function logEvent(input: {
  type: EventLogType;
  personaId?: PersonaId | null;
  taskId?: string | null;
  confidantId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<EventLogEntry> {
  const { data, error } = await supabase
    .from("event_log")
    .insert({
      type: input.type,
      persona_id: input.personaId ?? null,
      task_id: input.taskId ?? null,
      confidant_id: input.confidantId ?? null,
      payload: input.payload ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return fromRow(data);
}

export async function listRecentEvents(limit = 50): Promise<EventLogEntry[]> {
  const { data, error } = await supabase
    .from("event_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(fromRow);
}
