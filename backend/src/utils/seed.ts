import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (be careful in production!)
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.like.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.photoVerification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.oTP.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPassword = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@jecrc.ac.in',
      displayName: 'Admin User',
      passwordHash: adminPassword,
      role: 'ADMIN',
      emailVerified: true,
      profile: {
        create: {},
      },
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create regular users
  const users = [];
  const userPassword = await bcrypt.hash('password123', 10);

  for (let i = 1; i <= 5; i++) {
    const user = await prisma.user.create({
      data: {
        email: `student${i}@jecrc.ac.in`,
        displayName: `Student ${i}`,
        passwordHash: userPassword,
        emailVerified: true,
        verifiedSelfie: i <= 2, // First 2 users have verified selfies
        profile: {
          create: {
            bio: `Hey! I'm Student ${i}. Love coding, sports, and making new friends!`,
            interests: ['Coding', 'Sports', 'Music', 'Movies', 'Travel'].slice(0, 3),
            gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
            lookingFor: i % 2 === 0 ? 'FEMALE' : 'MALE',
            department: 'Computer Science',
            year: (i % 4) + 1,
            dateOfBirth: new Date(2000 + i, i % 12, i),
          },
        },
      },
      include: {
        profile: true,
      },
    });
    users.push(user);

    // Add sample photos
    for (let j = 1; j <= 2; j++) {
      await prisma.photo.create({
        data: {
          profileId: user.profile!.id,
          url: `https://i.pravatar.cc/400?img=${i * 10 + j}`,
          moderationStatus: 'APPROVED',
          order: j - 1,
          isProfilePic: j === 1,
        },
      });
    }

    console.log(`✅ Created user: ${user.email}`);
  }

  // Create some likes
  await prisma.like.create({
    data: {
      fromUserId: users[0].id,
      toUserId: users[1].id,
    },
  });

  await prisma.like.create({
    data: {
      fromUserId: users[1].id,
      toUserId: users[0].id,
    },
  });

  console.log('✅ Created likes');

  // Create match (mutual like)
  const [userAId, userBId] = [users[0].id, users[1].id].sort();
  const match = await prisma.match.create({
    data: {
      userAId,
      userBId,
    },
  });

  console.log('✅ Created match');

  // Create sample messages
  await prisma.message.createMany({
    data: [
      {
        matchId: match.id,
        senderId: users[0].id,
        content: 'Hey! How are you?',
      },
      {
        matchId: match.id,
        senderId: users[1].id,
        content: "I'm good! How about you?",
      },
      {
        matchId: match.id,
        senderId: users[0].id,
        content: 'Doing great! Want to meet for coffee sometime?',
      },
    ],
  });

  console.log('✅ Created sample messages');

  // Create photo verification request
  await prisma.photoVerification.create({
    data: {
      userId: users[2].id,
      selfieUrl: `https://i.pravatar.cc/400?img=30`,
      status: 'PENDING',
    },
  });

  console.log('✅ Created pending photo verification');

  // Create sample report
  await prisma.report.create({
    data: {
      reporterId: users[0].id,
      reportedId: users[3].id,
      reason: 'Inappropriate behavior',
      description: 'This is a test report for demonstration purposes.',
      status: 'PENDING',
    },
  });

  console.log('✅ Created sample report');

  console.log('\n🎉 Seeding complete!');
  console.log('\nSample accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:     admin@jecrc.ac.in / password123');
  console.log('Student 1: student1@jecrc.ac.in / password123');
  console.log('Student 2: student2@jecrc.ac.in / password123');
  console.log('Student 3: student3@jecrc.ac.in / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nStudent 1 and Student 2 have a match with messages!');
  console.log('Student 3 has a pending photo verification.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
