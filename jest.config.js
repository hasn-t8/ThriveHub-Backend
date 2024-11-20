module.exports = {
    preset: 'ts-jest', // Use ts-jest for TypeScript transformation
    testEnvironment: 'node', // Use Node.js environment for testing
    testMatch: ['**/tests/**/*.test.ts'], // Match all test files in the "tests" folder
    transform: {
      '^.+\\.tsx?$': 'ts-jest', // Transform .ts and .tsx files using ts-jest
    },
    moduleFileExtensions: ['ts', 'js', 'json', 'node'], // Recognize these file extensions
  };
  