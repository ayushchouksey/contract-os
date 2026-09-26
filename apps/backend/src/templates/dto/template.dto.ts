import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class RenderContractDto {
  @IsString()
  templateId: string;

  @IsObject()
  variables: Record<string, string>;

  @IsOptional()
  @IsString()
  title?: string;
}

export class CreateClauseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  content: string;
}