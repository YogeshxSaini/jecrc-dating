import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function addUser() {
  const email = process.argv[2];
  const displayName = process.argv[3];
  const password = process.argv[4];

  if (!email || !displayName || !password) {
    console.error('Usage: npm run add-user <email> <displayName> <password>');
    console.error('Example: npm run add-user test@jecrcu.edu.in "John Doe" "password123"');
    process.exit(1);
  }

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash,
        emailVerified: true,
        profile: {
          create: {},
        },
      },
      include: {
        profile: true,
      },
    });

    console.log('✅ User created successfully!');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Display Name:', user.displayName);
    console.log('\nYou can now login with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error: any) {
    console.error('❌ Error creating user:', error.message);
    if (error.code === 'P2002') {
      console.error('User with this email already exists!');
    }
  } finally {
    await prisma.$disconnect();
  }
}

addUser();
