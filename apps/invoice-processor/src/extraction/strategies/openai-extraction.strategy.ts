import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as pdfParse from 'pdf-parse';
import OpenAI from 'openai';
import { ExtractionResult, ExtractionStrategy } from '../interfaces';

/**
 * OpenAI LLM-based extraction strategy.
 *
 * Parses PDF text content, sends it to an LLM with a structured
 * prompt, and parses the JSON response. Much more accurate than
 * regex for varied invoice formats.
 *
 * Requires OPENAI_API_KEY in environment.
 */
@Injectable()
export class OpenAIExtractionStrategy implements ExtractionStrategy {
  private readonly logger = new Logger(OpenAIExtractionStrategy.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAI extraction strategy');
    }
    this.client = new OpenAI({ apiKey });
    this.model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
  }

  async extract(pdfBuffer: Buffer): Promise<ExtractionResult> {
    const parsed = await pdfParse(pdfBuffer);
    const text = parsed.text;

    this.logger.debug(`Extracted ${text.length} chars from PDF, sending to OpenAI`);

    // Truncate very long documents to stay within token limits
    const truncatedText = text.substring(0, 8000);

    const systemPrompt = `You are an invoice data extraction assistant. Extract structured data from invoice text.
Always respond with valid JSON only, no markdown formatting.
Use null for fields you cannot find. Dates should be in YYYY-MM-DD format.
Amounts should be numbers without currency symbols.`;

    const userPrompt = `Extract the following fields from this invoice text:
- vendorName: The name of the company/vendor issuing the invoice
- amount: The total amount due (number)
- tax: The tax amount (number)
- dueDate: The payment due date (YYYY-MM-DD format)
- confidence: Your confidence in the extraction accuracy (0.0 to 1.0)

Invoice text:
---
${truncatedText}
---

Respond with JSON only:
{"vendorName": "...", "amount": ..., "tax": ..., "dueDate": "...", "confidence": ...}`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    this.logger.debug(`OpenAI response: ${content}`);

    const extracted = JSON.parse(content);

    return {
      vendorName: typeof extracted.vendorName === 'string' ? extracted.vendorName : null,
      amount: typeof extracted.amount === 'number' ? extracted.amount : null,
      tax: typeof extracted.tax === 'number' ? extracted.tax : null,
      dueDate: typeof extracted.dueDate === 'string' ? extracted.dueDate : null,
      confidence: typeof extracted.confidence === 'number' ? extracted.confidence : 0.5,
      rawText: text.substring(0, 5000),
    };
  }
}
