/**
 * Vitest global setup — runs once before all test suites.
 *
 * Sets deterministic environment variables so tests never hit real
 * Grimmory instances and are fully reproducible.
 */

process.env.GRIMMORY_URL = "http://localhost:8080";
process.env.GRIMMORY_EMAIL = "test@example.com";
process.env.GRIMMORY_PASSWORD = "testpassword";
