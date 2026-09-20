# Lua patch policy

Lua 5.5.1 is unpacked from the hash-verified official archive and then receives
the ordered unified diffs in this directory. Every patch states the exact
upstream version/hash, applies with `git apply`, and is covered by runtime and
editor regression tests. No edit is made directly inside the upstream archive.

`0001-utf8-identifiers.patch` is the product-required Chinese support patch.
It accepts valid UTF-8 in names and rejects malformed encodings.
