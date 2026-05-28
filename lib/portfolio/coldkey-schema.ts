import { z } from "zod"

export const coldkeyQuerySchema = z.object({
  coldkey: z
    .string()
    .min(40)
    .max(50)
    .regex(/^5[A-Za-z0-9]+$/, "Invalid coldkey address"),
})
