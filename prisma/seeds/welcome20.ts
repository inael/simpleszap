/**
 * Seed: cupom WELCOME20 (20% off no 1º mês) — usado pelo flow de upsell
 * em /dashboard/instances quando o user recusa assinar e a gente oferece
 * desconto como última tentativa de conversão.
 *
 * Idempotente — pode rodar várias vezes sem duplicar.
 *
 * Uso:
 *   cd apps/api
 *   npx tsx ../../prisma/seeds/welcome20.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const coupon = await prisma.coupon.upsert({
    where: { code: 'WELCOME20' },
    update: {
      percentOff: 20,
      description: 'Boas-vindas — 20% off no 1º mês (oferta pós-recusa de upgrade)',
      validUntil: null,
      maxUses: null,
    },
    create: {
      code: 'WELCOME20',
      percentOff: 20,
      description: 'Boas-vindas — 20% off no 1º mês (oferta pós-recusa de upgrade)',
    },
  });
  console.log(`✅ cupom WELCOME20 garantido — id=${coupon.id}, percentOff=${coupon.percentOff}%`);
}

main()
  .catch((err) => {
    console.error('❌ falhou:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
