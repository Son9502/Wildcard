import { supabase } from "../lib/supabase";
import type { PersonaId, Task } from "../types";

function fromRow(row: any): Task {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    dueAt: row.due_at,
    personaId: row.persona_id,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createTask(input: {
  title: string;
  dueAt?: string | null;
  personaId?: PersonaId | null;
}): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: input.title,
      due_at: input.dueAt ?? null,
      persona_id: input.personaId ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return fromRow(data);
}

export async function completeTask(taskId: string): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error) throw error;
  return fromRow(data);
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}
