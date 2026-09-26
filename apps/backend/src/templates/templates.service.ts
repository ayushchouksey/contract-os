import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import {
  CreateClauseDto,
  CreateTemplateDto,
  RenderContractDto,
  UpdateTemplateDto,
} from './dto/template.dto.js';
import { } from '../common/decorators/current-user.decorator.js';
import { ContractStatus, ContractType, Prisma } from '@prisma/client';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(dto: CreateTemplateDto, user: AuthUser) {
    return this.prisma.template.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        content: dto.content,
        variables: dto.variables ?? [],
        isDefault: dto.isDefault ?? false,
        orgId: user.orgId ?? undefined,
      },
    });
  }

  async listTemplates(user: AuthUser, category?: string) {
    const where: Prisma.TemplateWhereInput = user.orgId
      ? { OR: [{ orgId: user.orgId }, { orgId: null }] }
      : {};
    if (category) where.AND = [{ category }];
    return this.prisma.template.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async getTemplate(id: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    await this.getTemplate(id);
    return this.prisma.template.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
      },
    });
  }

  async deleteTemplate(id: string) {
    await this.getTemplate(id);
    await this.prisma.template.delete({ where: { id } });
    return { success: true };
  }

  parseVariables(content: string): string[] {
    const matches = content.match(/\{\{([^}]+)\}\}/g) ?? [];
    return [...new Set(matches.map((m) => m.slice(2, -2).trim()))];
  }

  render(content: string, variables: Record<string, string>): string {
    return content.replace(/\{\{([^}]+)\}\}/g, (match, key: string) => {
      const value = variables[key.trim()];
      if (value === undefined) {
        throw new BadRequestException(
          `Missing template variable: {{${key.trim()}}}`,
        );
      }
      return value;
    });
  }

  async renderAndCreateContract(dto: RenderContractDto, user: AuthUser) {
    const template = await this.getTemplate(dto.templateId);

    const rendered = this.render(template.content, dto.variables);

    const count = await this.prisma.contract.count();
    const year = new Date().getFullYear();
    const contractNo = `CON-${year}-${String(count + 1).padStart(4, '0')}`;

    const counterpartyName =
      dto.variables['PARTY_B'] ??
      dto.variables['CUSTOMER'] ??
      dto.variables['COUNTERPARTY'] ??
      'Counterparty';

    const contract = await this.prisma.contract.create({
      data: {
        contractNo,
        title: dto.title ?? template.name,
        type: this.guessContractType(template.category) as ContractType,
        status: ContractStatus.DRAFT,
        counterpartyName,
        orgId: user.orgId!,
        createdById: user.id,
        ownerId: user.id,
        templateId: template.id,
        versions: {
          create: {
            version: 1,
            name: 'v1.0',
            summary: 'Rendered from template',
            content: rendered,
            createdById: user.id,
          },
        },
      },
      include: {
        versions: { orderBy: { version: 'desc' } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return { contract, content: rendered };
  }

  private guessContractType(category?: string | null): ContractType {
    const map: Record<string, ContractType> = {
      NDA: ContractType.NDA,
      MSA: ContractType.MSA,
      SOW: ContractType.SOW,
      VENDOR: ContractType.VENDOR,
      PURCHASE: ContractType.PURCHASE,
      SALES: ContractType.SALES,
      LEASE: ContractType.LEASE,
      EMPLOYMENT: ContractType.EMPLOYMENT,
      AMENDMENT: ContractType.AMENDMENT,
    };
    if (!category) return ContractType.OTHER;
    return map[category.toUpperCase()] ?? ContractType.OTHER;
  }

  // ------------------------------------------------------------------
  // Clauses
  // ------------------------------------------------------------------

  async createClause(dto: CreateClauseDto, user: AuthUser) {
    return this.prisma.clause.create({
      data: {
        name: dto.name,
        category: dto.category,
        title: dto.title,
        content: dto.content,
        orgId: user.orgId ?? undefined,
      },
    });
  }

  async listClauses(user: AuthUser, category?: string) {
    const where: Prisma.ClauseWhereInput = user.orgId
      ? { OR: [{ orgId: user.orgId }, { orgId: null }] }
      : {};
    if (category) where.category = category;
    return this.prisma.clause.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async updateClause(id: string, dto: Partial<CreateClauseDto>) {
    const existing = await this.prisma.clause.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Clause not found');
    return this.prisma.clause.update({ where: { id }, data: dto });
  }

  async deleteClause(id: string) {
    await this.prisma.clause.update({ where: { id }, data: {} }).catch(() => {
      throw new NotFoundException('Clause not found');
    });
    await this.prisma.clause.delete({ where: { id } });
    return { success: true };
  }
}