import { Role } from '@prisma/client';

export interface JwtPayload {
  sub:   string;
  email: string;
  role:  Role;
  iat?:  number;
  exp?:  number;
}

export interface PaginationResult {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
  hasNext:    boolean;
  hasPrev:    boolean;
}

export interface ApiResponseBody<T = unknown> {
  success:     boolean;
  message:     string;
  data?:       T;
  pagination?: PaginationResult;
  errors?:     unknown;
}

export interface AuthenticatedUser {
  id:    string;
  email: string;
  role:  Role;
  name:  string;
}

export interface ProjectFilters {
  category?:   string;
  isFeatured?: boolean;
  search?:     string;
  clientId?:   string;
}