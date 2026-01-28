import { createMockProfile, MockProfile } from '../setup/test-utils';
import { testUser, adminUser, unverifiedUser } from './users';

// Complete profile for test user
export const completeProfile: MockProfile = createMockProfile({
  id: 'profile-complete-1',
  userId: testUser.id,
  firstName: 'Test',
  lastName: 'User',
  bio: 'This is a complete profile for testing purposes. I enjoy hiking, reading, and coding.',
  birthDate: new Date('1995-05-15'),
  gender: 'MALE',
  interestedIn: ['FEMALE', 'NON_BINARY'],
  location: 'Paris, France',
  latitude: 48.8566,
  longitude: 2.3522,
  photos: [
    'https://example.com/photos/1.jpg',
    'https://example.com/photos/2.jpg',
    'https://example.com/photos/3.jpg',
  ],
  isComplete: true,
});

// Incomplete profile (missing required fields)
export const incompleteProfile: MockProfile = createMockProfile({
  id: 'profile-incomplete-1',
  userId: unverifiedUser.id,
  firstName: 'Incomplete',
  lastName: '',
  bio: null,
  birthDate: new Date('1998-03-20'),
  gender: 'FEMALE',
  interestedIn: [],
  location: null,
  latitude: null,
  longitude: null,
  photos: [],
  isComplete: false,
});

// Admin profile
export const adminProfile: MockProfile = createMockProfile({
  id: 'profile-admin-1',
  userId: adminUser.id,
  firstName: 'Admin',
  lastName: 'User',
  bio: 'Administrator profile',
  birthDate: new Date('1990-01-01'),
  gender: 'NON_BINARY',
  interestedIn: ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER'],
  location: 'New York, USA',
  latitude: 40.7128,
  longitude: -74.006,
  photos: ['https://example.com/photos/admin.jpg'],
  isComplete: true,
});

// Female profile
export const femaleProfile: MockProfile = createMockProfile({
  id: 'profile-female-1',
  userId: 'user-female-1',
  firstName: 'Jane',
  lastName: 'Doe',
  bio: 'Looking for meaningful connections',
  birthDate: new Date('1997-08-10'),
  gender: 'FEMALE',
  interestedIn: ['MALE'],
  location: 'London, UK',
  latitude: 51.5074,
  longitude: -0.1278,
  photos: [
    'https://example.com/photos/jane1.jpg',
    'https://example.com/photos/jane2.jpg',
  ],
  isComplete: true,
});

// Male profile
export const maleProfile: MockProfile = createMockProfile({
  id: 'profile-male-1',
  userId: 'user-male-1',
  firstName: 'John',
  lastName: 'Smith',
  bio: 'Adventure seeker and coffee lover',
  birthDate: new Date('1993-12-25'),
  gender: 'MALE',
  interestedIn: ['FEMALE'],
  location: 'Berlin, Germany',
  latitude: 52.52,
  longitude: 13.405,
  photos: [
    'https://example.com/photos/john1.jpg',
  ],
  isComplete: true,
});

// Non-binary profile
export const nonBinaryProfile: MockProfile = createMockProfile({
  id: 'profile-nb-1',
  userId: 'user-nb-1',
  firstName: 'Alex',
  lastName: 'Taylor',
  bio: 'Artist and musician. They/them pronouns.',
  birthDate: new Date('1999-06-30'),
  gender: 'NON_BINARY',
  interestedIn: ['MALE', 'FEMALE', 'NON_BINARY'],
  location: 'Amsterdam, Netherlands',
  latitude: 52.3676,
  longitude: 4.9041,
  photos: [
    'https://example.com/photos/alex1.jpg',
    'https://example.com/photos/alex2.jpg',
    'https://example.com/photos/alex3.jpg',
    'https://example.com/photos/alex4.jpg',
  ],
  isComplete: true,
});

// Profile with minimum age (18)
export const youngProfile: MockProfile = createMockProfile({
  id: 'profile-young-1',
  userId: 'user-young-1',
  firstName: 'Young',
  lastName: 'User',
  bio: 'Just turned 18!',
  birthDate: new Date(new Date().setFullYear(new Date().getFullYear() - 18)),
  gender: 'MALE',
  interestedIn: ['FEMALE'],
  location: 'Tokyo, Japan',
  latitude: 35.6762,
  longitude: 139.6503,
  photos: [],
  isComplete: false,
});

// Profile with many photos
export const photoRichProfile: MockProfile = createMockProfile({
  id: 'profile-photos-1',
  userId: 'user-photos-1',
  firstName: 'Photo',
  lastName: 'Lover',
  bio: 'I love taking photos!',
  birthDate: new Date('1994-04-15'),
  gender: 'FEMALE',
  interestedIn: ['MALE', 'FEMALE'],
  location: 'Los Angeles, USA',
  latitude: 34.0522,
  longitude: -118.2437,
  photos: Array.from({ length: 6 }, (_, i) => `https://example.com/photos/photo${i + 1}.jpg`),
  isComplete: true,
});

// Recently active profile
export const recentlyActiveProfile: MockProfile = createMockProfile({
  id: 'profile-recent-1',
  userId: 'user-recent-1',
  firstName: 'Active',
  lastName: 'User',
  bio: 'Online now!',
  birthDate: new Date('1996-07-20'),
  gender: 'MALE',
  interestedIn: ['FEMALE'],
  location: 'Sydney, Australia',
  latitude: -33.8688,
  longitude: 151.2093,
  photos: ['https://example.com/photos/active.jpg'],
  isComplete: true,
  lastActive: new Date(),
});

// Inactive profile (hasn't been active for a long time)
export const inactiveProfile: MockProfile = createMockProfile({
  id: 'profile-inactive-1',
  userId: 'user-inactive-1',
  firstName: 'Inactive',
  lastName: 'User',
  bio: 'Taking a break',
  birthDate: new Date('1992-11-05'),
  gender: 'FEMALE',
  interestedIn: ['MALE'],
  location: 'Toronto, Canada',
  latitude: 43.6532,
  longitude: -79.3832,
  photos: ['https://example.com/photos/inactive.jpg'],
  isComplete: true,
  lastActive: new Date('2023-01-01'),
});

// Profiles list for discover/matching tests
export const discoverProfiles: MockProfile[] = [
  femaleProfile,
  maleProfile,
  nonBinaryProfile,
  photoRichProfile,
  recentlyActiveProfile,
];

// Security test profiles
export const securityTestProfiles = {
  // Profile with XSS in bio
  xssProfile: createMockProfile({
    id: 'profile-xss',
    userId: 'user-xss',
    firstName: '<img src=x onerror=alert("xss")>',
    lastName: 'Test',
    bio: '<script>document.cookie</script>',
    gender: 'MALE',
  }),
  // Profile with SQL injection attempts
  sqlInjectionProfile: createMockProfile({
    id: 'profile-sqli',
    userId: 'user-sqli',
    firstName: "Robert'); DROP TABLE profiles;--",
    lastName: 'Tables',
    bio: "' OR '1'='1",
    gender: 'MALE',
  }),
  // Profile with path traversal attempt in photo
  pathTraversalProfile: createMockProfile({
    id: 'profile-path',
    userId: 'user-path',
    firstName: 'Path',
    lastName: 'Traversal',
    photos: ['../../../etc/passwd', '..\\..\\windows\\system32\\config'],
    gender: 'FEMALE',
  }),
};

// Export all profiles grouped
export const allProfiles = {
  completeProfile,
  incompleteProfile,
  adminProfile,
  femaleProfile,
  maleProfile,
  nonBinaryProfile,
  youngProfile,
  photoRichProfile,
  recentlyActiveProfile,
  inactiveProfile,
  discoverProfiles,
  securityTestProfiles,
};

export default allProfiles;
