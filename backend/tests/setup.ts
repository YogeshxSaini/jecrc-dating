import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Setup test database
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Cleanup
  await prisma.$disconnect();
});

// Export prisma for use in tests
export { prisma };
