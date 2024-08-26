import '@testing-library/jest-dom';

import { expect } from 'vitest';

// Add custom matchers
expect.extend({
  toHaveBeenCalledOnce(received) {
    if (received.mock.calls.length !== 1) {
      return {
        message: () => `Expected function to have been called once, but it was called ${received.mock.calls.length} times`,
        pass: false,
      };
    }
    return {
      message: () => 'Expected function not to have been called once',
      pass: true,
    };
  },
});

// Global setup
// beforeAll(() => {
  // Add any global setup here
// });

// Global teardown
// afterAll(() => {
  // Add any global teardown here
// });
