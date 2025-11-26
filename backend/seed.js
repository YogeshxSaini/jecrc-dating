const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Seeding database...\n');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@jecrc.ac.in' },
      update: {},
      create: {
        email: 'admin@jecrc.ac.in',
        displayName: 'Admin User',
        passwordHash: adminPassword,
        emailVerified: true,
        role: 'ADMIN',
        profile: { create: {} }
      }
    });
    console.log('✅ Created admin user');
    
    // Create test students
    for (let i = 1; i <= 5; i++) {
      const password = await bcrypt.hash('password123', 10);
      await prisma.user.upsert({
        where: { email: `student${i}@jecrc.ac.in` },
        update: {},
        create: {
          email: `student${i}@jecrc.ac.in`,
          displayName: `Student ${i}`,
          passwordHash: password,
          emailVerified: true,
          profile: { 
            create: {
              bio: `Hi! I'm Student ${i} from JECRC.`,
              gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
              lookingFor: i % 2 === 0 ? 'MALE' : 'FEMALE',
              interests: ['Music', 'Sports', 'Movies', 'Travel'].slice(0, i % 4 + 1),
              department: ['CSE', 'ECE', 'ME', 'CE', 'IT'][i % 5],
              year: (i % 4) + 1
            }
          }
        }
      });
      console.log(`✅ Created student${i}@jecrc.ac.in`);
    }
    
    console.log('\n✅ Seed completed successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('Test Accounts:');
    console.log('═══════════════════════════════════════');
    console.log('👑 Admin:');
    console.log('   Email: admin@jecrc.ac.in');
    console.log('   Password: admin123');
    console.log('');
    console.log('👥 Students (all password: password123):');
    console.log('   • student1@jecrc.ac.in');
    console.log('   • student2@jecrc.ac.in');
    console.log('   • student3@jecrc.ac.in');
    console.log('   • student4@jecrc.ac.in');
    console.log('   • student5@jecrc.ac.in');
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
