// Loads the app's browser scripts (plain globals, no modules) into an isolated
// context so their pure functions can be unit-tested with Node's built-in runner.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

// Pull a top-level `const name = ...;` or `function name(...) {...}` out of app.js,
// which can't be loaded whole outside the browser (it touches the DOM at load).
function extractFromAppJs(name) {
    const src = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const start = src.search(new RegExp(`^(const ${name} =|function ${name}\\()`, 'm'));
    if (start === -1) throw new Error(`${name} not found in app.js`);
    const firstLine = src.slice(start, src.indexOf('\n', start));
    if (firstLine.endsWith(';')) return firstLine; // single-line declaration
    const end = src.indexOf('\n}', start);
    return src.slice(start, end + 2) + (src[end + 2] === ';' ? ';' : '');
}

function loadScripts(files, { globals = {}, fromAppJs = [] } = {}) {
    const context = vm.createContext({ console, ...globals });
    for (const name of fromAppJs) {
        // `var` so extracted constants become properties the tests can read
        vm.runInContext(extractFromAppJs(name).replace(/^const /, 'var '), context);
    }
    for (const file of files) {
        vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
    }
    return context;
}

module.exports = { loadScripts };
