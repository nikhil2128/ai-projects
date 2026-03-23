import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo users
  const password = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@factory.com' },
    update: {},
    create: {
      email: 'admin@factory.com',
      password,
      name: 'Admin User',
      role: UserRole.ADMIN,
      department: 'Management',
    },
  });

  const engineer = await prisma.user.upsert({
    where: { email: 'engineer@factory.com' },
    update: {},
    create: {
      email: 'engineer@factory.com',
      password,
      name: 'Sarah Chen',
      role: UserRole.ENGINEER,
      department: 'Mechanical Engineering',
    },
  });

  const procurement = await prisma.user.upsert({
    where: { email: 'procurement@factory.com' },
    update: {},
    create: {
      email: 'procurement@factory.com',
      password,
      name: 'Mike Johnson',
      role: UserRole.PROCUREMENT,
      department: 'Procurement',
    },
  });

  const factoryWorker = await prisma.user.upsert({
    where: { email: 'worker@factory.com' },
    update: {},
    create: {
      email: 'worker@factory.com',
      password,
      name: 'Alex Rivera',
      role: UserRole.FACTORY_WORKER,
      department: 'Assembly Line A',
    },
  });

  console.log('Seed users created:');
  console.log(`  Admin:          ${admin.email} / password123`);
  console.log(`  Engineer:       ${engineer.email} / password123`);
  console.log(`  Procurement:    ${procurement.email} / password123`);
  console.log(`  Factory Worker: ${factoryWorker.email} / password123`);
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
