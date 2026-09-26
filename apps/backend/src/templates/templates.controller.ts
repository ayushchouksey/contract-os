import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TemplatesService } from './templates.service.js';
import {
  CreateClauseDto,
  CreateTemplateDto,
  RenderContractDto,
  UpdateTemplateDto,
} from './dto/template.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller()
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  // Templates
  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto, @CurrentUser() user: AuthUser) {
    return this.templatesService.createTemplate(dto, user);
  }

  @Get('templates')
  listTemplates(
    @CurrentUser() user: AuthUser,
    @Query('category') category?: string,
  ) {
    return this.templatesService.listTemplates(user, category);
  }

  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.templatesService.getTemplate(id);
  }

  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.templatesService.deleteTemplate(id);
  }

  @Post('templates/render')
  renderAndCreate(
    @Body() dto: RenderContractDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.templatesService.renderAndCreateContract(dto, user);
  }

  @Post('templates/:id/parse-variables')
  parseVariables(@Param('id') id: string) {
    return this.templatesService
      .getTemplate(id)
      .then((t) => ({ variables: this.templatesService.parseVariables(t.content) }));
  }

  // Clauses
  @Post('clauses')
  createClause(@Body() dto: CreateClauseDto, @CurrentUser() user: AuthUser) {
    return this.templatesService.createClause(dto, user);
  }

  @Get('clauses')
  listClauses(
    @CurrentUser() user: AuthUser,
    @Query('category') category?: string,
  ) {
    return this.templatesService.listClauses(user, category);
  }

  @Patch('clauses/:id')
  updateClause(
    @Param('id') id: string,
    @Body() dto: Partial<CreateClauseDto>,
  ) {
    return this.templatesService.updateClause(id, dto);
  }

  @Delete('clauses/:id')
  deleteClause(@Param('id') id: string) {
    return this.templatesService.deleteClause(id);
  }
}