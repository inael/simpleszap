import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const base = (process.env.SIMPLESZAP_API_URL || "http://localhost:3001/api").replace(/\/$/, "");
const orgId = process.env.SIMPLESZAP_ORG_ID || "";
const apiKey = process.env.SIMPLESZAP_API_KEY || "";
const clientToken = process.env.SIMPLESZAP_CLIENT_TOKEN || "";

function headers() {
  const h = {
    "Content-Type": "application/json",
    "x-org-id": orgId,
    Authorization: `Bearer ${apiKey}`,
  };
  if (clientToken) h["Client-Token"] = clientToken;
  return h;
}

async function apiGet(path) {
  const r = await fetch(`${base}${path}`, { headers: headers() });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

async function apiPut(path, body) {
  const r = await fetch(`${base}${path}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.text();
}

const server = new Server({ name: "simpleszap-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "simpleszap_get_user_settings",
      description:
        "Lê configurações de campanha (jitter min/max) e flags de segurança. Requer API key e x-org-id via env.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "simpleszap_update_campaign_jitter",
      description: "Atualiza intervalo aleatório (ms) entre mensagens na campanha.",
      inputSchema: {
        type: "object",
        properties: {
          minMs: { type: "number", description: "Mínimo em ms (200–120000)" },
          maxMs: { type: "number", description: "Máximo em ms" },
        },
        required: ["minMs", "maxMs"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!orgId || !apiKey) {
    return {
      content: [{ type: "text", text: "Defina SIMPLESZAP_ORG_ID e SIMPLESZAP_API_KEY no ambiente do MCP." }],
      isError: true,
    };
  }

  const name = request.params.name;
  const args = request.params.arguments ?? {};

  try {
    if (name === "simpleszap_get_user_settings") {
      const data = await apiGet("/user/settings");
      const safe = {
        campaignJitterMinMs: data.campaignJitterMinMs,
        campaignJitterMaxMs: data.campaignJitterMaxMs,
        useMessageVariants: data.useMessageVariants,
        hasClientToken: data.hasClientToken,
        requireClientToken: data.requireClientToken,
        bulkMessagingTermsAcceptedAt: data.bulkMessagingTermsAcceptedAt,
      };
      return { content: [{ type: "text", text: JSON.stringify(safe, null, 2) }] };
    }

    if (name === "simpleszap_update_campaign_jitter") {
      const minMs = args.minMs;
      const maxMs = args.maxMs;
      const text = await apiPut("/user/settings", { campaignJitterMinMs: minMs, campaignJitterMaxMs: maxMs });
      return { content: [{ type: "text", text: text || "ok" }] };
    }

    return { content: [{ type: "text", text: `Ferramenta desconhecida: ${name}` }], isError: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { content: [{ type: "text", text: msg }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
