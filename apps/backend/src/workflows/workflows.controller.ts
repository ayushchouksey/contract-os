import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service.js';
import { CreateWorkflowDto, ApproveDto } from './dto/workflow.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  create(@Body() dto: CreateWorkflowDto, @CurrentUser() user: AuthUser) {
    return this.workflowsService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.workflowsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.workflowsService.findOne(id, user);
  }

  @Post('/contracts/:contractId/init')
  initWorkflow(
    @Param('contractId') contractId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workflowsService.initWorkflow(contractId, user);
  }

  @Get('/contracts/:contractId/approvals')
  getApprovals(@Param('contractId') contractId: string) {
    return this.workflowsService.getContractApprovals(contractId);
  }

  @Put('/contracts/:contractId/approvals/:approvalId/approve')
  approve(
    @Param('contractId') contractId: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: ApproveDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workflowsService.approve(contractId, approvalId, dto, user);
  }

  @Put('/contracts/:contractId/approvals/:approvalId/reject')
  reject(
    @Param('contractId') contractId: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: ApproveDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workflowsService.reject(contractId, approvalId, dto, user);
  }
}