cmake_minimum_required(VERSION 3.25)
project(wasm_lua_bridge LANGUAGES C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)

set(LUA_DIR "${CMAKE_SOURCE_DIR}/vendor/lua-5.5.1/src")
set(LUA_SOURCES
  lapi.c lauxlib.c lbaselib.c lcode.c lcorolib.c lctype.c ldblib.c ldebug.c
  ldo.c ldump.c lfunc.c lgc.c linit.c liolib.c llex.c lmathlib.c lmem.c
  lobject.c lopcodes.c lparser.c lstate.c lstring.c
  loadlib.c loslib.c lstrlib.c ltable.c ltablib.c ltm.c lundump.c
  lutf8lib.c lvm.c lzio.c
)
list(TRANSFORM LUA_SOURCES PREPEND "${LUA_DIR}/")

add_library(lua55 STATIC ${LUA_SOURCES})
target_include_directories(lua55 PUBLIC "${LUA_DIR}")
target_compile_options(lua55 PRIVATE -O3 -fvisibility=hidden -Wall -Wextra)

if(WLUA_TARGET STREQUAL "wasi")
  # WASI SDK gates these libc compatibility layers explicitly. Lua uses
  # setjmp/longjmp internally for protected calls and sig_atomic_t for hooks.
  target_compile_definitions(lua55 PRIVATE
    _WASI_EMULATED_SIGNAL _WASI_EMULATED_PROCESS_CLOCKS L_tmpnam=32)
  target_compile_options(lua55 PRIVATE
    "SHELL:-mllvm -wasm-enable-sjlj"
    "SHELL:-mllvm -wasm-use-legacy-eh=false")
endif()

foreach(kind IN ITEMS runtime debug)
  set(target "lua-${kind}")
  add_executable(${target} native/bridge/wlua_bridge.c)
  target_include_directories(${target} PRIVATE native/bridge "${LUA_DIR}")
  target_link_libraries(${target} PRIVATE lua55 m)
  target_compile_options(${target} PRIVATE -O3 -fvisibility=hidden -Wall -Wextra)
  if(kind STREQUAL "debug")
    target_compile_definitions(${target} PRIVATE WLUA_DEBUGGER=1)
  else()
    target_compile_definitions(${target} PRIVATE WLUA_DEBUGGER=0)
  endif()

  if(WLUA_TARGET STREQUAL "emscripten")
    set_target_properties(${target} PROPERTIES SUFFIX ".mjs")
    target_link_options(${target} PRIVATE
      --no-entry
      -sMODULARIZE=1
      -sEXPORT_ES6=1
      "-sEXPORT_NAME=createWluaModule"
      "-sENVIRONMENT=worker,node"
      -sALLOW_MEMORY_GROWTH=1
      -sMAXIMUM_MEMORY=536870912
      -sFILESYSTEM=0
      -sASSERTIONS=0
      -sSINGLE_FILE=0
      "-sEXPORTED_RUNTIME_METHODS=HEAPU8"
    )
  elseif(WLUA_TARGET STREQUAL "wasi")
    set_target_properties(${target} PROPERTIES SUFFIX ".wasm")
    target_link_options(${target} PRIVATE
      -mexec-model=reactor
      -Wl,--no-entry
      -Wl,--export-memory
      -Wl,--initial-memory=16777216
      -Wl,--max-memory=536870912
      -Wl,--export-dynamic
      -Wl,--strip-all
      "SHELL:-mllvm -wasm-enable-sjlj"
      "SHELL:-mllvm -wasm-use-legacy-eh=false"
      -lwasi-emulated-signal
      -lsetjmp
    )
  else()
    message(FATAL_ERROR "Set WLUA_TARGET to emscripten or wasi")
  endif()
endforeach()

option(WLUA_BUILD_OFFICIAL_TEST_RUNNER "Build a non-shipping Lua CLI for the official suite" OFF)
if(WLUA_BUILD_OFFICIAL_TEST_RUNNER)
  add_executable(lua-official "${LUA_DIR}/lua.c")
  target_link_libraries(lua-official PRIVATE lua55 m)
  target_compile_options(lua-official PRIVATE -O2 -fvisibility=hidden -Wall -Wextra)
  if(WLUA_TARGET STREQUAL "emscripten")
    set_target_properties(lua-official PROPERTIES SUFFIX ".mjs")
    target_link_options(lua-official PRIVATE
      -sMODULARIZE=1
      -sEXPORT_ES6=1
      "-sEXPORT_NAME=createOfficialLua"
      "-sENVIRONMENT=web,worker,node"
      -sALLOW_MEMORY_GROWTH=1
      -sMAXIMUM_MEMORY=536870912
      -sEXIT_RUNTIME=1
      -sFORCE_FILESYSTEM=1
      "-sEXPORTED_RUNTIME_METHODS=FS"
      --preload-file
      "${CMAKE_SOURCE_DIR}/vendor/lua-5.5.1-tests@/tests"
      "SHELL:-mllvm -wasm-enable-sjlj"
      "SHELL:-mllvm -wasm-use-legacy-eh=false"
    )
  elseif(WLUA_TARGET STREQUAL "wasi")
    target_sources(lua-official PRIVATE native/tests/wasi_cli_compat.c)
    # WASI libc reports non-C locales as selected without providing matching
    # numeric conversion. The official suite explicitly permits unavailable
    # host locales, so expose the real Preview 1 limitation to Lua.
    target_compile_definitions(lua55 PRIVATE
      setlocale=wlua_test_setlocale fopen=wlua_test_fopen)
    target_compile_definitions(lua-official PRIVATE
      _WASI_EMULATED_SIGNAL _WASI_EMULATED_PROCESS_CLOCKS L_tmpnam=32)
    set_target_properties(lua-official PROPERTIES SUFFIX ".wasm")
    target_link_options(lua-official PRIVATE
      -Wl,--initial-memory=33554432
      -Wl,--max-memory=536870912
      -Wl,--strip-all
      "SHELL:-mllvm -wasm-enable-sjlj"
      "SHELL:-mllvm -wasm-use-legacy-eh=false"
      -lwasi-emulated-signal
      -lwasi-emulated-process-clocks
      -lsetjmp
    )
  endif()
endif()
