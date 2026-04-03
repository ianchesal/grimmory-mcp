/**
 * Example test demonstrating how to use the MCP test helpers.
 *
 * This file validates that the test infrastructure (setup, helpers,
 * factories) all wire together correctly.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestMCPContext,
  callTool,
  listTools,
  cleanupMCPContext,
  type TestMCPContext,
} from "./helpers/mcp-helpers.js";
import { createMockBook, createMockPage } from "./helpers/factories.js";

describe("MCP Test Helpers", () => {
  let ctx: TestMCPContext;

  beforeAll(async () => {
    ctx = await createTestMCPContext();
  });

  afterAll(async () => {
    await cleanupMCPContext(ctx);
  });

  it("should connect client and server via InMemoryTransport", () => {
    expect(ctx.client).toBeDefined();
    expect(ctx.mcpServer).toBeDefined();
    expect(ctx.mcpServer.isConnected()).toBe(true);
  });

  it("should list tools and call a registered tool", async () => {
    // Register a dummy tool via the setup callback
    const toolCtx = await createTestMCPContext({
      setup: (server) => {
        server.registerTool("ping", { description: "Returns pong" }, () => ({
          content: [{ type: "text" as const, text: "pong" }],
        }));
      },
    });

    try {
      const tools = await listTools(toolCtx);
      expect(tools).toHaveLength(1);
      expect(tools[0]!.name).toBe("ping");

      const result = await callTool<string>(toolCtx, "ping");
      expect(result).toBe("pong");
    } finally {
      await cleanupMCPContext(toolCtx);
    }
  });
});

describe("Mock Factories", () => {
  it("should create a mock book with defaults", () => {
    const book = createMockBook();
    expect(book.id).toBeDefined();
    expect(book.metadata?.title).toBe("Test Book");
    expect(book.readStatus).toBe("UNREAD");
  });

  it("should allow overriding mock book fields", () => {
    const book = createMockBook({
      id: "custom-id",
      readStatus: "READ",
    });
    expect(book.id).toBe("custom-id");
    expect(book.readStatus).toBe("READ");
  });

  it("should create a mock page", () => {
    const books = [createMockBook(), createMockBook({ id: "book-2" })];
    const page = createMockPage(books);
    expect(page.content).toHaveLength(2);
    expect(page.totalElements).toBe(2);
    expect(page.hasNext).toBe(false);
  });

  it("should allow overriding mock page fields", () => {
    const page = createMockPage([], { totalPages: 5, page: 2 });
    expect(page.totalPages).toBe(5);
    expect(page.page).toBe(2);
  });
});
