import { moderateImage, moderateText } from '../../src/services/moderation';
import { describe, test, expect } from '@jest/globals';

describe('Moderation Service', () => {
  test('moderateImage should return safe result for valid URL', async () => {
    const result = await moderateImage('https://example.com/image.jpg');
    expect(result).toHaveProperty('safe');
    expect(typeof result.safe).toBe('boolean');
  });

  test('moderateText should detect inappropriate content', async () => {
    const result = await moderateText('This is a spam message');
    expect(result.safe).toBe(false);
    expect(result.reason).toBeDefined();
  });

  test('moderateText should approve clean content', async () => {
    const result = await moderateText('Hello, how are you?');
    expect(result.safe).toBe(true);
  });
});
