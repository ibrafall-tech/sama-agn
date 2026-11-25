import { z } from "zod";
import { CATEGORIES } from "./types";

const name = z.string().trim().min(1, "Le prénom est obligatoire").max(40, "Prénom trop long");

export const loginSchema = z.object({
  code: z.string().trim().min(1, "Entrez le code").max(64),
  name,
  /** "admin" when the person chose « Je gère le menu » on the login screen. */
  role: z.enum(["member", "admin"]).default("member"),
});

export const profileSchema = z.object({
  name: name.optional(),
  adminCode: z.string().trim().min(1).max(64).optional(),
  /** Leave manager mode on this phone (e.g. before lending it). */
  dropAdmin: z.literal(true).optional(),
});

export const time = z.union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide")]);

export const menuSchema = z.object({
  restaurant: z.string().trim().max(80).default(""),
  deadline: time.default(""),
  dishes: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1, "Chaque plat doit avoir un nom").max(80),
        price: z.coerce.number().int().min(0).max(1_000_000),
        category: z.enum(CATEGORIES).default("Plat"),
      }),
    )
    .min(1, "Ajoutez au moins un plat")
    .max(80),
});

export const dayPatchSchema = z.object({
  runner: z.enum(["claim", "release"]).optional(),
  closed: z.boolean().optional(),
});

export const orderSchema = z.object({
  date: z.string(),
  /** Set only when someone enters an order for a colleague. */
  forId: z.string().regex(/^guest-[a-z0-9-]{6,40}$/).optional(),
  name: name.optional(),
  note: z.string().trim().max(200).default(""),
  items: z
    .array(z.object({ dishId: z.string().uuid(), qty: z.number().int().min(1).max(20) }))
    .max(40),
});

export type MenuInput = z.infer<typeof menuSchema>;
export type OrderInput = z.infer<typeof orderSchema>;

export function firstError(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Données invalides";
}
