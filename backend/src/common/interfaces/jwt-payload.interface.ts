import { Role } from '@prisma/client';

export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  type: TokenType;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
}
