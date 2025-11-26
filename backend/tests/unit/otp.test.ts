import { generateOTP, isValidOTP } from '../../src/utils/otp';
import { describe, test, expect } from '@jest/globals';

describe('OTP Utils', () => {
  test('generateOTP should return 6-digit string', () => {
    const otp = generateOTP();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  test('generateOTP should generate different values', () => {
    const otp1 = generateOTP();
    const otp2 = generateOTP();
    // While theoretically they could be the same, probability is very low
    expect(otp1).not.toBe(otp2);
  });

  test('isValidOTP should validate correct format', () => {
    expect(isValidOTP('123456')).toBe(true);
    expect(isValidOTP('000000')).toBe(true);
    expect(isValidOTP('999999')).toBe(true);
  });

  test('isValidOTP should reject invalid format', () => {
    expect(isValidOTP('12345')).toBe(false); // Too short
    expect(isValidOTP('1234567')).toBe(false); // Too long
    expect(isValidOTP('abc123')).toBe(false); // Contains letters
    expect(isValidOTP('')).toBe(false); // Empty
  });
});
