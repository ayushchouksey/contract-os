import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import {
  AddCommentDto,
  AddVersionDto,
  CreateContractDto,
  ListContractsQueryDto,
  UpdateContractDto,
} from './dto/contract.dto.js';
import { ContractStatus, Prisma, Role } from '@prisma/client';
import { } from '../common/decorators/current-user.decorator.js';
import { NotificationService } from '../notifications/notification.service.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async create(dto: CreateContractDto, user: AuthUser) {
    const count = await this.prisma.contract.count();
    const year = new Date().getFullYear();
    const contractNo = `CON-${year}-${String(count + 1).padStart(4, '0')}`;

    const ownerId = dto.ownerId ?? user.id;

    const contract = await this.prisma.contract.create({
      data: {
        contractNo,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status: dto.status ?? ContractStatus.DRAFT,
        priority: dto.priority,
        counterpartyName: dto.counterpartyName,
        counterpartyEmail: dto.counterpartyEmail,
        entity: dto.entity,
        subsidiary: dto.subsidiary,
        value: dto.value,
        currency: dto.currency ?? 'INR',
        tenureYears: dto.tenureYears,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : undefined,
        autoRenews: dto.autoRenews,
        jurisdiction: dto.jurisdiction,
        governingLaw: dto.governingLaw,
        businessJustification: dto.businessJustification,
        requestTrackingNumber: dto.requestTrackingNumber,
        ownerId,
        createdById: user.id,
        templateId: dto.templateId,
        parentContractId: dto.parentContractId,
        orgId: user.orgId!,
        versions: {
          create: {
            version: 1,
            name: 'v1.0',
            summary: 'Contract created',
            createdById: user.id,
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        versions: { orderBy: { version: 'desc' } },
        metadata: true,
      },
    });

    // Notify owner if different from creator
    if (ownerId !== user.id) {
      await this.notifications.create({
        userId: ownerId,
        title: 'New contract assigned',
        body: `${contract.contractNo} - ${contract.title} has been assigned to you.`,
        type: 'CONTRACT',
        entityType: 'contract',
        entityId: contract.id,
      });
    }

    return contract;
  }

  async findAll(query: ListContractsQueryDto, user: AuthUser) {
    const where: Prisma.ContractWhereInput = {};

    if (user.orgId) where.orgId = user.orgId;

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    if (query.expiringSoon) {
      const soon = new Date();
      soon.setMonth(soon.getMonth() + 3);
      where.OR = [
        { renewalDate: { lte: soon, gte: new Date() } },
        { endDate: { lte: soon, gte: new Date() } },
      ];
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { contractNo: { contains: query.search, mode: 'insensitive' } },
        { counterpartyName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true, role: true } },
          metadata: true,
          _count: {
            select: { versions: true, documents: true, approvals: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: query.skip ?? 0,
        take: query.take ?? 50,
      }),
      this.prisma.contract.count({ where }),
    ]);

    return { items, total };
  }

  async findOne(id: string, user: AuthUser) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        versions: {
          orderBy: { version: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: { select: { id: true, name: true } },
          },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          include: {
            approver: { select: { id: true, name: true, email: true, role: true } },
            step: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        metadata: true,
        template: true,
        parentContract: {
          select: { id: true, contractNo: true, title: true },
        },
        childContracts: {
          select: { id: true, contractNo: true, title: true, status: true },
        },
      },
    });

    if (!contract) throw new NotFoundException('Contract not found');

    if (
      user.orgId &&
      contract.orgId !== user.orgId &&
      user.role !== 'SUPER_ADMIN'
    ) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  async update(id: string, dto: UpdateContractDto, user: AuthUser) {
    await this.findOne(id, user);

    const previous = await this.prisma.contract.findUnique({ where: { id } });

    const contract = await this.prisma.contract.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : undefined,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        versions: { orderBy: { version: 'desc' } },
        metadata: true,
      },
    });

    // Auto add a version entry when status or content changes
    const didChangeStatus = previous && previous.status !== dto.status;
    if (didChangeStatus) {
      const latest = await this.prisma.contractVersion.findFirst({
        where: { contractId: id },
        orderBy: { version: 'desc' },
      });
      await this.prisma.contractVersion.create({
        data: {
          contractId: id,
          version: (latest?.version ?? 0) + 1,
          name: `Status → ${dto.status}`,
          summary: `Status changed from ${previous.status} to ${dto.status}`,
          changes: { status: { from: previous.status, to: dto.status } },
          createdById: user.id,
        },
      });
    }

    return contract;
  }

  async addVersion(id: string, dto: AddVersionDto, user: AuthUser) {
    await this.findOne(id, user);
    const latest = await this.prisma.contractVersion.findFirst({
      where: { contractId: id },
      orderBy: { version: 'desc' },
    });

    const version = await this.prisma.contractVersion.create({
      data: {
        contractId: id,
        version: (latest?.version ?? 0) + 1,
        name: dto.name ?? `v${(latest?.version ?? 0) + 1}`,
        summary: dto.summary,
        content: dto.content,
        changes: dto.changes as Prisma.InputJsonValue,
        createdById: user.id,
      },
    });

    return version;
  }

  async listVersions(id: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.contractVersion.findMany({
      where: { contractId: id },
      orderBy: { version: 'desc' },
      include: {
        // no relations to include
      },
    });
  }

  async addComment(id: string, dto: AddCommentDto, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.comment.create({
      data: {
        contractId: id,
        userId: user.id,
        content: dto.content,
        parentId: dto.parentId,
        mentions: dto.mentions ?? [],
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async resolveComment(id: string, commentId: string, user: AuthUser) {
    await this.findOne(id, user);
    return this.prisma.comment.update({
      where: { id: commentId },
      data: { resolved: true },
    });
  }

  async getRelatedEntities(id: string, user: AuthUser) {
    const contract = await this.findOne(id, user);
    return this.prisma.contract.findMany({
      where: {
        OR: [
          { counterpartyName: contract.counterpartyName },
          { parentContractId: id },
          { id: contract.parentContractId ?? undefined },
          { entity: contract.entity ?? undefined },
        ],
      },
      select: {
        id: true,
        contractNo: true,
        title: true,
        status: true,
        type: true,
        counterpartyName: true,
        entity: true,
      },
      take: 25,
    }).then((rows) => rows.filter((row) => row.id !== id));
  }

  async remove(id: string, user: AuthUser) {
    await this.findOne(id, user);
    await this.prisma.contract.delete({ where: { id } });
    return { success: true };
  }

  async getDashboardStats(user: AuthUser) {
    const orgWhere: Prisma.ContractWhereInput = user.orgId
      ? { orgId: user.orgId }
      : {};

    const [total, drafts, pendingApproval, executed, expiring, renewedSoon] =
      await Promise.all([
        this.prisma.contract.count({ where: orgWhere }),
        this.prisma.contract.count({
          where: { ...orgWhere, status: ContractStatus.DRAFT },
        }),
        this.prisma.contract.count({
          where: { ...orgWhere, status: ContractStatus.PENDING_APPROVAL },
        }),
        this.prisma.contract.count({
          where: { ...orgWhere, status: ContractStatus.EXECUTED },
        }),
        this.prisma.contract.count({
          where: {
            ...orgWhere,
            renewalDate: { lte: this.addMonths(new Date(), 3), gte: new Date() },
          },
        }),
        this.prisma.contract.count({
          where: {
            ...orgWhere,
            OR: [
              { renewalDate: { lte: this.addMonths(new Date(), 6), gte: new Date() } },
              { endDate: { lte: this.addMonths(new Date(), 6), gte: new Date() } },
            ],
          },
        }),
      ]);

    const pendingApprovals = user.orgId
      ? await this.prisma.approval.findMany({
          where: {
            status: 'PENDING',
            OR: [
              { approverId: user.id },
              { approverRole: user.role as Role },
            ],
          },
          include: {
            contract: {
              select: { id: true, contractNo: true, title: true, type: true },
            },
            step: true,
          },
          orderBy: { createdAt: 'asc' },
          take: 20,
        })
      : [];

    const recent = await this.prisma.contract.findMany({
      where: orgWhere,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        contractNo: true,
        title: true,
        status: true,
        type: true,
        counterpartyName: true,
        value: true,
        currency: true,
        createdAt: true,
      },
    });

    return {
      total,
      drafts,
      pendingApproval,
      executed,
      expiring,
      renewedSoon,
      pendingApprovals,
      recent,
    };
  }

  private addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }
}