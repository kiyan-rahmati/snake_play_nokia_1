// Loads the browser modules (they attach to globalThis.SP) for Node tests.
require('../js/config.js');
require('../js/storage.js');
require('../js/engine.js');
try { require('../js/achievements.js'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
module.exports = globalThis.SP;
