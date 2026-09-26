import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, ExtractedMetadata } from '../ai.types.js';

@Injectable()
export class OllamaProvider implements AiProvider {
  private readonly logger = new Logger(OllamaProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl() {
    return this.config.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
  }

  private get model() {
    return this.config.get<string>('OLLAMA_MODEL', 'llama3.2');
  }

  async extract(text: string, title?: string): Promise<ExtractedMetadata> {
    const prompt = `You are a contract intelligence engine. Analyze the following contract text and return ONLY a valid JSON object with exactly this schema:
{
  "parties": [{"name": "string", "role": "string"}],
  "extractedDates": {"effectiveDate": "string|null", "expiryDate": "string|null", "duration": "string|null"},
  "value": "number|null",
  "currency": "string|null",
  "jurisdiction": "string|null",
  "governingLaw": "string|null",
  "liability": "string|null",
  "indemnity": "string|null",
  "confidentiality": "string|null",
  "ipOwnership": "string|null",
  "termination": "string|null",
  "renewal": "string|null",
  "sla": "string|null",
  "obligations": ["string"],
  "riskScore": 0,
  "riskFlags": ["string"],
  "summary": "string"
}
Contract title (if known): ${title ?? 'unknown'}
Contract text:
"""${text.slice(0, 12000)}"""

Return only JSON.`;

    const response = await this.callOllama(prompt);
    return this.parseJson(response);
  }

  async summarize(text: string): Promise<string> {
    const prompt = `Summarize this contract in 3-4 sentences covering parties, term, value and key obligations:\n"""${text.slice(0, 6000)}"""`;
    return (await this.callOllama(prompt)).trim();
  }

  private async callOllama(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { response?: string };
    return data.response ?? '';
  }

  private parseJson(text: string): ExtractedMetadata {
    try {
      const json = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const start = json.indexOf('{');
      const end = json.lastIndexOf('}');
      return JSON.parse(json.slice(start, end + 1));
    } catch {
      this.logger.warn('Failed to parse Ollama JSON response');
      throw new Error('Could not parse AI response');
    }
  }
}