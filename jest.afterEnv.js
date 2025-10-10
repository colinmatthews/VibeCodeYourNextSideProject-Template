// This file runs AFTER the Jest test framework is installed
// Use this for setup that requires Jest APIs (jest.fn, expect, beforeEach, etc.)

// Suppress console output during tests to keep output clean
// This reduces noise from expected error messages in error-handling tests

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

// Override console methods using Jest APIs
console.error = jest.fn((...args) => {
  // Only log actual test failures, not expected errors from the code
  const message = args[0]?.toString() || '';
  // Allow through only critical Jest errors
  if (message.includes('FAIL') || message.includes('●')) {
    originalConsoleError(...args);
  }
  // Suppress all other console.error (like expected API errors in tests)
});

console.log = jest.fn((...args) => {
  // Suppress all console.log during tests
  // Uncomment to debug:
  // originalConsoleLog(...args);
});

console.warn = jest.fn((...args) => {
  // Suppress all console.warn during tests
});

console.debug = jest.fn((...args) => {
  // Suppress all console.debug during tests
});
