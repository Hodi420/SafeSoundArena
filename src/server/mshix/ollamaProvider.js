'use strict';

class OllamaProviderError extends Error {
  constructor(code, message, status = 502, details) {
    super(message);
    this.name = 'OllamaProviderError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeBaseUrl(value) {
  return String(value || 'http://127.0.0.1:11434').replace(/\/+$/, '');
}

function parseJsonContent(content) {
  const text = String(content || '').trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch (nestedError) {
        // Fall through to a safe summary object below.
      }
    }
    return { summary: text.slice(0, 2000), parseWarning: 'model_response_was_not_json' };
  }
}

class OllamaProvider {
  constructor(options = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl || process.env.OLLAMA_BASE_URL);
    this.chatModel = String(
      options.chatModel || process.env.MSHIX_BRAIN_CHAT_MODEL || process.env.OLLAMA_MODEL || 'qwen3:4b'
    ).trim();
    this.embeddingModel = String(
      options.embeddingModel || process.env.MSHIX_BRAIN_EMBED_MODEL || 'embeddinggemma:300m'
    ).trim();
    this.timeoutMs = positiveInteger(
      options.timeoutMs || process.env.OLLAMA_REQUEST_TIMEOUT_MS,
      30 * 1000
    );
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.lastStatus = { status: 'unknown', checkedAt: null, error: null };

    if (typeof this.fetchImpl !== 'function') {
      throw new TypeError('OllamaProvider requires a fetch implementation.');
    }
  }

  getConfig() {
    return {
      baseUrl: this.baseUrl,
      chatModel: this.chatModel,
      embeddingModel: this.embeddingModel,
      timeoutMs: this.timeoutMs,
    };
  }

  async request(pathname, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${pathname}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          ...(options.headers || {}),
        },
      });
      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (error) {
        throw new OllamaProviderError('OLLAMA_INVALID_RESPONSE', 'Ollama returned invalid JSON.', 502);
      }
      if (!response.ok) {
        throw new OllamaProviderError(
          'OLLAMA_REQUEST_FAILED',
          data.error || `Ollama request failed with status ${response.status}.`,
          502,
          { status: response.status }
        );
      }
      return data;
    } catch (error) {
      if (error instanceof OllamaProviderError) throw error;
      const code = error?.name === 'AbortError' ? 'OLLAMA_TIMEOUT' : 'OLLAMA_UNAVAILABLE';
      throw new OllamaProviderError(
        code,
        code === 'OLLAMA_TIMEOUT'
          ? `Ollama request exceeded ${this.timeoutMs}ms.`
          : 'Ollama is not reachable.',
        code === 'OLLAMA_TIMEOUT' ? 504 : 503
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async health() {
    try {
      const data = await this.request('/api/tags', { method: 'GET', headers: {} });
      const models = Array.isArray(data.models) ? data.models.map((model) => model.name).filter(Boolean) : [];
      this.lastStatus = { status: 'ok', checkedAt: new Date().toISOString(), error: null, models };
      return this.lastStatus;
    } catch (error) {
      this.lastStatus = {
        status: 'degraded',
        checkedAt: new Date().toISOString(),
        error: { code: error.code || 'OLLAMA_UNAVAILABLE', message: error.message },
      };
      return this.lastStatus;
    }
  }

  async chatJson(prompt, options = {}) {
    const data = await this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model: options.model || this.chatModel,
        stream: false,
        format: 'json',
        options: { temperature: 0.1, ...(options.options || {}) },
        messages: [
          {
            role: 'system',
            content: 'Return only a compact JSON object. Never propose or execute tools, shell commands, network writes, payments, or state mutations.',
          },
          { role: 'user', content: String(prompt).slice(0, 12000) },
        ],
      }),
    });
    return parseJsonContent(data.message?.content || data.response);
  }

  async embed(input, options = {}) {
    const data = await this.request('/api/embed', {
      method: 'POST',
      body: JSON.stringify({
        model: options.model || this.embeddingModel,
        input: String(input).slice(0, 8000),
      }),
    });
    const vector = Array.isArray(data.embeddings) ? data.embeddings[0] : data.embedding;
    if (!Array.isArray(vector) || vector.length === 0 || vector.some((value) => !Number.isFinite(value))) {
      throw new OllamaProviderError('OLLAMA_INVALID_EMBEDDING', 'Ollama returned an invalid embedding vector.', 502);
    }
    return vector;
  }
}

module.exports = { OllamaProvider, OllamaProviderError };
