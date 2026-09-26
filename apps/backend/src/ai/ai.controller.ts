import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service.js';
import { AI_PROVIDER } from './ai.types.js';
import { MockAiProvider } from './providers/mock.provider.js';
import { OllamaProvider } from './providers/ollama.provider.js';
import { CurrentUser, } from '../common/decorators/current-user.decorator.js';
import { IsOptional, IsString } from 'class-validator';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

class ExtractDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  title?: string;
}

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly config: ConfigService,
  ) {}

  @Post('extract')
  extractText(@Body() dto: ExtractDto) {
    return this.aiService.extractFromText(dto.text, dto.title);
  }

  @Post('contracts/:id/extract')
  extractContract(@Param('id') id: string, @Body() dto?: { text?: string }) {
    return this.aiService.extractContract(id, dto?.text);
  }

  @Get('contracts/:id/status')
  status(@Param('id') id: string) {
    return this.aiService.getExtractionStatus(id);
  }

  @Get('portfolio')
  portfolio(@CurrentUser() user: AuthUser) {
    return this.aiService.analyzePortfolio(user);
  }

  @Get('provider')
  provider() {
    return {
      provider: this.config.get<string>('AI_PROVIDER', 'mock'),
    };
  }
}