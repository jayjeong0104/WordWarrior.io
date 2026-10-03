The JavaScript files in this directory are the authoritative game client source.
Their order is defined in `tools/build_client.js`. The split sections were recovered
from the current desktop client so its newer UI, game options, inventory, clans,
dictionary, and replay behavior are retained.

From the repository root, run `node tools/build_client.js` to generate:

- `Server/lib/Web/lib/in_game_kkutu.js`
- `Server/lib/Web/public/js/in_game_kkutu.js` (desktop)
- `Server/lib/Web/public/js/in_game_kkutu.min.js` (mobile)

Both served files use the same source, including its runtime `mobile` branches.
The `.min.js` filename remains a readable compatibility output, as it was before
this build was repaired. This also allows the main-word regression checks to
compare the actual renderer in both clients. Do not edit the generated files.

`node tools/build_client.js --check` verifies the generated files without writing.
`node tools/test_client_regressions.js` checks source/output equality and exercises
the client game handlers. `node tools/test_main_word_rendering.js` checks the word
renderer and beta effects.

In `Server/lib`, `grunt client`, `grunt concat`, and `grunt pack` all perform the
same deterministic client build. `grunt` also minifies the other web scripts.
The game outputs are excluded from uglify, and `pack` never wraps an existing
output repeatedly.
