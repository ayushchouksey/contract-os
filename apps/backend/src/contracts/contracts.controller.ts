import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContractsService } from './contracts.service.js';
import {
  AddCommentDto,
  AddVersionDto,
  CreateContractDto,
  ListContractsQueryDto,
  UpdateContractDto,
} from './dto/contract.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  create(@Body() dto: CreateContractDto, @CurrentUser() user: AuthUser) {
    return this.contractsService.create(dto, user);
  }

  @Get()
  findAll(
    @Query() query: ListContractsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.findAll(query, user);
  }

  @Get('dashboard/stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.contractsService.getDashboardStats(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.remove(id, user);
  }

  @Post(':id/versions')
  addVersion(
    @Param('id') id: string,
    @Body() dto: AddVersionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.addVersion(id, dto, user);
  }

  @Get(':id/versions')
  listVersions(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.listVersions(id, user);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.addComment(id, dto, user);
  }

  @Patch(':id/comments/:commentId/resolve')
  resolveComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.contractsService.resolveComment(id, commentId, user);
  }

  @Get(':id/related')
  related(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.contractsService.getRelatedEntities(id, user);
  }
}