# wasm-lua DAP adapter

The stdio adapter speaks Debug Adapter Protocol 1.68 and launches the WASI
debug artifact. Run `pnpm dap`, then connect a DAP client over stdin/stdout
using the standard `Content-Length` framing.

Supported flows include source launch, line/conditional/hit-count breakpoints,
logpoints, continue, step in/over/out, pause, run to cursor, stack/scopes,
lazy variables, expression evaluation, `setVariable`, and unhandled exception
information. The browser SDK exposes the same message model over `MessagePort`.

The adapter intentionally does not attach to an already-running browser VM and
does not implement reverse/time-travel debugging.
