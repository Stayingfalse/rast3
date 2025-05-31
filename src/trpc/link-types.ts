// Types for Link entity, matching the Prisma model
export type Link = {
  id: string;
  name: string;
  url: string;
  description?: string | null;
  domain: string;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
    domain: string;
  } | null;
  error?: string | null;
};
