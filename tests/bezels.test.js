const test = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts } = require('./load-script');

const ctx = loadScripts([], {
    fromAppJs: ['deviceBezels', 'isIPadImage', 'resolveBezelModel', 'getBezelUrl']
});

const iphoneShot = { width: 1320, height: 2868 };
const ipadShot = { width: 2048, height: 2732 };
const ipadLandscape = { width: 2732, height: 2048 };

test('automatic model follows the screenshot shape', () => {
    assert.equal(ctx.resolveBezelModel({ model: 'auto' }, iphoneShot), 'iphone-18-pro');
    assert.equal(ctx.resolveBezelModel({ model: 'auto' }, ipadShot), 'ipad-pro-13');
    assert.equal(ctx.resolveBezelModel({ model: 'auto' }, ipadLandscape), 'ipad-pro-13');
});

test('an explicit model wins, unknown models fall back to automatic', () => {
    assert.equal(ctx.resolveBezelModel({ model: 'ipad-pro-13' }, iphoneShot), 'ipad-pro-13');
    assert.equal(ctx.resolveBezelModel({ model: 'no-such-device' }, iphoneShot), 'iphone-18-pro');
});

test('bezel file paths use model, color and orientation', () => {
    assert.equal(
        ctx.getBezelUrl({ bezel: { enabled: true, model: 'auto', color: 'glacier' } }, iphoneShot),
        'frames/iphone-18-pro/glacier-portrait.png'
    );
    assert.equal(
        ctx.getBezelUrl({ bezel: { enabled: true, model: 'auto', color: null } }, ipadLandscape),
        'frames/ipad-pro-13/silver-landscape.png'
    );
});

test('a color the model does not have falls back to its first color', () => {
    // "glacier" exists for the iPhone but not the iPad
    assert.equal(
        ctx.getBezelUrl({ bezel: { enabled: true, model: 'ipad-pro-13', color: 'glacier' } }, ipadShot),
        'frames/ipad-pro-13/silver-portrait.png'
    );
});

test('no bezel when disabled or missing', () => {
    assert.equal(ctx.getBezelUrl({ bezel: { enabled: false, model: 'auto' } }, iphoneShot), null);
    assert.equal(ctx.getBezelUrl({}, iphoneShot), null);
    assert.equal(ctx.getBezelUrl({ bezel: { enabled: true, model: 'auto' } }, null), null);
});

test('every catalog entry matches a frames/ folder layout', () => {
    for (const [model, spec] of Object.entries(ctx.deviceBezels)) {
        assert.match(model, /^[a-z0-9-]+$/, `${model} is not a web-safe folder name`);
        assert.ok(['iPhone', 'iPad'].includes(spec.deviceType), `${model} has an unknown device type`);
        assert.ok(spec.colors.length > 0, `${model} has no colors`);
        for (const color of spec.colors) assert.match(color, /^[a-z-]+$/, `${model}/${color}`);
    }
});
