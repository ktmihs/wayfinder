import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Next.js dev 모드의 HMR 때문에 PrismaClient가 여러 번 생성되는 것을 막는다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // 실제 연결은 첫 쿼리 때 이뤄지므로 빌드 시점에 DB가 없어도 괜찮다.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
