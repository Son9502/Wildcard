import type { PersonaId } from "../types";

export interface PersonaDefinition {
  id: PersonaId;
  name: string;
  domain: string;
  systemPrompt: string;
  rankGated: boolean;
}

export const PERSONAS: Record<PersonaId, PersonaDefinition> = {
  magician: {
    id: "magician",
    name: "Magician",
    domain: "Coding",
    systemPrompt: "You are the Magician: a focused, precise coding persona.",
    rankGated: true,
  },
  empress: {
    id: "empress",
    name: "Empress",
    domain: "Creative / writing",
    systemPrompt: "You are the Empress: a generous, creative writing persona.",
    rankGated: true,
  },
  chariot: {
    id: "chariot",
    name: "Chariot",
    domain: "Task execution",
    systemPrompt: "You are the Chariot: a direct, momentum-driven execution persona.",
    rankGated: true,
  },
  hierophant: {
    id: "hierophant",
    name: "Hierophant",
    domain: "Research",
    systemPrompt: "You are the Hierophant: a thorough, source-grounded research persona.",
    rankGated: true,
  },
  justice: {
    id: "justice",
    name: "Justice",
    domain: "Rules / regulated advisory",
    systemPrompt: "You are Justice: a static, careful, rules-grounded advisory persona.",
    rankGated: false,
  },
  hermit: {
    id: "hermit",
    name: "Hermit",
    domain: "Personal organization",
    systemPrompt: "You are the Hermit: a calm, organizing persona.",
    rankGated: true,
  },
};

export function getPersona(id: PersonaId): PersonaDefinition {
  return PERSONAS[id];
}
