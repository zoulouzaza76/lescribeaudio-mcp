import readline from 'node:readline';

export const PACKAGE_NAME = 'lescribeaudio-mcp';
export const PACKAGE_VERSION = '1.0.0';
export const DEFAULT_MCP_ENDPOINT = 'https://lescribeaudio.com/api/mcp';
export const DOCUMENTATION_URL = 'https://lescribeaudio.com/integrations-mcp';
export const TOKEN_BUILDER_URL = 'https://lescribeaudio.com/integrations-mcp#mcp-config-builder';
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

export const MCP_TOOLS_CATALOG = [
  {
    name: 'list_transcriptions',
    mode: 'read-only',
    summaryFr:
      'Liste vos transcriptions récentes (file_id, nom du fichier, durée HH:MM:SS, statut, date et présence d’une synthèse).',
    summaryEn:
      'Lists your recent transcriptions (file_id, filename, HH:MM:SS duration, status, date, and summary availability).',
  },
  {
    name: 'search_transcriptions',
    mode: 'read-only',
    summaryFr:
      'Recherche plein texte un mot-clé, un thème ou un intervenant dans vos titres, synthèses et transcriptions avec extraits horodatés.',
    summaryEn:
      'Full-text search across your titles, summaries, and unlocked transcripts with timestamped snippets.',
  },
  {
    name: 'get_transcription_text',
    mode: 'read-only',
    summaryFr:
      'Lit le texte intégral séparé par intervenant (diarisation) avec timecodes [HH:MM:SS] optionnels et pagination jusqu’à 10 h.',
    summaryEn:
      'Reads full speaker-diarized transcript text with optional [HH:MM:SS] timecodes and character pagination.',
  },
  {
    name: 'get_transcription_summary',
    mode: 'read-only',
    summaryFr:
      'Récupère la synthèse exécutive suivie du développement chrono-thématique associée au dossier.',
    summaryEn:
      'Retrieves the executive summary followed by the chrono-thematic development generated for a transcript.',
  },
  {
    name: 'rename_speaker_label',
    mode: 'write-idempotent',
    summaryFr:
      'Renomme ou code globalement une étiquette d’intervenant (diarisation, ex. Enquêté P1 ou Mme Dubois) et met à jour l’export Word (.docx) 100 % modifiable.',
    summaryEn:
      'Globally renames or codes a speaker diarization label across all turns and refreshes the 100% editable Word (.docx) export.',
  },
  {
    name: 'get_export_urls',
    mode: 'read-only',
    summaryFr:
      'Fournit l’URL du lecteur interactif Studio et les liens d’export (.docx 100 % modifiable, .pdf, .srt, .vtt, .txt, corpus IRaMuTeQ).',
    summaryEn:
      'Returns the Studio interactive player URL and export links (100% editable .docx, .pdf, .srt, .vtt, .txt, IRaMuTeQ corpus).',
  },
];

export class McpConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'McpConfigError';
  }
}

/**
 * Validates the Personal MCP Access Token (`lsa_mcp_...` or Clerk Bearer JWT).
 * Throws a clean, actionable McpConfigError if missing or malformed.
 */
export function validateToken(rawToken) {
  const cleaned = typeof rawToken === 'string' ? rawToken.replace(/^Bearer\s+/i, '').trim() : '';
  if (!cleaned) {
    throw new McpConfigError(
      [
        '[lescribeaudio-mcp] Clé d’accès MCP manquante (variable LESCRIBEAUDIO_MCP_TOKEN non définie).',
        'Missing MCP access token (environment variable LESCRIBEAUDIO_MCP_TOKEN is not set).',
        `Générez votre clé personnelle à durée bornée (30 à 180 jours, préfixe lsa_mcp_...) sur : ${TOKEN_BUILDER_URL}`,
      ].join('\n')
    );
  }
  if (/\s/.test(cleaned) || cleaned.length < 12) {
    throw new McpConfigError(
      `[lescribeaudio-mcp] Format de jeton invalide. Utilisez une clé personnelle commençant par "lsa_mcp_..." générée sur ${TOKEN_BUILDER_URL}.`
    );
  }
  return cleaned;
}

/**
 * Parses a single newline-delimited JSON-RPC 2.0 frame from stdin.
 * Returns:
 * - `{ kind: 'empty' }` for blank lines
 * - `{ kind: 'error', response }` for malformed JSON or invalid JSON-RPC envelope
 * - `{ kind: 'valid', payload, expectsResponse }` for valid single or batch JSON-RPC messages
 */
export function parseJsonRpcLine(line) {
  if (typeof line !== 'string') {
    return { kind: 'empty' };
  }
  const trimmed = line.trim();
  if (!trimmed) {
    return { kind: 'empty' };
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      kind: 'error',
      response: {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error: invalid JSON line on stdin',
        },
      },
    };
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return {
        kind: 'error',
        response: {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32600,
            message: 'Invalid Request: empty JSON-RPC batch',
          },
        },
      };
    }
    const validItems = parsed.every(
      (item) => item && typeof item === 'object' && !Array.isArray(item) && item.jsonrpc === '2.0'
    );
    if (!validItems) {
      return {
        kind: 'error',
        response: {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32600,
            message: 'Invalid Request: all batch items must be JSON-RPC 2.0 objects',
          },
        },
      };
    }
    const expectsResponse = parsed.some((item) => Object.prototype.hasOwnProperty.call(item, 'id'));
    return { kind: 'valid', payload: parsed, expectsResponse };
  }

  if (!parsed || typeof parsed !== 'object' || parsed.jsonrpc !== '2.0' || typeof parsed.method !== 'string') {
    const id = parsed && typeof parsed === 'object' && 'id' in parsed ? parsed.id : null;
    return {
      kind: 'error',
      response: {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32600,
          message: 'Invalid Request: expected a JSON-RPC 2.0 message with "method"',
        },
      },
    };
  }

  const expectsResponse = Object.prototype.hasOwnProperty.call(parsed, 'id');
  return { kind: 'valid', payload: parsed, expectsResponse };
}

function buildUpstreamErrorResponse(payload, code, message) {
  if (Array.isArray(payload)) {
    const ids = payload
      .filter((item) => Object.prototype.hasOwnProperty.call(item, 'id'))
      .map((item) => item.id);
    if (ids.length === 0) return null;
    return ids.map((id) => ({
      jsonrpc: '2.0',
      id,
      error: { code, message },
    }));
  }
  if (!Object.prototype.hasOwnProperty.call(payload, 'id')) {
    return null;
  }
  return {
    jsonrpc: '2.0',
    id: payload.id,
    error: { code, message },
  };
}

function parseSseFrames(sseBody) {
  const messages = [];
  const blocks = sseBody.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const dataLines = [];
    for (const rawLine of block.split(/\r?\n/)) {
      if (rawLine.startsWith('data:')) {
        dataLines.push(rawLine.slice(5).trimStart());
      }
    }
    if (dataLines.length > 0) {
      const joined = dataLines.join('\n').trim();
      if (joined) {
        messages.push(JSON.parse(joined));
      }
    }
  }
  return messages;
}

/**
 * Relays a single JSON-RPC 2.0 object or batch to the Streamable HTTP MCP endpoint.
 * Returns an array of JSON-RPC response objects to emit on stdout (empty array for HTTP 202 notifications).
 */
export async function forwardJsonRpcPayload(
  payload,
  {
    endpoint = DEFAULT_MCP_ENDPOINT,
    token,
    timeoutMs = 30000,
    fetchImpl = globalThis.fetch,
  } = {}
) {
  const validToken = validateToken(token);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${validToken}`,
        'User-Agent': `${PACKAGE_NAME}/${PACKAGE_VERSION}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const reason = err && err.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : String(err?.message || err);
    const fallback = buildUpstreamErrorResponse(
      payload,
      -32603,
      `Network error reaching ${endpoint}: ${reason}`
    );
    return fallback ? [fallback] : [];
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 202 || res.status === 204) {
    return [];
  }

  const rawBody = await res.text();
  if (!res.ok) {
    let detail = rawBody.slice(0, 300).trim();
    try {
      const parsedErr = JSON.parse(rawBody);
      if (parsedErr && parsedErr.jsonrpc === '2.0') {
        return [parsedErr];
      }
      if (parsedErr && typeof parsedErr.detail === 'string') {
        detail = parsedErr.detail;
      }
    } catch {
      // Keep plain text snippet
    }
    const rpcCode = res.status === 401 || res.status === 403 ? -32001 : -32603;
    const msg =
      res.status === 401 || res.status === 403
        ? `Authentication failed (HTTP ${res.status}): ${detail || 'invalid or expired LESCRIBEAUDIO_MCP_TOKEN'}. Generate a fresh token at ${TOKEN_BUILDER_URL}`
        : `Upstream MCP HTTP ${res.status}: ${detail || res.statusText}`;
    const fallback = buildUpstreamErrorResponse(payload, rpcCode, msg);
    return fallback ? [fallback] : [];
  }

  if (!rawBody.trim()) {
    return [];
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/event-stream')) {
    return parseSseFrames(rawBody);
  }

  const decoded = JSON.parse(rawBody);
  return [decoded];
}

/**
 * Fetches public discovery metadata via `GET https://lescribeaudio.com/api/mcp`.
 */
export async function fetchDiscoveryInfo({
  endpoint = DEFAULT_MCP_ENDPOINT,
  timeoutMs = 10000,
  fetchImpl = globalThis.fetch,
} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': `${PACKAGE_NAME}/${PACKAGE_VERSION}`,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Starts the newline-delimited JSON-RPC 2.0 STDIO bridge.
 * Preserves request ordering while keeping stdout strictly reserved for JSON-RPC frames.
 */
export function createStdioBridge({
  input = process.stdin,
  output = process.stdout,
  errorOutput = process.stderr,
  endpoint = DEFAULT_MCP_ENDPOINT,
  token,
  timeoutMs = 30000,
  fetchImpl = globalThis.fetch,
} = {}) {
  const validToken = validateToken(token);

  const rl = readline.createInterface({
    input,
    crlfDelay: Infinity,
    terminal: false,
  });

  let queue = Promise.resolve();

  const writeFrame = (obj) => {
    output.write(`${JSON.stringify(obj)}\n`);
  };

  rl.on('line', (line) => {
    queue = queue
      .then(async () => {
        const parsed = parseJsonRpcLine(line);
        if (parsed.kind === 'empty') {
          return;
        }
        if (parsed.kind === 'error') {
          writeFrame(parsed.response);
          return;
        }
        const frames = await forwardJsonRpcPayload(parsed.payload, {
          endpoint,
          token: validToken,
          timeoutMs,
          fetchImpl,
        });
        for (const frame of frames) {
          if (frame !== null && frame !== undefined) {
            writeFrame(frame);
          }
        }
      })
      .catch((err) => {
        errorOutput.write(`[lescribeaudio-mcp] Bridge error: ${err?.message || err}\n`);
      });
  });

  const done = new Promise((resolve) => {
    rl.on('close', () => {
      queue.finally(resolve);
    });
  });

  return {
    close: () => rl.close(),
    done,
  };
}
