import { supabase } from "../lib/supabase";
import type { ScheduleEvent } from "../types";

function fromRow(row: any): ScheduleEvent {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
  };
}

export async function listTodaysEvents(): Promise<ScheduleEvent[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("schedule_events")
    .select("*")
    .gte("starts_at", startOfDay.toISOString())
    .lte("starts_at", endOfDay.toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createEvent(input: {
  title: string;
  startsAt: string;
  endsAt?: string | null;
}): Promise<ScheduleEvent> {
  const { data, error } = await supabase
    .from("schedule_events")
    .insert({
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return fromRow(data);
}
