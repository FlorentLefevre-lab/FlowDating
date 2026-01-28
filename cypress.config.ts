import { defineConfig } from 'cypress';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    retries: {
      runMode: 2,
      openMode: 0
    },
    experimentalStudio: true,
    setupNodeEvents(on, config) {
      // Tasks for database operations
      on('task', {
        // Create a test user
        async createUser({ email, password = 'TestPassword123!', name = 'Test User', verified = false, profile = false }) {
          const hashedPassword = await bcrypt.hash(password, 12);

          const user = await prisma.user.create({
            data: {
              email,
              name,
              hashedPassword,
              emailVerified: verified ? new Date() : null,
            },
          });

          if (profile) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                age: 25,
                bio: 'Test user bio',
                gender: 'MALE',
                location: 'Paris, France',
                profession: 'Developer',
                interests: ['Music', 'Sports', 'Travel'],
              },
            });
          }

          return user;
        },

        // Verify user email
        async verifyEmail(email: string) {
          await prisma.user.update({
            where: { email },
            data: { emailVerified: new Date() },
          });
          return true;
        },

        // Create multiple profiles for discovery
        async createProfiles(count: number) {
          const profiles = [];
          for (let i = 0; i < count; i++) {
            const user = await prisma.user.create({
              data: {
                email: `testprofile${i}@example.com`,
                name: `Profile ${i}`,
                hashedPassword: await bcrypt.hash('TestPassword123!', 12),
                emailVerified: new Date(),
                age: 20 + i,
                bio: `Bio for profile ${i}`,
                gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
                location: 'Paris, France',
                profession: 'Tester',
                interests: ['Testing', 'Coding'],
              },
            });
            profiles.push(user);
          }
          return profiles;
        },

        // Create a like from one user to another
        async createLike({ from, to }: { from: string; to: string }) {
          const fromUser = await prisma.user.findUnique({ where: { email: from } });
          const toUser = await prisma.user.findUnique({ where: { email: to } });

          if (!fromUser || !toUser) {
            throw new Error('Users not found');
          }

          const like = await prisma.like.create({
            data: {
              fromUserId: fromUser.id,
              toUserId: toUser.id,
              type: 'LIKE',
            },
          });
          return like;
        },

        // Create a match between two users
        async createMatch({ user1, user2 }: { user1: string; user2: string }) {
          const userOne = await prisma.user.findUnique({ where: { email: user1 } });
          const userTwo = await prisma.user.findUnique({ where: { email: user2 } });

          if (!userOne || !userTwo) {
            throw new Error('Users not found');
          }

          // Create mutual likes
          await prisma.like.createMany({
            data: [
              { fromUserId: userOne.id, toUserId: userTwo.id, type: 'LIKE' },
              { fromUserId: userTwo.id, toUserId: userOne.id, type: 'LIKE' },
            ],
          });

          // Create match
          const match = await prisma.match.create({
            data: {
              user1Id: userOne.id,
              user2Id: userTwo.id,
            },
          });

          return match;
        },

        // Clear all test data from database
        async clearDatabase() {
          // Delete in order of dependencies
          await prisma.message.deleteMany({});
          await prisma.match.deleteMany({});
          await prisma.like.deleteMany({});
          await prisma.photo.deleteMany({});
          await prisma.userPreference.deleteMany({});
          await prisma.session.deleteMany({});
          await prisma.account.deleteMany({});
          await prisma.verificationToken.deleteMany({});
          await prisma.user.deleteMany({
            where: {
              email: {
                contains: '@example.com'
              }
            }
          });
          return true;
        },

        // Log message for debugging
        log(message: string) {
          console.log(message);
          return null;
        },
      });

      return config;
    },
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
});
