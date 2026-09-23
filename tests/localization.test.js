const test = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts } = require('./load-script');

// Note: values created inside the script context have that context's prototypes, so
// copy objects with JSON round-trips before deepEqual.
const plain = value => JSON.parse(JSON.stringify(value));

const ctx = loadScripts([], {
    globals: { state: { currentLanguage: 'en', mirrorRTL: true } },
    fromAppJs: [
        'languageFlags', 'fastlaneLocales', 'rtlLanguages', 'isRTL', 'isMirroredLanguage',
        'mirrorScreenshotSettings', 'mirrorElement', 'mirrorPopout'
    ]
});

test('every app language has an App Store locale for fastlane', () => {
    for (const lang of Object.keys(ctx.languageFlags)) {
        assert.ok(ctx.fastlaneLocales[lang], `${lang} has no fastlane locale`);
    }
});

test('shipped languages map to the fastlane folder names', () => {
    assert.equal(ctx.fastlaneLocales.en, 'en-US');
    assert.equal(ctx.fastlaneLocales.fr, 'fr-FR');
    assert.equal(ctx.fastlaneLocales.de, 'de-DE');
    assert.equal(ctx.fastlaneLocales.he, 'he');
});

test('Hebrew and Arabic are right-to-left and mirrored by default', () => {
    assert.ok(ctx.isRTL('he'));
    assert.ok(ctx.isRTL('ar'));
    assert.ok(!ctx.isRTL('en'));
    assert.ok(ctx.isMirroredLanguage('he'));
    assert.ok(!ctx.isMirroredLanguage('de'));
});

test('mirroring can be turned off per project', () => {
    ctx.state.mirrorRTL = false;
    try {
        assert.ok(!ctx.isMirroredLanguage('he'));
    } finally {
        ctx.state.mirrorRTL = true;
    }
});

test('device settings mirror horizontally, vertical values are untouched', () => {
    const ss = {
        x: 25, y: 60, scale: 70, rotation: 8, perspective: 5,
        shadow: { enabled: true, x: 20, y: 30, blur: 40 },
        rotation3D: { x: 10, y: 25, z: -5 }
    };
    const mirrored = plain(ctx.mirrorScreenshotSettings(ss));
    assert.deepEqual(mirrored, {
        x: 75, y: 60, scale: 70, rotation: -8, perspective: -5,
        shadow: { enabled: true, x: -20, y: 30, blur: 40 },
        rotation3D: { x: 10, y: -25, z: 5 }
    });
    // The stored settings are not modified
    assert.equal(ss.x, 25);
    assert.equal(ss.rotation3D.y, 25);
});

test('mirroring twice restores the original layout', () => {
    const ss = { x: 30, rotation: 12, perspective: -3, shadow: { x: 7 }, rotation3D: { x: 1, y: 2, z: 3 } };
    const twice = plain(ctx.mirrorScreenshotSettings(ctx.mirrorScreenshotSettings(ss)));
    assert.deepEqual(twice, ss);
});

test('elements and popouts mirror position, rotation and crop', () => {
    const image = { width: 10 };
    const el = plain({ ...ctx.mirrorElement({ x: 80, y: 15, rotation: 20, iconShadow: { x: 4, y: 6 }, image }), image: null });
    assert.deepEqual(el, { x: 20, y: 15, rotation: -20, iconShadow: { x: -4, y: 6 }, image: null });
    // Image objects are shared, not copied
    assert.equal(ctx.mirrorElement({ x: 50, image }).image, image);

    const popout = plain(ctx.mirrorPopout({ x: 72, y: 70, rotation: -6, cropX: 70, cropWidth: 25, shadow: { x: 3 } }));
    assert.deepEqual(popout, { x: 28, y: 70, rotation: 6, cropX: 5, cropWidth: 25, shadow: { x: -3 } });
});
