import { supabase } from "../lib/supabase";
import type { Confidant } from "../types";

function fromRow(row: any): Confidant {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    lastContactAt: row.last_contact_at,
    followUpsOwed: row.follow_ups_owed ?? [],
    questionsQueued: row.questions_queued ?? [],
    createdAt: row.created_at,
  };
}

export async function listConfidants(): Promise<Confidant[]> {
  const { data, error } = await supabase
    .from("confidants")
    .select("*")
    .order("last_contact_at", { ascending: true, nullsFirst: true });

  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createConfidant(name: string): Promise<Confidant> {
  const { data, error } = await supabase
    .from("confidants")
    .insert({ name })
    .select("*")
    .single();

  if (error) throw error;
  return fromRow(data);
}

export async function logContact(confidantId: string): Promise<Confidant> {
  const { data, error } = await supabase
    .from("confidants")
    .update({ last_contact_at: new Date().toISOString() })
    .eq("id", confidantId)
    .select("*")
    .single();

  if (error) throw error;
  return fromRow(data);
}
