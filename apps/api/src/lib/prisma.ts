import { PrismaClient } from '@prisma/client';

let prismaInitError: unknown | undefined;
let prismaClient: PrismaClient | undefined;

try {
  prismaClient = new PrismaClient();
} catch (err) {
  prismaInitError = err;
}

export const prisma: PrismaClient = (prismaClient ||
  (new Proxy(
    {},
    {
      get() {
        throw prismaInitError || new Error('PrismaClient failed to initialize');
      },
    }
  ) as unknown as PrismaClient));
