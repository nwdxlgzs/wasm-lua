# Lua 5.5.1 grammar corrections

Upstream: `@tree-sitter-grammars/tree-sitter-lua@0.4.1` (MIT).

`prepare-grammar.mjs` verifies the original npm tarball SHA-512, extracts a
real generated copy (never a pnpm symlink), and applies the ordered unified
diffs in this directory with `git apply --check`:

- identifiers follow the product's validated UTF-8 Lua lexer patch, including
  Chinese names; the official compiler diagnostic remains the final validity
  authority;
- LuaJIT binary numerals and integer/imaginary suffixes are removed;
- Lua 5.5 contextual `global` declarations remain enabled.

The contextual keyword is implemented by a patched external scanner so
`global name` is a declaration while `global = 1`, `local global`, and
`globalName` remain ordinary identifiers under the default
`LUA_COMPAT_GLOBAL` configuration. `pnpm test:grammar` differentially checks
the generated CST against the official Lua compiler.

These grammar corrections do not edit the unpacked Lua sources. The separate,
auditable Lua UTF-8 patch is in `patches/lua`.
