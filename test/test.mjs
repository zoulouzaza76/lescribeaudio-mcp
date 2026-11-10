import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';

import {
  MCP_TOOLS_CATALOG,
  McpConfigError,
  validateToken,
  parseJsonRpcLine,
  forwardJsonRpcPayload,
  createStdioBridge,
} from '../src/bridge.mjs';
import { runCli } from '../bin/cli.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

test('package.json and server.json conform to MCP Registry requirements', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'lescribeaudio-mcp');
  assert.equal(pkg.version, '1.0.0');
  assert.equal(pkg.license, 'MIT');
  assert.equal(pkg.homepage, 'https://lescribeaudio.com/integrations-mcp');
  assert.equal(pkg.bin['lescribeaudio-mcp'], './bin/cli.mjs');
  assert.equal(pkg.dependencies, undefined, 'Must have 0 external dependencies');

  const serverJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'server.json'), 'utf8'));
  assert.equal(serverJson.name, 'io.github.lescribeaudio/mcp');
  assert.equal(serverJson.version, '1.0.0');
  assert.equal(serverJson.websiteUrl, 'https://lescribeaudio.com/integrations-mcp');
  assert.ok(Array.isArray(serverJson.remotes) && serverJson.remotes.length === 1);
  assert.equal(serverJson.remotes[0].type, 'streamable-http');
  assert.equal(serverJson.remotes[0].url, 'https://lescribeaudio.com/api/mcp');
  assert.equal(serverJson.remotes[0].headers[0].name, 'Authorization');
  assert.equal(serverJson.remotes[0].headers[0].isRequired, true);
  assert.equal(serverJson.remotes[0].headers[0].isSecret, true);
});

test('MCP_TOOLS_CATALOG lists all 6 official tools', () => {
  const names = MCP_TOOLS_CATALOG.map((t) => t.name);
  assert.deepEqual(names, [
    'list_transcriptions',
    'search_transcriptions',
    'get_transcription_text',
    'get_transcription_summary',
    'rename_speaker_label',
    'get_export_urls',
  ]);
});

test('validateToken rejects missing or invalid tokens with a clean actionable message', () => {
  assert.throws(
    () => validateToken(''),
    (err) => {
      assert.ok(err instanceof McpConfigError);
      assert.match(err.message, /LESCRIBEAUDIO_MCP_TOKEN/);
      assert.match(err.message, /https:\/\/lescribeaudio\.com\/integrations-mcp/);
      return true;
    }
  );

  assert.throws(() => validateToken('short'), McpConfigError);
  assert.throws(() => validateToken('lsa_mcp_has space_inside'), McpConfigError);
  assert.equal(
    validateToken('Bearer lsa_mcp_valid_personal_token_12345'),
    'lsa_mcp_valid_personal_token_12345'
  );
});

test('parseJsonRpcLine serializes and validates single frames, batches, notifications, and errors', () => {
  assert.deepEqual(parseJsonRpcLine('   '), { kind: 'empty' });

  const invalidJson = parseJsonRpcLine('{broken json');
  assert.equal(invalidJson.kind, 'error');
  assert.equal(invalidJson.response.error.code, -32700);

  const emptyBatch = parseJsonRpcLine('[]');
  assert.equal(emptyBatch.kind, 'error');
  assert.equal(emptyBatch.response.error.code, -32600);

  const notification = parseJsonRpcLine(
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })
  );
  assert.equal(notification.kind, 'valid');
  assert.equal(notification.expectsResponse, false);

  const request = parseJsonRpcLine(
    JSON.stringify({ jsonrpc: '2.0', id: 42, method: 'tools/list', params: {} })
  );
  assert.equal(request.kind, 'valid');
  assert.equal(request.expectsResponse, true);
  assert.equal(request.payload.id, 42);
});

test('CLI exits cleanly with code 1 and descriptive stderr when LESCRIBEAUDIO_MCP_TOKEN is missing', async () => {
  const out = new PassThrough();
  const err = new PassThrough();
  let stdoutText = '';
  let stderrText = '';
  out.on('data', (chunk) => {
    stdoutText += chunk.toString('utf8');
  });
  err.on('data', (chunk) => {
    stderrText += chunk.toString('utf8');
  });

  const code = await runCli([], {
    env: {},
    output: out,
    errorOutput: err,
  });

  assert.equal(code, 1);
  assert.equal(stdoutText, '');
  assert.match(stderrText, /LESCRIBEAUDIO_MCP_TOKEN/);
  assert.match(stderrText, /lsa_mcp_/);
});

test('STDIO bridge relays JSON-RPC 2.0 requests, ignores HTTP 202 notifications, and supports --check', async () => {
  const EXPECTED_TOKEN = 'lsa_mcp_unit_test_secret_token_2026';
  const receivedHeaders = [];

  const server = http.createServer((req, res) => {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          name: 'lescribeaudio-mcp',
          version: '1.0.0',
          transport: 'streamable-http',
          protocolVersions: ['2025-06-18', '2025-03-26', '2024-11-05'],
          endpoint: 'https://lescribeaudio.com/api/mcp',
          tools: MCP_TOOLS_CATALOG.map((t) => ({ name: t.name, description: t.summaryFr })),
        })
      );
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      receivedHeaders.push(req.headers.authorization);
      if (req.headers.authorization !== `Bearer ${EXPECTED_TOKEN}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Invalid MCP token' }));
        return;
      }

      const rpc = JSON.parse(body);
      if (!Object.prototype.hasOwnProperty.call(rpc, 'id')) {
        res.writeHead(202);
        res.end();
        return;
      }

      if (rpc.method === 'ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: {} }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: rpc.id,
          result: {
            protocolVersion: '2025-03-26',
            serverInfo: { name: 'lescribeaudio-mcp', version: '1.0.0' },
          },
        })
      );
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const mockEndpoint = `http://127.0.0.1:${port}/api/mcp`;

  try {
    // 1. Test --check with valid token
    const checkOut = new PassThrough();
    let checkText = '';
    checkOut.on('data', (c) => {
      checkText += c.toString('utf8');
    });
    const checkCode = await runCli(['--check', '--endpoint', mockEndpoint], {
      env: { LESCRIBEAUDIO_MCP_TOKEN: EXPECTED_TOKEN },
      output: checkOut,
      errorOutput: new PassThrough(),
    });
    assert.equal(checkCode, 0);
    assert.match(checkText, /\[OK\] Serveur MCP joignable/);
    assert.match(checkText, /authentification vérifiée/);

    // 2. Test full STDIO bridge stream (initialize + HTTP 202 notification + ping)
    const stdinStream = new PassThrough();
    const stdoutStream = new PassThrough();
    const outLines = [];
    stdoutStream.on('data', (chunk) => {
      for (const l of chunk.toString('utf8').split('\n')) {
        if (l.trim()) outLines.push(JSON.parse(l));
      }
    });

    const bridge = createStdioBridge({
      input: stdinStream,
      output: stdoutStream,
      errorOutput: new PassThrough(),
      endpoint: mockEndpoint,
      token: EXPECTED_TOKEN,
    });

    stdinStream.write(
      `${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })}\n`
    );
    stdinStream.write(
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`
    );
    stdinStream.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'ping' })}\n`);
    stdinStream.end();

    await bridge.done;

    assert.equal(outLines.length, 2, 'Notification HTTP 202 must not emit any stdout frame');
    assert.equal(outLines[0].id, 1);
    assert.equal(outLines[0].result.serverInfo.name, 'lescribeaudio-mcp');
    assert.equal(outLines[1].id, 2);
    assert.deepEqual(outLines[1].result, {});
    assert.ok(receivedHeaders.every((h) => h === `Bearer ${EXPECTED_TOKEN}`));

    // 3. Test HTTP 401 translates cleanly into a JSON-RPC error frame
    const unauthFrames = await forwardJsonRpcPayload(
      { jsonrpc: '2.0', id: 99, method: 'tools/list' },
      { endpoint: mockEndpoint, token: 'lsa_mcp_wrong_token_value_0000' }
    );
    assert.equal(unauthFrames.length, 1);
    assert.equal(unauthFrames[0].id, 99);
    assert.equal(unauthFrames[0].error.code, -32001);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
