import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password_hash = await bcrypt.hash('password123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@carbonoracle.com' },
    update: {},
    create: {
      email: 'admin@carbonoracle.com',
      password_hash,
      name: 'System Admin',
      role: 'ADMIN'
    }
  });

  console.log('Admin user seeded!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
