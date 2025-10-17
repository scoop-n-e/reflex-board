import { z } from "zod";

import fallbackLayoutJson from "@/config/default-button-layout.json";

const buttonSchema = z.object({
  id: z.string().min(1, "Button id must be provided."),
  label: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  diameter: z.number().positive().optional(),
  inactiveColor: z.string().optional(),
  activeColor: z.string().optional(),
});

const playerSchema = z.object({
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  iconSize: z.number().positive().optional(),
  color: z.string().optional(),
});

export const layoutSchema = z.object({
  name: z.string().optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  buttons: z.array(buttonSchema).min(1, "At least one button is required."),
  player: playerSchema.optional(),
});

export type ButtonLayout = z.infer<typeof layoutSchema>;
export type ButtonConfig = ButtonLayout["buttons"][number];
export type PlayerConfig = z.infer<typeof playerSchema>;

export function parseLayout(input: unknown): ButtonLayout {
  const result = layoutSchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
}

export const fallbackLayout = parseLayout(fallbackLayoutJson);
