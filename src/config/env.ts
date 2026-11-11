// Sec. 3 — variabilele de mediu, validate la pornire.
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  APP_MODE: z.enum(["demo", "prod"]).default("demo"),
  TZ_APP: z.string().default("Europe/Bucharest"),
  DEMO_RESET_ENABLED: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  DEMO_WASTE_SHIFT: z.enum(["years", "months"]).default("years"), // Q1
  FILE_STORAGE_DIR: z.string().default("/data/files"),
});

export const env = schema.parse(process.env);
export const isDemo = env.APP_MODE === "demo";
