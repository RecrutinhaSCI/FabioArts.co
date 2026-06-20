// Use require to avoid TypeScript resolution issues with @prisma/client exports
const { PrismaClient } = require('@prisma/client');
import { env } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: InstanceType<typeof PrismaClient> | undefined;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    log: env.isDevelopment
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
    errorFormat: env.isDevelopment ? 'pretty' : 'minimal',
  });

if (env.isDevelopment) {
  global.prisma = prisma;
}

export default prisma;