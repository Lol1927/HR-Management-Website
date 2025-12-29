const { z } = require("zod");

const employeeCreateSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(7),
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  rrn: z.string().min(6),
  rating: z.number().min(1).max(5).optional(),
  reviewNote: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  regions: z.array(z.string()).max(5).default([]),
  isVisible: z.boolean().default(true),
});

const employeeUpdateSchema = employeeCreateSchema.partial();

module.exports = {
  employeeCreateSchema,
  employeeUpdateSchema,
};
