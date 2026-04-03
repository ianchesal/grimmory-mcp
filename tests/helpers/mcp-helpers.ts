/**
 * MCP InMemoryTransport test helpers.
 *
 * Provides a thin wrapper around the MCP SDK's InMemoryTransport so that
 * individual test suites can spin up a client ↔ server pair without any
 * stdio / network I/O.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Implementation } from "@modelcontextprotocol/sdk/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestMCPContext {
  /** MCP client connected to the server via in-memory transport. */
  client: Client;
  /** The high-level McpServer instance (exposes `.server` for low-level access). */
  mcpServer: McpServer;
  clientTransport: InMemoryTransport;
  serverTransport: InMemoryTransport;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const DEFAULT_SERVER_INFO: Implementation = {
  name: "test-grimmory-server",
  version: "0.0.1",
};

const DEFAULT_CLIENT_INFO: Implementation = {
  name: "test-client",
  version: "0.0.1",
};

/**
 * Creates a fully wired client ↔ server pair using InMemoryTransport.
 *
 * @param options.serverInfo  – optional server implementation metadata.
 * @param options.setup       – optional callback invoked **before** connecting.
 *                            Use it to register tools / resources / prompts on the server.
 */
export async function createTestMCPContext(
  options: {
    serverInfo?: Implementation;
    setup?: (server: McpServer) => void;
  } = {},
): Promise<TestMCPContext> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  const mcpServer = new McpServer(
    options.serverInfo ?? DEFAULT_SERVER_INFO,
  );

  // Let the caller register tools / resources / prompts.
  options.setup?.(mcpServer);

  const client = new Client(DEFAULT_CLIENT_INFO);

  // Wire both sides and wait for the MCP handshake to complete.
  await Promise.all([
    mcpServer.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return { client, mcpServer, clientTransport, serverTransport };
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/**
 * Call a tool on the server and return its structured content.
 *
 * Throws if the tool response indicates an error.
 */
export async function callTool<T = unknown>(
  context: TestMCPContext,
  toolName: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const result = await context.client.callTool({ name: toolName, arguments: args });

  if (result.isError) {
    const text = result.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    throw new Error(`Tool '${toolName}' returned error: ${text}`);
  }

  // Extract the first text content block as JSON.
  const textBlock = result.content.find(
    (c): c is { type: "text"; text: string } => c.type === "text",
  );

  if (!textBlock) {
    return undefined as T;
  }

  try {
    return JSON.parse(textBlock.text) as T;
  } catch {
    // If it's not JSON, return the raw text.
    return textBlock.text as T;
  }
}

/**
 * List all tools registered on the server.
 */
export async function listTools(
  context: TestMCPContext,
): Promise<Array<{ name: string; description?: string }>> {
  const { tools } = await context.client.listTools();
  return tools.map((t) => ({ name: t.name, description: t.description }));
}

/**
 * Gracefully close both transports and the server.
 */
export async function cleanupMCPContext(
  context: TestMCPContext,
): Promise<void> {
  await Promise.all([
    context.client.close().catch(() => {}),
    context.mcpServer.close().catch(() => {}),
  ]);
}
