import { logEvent } from "../data/eventLog";
import { completeTask } from "../data/tasks";
import { recordCompletion } from "../progression";
import { getPersona } from "../personas/registry";
import type { PersonaId, Task } from "../types";

export interface PersonaSessionContext {
  task: Task;
  persona: ReturnType<typeof getPersona>;
  relatedNotes: string[];
}

export function buildSessionContext(task: Task): PersonaSessionContext {
  if (!task.personaId) {
    throw new Error(`Task ${task.id} has no persona assigned`);
  }

  return {
    task,
    persona: getPersona(task.personaId),
    relatedNotes: [],
  };
}

export async function completeSession(personaId: PersonaId, taskId: string): Promise<void> {
  await completeTask(taskId);
  await logEvent({
    type: "persona_session_completed",
    personaId,
    taskId,
  });
  await recordCompletion(personaId);
}
