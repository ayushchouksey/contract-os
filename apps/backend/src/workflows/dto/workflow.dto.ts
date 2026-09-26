import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ContractType, Role, WorkflowStepType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateWorkflowStepDto {
  @IsString()
  name: string;

  @IsEnum(WorkflowStepType)
  type: WorkflowStepType;

  @IsInt()
  @Min(1)
  stepOrder: number;

  @IsOptional()
  @IsEnum(Role)
  approverRole?: Role;

  @IsOptional()
  @IsString()
  approverId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minApprovers?: number;

  @IsOptional()
  config?: Record<string, unknown>;
}

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ContractType)
  contractType: ContractType;

  steps: CreateWorkflowStepDto[];
}

export class ApproveDto {
  @IsOptional()
  @IsString()
  comment?: string;
}