import { Logger, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service.js';
import { AiController } from './ai.controller.js';
import { AI_PROVIDER } from './ai.types.js';
import { MockAiProvider } from './providers/mock.provider.js';
import { OllamaProvider } from './providers/ollama.provider.js';

const aiProviderFactory: Provider = {
  provide: AI_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const provider = config.get<string>('AI_PROVIDER', 'mock');
    if (provider === 'ollama') {
      return new OllamaProvider(config);
    }
    return new MockAiProvider();
  },
};

@Module({
  controllers: [AiController],
  providers: [aiProviderFactory, AiService],
  exports: [AiService],
})
export class AiModule {
  private readonly logger = new Logger(AiModule.name);

  constructor(config: ConfigService) {
    this.logger.log(
      `AI provider configured: ${config.get<string>('AI_PROVIDER', 'mock')}`,
    );
  }
}