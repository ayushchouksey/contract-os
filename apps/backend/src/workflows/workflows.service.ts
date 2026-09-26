import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CreateWorkflowDto, ApproveDto } from './dto/workflow.dto.js';
import { ApprovalStatus, ContractStatus, Prisma } from '@prisma/client';
import { } from '../common/decorators/current-user.decorator.js';
import { NotificationService } from '../notifications/notification.service.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async create(dto: CreateWorkflowDto, user: AuthUser) {
    return this.prisma.workflow.create({
      data: {
        name: dto.name,
        description: dto.description,
        contractType: dto.contractType,
        orgId: user.orgId,
        steps: {
          create: dto.steps.map((s) => ({
            name: s.name,
            type: s.type,
            stepOrder: s.stepOrder,
            approverRole: s.approverRole,
            approverId: s.approverId,
            minApprovers: s.minApprovers ?? 1,
            config: s.config as Prisma.InputJsonValue,
          })),
        },
      },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
      },
    });
  }

  async findAll(user: AuthUser) {
    return this.prisma.workflow.findMany({
      where: user.orgId ? { orgId: user.orgId } : {},
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async initWorkflow(contractId: string, user: AuthUser) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    const workflow = await this.prisma.workflow.findFirst({
      where: {
        contractType: contract.type,
        isActive: true,
        ...(contract.orgId ? { OR: [{ orgId: contract.orgId }, { orgId: null }] } : {}),
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    if (!workflow || workflow.steps.length === 0) {
      throw new BadRequestException('No workflow configured for this contract type');
    }

    // Remove existing pending approvals
    await this.prisma.approval.deleteMany({
      where: { contractId, status: ApprovalStatus.PENDING },
    });

    for (const step of workflow.steps) {
      // For approval steps without assigned users, find users with the role
      let approverId = step.approverId ?? null;
      if (!approverId && step.approverRole) {
        const approver = await this.prisma.user.findFirst({
          where: {
            role: step.approverRole,
            orgId: contract.orgId,
            isActive: true,
          },
        });
        approverId = approver?.id ?? null;
      }

      await this.prisma.approval.create({
        data: {
          contractId,
          stepId: step.id,
          stepName: step.name,
          approverId,
          approverRole: step.approverRole,
          status: ApprovalStatus.PENDING,
        },
      });

      if (approverId) {
        await this.notifications.create({
          userId: approverId,
          title: 'Approval required',
          body: `${contract.contractNo} - ${contract.title} requires your approval (${step.name}).`,
          type: 'APPROVAL',
          entityType: 'contract',
          entityId: contractId,
        });
      }
    }

    await this.prisma.contract.update({
      where: { id: contractId },
      data: { status: ContractStatus.PENDING_APPROVAL },
    });

    return this.getContractApprovals(contractId);
  }

  async getContractApprovals(contractId: string) {
    return this.prisma.approval.findMany({
      where: { contractId },
      include: {
        approver: { select: { id: true, name: true, email: true, role: true } },
        step: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(
    contractId: string,
    approvalId: string,
    dto: ApproveDto,
    user: AuthUser,
  ) {
    const approval = await this.prisma.approval.findFirst({
      where: { id: approvalId, contractId },
      include: { contract: true },
    });
    if (!approval) throw new NotFoundException('Approval not found');

    // Permission check: approver can act, or role matches
    const hasAccess =
      approval.approverId === user.id || approval.approverRole === user.role;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    if (!hasAccess && !isSuperAdmin) {
      throw new BadRequestException('You are not authorized to act on this approval');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('This approval has already been actioned');
    }

    const updated = await this.prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: ApprovalStatus.APPROVED,
        comment: dto.comment,
        approverId: user.id,
        signedAt: new Date(),
      },
    });

    // Check if all steps are complete
    const all = await this.getContractApprovals(contractId);
    const allComplete = all.every((a) => a.status !== ApprovalStatus.PENDING);

    if (allComplete) {
      const approvedAll = all.every(
        (a) => a.status === ApprovalStatus.APPROVED,
      );
      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          status: approvedAll ? ContractStatus.APPROVED : ContractStatus.REJECTED,
        },
      });

      const contract = await this.prisma.contract.findUnique({
        where: { id: contractId },
      });
      if (contract && contract.ownerId) {
        await this.notifications.create({
          userId: contract.ownerId,
          title: approvedAll ? 'Contract approved' : 'Contract rejected',
          body: `${contract.contractNo} - ${contract.title} has been ${
            approvedAll ? 'fully approved' : 'rejected'
          }.`,
          type: 'CONTRACT',
          entityType: 'contract',
          entityId: contractId,
        });
      }
    }

    return updated;
  }

  async reject(
    contractId: string,
    approvalId: string,
    dto: ApproveDto,
    user: AuthUser,
  ) {
    const approval = await this.prisma.approval.findFirst({
      where: { id: approvalId, contractId },
    });
    if (!approval) throw new NotFoundException('Approval not found');

    const hasAccess =
      approval.approverId === user.id || approval.approverRole === user.role;
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    if (!hasAccess && !isSuperAdmin) {
      throw new BadRequestException('You are not authorized to act on this approval');
    }

    const updated = await this.prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: ApprovalStatus.REJECTED,
        comment: dto.comment,
        approverId: user.id,
        signedAt: new Date(),
      },
    });

    await this.prisma.contract.update({
      where: { id: contractId },
      data: { status: ContractStatus.REJECTED },
    });

    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (contract && contract.ownerId) {
      await this.notifications.create({
        userId: contract.ownerId,
        title: 'Contract rejected',
        body: `${contract.contractNo} - ${contract.title} was rejected. Reason: ${dto.comment ?? 'No reason provided'}`,
        type: 'CONTRACT',
        entityType: 'contract',
        entityId: contractId,
      });
    }

    return updated;
  }
}