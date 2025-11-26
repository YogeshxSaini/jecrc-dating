import request from 'supertest';
import { describe, test, expect, beforeAll } from '@jest/globals';
import express from 'express';
import authRoutes from '../../src/routes/auth';
import { prisma } from '../setup';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  const testEmail = 'test@jecrc.ac.in';
  const testPassword = 'testpassword123';
  const testDisplayName = 'Test User';

  beforeAll(async () => {
    // Clean up test user if exists
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  test('POST /api/auth/request-verification - should send OTP for valid email', async () => {
    const response = await request(app)
      .post('/api/auth/request-verification')
      .send({ email: testEmail })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('OTP sent');
    expect(response.body.expiresIn).toBeDefined();
  });

  test('POST /api/auth/request-verification - should reject non-JECRC email', async () => {
    const response = await request(app)
      .post('/api/auth/request-verification')
      .send({ email: 'test@gmail.com' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Only @jecrc.ac.in');
  });

  test('POST /api/auth/request-verification - should reject invalid email format', async () => {
    const response = await request(app)
      .post('/api/auth/request-verification')
      .send({ email: 'notanemail' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  test('POST /api/auth/verify - should reject invalid OTP', async () => {
    // First request OTP
    await request(app)
      .post('/api/auth/request-verification')
      .send({ email: testEmail });

    // Try to verify with wrong OTP
    const response = await request(app)
      .post('/api/auth/verify')
      .send({
        email: testEmail,
        otp: '000000',
        password: testPassword,
        displayName: testDisplayName,
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Invalid OTP');
  });

  test('POST /api/auth/login - should login with valid credentials', async () => {
    // First create a user with password
    const hashedPassword = await require('bcrypt').hash(testPassword, 10);
    await prisma.user.create({
      data: {
        email: testEmail,
        displayName: testDisplayName,
        passwordHash: hashedPassword,
        emailVerified: true,
        profile: { create: {} },
      },
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.user.email).toBe(testEmail);
  });

  test('POST /api/auth/login - should reject invalid password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'wrongpassword',
      })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Invalid credentials');
  });
});
