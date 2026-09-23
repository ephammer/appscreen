const test = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts } = require('./load-script');

// Note: values created inside the script context have that context's prototypes, so
// copy arrays with Array.from() before deepEqual.

const storage = new Map();
const localStorage = {
    getItem: key => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value))
};
let fetchCalls = [];
let nextResponse = null;
const fetch = async (url, options) => {
    fetchCalls.push({ url, options });
    return nextResponse;
};
const ctx = loadScripts(['llm.js'], { globals: { localStorage, fetch } });

const KEY = 'secret-key-123';
const image = { mimeType: 'image/png', base64: 'AAAA' };

function jsonResponse(status, body) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body
    };
}

test('API keys are sent in headers, never in the URL', () => {
    for (const provider of ['anthropic', 'openai', 'google']) {
        const req = ctx.buildLLMRequest(provider, 'model-x', KEY, 'hi', [], 4096);
        assert.ok(!req.url.includes(KEY), `${provider} URL contains the key`);
        assert.ok(Object.values(req.headers).some(v => v.includes(KEY)), `${provider} headers lack the key`);
    }
});

test('images are placed before the prompt for every provider', () => {
    const anthropic = ctx.buildLLMRequest('anthropic', 'm', KEY, 'prompt', [image], 4096).body.messages[0].content;
    assert.deepEqual(Array.from(anthropic, p => p.type), ['image', 'text']);
    assert.equal(anthropic[0].source.data, 'AAAA');

    const openai = ctx.buildLLMRequest('openai', 'm', KEY, 'prompt', [image], 4096).body.messages[0].content;
    assert.deepEqual(Array.from(openai, p => p.type), ['image_url', 'text']);
    assert.equal(openai[0].image_url.url, 'data:image/png;base64,AAAA');

    const google = ctx.buildLLMRequest('google', 'm', KEY, 'prompt', [image], 4096).body.contents[0].parts;
    assert.equal(google[0].inlineData.data, 'AAAA');
    assert.equal(google[1].text, 'prompt');
});

test('OpenAI gets headroom for reasoning tokens', () => {
    const req = ctx.buildLLMRequest('openai', 'm', KEY, 'p', [], 4096);
    assert.equal(req.body.max_completion_tokens, 16384);
});

test('unknown providers are rejected', () => {
    assert.throws(() => ctx.buildLLMRequest('nope', 'm', KEY, 'p', [], 4096), /Unknown provider/);
});

test('callLLM uses the selected model and returns the response text', async () => {
    storage.set('anthropicModel', 'claude-haiku-4-5-20251001');
    fetchCalls = [];
    nextResponse = jsonResponse(200, { content: [{ text: 'hello back' }] });
    const text = await ctx.callLLM('anthropic', KEY, 'hello');
    assert.equal(text, 'hello back');
    assert.equal(JSON.parse(fetchCalls[0].options.body).model, 'claude-haiku-4-5-20251001');
});

test('callLLM maps rejected keys to AI_UNAVAILABLE', async () => {
    const quiet = console.error;
    console.error = () => {};
    try {
        const cases = [
            ['anthropic', 401, 'AI_UNAVAILABLE'],
            ['openai', 403, 'AI_UNAVAILABLE'],
            ['google', 400, 'AI_UNAVAILABLE'], // Gemini reports a bad key as 400
            ['anthropic', 400, /API request failed: 400 - bad request/],
            ['openai', 500, /API request failed: 500/]
        ];
        for (const [provider, status, expected] of cases) {
            nextResponse = jsonResponse(status, { error: { message: 'bad request' } });
            await assert.rejects(ctx.callLLM(provider, KEY, 'x'), { message: expected }, `${provider} ${status}`);
        }
    } finally {
        console.error = quiet;
    }
});
