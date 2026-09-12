'use strict';

// Bounded read-only MCP connectivity probe. No repo, env, or runtime data is sent.
const endpoints = [
  { name: 'openaiDeveloperDocs', url: 'https://developers.openai.com/mcp' },
  { name: 'context7', url: 'https://mcp.context7.com/mcp' },
];

function decode(text, id) {
  if (!text.trim()) return undefined;
  try { return JSON.parse(text); } catch {}
  const messages = text.split(/\r?\n\r?\n/).flatMap(event => {
    const data = event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!data) return [];
    try { return [JSON.parse(data)]; } catch { return []; }
  });
  return messages.find(message => message.id === id);
}

async function probe(endpoint) {
  let session;
  let protocol = '2025-03-26';
  const request = async (id, method, params) => {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
    if (session) headers['Mcp-Session-Id'] = session;
    if (method !== 'initialize') headers['MCP-Protocol-Version'] = protocol;
    const response = await fetch(endpoint.url, {
      method: 'POST', headers, signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ jsonrpc: '2.0', ...(id === undefined ? {} : { id }), method, ...(params === undefined ? {} : { params }) }),
    });
    if (!response.ok) throw new Error('HTTP_' + response.status);
    if (method === 'initialize') session = response.headers.get('Mcp-Session-Id');
    const result = decode(await response.text(), id);
    if (result?.error) throw new Error('MCP_ERROR_' + result.error.code);
    return result?.result;
  };
  const init = await request(1, 'initialize', { protocolVersion: protocol, capabilities: {}, clientInfo: { name: 'documentation-connectivity-check', version: '1.0.0' } });
  if (!init?.serverInfo || !init?.protocolVersion) throw new Error('INVALID_INITIALIZE');
  protocol = init.protocolVersion;
  await request(undefined, 'notifications/initialized');
  const listed = await request(2, 'tools/list', {});
  if (!Array.isArray(listed?.tools)) throw new Error('INVALID_TOOLS_LIST');
  const output = { name: endpoint.name, endpoint: endpoint.url, initialized: true, protocol, server: init.serverInfo, tools: listed.tools.map(tool => ({ name: tool.name, annotations: tool.annotations, ...(process.argv.includes('--schema') ? { inputSchema: tool.inputSchema } : {}) })) };
  console.log(JSON.stringify(output));
  if (process.argv.includes('--query')) {
    const name = endpoint.name === 'context7' ? 'resolve-library-id' : 'search_openai_docs';
    const args = endpoint.name === 'context7' ? { libraryName: 'Next.js', query: 'Next.js environment variables NEXT_PUBLIC build time' } : { query: 'Responses API tools documentation', limit: 1 };
    if (!listed.tools.some(tool => tool.name === name)) throw new Error('EXPECTED_READ_TOOL_MISSING');
    const response = await request(3, 'tools/call', { name, arguments: args });
    const text = (response?.content ?? []).filter(item => item.type === 'text').map(item => item.text).join('\n');
    console.log(JSON.stringify({ name: endpoint.name, queryTool: name, queryIsPublicGeneric: true, toolError: response?.isError === true, resultCharacters: text.length, resultPreview: text.slice(0, 500) }));
    if (response?.isError || !text.length) throw new Error('QUERY_NOT_SUCCESSFUL');
  }
}

Promise.all(endpoints.map(async endpoint => {
  try { await probe(endpoint); }
  catch (error) { console.log(JSON.stringify({ name: endpoint.name, initializedOrQueryFailed: true, error: error.name === 'TimeoutError' ? 'TIMEOUT' : error.message })); process.exitCode = 1; }
}));
