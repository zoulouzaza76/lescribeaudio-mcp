#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import {
  PACKAGE_NAME,
  PACKAGE_VERSION,
  DEFAULT_MCP_ENDPOINT,
  DOCUMENTATION_URL,
  TOKEN_BUILDER_URL,
  SUPPORTED_PROTOCOL_VERSIONS,
  MCP_TOOLS_CATALOG,
  McpConfigError,
  validateToken,
  fetchDiscoveryInfo,
  forwardJsonRpcPayload,
  createStdioBridge,
} from '../src/bridge.mjs';

function formatHelp() {
  return [
    `${PACKAGE_NAME} v${PACKAGE_VERSION} — Official MCP STDIO ⇄ Streamable HTTP Bridge`,
    '',
    'Usage:',
    '  LESCRIBEAUDIO_MCP_TOKEN=lsa_mcp_... npx -y lescribeaudio-mcp',
    '  lescribeaudio-mcp --info [--json]',
    '  lescribeaudio-mcp --check [--endpoint <url>]',
    '  lescribeaudio-mcp --help | --version',
    '',
    'Environment variables:',
    '  LESCRIBEAUDIO_MCP_TOKEN   Personal MCP Access Token (lsa_mcp_..., TTL 30–180 days)',
    `                            Generate at: ${TOKEN_BUILDER_URL}`,
    `  LESCRIBEAUDIO_MCP_URL     Override Streamable HTTP endpoint (default: ${DEFAULT_MCP_ENDPOINT})`,
    '',
    'Documentation & RGPD:',
    `  MCP Guide:  ${DOCUMENTATION_URL}`,
    '  Security:   https://lescribeaudio.com/securite-rgpd (OVHcloud France AES-256 · Vertex AI Europe Zero Data Retention)',
    '  Phone:      +33 9 61 44 46 64 (09 61 44 46 64)',
  ].join('\n');
}

function formatStaticInfo(asJson = false) {
  const info = {
    name: PACKAGE_NAME,
    registryName: 'io.github.lescribeaudio/mcp',
    version: PACKAGE_VERSION,
    transport: {
      bridge: 'stdio-to-streamable-http',
      upstreamEndpoint: process.env.LESCRIBEAUDIO_MCP_URL || DEFAULT_MCP_ENDPOINT,
      protocolVersions: SUPPORTED_PROTOCOL_VERSIONS,
    },
    authentication: {
      env: 'LESCRIBEAUDIO_MCP_TOKEN',
      tokenPrefix: 'lsa_mcp_',
      ttlDaysRange: '30-180',
      generatorUrl: TOKEN_BUILDER_URL,
    },
    security: {
      storage: 'France — OVHcloud (AES-256)',
      inference: 'Google Cloud Vertex AI (Europe region, Zero Data Retention)',
      privacyUrl: 'https://lescribeaudio.com/securite-rgpd',
    },
    documentationUrl: DOCUMENTATION_URL,
    tools: MCP_TOOLS_CATALOG,
  };

  if (asJson) {
    return JSON.stringify(info, null, 2);
  }

  const lines = [
    `${PACKAGE_NAME} v${PACKAGE_VERSION} (io.github.lescribeaudio/mcp)`,
    `Endpoint Streamable HTTP : ${info.transport.upstreamEndpoint}`,
    `Documentation & Clés MCP : ${DOCUMENTATION_URL}`,
    'Hébergement & RGPD       : Stockage France OVHcloud (AES-256) · Inférence Google Cloud Vertex AI (Europe, Zero Data Retention)',
    '',
    `6 outils MCP disponibles (${SUPPORTED_PROTOCOL_VERSIONS.join(', ')}) :`,
    ...MCP_TOOLS_CATALOG.map(
      (t, idx) => `  ${idx + 1}. ${t.name} [${t.mode}] — ${t.summaryFr}`
    ),
  ];
  return lines.join('\n');
}

export async function runCli(
  argv = process.argv.slice(2),
  {
    env = process.env,
    input = process.stdin,
    output = process.stdout,
    errorOutput = process.stderr,
    fetchImpl = globalThis.fetch,
  } = {}
) {
  const args = [...argv];
  const hasFlag = (f) => args.includes(f);
  const getOption = (name) => {
    const idx = args.indexOf(name);
    if (idx !== -1 && idx + 1 < args.length) {
      return args[idx + 1];
    }
    return undefined;
  };

  if (hasFlag('--help') || hasFlag('-h')) {
    output.write(`${formatHelp()}\n`);
    return 0;
  }

  if (hasFlag('--version') || hasFlag('-v')) {
    output.write(`${PACKAGE_NAME} ${PACKAGE_VERSION}\n`);
    return 0;
  }

  const endpoint = (getOption('--endpoint') || env.LESCRIBEAUDIO_MCP_URL || DEFAULT_MCP_ENDPOINT).trim();
  const asJson = hasFlag('--json');

  if (hasFlag('--info')) {
    output.write(`${formatStaticInfo(asJson)}\n`);
    return 0;
  }

  if (hasFlag('--check')) {
    try {
      const discovery = await fetchDiscoveryInfo({ endpoint, fetchImpl });
      let authPingOk = null;
      const rawToken = getOption('--token') || env.LESCRIBEAUDIO_MCP_TOKEN;
      if (rawToken) {
        const frames = await forwardJsonRpcPayload(
          { jsonrpc: '2.0', id: 'check-1', method: 'ping' },
          { endpoint, token: rawToken, fetchImpl }
        );
        authPingOk = Array.isArray(frames) && frames.length === 1 && !frames[0].error;
      }

      if (asJson) {
        output.write(
          `${JSON.stringify(
            {
              ok: true,
              endpoint,
              authenticatedPing: authPingOk,
              discovery,
            },
            null,
            2
          )}\n`
        );
      } else {
        const remoteTools = Array.isArray(discovery.tools)
          ? discovery.tools.map((t) => t.name)
          : MCP_TOOLS_CATALOG.map((t) => t.name);
        output.write(
          [
            `[OK] Serveur MCP joignable : ${discovery.name || PACKAGE_NAME} v${discovery.version || PACKAGE_VERSION}`,
            `     Endpoint             : ${discovery.endpoint || endpoint}`,
            `     Protocoles MCP       : ${(discovery.protocolVersions || SUPPORTED_PROTOCOL_VERSIONS).join(', ')}`,
            `     Outils exposés (${remoteTools.length})   : ${remoteTools.join(', ')}`,
            authPingOk === null
              ? '     Jeton MCP            : non fourni (ajoutez LESCRIBEAUDIO_MCP_TOKEN pour tester l’authentification)'
              : authPingOk
                ? '     Jeton MCP            : authentification vérifiée (ping JSON-RPC 2.0 OK)'
                : '     Jeton MCP            : ÉCHEC d’authentification (clé invalide ou expirée)',
          ].join('\n') + '\n'
        );
        if (authPingOk === false) {
          return 1;
        }
      }
      return 0;
    } catch (err) {
      errorOutput.write(
        `[lescribeaudio-mcp] Échec de vérification sur ${endpoint} : ${err?.message || err}\n`
      );
      return 1;
    }
  }

  let token;
  try {
    token = validateToken(getOption('--token') || env.LESCRIBEAUDIO_MCP_TOKEN);
  } catch (err) {
    if (err instanceof McpConfigError) {
      errorOutput.write(`${err.message}\n`);
      return 1;
    }
    throw err;
  }

  const bridge = createStdioBridge({
    input,
    output,
    errorOutput,
    endpoint,
    token,
    fetchImpl,
  });

  await bridge.done;
  return 0;
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runCli().then((code) => {
    process.exitCode = code;
  });
}
