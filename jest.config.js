
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/client/src/setupTests.ts'],
  testMatch: [
    '<rootDir>/client/src/__tests__/**/*.test.(ts|tsx)',
    '<rootDir>/server/__tests__/**/*.test.ts',
  ],
};
