/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/auth/auth.service.ts',
    'src/posts/posts.service.ts',
    'src/follows/follows.service.ts',
    'src/reactions/reactions.service.ts',
    'src/users/users.service.ts',
  ],
  coverageDirectory: './coverage',
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testEnvironment: 'node',
};
