import { z } from "zod";

export const tableSchema = z.object({
  name: z.string().min(1, "Table name is required").max(20),
  capacity: z.number().int().min(1).max(50).default(4),
  floor: z.string().max(50).optional(),
  positionX: z.number().int().optional(),
  positionY: z.number().int().optional(),
});

export type TableFormData = z.infer<typeof tableSchema>;

export const tablePositionSchema = z.object({
  id: z.string().min(1),
  positionX: z.number().int().min(0).max(5000),
  positionY: z.number().int().min(0).max(5000),
});

export const tablePositionsBatchSchema = z.array(tablePositionSchema).max(500);

export type TablePositionData = z.infer<typeof tablePositionSchema>;
