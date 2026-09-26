import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto.js';
import { CurrentUser, } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/auth.decorators.js';
import { Role } from '@prisma/client';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.usersService.create(dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.LEGAL)
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.usersService.findAll(user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}