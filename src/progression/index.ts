import { supabase } from "../lib/supabase";
import type { PersonaId, PersonaProgression } from "../types";

function fromRow(row: any): PersonaProgression {
  return {
    userId: row.user_id,
    personaId: row.persona_id,
    rank: row.rank,
    xp: row.xp,
    evolvedAt: row.evolved_at,
  };
}

export async function listProgression(): Promise<PersonaProgression[]> {
  const { data, error } = await supabase.from("persona_progression").select("*");
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

const XP_PER_COMPLETION = 10;
const XP_PER_RANK = 100;

export async function recordCompletion(personaId: PersonaId): Promise<PersonaProgression> {
  const { data: existing, error: fetchError } = await supabase
    .from("persona_progression")
    .select("*")
    .eq("persona_id", personaId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const nextXp = (existing?.xp ?? 0) + XP_PER_COMPLETION;
  const nextRank = Math.floor(nextXp / XP_PER_RANK) + 1;

  const { data, error } = await supabase
    .from("persona_progression")
    .upsert(
      {
        persona_id: personaId,
        xp: nextXp,
        rank: nextRank,
      },
      { onConflict: "user_id,persona_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return fromRow(data);
}
