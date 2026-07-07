import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@ai-os.dev" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@ai-os.dev",
      passwordHash,
      settings: {
        create: {
          theme: "system",
          language: "en",
        },
      },
    },
  });

  console.log(`Seeded demo user: ${user.email} (password: password123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
