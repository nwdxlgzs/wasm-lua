# Lua 5.5.1 official test adaptations for WebAssembly

The official `_U` suite is hash-verified and unpacked into a generated test
directory. The ordered patches here apply only to the test copy. They are not
part of Lua itself and are never linked into the production runtime/debug
artifacts.

The explicit WebAssembly-host skips are:

- `0001`: native C-stack overflow stress. A WASM stack overflow terminates the
  host before Lua can recover and inspect the error.
- `0003`: host filesystem, `/dev/null`, and process-I/O assumptions. Production
  runtimes expose no ambient host filesystem or process.
- `0004`: host locale switching. Browser/WASI hosts do not promise installation
  of the Portuguese locales required by this test.

`0002` is not a skip. It updates the malformed-name expectation for the
product-required validated UTF-8 identifier patch.

The test-only WASI compatibility stubs live in `native/tests/wasi_cli_compat.c`
and are not linked into production artifacts.
