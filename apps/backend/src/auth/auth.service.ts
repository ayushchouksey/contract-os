import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service.js';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const org = dto.orgName
      ? await this.prisma.organization.create({
          data: { name: dto.orgName },
        })
      : null;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        role: dto.role ?? Role.VIEWER,
        orgId: org?.id ?? null,
      },
    });

    const payload = this.buildPayload(user);
    return {
      user: this.sanitizeUser(user),
      accessToken: this.jwtService.sign(payload),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = this.buildPayload(user);
    return {
      user: this.sanitizeUser(user),
      accessToken: this.jwtService.sign(payload),
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.sanitizeUser(user);
  }

  private buildPayload(user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    orgId: string | null;
  }) {
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
    };
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    orgId: string | null;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
  }) {
    const { passwordHash, resetToken, ...safe } = user as any;
    return safe;
  }
}