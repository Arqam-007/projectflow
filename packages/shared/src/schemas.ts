import { z } from 'zod';

export const HealthQuerySchema = z.object({
  checkDb: z.enum(['true', 'false']).optional().default('true'),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
});

export const RegisterSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Please provide a valid email address' }),
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters long' })
    .max(60, { message: 'Name cannot exceed 60 characters' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(100, { message: 'Password cannot exceed 100 characters' })
    .regex(/[A-Za-z]/, { message: 'Password must contain at least one letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Please provide a valid email address' }),
  password: z
    .string()
    .min(1, { message: 'Password is required' }),
});

export const RoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

export const ProjectStatusSchema = z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']);

export const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Workspace name must be at least 2 characters' })
    .max(60, { message: 'Workspace name cannot exceed 60 characters' }),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' })
    .min(2, { message: 'Slug must be at least 2 characters' })
    .max(60, { message: 'Slug cannot exceed 60 characters' })
    .optional(),
  description: z.string().trim().max(300, { message: 'Description cannot exceed 300 characters' }).optional(),
});

export const UpdateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Workspace name must be at least 2 characters' })
    .max(60, { message: 'Workspace name cannot exceed 60 characters' })
    .optional(),
  description: z.string().trim().max(300, { message: 'Description cannot exceed 300 characters' }).optional(),
});

export const AddMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Valid email is required to invite member' }),
  role: RoleSchema.default('MEMBER'),
});

export const UpdateRoleSchema = z.object({
  role: RoleSchema,
});

export const CreateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Project name must be at least 2 characters' })
    .max(80, { message: 'Project name cannot exceed 80 characters' }),
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/, { message: 'Key must be 2-10 alphanumeric characters (e.g. PRJ, DEV)' }),
  description: z.string().trim().max(500, { message: 'Description cannot exceed 500 characters' }).optional(),
  status: ProjectStatusSchema.optional().default('ACTIVE'),
});

export const UpdateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Project name must be at least 2 characters' })
    .max(80, { message: 'Project name cannot exceed 80 characters' })
    .optional(),
  description: z.string().trim().max(500, { message: 'Description cannot exceed 500 characters' }).optional(),
  status: ProjectStatusSchema.optional(),
});

export const TaskStatusSchema = z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);

export const TaskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const CreateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, { message: 'Task title must be at least 2 characters' })
    .max(150, { message: 'Task title cannot exceed 150 characters' }),
  description: z.string().trim().max(2000, { message: 'Description cannot exceed 2000 characters' }).optional(),
  status: TaskStatusSchema.optional().default('TODO'),
  priority: TaskPrioritySchema.optional().default('MEDIUM'),
  dueDate: z.string().datetime({ offset: true }).nullable().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).nullable().optional()),
  assigneeId: z.string().uuid().nullable().optional().or(z.string().min(1).nullable().optional()),
  orderIndex: z.coerce.number().int().min(0).optional().default(0),
});

export const UpdateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, { message: 'Task title must be at least 2 characters' })
    .max(150, { message: 'Task title cannot exceed 150 characters' })
    .optional(),
  description: z.string().trim().max(2000, { message: 'Description cannot exceed 2000 characters' }).nullable().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  orderIndex: z.coerce.number().int().min(0).optional(),
  projectId: z.string().optional(),
});

export const UpdateTaskStatusSchema = z.object({
  status: TaskStatusSchema,
  orderIndex: z.coerce.number().int().min(0).optional(),
});

export const TaskSortBySchema = z.enum([
  'createdAt',
  'dueDate',
  'priority',
  'taskNumber',
  'title',
  'status',
  'orderIndex',
]);

export const SortOrderSchema = z.enum(['asc', 'desc']);

export const TaskFilterSchema = z.object({
  status: z
    .union([
      TaskStatusSchema,
      z.array(TaskStatusSchema),
      z.string().transform((val) => val.split(',').map((s) => s.trim()) as z.infer<typeof TaskStatusSchema>[]),
    ])
    .optional(),
  priority: z
    .union([
      TaskPrioritySchema,
      z.array(TaskPrioritySchema),
      z.string().transform((val) => val.split(',').map((p) => p.trim()) as z.infer<typeof TaskPrioritySchema>[]),
    ])
    .optional(),
  assigneeId: z.string().optional(),
  search: z.string().trim().optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
  overdueOnly: z
    .union([z.boolean(), z.string().transform((val) => val === 'true' || val === '1')])
    .optional(),
  sortBy: TaskSortBySchema.optional().default('createdAt'),
  sortOrder: SortOrderSchema.optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const ActivityFilterSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  page: z.coerce.number().int().min(1).optional().default(1),
  action: z.string().trim().optional(),
});
