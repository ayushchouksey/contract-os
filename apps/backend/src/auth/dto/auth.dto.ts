import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  orgName?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}