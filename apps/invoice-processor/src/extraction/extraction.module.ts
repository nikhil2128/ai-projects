import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractionService } from './extraction.service';
import { EXTRACTION_STRATEGY } from './interfaces';
import { RegexExtractionStrategy } from './strategies/regex-extraction.strategy';
import { OpenAIExtractionStrategy } from './strategies/openai-extraction.strategy';

@Module({
  providers: [
    ExtractionService,
    {
      provide: EXTRACTION_STRATEGY,
      useFactory: (configService: ConfigService) => {
        const strategy = configService.get<string>('EXTRACTION_STRATEGY', 'regex');

        if (strategy === 'openai') {
          return new OpenAIExtractionStrategy(configService);
        }

        return new RegexExtractionStrategy();
      },
      inject: [ConfigService],
    },
  ],
  exports: [ExtractionService],
})
export class ExtractionModule {}
