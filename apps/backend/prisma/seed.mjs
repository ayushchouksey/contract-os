import { PrismaClient, Role, ContractStatus, ContractType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  const org = await prisma.organization.upsert({
    where: { id: 'org-demo' },
    update: {},
    create: {
      id: 'org-demo',
      name: 'Acme Corp Pvt Ltd',
      industry: 'Technology',
      country: 'India',
    },
  });

  const users = [
    { id: 'user-super', email: 'superadmin@acme.com', name: 'Super Admin', role: Role.SUPER_ADMIN },
    { id: 'user-admin', email: 'admin@acme.com', name: 'Admin User', role: Role.ADMIN },
    { id: 'user-legal', email: 'legal@acme.com', name: 'Legal Counsel', role: Role.LEGAL },
    { id: 'user-finance', email: 'finance@acme.com', name: 'Finance Head', role: Role.FINANCE },
    { id: 'user-procure', email: 'procurement@acme.com', name: 'Procurement Lead', role: Role.PROCUREMENT },
    { id: 'user-sales', email: 'sales@acme.com', name: 'Sales Rep', role: Role.SALES },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { email: u.email, name: u.name, role: u.role },
      create: {
        id: u.id,
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role,
        orgId: org.id,
      },
    });
  }

  // Default clauses library
  const clauses = [
    {
      name: 'Limitation of Liability',
      category: 'Liability',
      content:
        'Neither party shall be liable to the other for any indirect, incidental, special, consequential or punitive damages, or for any loss of profits, revenues, data or business opportunities, arising out of or in connection with this Agreement, regardless of the theory of liability. Each party\u2019s aggregate liability under this Agreement shall not exceed the total fees paid or payable by the Customer to the Provider during the twelve (12) months preceding the claim.',
    },
    {
      name: 'Confidentiality',
      category: 'Confidentiality',
      content:
        'Each party agrees to maintain the confidentiality of the other party\u2019s Confidential Information and shall not disclose it to any third party without the prior written consent of the disclosing party, except to the extent necessary to perform its obligations under this Agreement and to those of its representatives who have a need to know.',
    },
    {
      name: 'Governing Law & Jurisdiction',
      category: 'Legal',
      content:
        'This Agreement shall be governed by and construed in accordance with the laws of India. The courts at Bengaluru, Karnataka shall have exclusive jurisdiction over any disputes arising out of or in connection with this Agreement.',
    },
    {
      name: 'Termination for Convenience',
      category: 'Termination',
      content:
        'Either party may terminate this Agreement for convenience by providing not less than thirty (30) days prior written notice to the other party. Upon such termination, the Customer shall pay all fees accrued up to the date of termination.',
    },
    {
      name: 'Data Protection (DPDP)',
      category: 'Data Privacy',
      content:
        'The parties shall comply with all applicable data protection laws including the Digital Personal Data Protection Act, 2023 (DPDP Act) of India. The Provider shall process Personal Data only on documented instructions from the Customer and shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk.',
    },
  ];

  for (const c of clauses) {
    const existing = await prisma.clause.findFirst({
      where: { name: c.name, orgId: null },
    });
    if (!existing) {
      await prisma.clause.create({ data: { ...c, isDefault: true } });
    }
  }

  // Standard templates
  const templates = [
    {
      id: 'tpl-nda',
      name: 'Standard NDA',
      category: 'NDA',
      description: 'Mutual Non-Disclosure Agreement template',
      variables: ['{{PARTY_A}}', '{{PARTY_B}}', '{{EFFECTIVE_DATE}}', '{{GOVERNING_STATE}}'],
      content: `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into by and between {{PARTY_A}} and {{PARTY_B}} effective as of {{EFFECTIVE_DATE}}.

1. CONFIDENTIAL INFORMATION: "Confidential Information" means any information disclosed by either party to the other, whether orally or in writing, that is designated as confidential or should reasonably be understood to be confidential.

2. OBLIGATIONS: The Receiving Party shall (a) hold Confidential Information in confidence and not disclose it to any third party without the prior written consent of the Disclosing Party; (b) use Confidential Information solely for the purpose of evaluating a potential business relationship.

3. TERM: This Agreement shall remain in effect for a period of two (2) years from the Effective Date, with confidentiality obligations surviving for three (3) years thereafter.

4. GOVERNING LAW: This Agreement shall be governed by the laws of the State of {{GOVERNING_STATE}}, India.`,
    },
    {
      id: 'tpl-msa',
      name: 'Master Services Agreement',
      category: 'MSA',
      description: 'Master Services Agreement template',
      variables: ['{{CUSTOMER}}', '{{VENDOR}}', '{{EFFECTIVE_DATE}}', '{{SERVICE_DESC}}'],
      content: `MASTER SERVICES AGREEMENT

This Master Services Agreement ("Agreement") is made and entered into as of {{EFFECTIVE_DATE}} (the "Effective Date") by and between {{CUSTOMER}} ("Customer") and {{VENDOR}} ("Provider").

1. SERVICES: Provider shall provide the services described in statements of work issued under this Agreement ("SOW"), including {{SERVICE_DESC}}.

2. FEES & PAYMENT: Customer shall pay Provider the fees set forth in each SOW within thirty (30) days of the date of invoice.

3. INTELLECTUAL PROPERTY: Customer retains all rights, title and interest in Customer's IP. Provider retains all rights in Provider's pre-existing IP.

4. LIMITATION OF LIABILITY: Subject to clause 5, neither party's aggregate liability shall exceed the fees paid or payable during the twelve months preceding the claim.

5. INDEMNITY: Provider shall indemnify Customer against third-party claims arising from Provider's infringement of third-party IP rights.

6. TERM & TERMINATION: This Agreement shall commence on the Effective Date and continue until terminated by either party upon sixty (60) days written notice.`,
    },
  ];

  for (const t of templates) {
    await prisma.template.upsert({
      where: { id: t.id },
      update: { variables: t.variables },
      create: { ...t, orgId: org.id, isDefault: true },
    });
  }

  // Default approval workflow for NDAs and MSAs
  const workflow = await prisma.workflow.upsert({
    where: { id: 'wf-legal' },
    update: {},
    create: {
      id: 'wf-legal',
      name: 'Legal Review & Approval',
      description: 'Standard legal review workflow',
      contractType: ContractType.NDA,
      orgId: org.id,
      steps: {
        create: [
          {
            id: 'wfs-1',
            name: 'Legal Review',
            type: 'APPROVAL',
            stepOrder: 1,
            approverRole: Role.LEGAL,
          },
          {
            id: 'wfs-2',
            name: 'Finance Check',
            type: 'APPROVAL',
            stepOrder: 2,
            approverRole: Role.FINANCE,
          },
          {
            id: 'wfs-3',
            name: 'Final Sign-off',
            type: 'APPROVAL',
            stepOrder: 3,
            approverRole: Role.ADMIN,
          },
        ],
      },
    },
  });

  // MSA workflow
  await prisma.workflow.upsert({
    where: { id: 'wf-msa' },
    update: {},
    create: {
      id: 'wf-msa',
      name: 'MSA Approval',
      description: 'Master services agreement approval',
      contractType: ContractType.MSA,
      orgId: org.id,
      steps: {
        create: [
          {
            id: 'wfs-m1',
            name: 'Legal Review',
            type: 'APPROVAL',
            stepOrder: 1,
            approverRole: Role.LEGAL,
          },
          {
            id: 'wfs-m2',
            name: 'Finance Check',
            type: 'APPROVAL',
            stepOrder: 2,
            approverRole: Role.FINANCE,
          },
          {
            id: 'wfs-m3',
            name: 'Admin Sign-off',
            type: 'APPROVAL',
            stepOrder: 3,
            approverRole: Role.ADMIN,
          },
        ],
      },
    },
  });

  // Sample contracts for demo
  const sampleContracts = [
    {
      id: 'ctr-1',
      contractNo: 'CON-2026-0001',
      title: 'Vendor NDA - CloudServe Technologies',
      type: ContractType.NDA,
      status: ContractStatus.EXECUTED,
      counterpartyName: 'CloudServe Technologies Pvt Ltd',
      counterpartyEmail: 'legal@cloudserve.in',
      entity: 'Acme Corp Pvt Ltd',
      value: '0',
      currency: 'INR',
      startDate: new Date('2026-01-15'),
      endDate: new Date('2027-01-14'),
      renewalDate: new Date('2026-12-15'),
      autoRenews: true,
      jurisdiction: 'Karnataka',
      governingLaw: 'India',
      ownerId: 'user-legal',
    },
    {
      id: 'ctr-2',
      contractNo: 'CON-2026-0002',
      title: 'MSA - DataWorks Analytics',
      type: ContractType.MSA,
      status: ContractStatus.PENDING_APPROVAL,
      counterpartyName: 'DataWorks Analytics Ltd',
      counterpartyEmail: 'contracts@dataworks.in',
      entity: 'Acme Corp Pvt Ltd',
      value: '4500000',
      currency: 'INR',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2027-02-28'),
      renewalDate: new Date('2027-01-28'),
      autoRenews: true,
      jurisdiction: 'Maharashtra',
      governingLaw: 'India',
      ownerId: 'user-sales',
    },
    {
      id: 'ctr-3',
      contractNo: 'CON-2026-0003',
      title: 'Office Lease - Mumbai Suburb',
      type: ContractType.LEASE,
      status: ContractStatus.DRAFT,
      counterpartyName: 'Prestige Properties Ltd',
      entity: 'Acme Corp Pvt Ltd (Mumbai Branch)',
      value: '12000000',
      currency: 'INR',
      jurisdiction: 'Maharashtra',
      governingLaw: 'India',
      ownerId: 'user-finance',
    },
  ];

  for (const c of sampleContracts) {
    const existing = await prisma.contract.findUnique({ where: { id: c.id } });
    if (!existing) {
      const { id, ...data } = c;
      await prisma.contract.create({
        data: {
          ...data,
          id,
          orgId: org.id,
          createdById: 'user-admin',
          versions: {
            create: {
              version: 1,
              name: 'v1.0',
              summary: 'Initial version',
              createdById: 'user-admin',
            },
          },
        },
      });
    }
  }

  console.log('✅ Seed complete!');
  console.log('Demo credentials:');
  console.log('  admin@acme.com / Password@123 (Admin)');
  console.log('  legal@acme.com / Password@123 (Legal)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());