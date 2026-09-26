import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto.js';
import * as bcrypt from 'bcryptjs';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, user: AuthUser) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        role: dto.role,
        passwordHash,
        orgId: user.orgId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findAll(user: AuthUser) {
    return this.prisma.user.findMany({
      where: user.orgId ? { orgId: user.orgId } : {},
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: Record<string, unknown> = { ...dto };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      delete data.password;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}