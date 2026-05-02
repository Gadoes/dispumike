/**
 * POC: MCP host spike using @modelcontextprotocol/server-filesystem via stdio transport.
 * Validates: StdioClientTransport, listTools(), callTool(), clean exit.
 * Run: npx tsx backend/scripts/spike-mcp-host.ts
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";

const SERVER_BIN = path.resolve(
  __dirname,
  "../node_modules/@modelcontextprotocol/server-filesystem/dist/index.js"
);

// Allowed directory for the filesystem server to browse
const ALLOWED_DIR = path.resolve(__dirname, "../src");

async function main() {
  console.log("=== MCP stdio POC ===");
  console.log(`Server binary: ${SERVER_BIN}`);
  console.log(`Allowed directory: ${ALLOWED_DIR}\n`);

  // 1. Create transport — spawns the MCP server as a child process
  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_BIN, ALLOWED_DIR],
    stderr: "pipe", // suppress child stderr from polluting our stdout
  });

  // 2. Create client and connect
  const client = new Client(
    { name: "spike-client", version: "0.0.1" },
    { capabilities: {} }
  );

  console.log("Connecting to MCP server...");
  await client.connect(transport);
  console.log("Connected.\n");

  // 3. listTools()
  console.log("=== listTools() ===");
  const toolsResult = await client.listTools();
  console.log(`Found ${toolsResult.tools.length} tool(s):`);
  for (const tool of toolsResult.tools) {
    console.log(`  - ${tool.name}: ${tool.description ?? "(no description)"}`);
  }
  console.log();

  // Verify structure
  if (toolsResult.tools.length === 0) {
    throw new Error("listTools() returned no tools — POC FAILED");
  }
  const sample = toolsResult.tools[0];
  if (!sample.name || !sample.inputSchema) {
    throw new Error(
      "Tool missing required fields (name/inputSchema) — POC FAILED"
    );
  }
  console.log("listTools() structure check: PASS\n");

  // 4. Call a tool — list_directory on the allowed dir
  const listDirTool = toolsResult.tools.find(
    (t) => t.name === "list_directory"
  );
  if (!listDirTool) {
    console.warn(
      "list_directory tool not found; skipping tool call test. Available:",
      toolsResult.tools.map((t) => t.name)
    );
  } else {
    console.log("=== callTool(list_directory) ===");
    const callResult = await client.callTool({
      name: "list_directory",
      arguments: { path: ALLOWED_DIR },
    });
    console.log("Tool result content:");
    for (const item of callResult.content as Array<{
      type: string;
      text?: string;
    }>) {
      if (item.type === "text" && item.text) {
        console.log(item.text.substring(0, 500));
      }
    }
    if (!callResult.content || (callResult.content as unknown[]).length === 0) {
      throw new Error("callTool() returned empty content — POC FAILED");
    }
    console.log("\ncallTool() result check: PASS");
  }

  // 5. Clean disconnect
  console.log("\nDisconnecting...");
  await client.close();
  console.log("=== POC PASSED ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("POC FAILED:", err);
  process.exit(1);
});
