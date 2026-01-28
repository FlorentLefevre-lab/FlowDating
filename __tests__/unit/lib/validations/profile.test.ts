/**
 * Unit tests for src/lib/validations/profile.ts
 * Tests Zod validation schemas for profile and preferences
 */

import { profileSchema, preferencesSchema, ProfileFormData, PreferencesFormData } from '@/lib/validations/profile';
import { z } from 'zod';

describe('Validation Schemas', () => {
  describe('profileSchema', () => {
    describe('valid data', () => {
      it('should accept valid profile with all fields', () => {
        const validProfile: ProfileFormData = {
          name: 'John Doe',
          age: 25,
          bio: 'Hello, I am John!',
          location: 'Paris, France',
          interests: ['music', 'travel', 'cooking'],
        };

        const result = profileSchema.safeParse(validProfile);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validProfile);
        }
      });

      it('should accept profile with only required fields', () => {
        const minimalProfile = {
          name: 'Jane',
        };

        const result = profileSchema.safeParse(minimalProfile);

        expect(result.success).toBe(true);
      });

      it('should accept profile with null optional fields', () => {
        const profileWithNulls = {
          name: 'Test User',
          age: null,
          bio: null,
          location: null,
          interests: undefined,
        };

        const result = profileSchema.safeParse(profileWithNulls);

        expect(result.success).toBe(true);
      });

      it('should accept profile with empty interests array', () => {
        const profileWithEmptyInterests = {
          name: 'Test',
          interests: [],
        };

        const result = profileSchema.safeParse(profileWithEmptyInterests);

        expect(result.success).toBe(true);
      });
    });

    describe('name validation', () => {
      it('should require name', () => {
        const profileWithoutName = {
          age: 25,
          bio: 'Test bio',
        };

        const result = profileSchema.safeParse(profileWithoutName);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('name');
        }
      });

      it('should reject empty name', () => {
        const profileWithEmptyName = {
          name: '',
          age: 25,
        };

        const result = profileSchema.safeParse(profileWithEmptyName);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('requis');
        }
      });

      it('should reject name exceeding 100 characters', () => {
        const profileWithLongName = {
          name: 'a'.repeat(101),
        };

        const result = profileSchema.safeParse(profileWithLongName);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('trop long');
        }
      });

      it('should accept name at max length (100)', () => {
        const profileWithMaxName = {
          name: 'a'.repeat(100),
        };

        const result = profileSchema.safeParse(profileWithMaxName);

        expect(result.success).toBe(true);
      });
    });

    describe('age validation', () => {
      it('should accept age at minimum (18)', () => {
        const profileWithMinAge = {
          name: 'Test',
          age: 18,
        };

        const result = profileSchema.safeParse(profileWithMinAge);

        expect(result.success).toBe(true);
      });

      it('should accept age at maximum (100)', () => {
        const profileWithMaxAge = {
          name: 'Test',
          age: 100,
        };

        const result = profileSchema.safeParse(profileWithMaxAge);

        expect(result.success).toBe(true);
      });

      it('should reject age below 18', () => {
        const profileWithYoungAge = {
          name: 'Test',
          age: 17,
        };

        const result = profileSchema.safeParse(profileWithYoungAge);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('18');
        }
      });

      it('should reject age above 100', () => {
        const profileWithOldAge = {
          name: 'Test',
          age: 101,
        };

        const result = profileSchema.safeParse(profileWithOldAge);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('100');
        }
      });

      it('should accept null age', () => {
        const profileWithNullAge = {
          name: 'Test',
          age: null,
        };

        const result = profileSchema.safeParse(profileWithNullAge);

        expect(result.success).toBe(true);
      });
    });

    describe('bio validation', () => {
      it('should accept bio at max length (500)', () => {
        const profileWithMaxBio = {
          name: 'Test',
          bio: 'a'.repeat(500),
        };

        const result = profileSchema.safeParse(profileWithMaxBio);

        expect(result.success).toBe(true);
      });

      it('should reject bio exceeding 500 characters', () => {
        const profileWithLongBio = {
          name: 'Test',
          bio: 'a'.repeat(501),
        };

        const result = profileSchema.safeParse(profileWithLongBio);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('500');
        }
      });

      it('should accept empty bio', () => {
        const profileWithEmptyBio = {
          name: 'Test',
          bio: '',
        };

        const result = profileSchema.safeParse(profileWithEmptyBio);

        expect(result.success).toBe(true);
      });
    });

    describe('location validation', () => {
      it('should accept valid location', () => {
        const profileWithLocation = {
          name: 'Test',
          location: 'Paris, France',
        };

        const result = profileSchema.safeParse(profileWithLocation);

        expect(result.success).toBe(true);
      });

      it('should accept location at max length (100)', () => {
        const profileWithMaxLocation = {
          name: 'Test',
          location: 'a'.repeat(100),
        };

        const result = profileSchema.safeParse(profileWithMaxLocation);

        expect(result.success).toBe(true);
      });

      it('should reject location exceeding 100 characters', () => {
        const profileWithLongLocation = {
          name: 'Test',
          location: 'a'.repeat(101),
        };

        const result = profileSchema.safeParse(profileWithLongLocation);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('trop longue');
        }
      });
    });

    describe('interests validation', () => {
      it('should accept up to 10 interests', () => {
        const profileWithMaxInterests = {
          name: 'Test',
          interests: Array(10).fill('interest'),
        };

        const result = profileSchema.safeParse(profileWithMaxInterests);

        expect(result.success).toBe(true);
      });

      it('should reject more than 10 interests', () => {
        const profileWithTooManyInterests = {
          name: 'Test',
          interests: Array(11).fill('interest'),
        };

        const result = profileSchema.safeParse(profileWithTooManyInterests);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('10');
        }
      });

      it('should accept various interest formats', () => {
        const profileWithVariedInterests = {
          name: 'Test',
          interests: ['Music', 'reading', 'COOKING', 'Travel & Adventure'],
        };

        const result = profileSchema.safeParse(profileWithVariedInterests);

        expect(result.success).toBe(true);
      });
    });
  });

  describe('preferencesSchema', () => {
    describe('valid data', () => {
      it('should accept valid preferences', () => {
        const validPreferences: PreferencesFormData = {
          minAge: 20,
          maxAge: 35,
          maxDistance: 50,
          gender: 'female',
        };

        const result = preferencesSchema.safeParse(validPreferences);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validPreferences);
        }
      });

      it('should accept preferences with null gender', () => {
        const preferencesWithNullGender = {
          minAge: 18,
          maxAge: 50,
          maxDistance: 100,
          gender: null,
        };

        const result = preferencesSchema.safeParse(preferencesWithNullGender);

        expect(result.success).toBe(true);
      });

      it('should accept preferences without gender', () => {
        const preferencesWithoutGender = {
          minAge: 25,
          maxAge: 45,
          maxDistance: 30,
        };

        const result = preferencesSchema.safeParse(preferencesWithoutGender);

        expect(result.success).toBe(true);
      });
    });

    describe('age range validation', () => {
      it('should accept minAge at boundary (18)', () => {
        const preferences = {
          minAge: 18,
          maxAge: 30,
          maxDistance: 50,
        };

        const result = preferencesSchema.safeParse(preferences);

        expect(result.success).toBe(true);
      });

      it('should accept maxAge at boundary (99)', () => {
        const preferences = {
          minAge: 18,
          maxAge: 99,
          maxDistance: 50,
        };

        const result = preferencesSchema.safeParse(preferences);

        expect(result.success).toBe(true);
      });

      it('should reject minAge below 18', () => {
        const preferences = {
          minAge: 17,
          maxAge: 30,
          maxDistance: 50,
        };

        const result = preferencesSchema.safeParse(preferences);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('18');
        }
      });

      it('should reject maxAge above 99', () => {
        const preferences = {
          minAge: 18,
          maxAge: 100,
          maxDistance: 50,
        };

        const result = preferencesSchema.safeParse(preferences);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('99');
        }
      });

      it('should reject minAge greater than maxAge', () => {
        const preferences = {
          minAge: 40,
          maxAge: 30,
          maxDistance: 50,
        };

        const result = preferencesSchema.safeParse(preferences);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('minimum');
          expect(result.error.issues[0].message).toContain('maximum');
        }
      });

      it('should accept equal minAge and maxAge', () => {
        const preferences = {
          minAge: 30,
          maxAge: 30,
          maxDistance: 50,
        };

        const result = preferencesSchema.safeParse(preferences);

        expect(result.success).toBe(true);
      });
    });

    describe('distance validation', () => {
      it('should accept maxDistance at minimum (1)', () => {
        const preferences = {
          minAge: 18,
          maxAge: 30,
          maxDistance: 1,
        };

        const result = preferencesSchema.safeParse(preferences);

        expect(result.success).toBe(true);
      });

      it('should accept maxDistance at maximum (500)', () => {
        const preferences = {
          minAge: 18,
          maxAge: 30,
          maxDistance: 500,
        };

        const result = preferencesSchema.safeParse(preferences);

        expect(result.success).toBe(true);
      });

      it('should reject maxDistance below 1', () => {
        const preferences = {
          minAge: 18,
          maxAge: 30,
          maxDistance: 0,
        };

        const result = preferencesSchema.safeParse(preferences);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('1');
        }
      });

      it('should reject maxDistance above 500', () => {
        const preferences = {
          minAge: 18,
          maxAge: 30,
          maxDistance: 501,
        };

        const result = preferencesSchema.safeParse(preferences);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('500');
        }
      });
    });

    describe('gender validation', () => {
      it('should accept various gender strings', () => {
        const genders = ['male', 'female', 'non-binary', 'other', 'Male', 'FEMALE'];

        for (const gender of genders) {
          const preferences = {
            minAge: 18,
            maxAge: 30,
            maxDistance: 50,
            gender,
          };

          const result = preferencesSchema.safeParse(preferences);
          expect(result.success).toBe(true);
        }
      });
    });

    describe('required fields', () => {
      it('should reject missing minAge', () => {
        const preferences = {
          maxAge: 30,
          maxDistance: 50,
        };

        const result = preferencesSchema.safeParse(preferences);

        expect(result.success).toBe(false);
      });

      it('should reject missing maxAge', () => {
        const preferences = {
          minAge: 18,
          maxDistance: 50,
        };

        const result = preferencesSchema.safeParse(preferences);

        expect(result.success).toBe(false);
      });

      it('should reject missing maxDistance', () => {
        const preferences = {
          minAge: 18,
          maxAge: 30,
        };

        const result = preferencesSchema.safeParse(preferences);

        expect(result.success).toBe(false);
      });
    });
  });

  describe('type inference', () => {
    it('should correctly infer ProfileFormData type', () => {
      const profile: ProfileFormData = {
        name: 'Test',
        age: 25,
        bio: 'Bio',
        location: 'Location',
        interests: ['a', 'b'],
      };

      // TypeScript should accept this
      const parsed = profileSchema.parse(profile);
      expect(parsed.name).toBe('Test');
    });

    it('should correctly infer PreferencesFormData type', () => {
      const preferences: PreferencesFormData = {
        minAge: 18,
        maxAge: 30,
        maxDistance: 50,
        gender: 'female',
      };

      // TypeScript should accept this
      const parsed = preferencesSchema.parse(preferences);
      expect(parsed.minAge).toBe(18);
    });
  });

  describe('error messages', () => {
    it('should provide French error messages for profile', () => {
      const invalidProfile = {
        name: '',
        age: 15,
        bio: 'a'.repeat(501),
        location: 'a'.repeat(101),
        interests: Array(11).fill('test'),
      };

      const result = profileSchema.safeParse(invalidProfile);

      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message).join(' ');
        // Should contain French error messages
        expect(messages).toMatch(/requis|trop/i);
      }
    });

    it('should provide French error messages for preferences', () => {
      const invalidPreferences = {
        minAge: 50,
        maxAge: 30,
        maxDistance: 600,
      };

      const result = preferencesSchema.safeParse(invalidPreferences);

      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message).join(' ');
        // Should contain French or descriptive error messages
        expect(messages.length).toBeGreaterThan(0);
      }
    });
  });
});
