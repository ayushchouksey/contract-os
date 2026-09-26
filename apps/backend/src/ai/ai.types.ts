export interface ExtractedMetadata {
  parties: Array<{ name: string; role: string } | string>;
  extractedDates: {
    effectiveDate?: string;
    expiryDate?: string;
    duration?: string;
  };
  value?: string;
  currency?: string;
  jurisdiction?: string;
  governingLaw?: string;
  liability?: string;
  indemnity?: string;
  confidentiality?: string;
  ipOwnership?: string;
  termination?: string;
  renewal?: string;
  sla?: string;
  obligations: string[];
  riskScore: number;
  riskFlags: string[];
  summary: string;
}

export interface AiProvider {
  extract(text: string, title?: string): Promise<ExtractedMetadata>;
  summarize(text: string): Promise<string>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');