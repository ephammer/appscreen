const test = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts } = require('./load-script');

const ctx = loadScripts(['language-utils.js'], { fromAppJs: ['languageFlags'] });

test('detectLanguageFromFilename reads language suffixes', () => {
    const cases = {
        'screenshot_de.png': 'de',
        'screenshot-fr.png': 'fr',
        'Screenshot_DE.PNG': 'de',
        'home_de-DE.png': 'de',
        'final_en-gb.png': 'en-gb',
        'shot_zh-TW.png': 'zh-tw'
    };
    for (const [filename, lang] of Object.entries(cases)) {
        assert.equal(ctx.detectLanguageFromFilename(filename), lang, filename);
    }
});

test('detectLanguageFromFilename prefers longer codes (pt-br over pt)', () => {
    assert.equal(ctx.detectLanguageFromFilename('screenshot_pt-br.png'), 'pt-br');
    assert.equal(ctx.detectLanguageFromFilename('screenshot_pt_BR.png'), 'pt-br');
    assert.equal(ctx.detectLanguageFromFilename('screenshot_pt.png'), 'pt');
});

test('detectLanguageFromFilename falls back to en', () => {
    for (const filename of ['screenshot.png', 'iPhone_1.png', 'my_design.png', 'a_de_extra.png']) {
        assert.equal(ctx.detectLanguageFromFilename(filename), 'en', filename);
    }
});

test('getBaseFilename strips the language suffix and extension', () => {
    const cases = {
        'screenshot_de.png': 'screenshot',
        'screenshot-pt-br.png': 'screenshot',
        'home_de-DE.png': 'home',
        'shot_zh-TW.png': 'shot',
        'screenshot.png': 'screenshot',
        'my_design.png': 'my_design'
    };
    for (const [filename, base] of Object.entries(cases)) {
        assert.equal(ctx.getBaseFilename(filename), base, filename);
    }
});

test('localized variants share a base filename', () => {
    const base = ctx.getBaseFilename('onboarding_1.png');
    for (const variant of ['onboarding_1_de.png', 'onboarding_1-fr.png', 'onboarding_1_pt-br.png']) {
        assert.equal(ctx.getBaseFilename(variant), base, variant);
    }
});
