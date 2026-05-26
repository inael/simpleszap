const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const r = await p.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`
    );
    console.log(r.map((x) => x.table_name).join('\n'));
  } catch (e) {
    console.error('ERR', e.message);
  } finally {
    await p.$disconnect();
  }
})();
