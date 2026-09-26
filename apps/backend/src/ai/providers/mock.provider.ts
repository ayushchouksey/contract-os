import { Injectable } from '@nestjs/common';
import { AiProvider, ExtractedMetadata } from '../ai.types.js';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];
const CURRENCY_SYMBOLS = ['₹', '$', '€', '£'];

@Injectable()
export class MockAiProvider implements AiProvider {
  async extract(text: string, title?: string): Promise<ExtractedMetadata> {
    const clean = text.replace(/\r\n/g, '\n');

    const parties = this.extractParties(clean);
    const dates = this.extractDates(clean);
    const [value, currency] = this.extractValue(clean);
    const governingLaw = this.extractGoverningLaw(clean);
    const summary = await this.summarize(clean, title);

    const liability = this.extractSection(clean, [
      'liability',
      'limitat',
      'cap',
    ]);
    const indemnity = this.extractSection(clean, ['indemnif', 'indemnity']);
    const confidentiality = this.extractSection(clean, [
      'confidential',
      'non-disclosure',
    ]);
    const ipOwnership = this.extractSection(clean, [
      'intellectual propert',
      'ownership',
      'as between the parties',
    ]);
    const termination = this.extractSection(clean, ['terminat']);
    const renewal = this.extractSection(clean, ['renew']);
    const sla = this.extractSection(clean, [
      'service level',
      'sla',
      'uptime',
    ]);

    const obligations = this.extractObligations(clean);
    const riskFlags = this.computeRiskFlags(clean, {
      liability,
      limitationSection: this.findSection(clean, 'limitation of liability'),
    });

    const riskScore = this.computeRiskScore(riskFlags);

    return {
      parties,
      extractedDates: dates,
      value: value ? `${value.toLocaleString('en-IN')}` : undefined,
      currency,
      jurisdiction: undefined,
      governingLaw,
      liability,
      indemnity,
      confidentiality,
      ipOwnership,
      termination,
      renewal,
      sla,
      obligations,
      riskScore,
      riskFlags,
      summary,
    };
  }

  async summarize(text: string, title?: string): Promise<string> {
    const clean = text.replace(/\r\n/g, ' ').replace(/\s+/g, ' ').trim();
    const firstParty = this.extractParties(clean)[0] as
      | { name: string }
      | string
      | undefined;
    const partyLabel =
      typeof firstParty === 'object' ? firstParty?.name : firstParty;

    const dates = this.extractDates(clean);
    const [value] = this.extractValue(clean);
    const gov = this.extractGoverningLaw(clean);

    const parts: string[] = [];
    parts.push(
      `This contract${title ? ` (${title})` : ''} involves${
        partyLabel ? ` ${partyLabel}` : ' the identified parties'
      }.`,
    );
    if (dates.effectiveDate)
      parts.push(`Effective from ${dates.effectiveDate}.`);
    if (gov) parts.push(`Governed by ${gov} law.`);
    if (value)
      parts.push(
        `The stated contract value is approximately ${value.toLocaleString(
          'en-IN',
        )}${this.extractValue(clean)[1] ?? ' INR'}.`,
      );

    return parts.join('\n');
  }

  // ------------------------------------------------------------------
  private extractParties(text: string): Array<{ name: string; role: string }> {
    const parties: Array<{ name: string; role: string }> = [];
    const patterns = [
      /between\s+([A-Z][A-Za-z0-9&\s.,'-]{3,60})\s+\(*([^()\n]{2,40})*\)*\s*and\s+([A-Z][A-Za-z0-9&\s.,'-]{3,60})/i,
      /(?:^|\n){0,1}\s*([A-Z][A-Za-z0-9&\s.,'-]{3,60})\s*\(?\s*(?:hereafter|a company incorporated|a corporation|an entity)/i,
    ];

    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        parties.push({ name: m[1].trim(), role: 'first-party' });
        if (m[3]) parties.push({ name: m[3].trim(), role: 'counterparty' });
        break;
      }
    }

    if (parties.length === 0) {
      const companyMatches =
        text.match(
          /([A-Z][A-Za-z0-9&]+(?:\s+(?:Technologies|Solutions|Services|Systems|Limited|Ltd|LLC|Inc|Corporation|Corp|Pvt|P\.?L\.?C|Analytics|Ventures|Properties|Info[rs]?match|Spark)){0,4})/g,
        ) ?? [];
      if (companyMatches.length) {
        const seen = new Set<string>();
        for (const name of companyMatches.slice(0, 4)) {
          if (!seen.has(name)) {
            seen.add(name);
            parties.push({
              name,
              role: parties.length === 0 ? 'first-party' : 'counterparty',
            });
          }
        }
      }
    }

    return parties;
  }

  private extractDates(text: string) {
    const result: {
      effectiveDate?: string;
      expiryDate?: string;
      duration?: string;
    } = {};

    const datePatterns = [
      /as of\s+([A-Z][a-z]+ \d{1,2},? \d{4})/i,
      /(?:effective|commencement|dated)\s+(?:as of|day of)?\s*([A-Z][a-z]+ \d{1,2},? \d{4}|[A-Z][a-z]+ \d{1,2}(?:nd|st|rd|th),? \d{4})/i,
      /on this\s+(\d{1,2}(?:st|nd|rd|th)?\s+day of\s+[A-Z][a-z]+,\s+\d{4})/i,
    ];

    for (const p of datePatterns) {
      const m = text.match(p);
      if (m && !result.effectiveDate) {
        result.effectiveDate = m[1].replace(/,?/g, '').trim();
      }
    }

    const expiryPatterns = [
      /(?:expires|expiry|expiration|terminat)\w*\s*(?:on|date)?\s*:?\s*([A-Z][a-z]+ \d{1,2},? \d{4})/i,
      /period of\s+(\d+\s+(?:months|years|days|weeks))/i,
      /for a term of\s+(\d+\s+(?:months|years|days|weeks))/i,
      /effective for\s+(\d+\s+(?:months|years|days|weeks))/i,
    ];
    for (const p of expiryPatterns) {
      const m = text.match(p);
      if (m) {
        if (/\d/.test(m[1]) && /months|years|days|weeks/i.test(m[1])) {
          result.duration = m[1];
        } else {
          result.expiryDate = m[1];
        }
      }
    }

    return result;
  }

  private extractValue(text: string): [number | undefined, string?] {
    const patterns = [
      /(?:total|aggregate|contract|agreement|sum|value|consideration|annual|fees?)\s+(?:value\s+of)?\s*(?:amount of)?\s*(\₹|Rs\.?|USD|INR|\$|EUR|€|£)?\s*([0-9][0-9,.]*(?:\s*(?:million|billion|crore|lakh))?(?:\s*(?:INR|USD|EUR|GBP|AED))?)/i,
      /(\₹|Rs\.?|USD|INR|\$|EUR|€|£)\s*([0-9][0-9,.]*)/i,
      /([0-9][0-9,.]*)\s*(?:INR|USD|EUR|GBP)/i,
    ];

    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        const symbol = (m[1] ?? '').replace(/\./g, '');
        let currency = CURRENCIES.find((c) =>
          symbol.toUpperCase().includes(c),
        );
        let raw = m[2] ?? m[0];
        if (!currency) {
          if (symbol.includes('₹') || symbol === 'Rs') currency = 'INR';
          else if (symbol === '$') currency = 'USD';
          else if (symbol.includes('€')) currency = 'EUR';
          else if (symbol.includes('£')) currency = 'GBP';
        }
        const multiplierMatch = raw.match(/(crore|lakh|million|billion)/i);
        raw = raw.replace(/[^\d.,]/g, '');
        let num = parseFloat(raw.replace(/,/g, ''));
        if (multiplierMatch) {
          const mult = multiplierMatch[1].toLowerCase();
          if (mult === 'crore') num *= 1e7;
          else if (mult === 'lakh') num *= 1e5;
          else if (mult === 'million') num *= 1e6;
          else if (mult === 'billion') num *= 1e9;
        }
        if (!isNaN(num) && num > 0) return [num, currency ?? 'INR'];
      }
    }
    return [undefined, undefined];
  }

  private extractGoverningLaw(text: string): string | undefined {
    const patterns = [
      /governed by and construed in accordance with the laws of\s+([^.]+)\./i,
      /governed by the laws of\s+([^.;]+)/i,
      /jurisdiction of\s+([^.;]+?)(?: courts| india)?/i,
      /laws of\s+([A-Z][a-zA-Z\s]+)/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m && m[1].trim().length < 60) return m[1].trim();
    }
    return undefined;
  }

  private findSection(text: string, heading: string): string | undefined {
    const re = new RegExp(
      `(?:^|\\n)\\s*\\d*\\.?\\s*${heading}[^\n]*\\n([^]+?)(?=\\n\\s*\\d+\\.|\\n+\\s*[A-Z][^a-z]{0,20}\\n|$)`,
      'i',
    );
    const m = text.match(re);
    if (!m || !m[1] || m[1].trim().length < 10) return undefined;
    const lines = m[1]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.slice(0, 6).join('\n');
  }

  private extractSection(
    text: string,
    keywords: string[],
  ): string | undefined {
    const anyKeyword = keywords.join('|');
    const re = new RegExp(
      `(?:^|\\n)\\s*\\d*\\.?\\s*[^\\n]{0,40}(?:${anyKeyword})[^\\n]{0,60}\\n([^]+?)(?=\\n\\s*\\d+\\.|\\n+\\s*[A-Z][^a-z]{0,20}\\n|$)`,
      'i',
    );
    const m = text.match(re);
    if (!m || !m[1] || m[1].trim().length < 10) return undefined;
    const lines = m[1]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.slice(0, 4).join('\n');
  }

  private extractObligations(text: string): string[] {
    const obligations: string[] = [];
    const patterns = [
      /(?:shall|must)\s+provide\s+([^.;\n]{8,120})/gi,
      /(?:obligat\w+\s*(?:of|to)\s*\w+)?\s*(?:shall|will)\s+(?:deliver|submit|furnish|comply with)\s+([^.;\n]{8,120})/gi,
      /(?:within)\s+(\d+\s+(?:days|business days|weeks))\s*[^.;\n]{0,80}/gi,
    ];
    for (const p of patterns) {
      const matches = text.matchAll(p);
      for (const m of matches) {
        const obligation = m[1].trim();
        if (
          obligation.length > 10 &&
          obligation.length < 140 &&
          !obligations.includes(obligation) &&
          !/the (?:failure|provisions|term|party)/i.test(obligation)
        ) {
          obligations.push(obligation.charAt(0).toUpperCase() + obligation.slice(1));
        }
        if (obligations.length >= 8) break;
      }
      if (obligations.length >= 8) break;
    }
    return obligations;
  }

  private computeRiskFlags(
    text: string,
    opts: { liability?: string; limitationSection?: string },
  ): string[] {
    const flags: string[] = [];
    const lower = text.toLowerCase();

    if (/unlimited\s+liabilit/i.test(lower)) flags.push('Unlimited liability');
    if (/no\s+limitation|without\s+limit/i.test(lower))
      flags.push('No limitation of liability');

    if (/indemnif/i.test(lower) && /defend|indemnif|hold\s+harmless/i.test(lower)) {
      if (/unlimited|on\s?demand|first-?party/i.test(lower))
        flags.push('Broad indemnity obligation');
    }

    if (opts.limitationSection && /\b(minimum|at least)\b/i.test(opts.limitationSection)) {
      // no flag
    } else if (!/liability/i.test(lower)) {
      flags.push('No limitation of liability clause detected');
    }

    if (/ai|machine learning|generative/i.test(lower) && !/do not\s+use/i.test(lower))
      flags.push('AI usage not restricted');

    return flags.slice(0, 6);
  }

  private computeRiskScore(flags: string[]): number {
    if (flags.length === 0) return 0;
    return Math.min(flags.length * 25, 100);
  }
}