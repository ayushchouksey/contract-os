import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ContractStatus, ContractType, Priority } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateContractDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ContractType)
  type: ContractType;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsString()
  counterpartyName: string;

  @IsOptional()
  @IsString()
  counterpartyEmail?: string;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  subsidiary?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenureYears?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  renewalDate?: string;

  @IsOptional()
  @IsBoolean()
  autoRenews?: boolean;

  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsString()
  governingLaw?: string;

  @IsOptional()
  @IsString()
  businessJustification?: string;

  @IsOptional()
  @IsString()
  requestTrackingNumber?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  parentContractId?: string;

  @IsOptional()
  @IsArray()
  obligations?: any[];
}

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsString()
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  counterpartyEmail?: string;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  subsidiary?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tenureYears?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  renewalDate?: string;

  @IsOptional()
  @IsBoolean()
  autoRenews?: boolean;

  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsString()
  governingLaw?: string;

  @IsOptional()
  @IsString()
  businessJustification?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;
}

export class ListContractsQueryDto {
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsEnum(ContractType)
  type?: ContractType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  expiringSoon?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  take?: number;
}

export class AddVersionDto {
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsObject()
  changes?: Record<string, unknown>;
}

export class AddCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsArray()
  mentions?: string[];
}