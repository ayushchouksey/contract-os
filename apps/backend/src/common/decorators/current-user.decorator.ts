import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    return data ? user?.[data] : user;
  },
);

export type { User };