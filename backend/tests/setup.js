// Test setup file
// This file runs before each test file

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during testing
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DB_NAME = 'resume_processor_test';
