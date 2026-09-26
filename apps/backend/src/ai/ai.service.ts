import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service.js';
import { AI_PROVIDER } from './ai.types.js';
import type { AiProvider, ExtractedMetadata } from './ai.types.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  getProviderName() {
    return this.config.get<string>('AI_PROVIDER', 'mock');
  }

  async extractFromText(text: string, title?: string) {
    const result = await this.provider.extract(text, title);
    return { ...result, provider: this.getProviderName() };
  }

  async extractContract(contractId: string, text?: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { metadata: true, versions: { orderBy: { version: 'desc' } } },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    const content =
      text ?? contract.versions[0]?.content ?? undefined;

    if (!content || content.trim().length < 20) {
      throw new NotFoundException(
        'No contract content available for extraction. Add a document or version first.',
      );
    }

    // Update extraction status to processing
    const existing = contract.metadata;
    const metadata = existing
      ? await this.prisma.contractMetadata.update({
          where: { contractId },
          data: { extractionStatus: 'PROCESSING' },
        })
      : await this.prisma.contractMetadata.create({
          data: {
            contractId,
            extractionStatus: 'PROCESSING',
          },
        });

    try {
      const extracted: ExtractedMetadata = await this.provider.extract(
        content,
        contract.title,
      );

      // Map extracted metadata onto the contract entity where it makes sense
      const updateData: Record<string, unknown> = {};
      if (extracted.value) updateData.value = extracted.value;
      if (extracted.currency) updateData.currency = extracted.currency;
      if (extracted.governingLaw)
        updateData.governingLaw = extracted.governingLaw;
      if (extracted.extractedDates.effectiveDate)
        updateData.startDate = new Date(extracted.extractedDates.effectiveDate);
      if (extracted.extractedDates.expiryDate)
        updateData.endDate = new Date(extracted.extractedDates.expiryDate);

      if (Object.keys(updateData).length > 0) {
        await this.prisma.contract.update({
          where: { id: contractId },
          data: updateData,
        });
      }

      const saved = await this.prisma.contractMetadata.update({
        where: { id: metadata.id },
        data: {
          parties: extracted.parties as any,
          extractedDates: extracted.extractedDates as any,
          liability: extracted.liability,
          indemnity: extracted.indemnity,
          confidentiality: extracted.confidentiality,
          ipOwnership: extracted.ipOwnership,
          termination: extracted.termination,
          renewal: extracted.renewal,
          sla: extracted.sla,
          obligations: extracted.obligations as any,
          riskScore: extracted.riskScore,
          riskFlags: extracted.riskFlags as any,
          summary: extracted.summary,
          extractionStatus: 'COMPLETED',
          extractedAt: new Date(),
        },
      });

      return {
        contractId,
        provider: this.getProviderName(),
        metadata: saved,
        extracted,
      };
    } catch (error) {
      await this.prisma.contractMetadata.update({
        where: { id: metadata.id },
        data: { extractionStatus: 'FAILED' },
      });
      this.logger.error(`Extraction failed for contract ${contractId}`, error);
      throw error;
    }
  }

  async getExtractionStatus(contractId: string) {
    const metadata = await this.prisma.contractMetadata.findUnique({
      where: { contractId },
    });
    return {
      contractId,
      status: metadata?.extractionStatus ?? 'NOT_STARTED',
      metadata,
    };
  }

  async analyzePortfolio(user: AuthUser) {
    const orgWhere: Record<string, unknown> = user.orgId
      ? { orgId: user.orgId }
      : {};

    const [total, withMetadata, risky, expiring] = await Promise.all([
      this.prisma.contract.count({ where: orgWhere }),
      this.prisma.contractMetadata.count({
        where: {
          contract: orgWhere,
          extractionStatus: 'COMPLETED',
        },
      }),
      this.prisma.contractMetadata.count({
        where: {
          contract: orgWhere,
          riskScore: { gte: 50 },
        },
      }),
      this.prisma.contract.count({
        where: {
          ...orgWhere,
          OR: [
            { renewalDate: { lte: this.addMonths(new Date(), 3) } },
            { endDate: { lte: this.addMonths(new Date(), 3) } },
          ],
        },
      }),
    ]);

    const risks = await this.prisma.contract.findMany({
      where: {
        ...orgWhere,
        metadata: { riskScore: { gte: 50 } },
      },
      select: {
        id: true,
        contractNo: true,
        title: true,
        type: true,
        metadata: {
          select: { riskScore: true, riskFlags: true, summary: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return {
      coverage: {
        total,
        analyzed: withMetadata,
        pct: total > 0 ? Math.round((withMetadata / total) * 100) : 0,
      },
      highRisk: risky,
      expiringWithin90Days: expiring,
      topRisks: risks,
    };
  }

  private addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }
}