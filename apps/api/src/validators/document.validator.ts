import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or fewer'),
  description: z
    .string()
    .trim()
    .max(5000, 'Description must be 5000 characters or fewer')
    .optional()
    .default(''),
  tags: z
    .array(z.string().trim().min(1).max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional()
    .default([]),
  jurisdictionIds: z
    .array(z.string().uuid('Each jurisdiction ID must be a valid UUID'))
    .min(1, 'At least one jurisdiction is required')
    .max(10, 'Maximum 10 jurisdictions allowed'),
});

export const updateDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title must not be empty')
    .max(255, 'Title must be 255 characters or fewer')
    .optional(),
  description: z
    .string()
    .trim()
    .max(5000, 'Description must be 5000 characters or fewer')
    .optional(),
  tags: z
    .array(z.string().trim().min(1).max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
});

export const documentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  jurisdictionLevel: z.enum(['federal', 'provincial', 'municipal']).optional(),
  jurisdictionId: z.string().uuid().optional(),
  fileType: z.string().trim().max(10).optional(),
  sortBy: z.enum(['uploadedAt', 'title', 'fileSizeBytes', 'updatedAt']).default('uploadedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const documentParamsSchema = z.object({
  id: z.string().uuid('Document ID must be a valid UUID'),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentQueryInput = z.infer<typeof documentQuerySchema>;
export type DocumentParamsInput = z.infer<typeof documentParamsSchema>;
