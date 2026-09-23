// LLM Provider Configuration
// Centralized configuration for all AI translation providers and models

const llmProviders = {
    anthropic: {
        name: 'Anthropic (Claude)',
        keyPrefix: 'sk-ant-',
        storageKey: 'claudeApiKey',
        modelStorageKey: 'anthropicModel',
        models: [
            { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5 ($)' },
            { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 ($$)' },
            { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5 ($$$)' }
        ],
        defaultModel: 'claude-sonnet-4-5-20250929'
    },
    openai: {
        name: 'OpenAI (GPT)',
        keyPrefix: 'sk-',
        storageKey: 'openaiApiKey',
        modelStorageKey: 'openaiModel',
        models: [
            { id: 'gpt-5.1-2025-11-13', name: 'GPT-5.1 ($$$)' },
            { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini ($$)' },
            { id: 'gpt-5-nano-2025-08-07', name: 'GPT-5 Nano ($)' }
        ],
        defaultModel: 'gpt-5-mini-2025-08-07'
    },
    google: {
        name: 'Google (Gemini)',
        keyPrefix: 'AIza',
        storageKey: 'googleApiKey',
        modelStorageKey: 'googleModel',
        models: [
            { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview) ($$)' },
            { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview) ($$$)' },
            { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite ($)' },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash ($$)' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro ($$$)' }
        ],
        defaultModel: 'gemini-2.5-flash'
    }
};

/**
 * Get the selected model for a provider
 * @param {string} provider - Provider key (anthropic, openai, google)
 * @returns {string} - Model ID
 */
function getSelectedModel(provider) {
    const config = llmProviders[provider];
    if (!config) return null;
    return localStorage.getItem(config.modelStorageKey) || config.defaultModel;
}

/**
 * Get the selected provider
 * @returns {string} - Provider key
 */
function getSelectedProvider() {
    return localStorage.getItem('aiProvider') || 'anthropic';
}

/**
 * Get API key for a provider
 * @param {string} provider - Provider key
 * @returns {string|null} - API key or null
 */
function getApiKey(provider) {
    const config = llmProviders[provider];
    if (!config) return null;
    return localStorage.getItem(config.storageKey);
}

/**
 * Validate API key format for a provider
 * @param {string} provider - Provider key
 * @param {string} key - API key to validate
 * @returns {boolean} - Whether key format is valid
 */
function validateApiKeyFormat(provider, key) {
    const config = llmProviders[provider];
    if (!config) return false;
    return key.startsWith(config.keyPrefix);
}

/**
 * Generate HTML options for model select dropdown
 * @param {string} provider - Provider key
 * @param {string} selectedModel - Currently selected model ID (optional)
 * @returns {string} - HTML string of option elements
 */
function generateModelOptions(provider, selectedModel = null) {
    const config = llmProviders[provider];
    if (!config) return '';

    const selected = selectedModel || getSelectedModel(provider);
    return config.models.map(model =>
        `<option value="${model.id}"${model.id === selected ? ' selected' : ''}>${model.name}</option>`
    ).join('\n');
}

/**
 * Build the provider-specific request for a single-turn prompt with optional images
 * @param {string} provider - Provider key
 * @param {string} model - Model ID
 * @param {string} apiKey - API key
 * @param {string} prompt - Text prompt
 * @param {Array} images - Array of { mimeType, base64 } objects
 * @param {number} maxTokens - Output token limit
 * @returns {{url: string, headers: Object, body: Object, extractText: Function}}
 */
function buildLLMRequest(provider, model, apiKey, prompt, images, maxTokens) {
    switch (provider) {
        case 'anthropic':
            return {
                url: 'https://api.anthropic.com/v1/messages',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: {
                    model,
                    max_tokens: maxTokens,
                    messages: [{
                        role: 'user',
                        content: [
                            ...images.map(img => ({
                                type: 'image',
                                source: { type: 'base64', media_type: img.mimeType, data: img.base64 }
                            })),
                            { type: 'text', text: prompt }
                        ]
                    }]
                },
                extractText: data => data.content[0].text
            };
        case 'openai':
            return {
                url: 'https://api.openai.com/v1/chat/completions',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: {
                    model,
                    // GPT-5 models spend completion tokens on reasoning before answering,
                    // so leave headroom beyond the visible output
                    max_completion_tokens: Math.max(maxTokens, 16384),
                    messages: [{
                        role: 'user',
                        content: [
                            ...images.map(img => ({
                                type: 'image_url',
                                image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
                            })),
                            { type: 'text', text: prompt }
                        ]
                    }]
                },
                extractText: data => data.choices[0].message.content
            };
        case 'google':
            return {
                url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
                headers: {
                    'Content-Type': 'application/json',
                    // Header rather than ?key= so the key doesn't end up in URLs and logs
                    'x-goog-api-key': apiKey
                },
                body: {
                    contents: [{
                        parts: [
                            ...images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
                            { text: prompt }
                        ]
                    }]
                },
                extractText: data => data.candidates[0].content.parts[0].text
            };
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

/**
 * Send a single-turn prompt (optionally with images) to a provider's API
 * @param {string} provider - Provider key (anthropic, openai, google)
 * @param {string} apiKey - API key
 * @param {string} prompt - Text prompt
 * @param {Object} [options]
 * @param {Array} [options.images] - Array of { mimeType, base64 } objects
 * @param {number} [options.maxTokens] - Output token limit
 * @returns {Promise<string>} - Response text
 * @throws {Error} 'AI_UNAVAILABLE' when the key is rejected
 */
async function callLLM(provider, apiKey, prompt, { images = [], maxTokens = 4096 } = {}) {
    const model = getSelectedModel(provider);
    const request = buildLLMRequest(provider, model, apiKey, prompt, images, maxTokens);

    const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(request.body)
    });

    if (!response.ok) {
        const status = response.status;
        const errorBody = await response.json().catch(() => ({}));
        console.error(`${llmProviders[provider].name} API error:`, { status, model, error: errorBody });
        // Gemini reports an invalid key as 400
        const authFailed = status === 401 || status === 403 || (provider === 'google' && status === 400);
        if (authFailed) throw new Error('AI_UNAVAILABLE');
        throw new Error(`API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`);
    }

    return request.extractText(await response.json());
}
