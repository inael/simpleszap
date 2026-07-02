// Inspeciona e (opcionalmente) limpa WebhookLog antigos sem instância de origem.
// Uso:
//   node scripts/cleanup-webhook-logs.mjs           -> só conta (dry-run)
//   node scripts/cleanup-webhook-logs.mjs --delete  -> apaga WHERE instanceId IS NULL
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const doDelete = process.argv.includes('--delete');

const total = await prisma.webhookLog.count();
const nullInstance = await prisma.webhookLog.count({ where: { instanceId: null } });
const withInstance = total - nullInstance;
const oldest = await prisma.webhookLog.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } });
const newest = await prisma.webhookLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } });

console.log(JSON.stringify({
  total,
  semInstancia_antigos: nullInstance,
  comInstancia: withInstance,
  maisAntigo: oldest?.createdAt ?? null,
  maisRecente: newest?.createdAt ?? null,
}, null, 2));

if (doDelete) {
  const res = await prisma.webhookLog.deleteMany({ where: { instanceId: null } });
  console.log(`DELETADOS (instanceId IS NULL): ${res.count}`);
  const remaining = await prisma.webhookLog.count();
  console.log(`Restantes na tabela: ${remaining}`);
}

await prisma.$disconnect();
