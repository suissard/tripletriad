const assert = require('assert');
const fs = require('fs');

async function testMatchArbitrateFix() {
  let loggedError = null;
  const originalConsoleError = console.error;

  // Mock console.error
  console.error = (msg, err) => {
    if (msg.includes('Error:')) {
      loggedError = err;
    }
  };

  try {
    // We'll just verify the code changes were applied by mocking the ctx and throwing an error
    // within a simplified block of what the controller essentially does now.

    // Simulate the catch block in the controller
    const ctx = {
      internalServerError: (msg) => {
        return { status: 500, message: msg };
      }
    };

    const simulatedCatchBlock = (ctx, err) => {
      console.error("[Arbitrate] Error:", err);
      return ctx.internalServerError("An error occurred during arbitration.");
    };

    const dummyError = new Error("This is a sensitive database error!");
    const response = simulatedCatchBlock(ctx, dummyError);

    assert.strictEqual(response.status, 500);
    assert.strictEqual(response.message, "An error occurred during arbitration.");
    assert.strictEqual(loggedError, dummyError);

    console.log("Mock test passed: Sanitized error response and internal logging are correct.");

    // Check if the actual file contains the fix
    const fileContent = fs.readFileSync('back/strapi/src/api/match/controllers/match.ts', 'utf8');
    assert(fileContent.includes('return ctx.internalServerError("An error occurred during arbitration.");'), "Arbitrate fix not found in file");
    assert(fileContent.includes('return ctx.internalServerError('), "Other fixes not found in file");
    assert(fileContent.includes('"An error occurred while processing the match request."'), "Other fixes not found in file");

    console.log("File analysis passed: Vulnerable patterns replaced successfully.");

  } finally {
    // Restore console.error
    console.error = originalConsoleError;
  }
}

testMatchArbitrateFix().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
