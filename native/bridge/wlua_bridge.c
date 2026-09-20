#include "wlua_bridge.h"

#include <inttypes.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "lua.h"
#include "lauxlib.h"
#include "lualib.h"

#if defined(__EMSCRIPTEN__)
#include <emscripten/emscripten.h>
#define WLUA_EXPORT EMSCRIPTEN_KEEPALIVE
#else
#define WLUA_EXPORT __attribute__((visibility("default")))
#endif

#define HOOK_QUANTUM 50000
#define MAX_BREAKPOINTS 1024
#define MAX_DEBUG_REFS 2048
#define MAX_VALUE_REFS 8192
#define MAX_WIRE_ITEMS 100000
#define MAX_WASM_MEMORY 536870912u
#define USER_HOOKS_KEY "_WLUA_MANAGED_HOOKS"

enum wire_tag {
  W_NIL = 0, W_FALSE = 1, W_TRUE = 2, W_FLOAT64 = 3, W_INT64 = 4,
  W_BYTES = 5, W_STRING = 6, W_ARRAY = 7, W_MAP = 8, W_LUAREF = 9,
  W_JSREF = 10, W_ERROR = 11
};
enum pending_kind {
  PENDING_NONE, PENDING_SLICE, PENDING_DEBUG, PENDING_CAPABILITY,
  PENDING_INSTRUCTION_LIMIT
};
enum execution_kind {
  EXECUTION_IDLE, EXECUTION_RUNNING, EXECUTION_YIELDED_SLICE,
  EXECUTION_PAUSED_DEBUG, EXECUTION_YIELDED_CAPABILITY,
  EXECUTION_YIELDED_USER, EXECUTION_COMPLETE, EXECUTION_FAILED
};

typedef struct {
  unsigned char *data;
  size_t length;
  size_t capacity;
} buffer;

typedef struct {
  size_t used;
  size_t limit;
} quota_allocator;

typedef struct {
  lua_State *main_state;
  lua_State *run_state;
  lua_State *paused_state;
  int run_ref;
  quota_allocator allocator;
  buffer output;
  buffer result;
  buffer resume_value;
  buffer json;
  uint64_t instructions;
  uint64_t instruction_limit;
  uint64_t hook_progress;
  size_t output_limit;
  int profile;
  int pending;
  int execution;
  int resume_rejected;
  uint32_t capability_token;
  int current_line;
  int breakpoints[MAX_BREAKPOINTS];
  int breakpoint_ends[MAX_BREAKPOINTS];
  uint32_t breakpoint_count;
  int resume_mode;
  int step_line;
  int step_depth;
  uint32_t debug_pause_reason;
  int debug_refs[MAX_DEBUG_REFS];
  uint32_t debug_ref_count;
  int value_refs[MAX_VALUE_REFS];
  uint32_t value_ref_count;
} wlua_vm;

typedef struct {
  const unsigned char *data;
  size_t length;
  size_t offset;
} wire_reader;

static wlua_vm *vm_from_state(lua_State *L) {
  return *(wlua_vm **)lua_getextraspace(L);
}

static void breset(buffer *b) { b->length = 0; }

static int breserve(buffer *b, size_t extra) {
  size_t need;
  size_t capacity;
  unsigned char *next;
  if (extra > SIZE_MAX - b->length) return 0;
  need = b->length + extra;
  if (need <= b->capacity) return 1;
  capacity = b->capacity ? b->capacity : 256;
  while (capacity < need) {
    if (capacity > SIZE_MAX / 2) return 0;
    capacity *= 2;
  }
  next = (unsigned char *)realloc(b->data, capacity);
  if (!next) return 0;
  b->data = next;
  b->capacity = capacity;
  return 1;
}

static int bwrite(buffer *b, const void *data, size_t length) {
  if (!breserve(b, length)) return 0;
  if (length) memcpy(b->data + b->length, data, length);
  b->length += length;
  return 1;
}

static int braw(buffer *b, const char *text) { return bwrite(b, text, strlen(text)); }
static int bbyte(buffer *b, unsigned char value) { return bwrite(b, &value, 1); }

static int bu32(buffer *b, uint32_t value) {
  unsigned char bytes[4] = {
    (unsigned char)value, (unsigned char)(value >> 8),
    (unsigned char)(value >> 16), (unsigned char)(value >> 24)
  };
  return bwrite(b, bytes, sizeof(bytes));
}

static int bu64(buffer *b, uint64_t value) {
  unsigned char bytes[8];
  int i;
  for (i = 0; i < 8; i++) bytes[i] = (unsigned char)(value >> (i * 8));
  return bwrite(b, bytes, sizeof(bytes));
}

static void bfree(buffer *b) {
  free(b->data);
  b->data = NULL;
  b->length = b->capacity = 0;
}

static void *quota_alloc(void *ud, void *ptr, size_t old_size, size_t new_size) {
  quota_allocator *quota = (quota_allocator *)ud;
  void *next;
  if (!ptr) old_size = 0;
  if (new_size == 0) {
    free(ptr);
    quota->used = old_size <= quota->used ? quota->used - old_size : 0;
    return NULL;
  }
  if (new_size > old_size &&
      (quota->used >= quota->limit || new_size - old_size > quota->limit - quota->used))
    return NULL;
  next = realloc(ptr, new_size);
  if (!next) return NULL;
  if (new_size >= old_size) quota->used += new_size - old_size;
  else quota->used -= old_size - new_size;
  return next;
}

static void wire_begin(buffer *b) {
  static const unsigned char magic[4] = { 'W', 'L', 'U', 1 };
  breset(b);
  bwrite(b, magic, sizeof(magic));
}

static int add_debug_ref(wlua_vm *vm, lua_State *L, int index) {
  int ref;
  if (vm->debug_ref_count >= MAX_DEBUG_REFS) return LUA_NOREF;
  lua_pushvalue(L, index);
  ref = luaL_ref(L, LUA_REGISTRYINDEX);
  vm->debug_refs[vm->debug_ref_count++] = ref;
  return ref;
}

static int tracked_ref(const int *refs, uint32_t count, int ref) {
  uint32_t i;
  if (ref < 0) return 0;
  for (i = 0; i < count; i++)
    if (refs[i] == ref) return 1;
  return 0;
}

static int add_value_ref(wlua_vm *vm, lua_State *L, int index) {
  int ref;
  uint32_t slot;
  for (slot = 0; slot < vm->value_ref_count; slot++)
    if (vm->value_refs[slot] == LUA_NOREF) break;
  if (slot == MAX_VALUE_REFS) return LUA_NOREF;
  lua_pushvalue(L, index);
  ref = luaL_ref(L, LUA_REGISTRYINDEX);
  if (slot == vm->value_ref_count) vm->value_ref_count++;
  vm->value_refs[slot] = ref;
  return ref;
}

static void clear_debug_refs(wlua_vm *vm) {
  uint32_t i;
  if (!vm->main_state) return;
  for (i = 0; i < vm->debug_ref_count; i++)
    luaL_unref(vm->main_state, LUA_REGISTRYINDEX, vm->debug_refs[i]);
  vm->debug_ref_count = 0;
}

/* Lua strings are byte strings.  Preserve the ABI's distinction between
   UTF-8 text and binary data so string.dump and arbitrary file payloads never
   pass through TextDecoder replacement characters in JavaScript. */
static int valid_utf8(const unsigned char *s, size_t length) {
  size_t i = 0;
  while (i < length) {
    unsigned char first = s[i++];
    if (first <= 0x7f) continue;
    if (first >= 0xc2 && first <= 0xdf) {
      if (i >= length || s[i] < 0x80 || s[i] > 0xbf) return 0;
      i++;
      continue;
    }
    if (first >= 0xe0 && first <= 0xef) {
      unsigned char second;
      if (i + 1 >= length) return 0;
      second = s[i];
      if (second < 0x80 || second > 0xbf || s[i + 1] < 0x80 ||
          s[i + 1] > 0xbf || (first == 0xe0 && second < 0xa0) ||
          (first == 0xed && second > 0x9f)) return 0;
      i += 2;
      continue;
    }
    if (first >= 0xf0 && first <= 0xf4) {
      unsigned char second;
      if (i + 2 >= length) return 0;
      second = s[i];
      if (second < 0x80 || second > 0xbf || s[i + 1] < 0x80 ||
          s[i + 1] > 0xbf || s[i + 2] < 0x80 || s[i + 2] > 0xbf ||
          (first == 0xf0 && second < 0x90) ||
          (first == 0xf4 && second > 0x8f)) return 0;
      i += 3;
      continue;
    }
    return 0;
  }
  return 1;
}

static int wire_encode_value(wlua_vm *vm, lua_State *L, int index, buffer *b) {
  int type = lua_type(L, index);
  size_t length;
  const char *string;
  switch (type) {
    case LUA_TNIL: return bbyte(b, W_NIL);
    case LUA_TBOOLEAN: return bbyte(b, lua_toboolean(L, index) ? W_TRUE : W_FALSE);
    case LUA_TNUMBER:
      if (lua_isinteger(L, index))
        return bbyte(b, W_INT64) && bu64(b, (uint64_t)(int64_t)lua_tointeger(L, index));
      else {
        union { double number; uint64_t bits; } value;
        value.number = (double)lua_tonumber(L, index);
        return bbyte(b, W_FLOAT64) && bu64(b, value.bits);
      }
    case LUA_TSTRING:
      string = lua_tolstring(L, index, &length);
      return bbyte(b, valid_utf8((const unsigned char *)string, length)
                   ? W_STRING : W_BYTES) &&
             bu32(b, (uint32_t)length) && bwrite(b, string, length);
    default: {
      int ref = add_value_ref(vm, L, index);
      if (ref == LUA_NOREF) return 0;
      return bbyte(b, W_LUAREF) && bu32(b, (uint32_t)ref) &&
             bbyte(b, (unsigned char)type);
    }
  }
}

static void wire_encode_stack(wlua_vm *vm, lua_State *L, int first, int count) {
  int i;
  wire_begin(&vm->result);
  bbyte(&vm->result, W_ARRAY);
  bu32(&vm->result, (uint32_t)count);
  for (i = 0; i < count; i++)
    wire_encode_value(vm, L, first + i, &vm->result);
}

static int reader_take(wire_reader *r, void *out, size_t length) {
  if (r->offset > r->length || length > r->length - r->offset) return 0;
  if (length) memcpy(out, r->data + r->offset, length);
  r->offset += length;
  return 1;
}

static int reader_u32(wire_reader *r, uint32_t *value) {
  unsigned char b[4];
  if (!reader_take(r, b, 4)) return 0;
  *value = (uint32_t)b[0] | ((uint32_t)b[1] << 8) |
           ((uint32_t)b[2] << 16) | ((uint32_t)b[3] << 24);
  return 1;
}

static int reader_u64(wire_reader *r, uint64_t *value) {
  unsigned char b[8];
  int i;
  uint64_t result = 0;
  if (!reader_take(r, b, 8)) return 0;
  for (i = 0; i < 8; i++) result |= ((uint64_t)b[i]) << (i * 8);
  *value = result;
  return 1;
}

static int wire_decode_value(lua_State *L, wire_reader *r, int depth) {
  unsigned char tag;
  uint32_t length, i, ref;
  uint64_t bits;
  union { uint64_t bits; double number; } number;
  if (depth > 64 || !reader_take(r, &tag, 1)) return 0;
  switch (tag) {
    case W_NIL: lua_pushnil(L); return 1;
    case W_FALSE: lua_pushboolean(L, 0); return 1;
    case W_TRUE: lua_pushboolean(L, 1); return 1;
    case W_FLOAT64:
      if (!reader_u64(r, &number.bits)) return 0;
      lua_pushnumber(L, (lua_Number)number.number);
      return 1;
    case W_INT64:
      if (!reader_u64(r, &bits)) return 0;
      lua_pushinteger(L, (lua_Integer)(int64_t)bits);
      return 1;
    case W_BYTES: case W_STRING: case W_ERROR:
      if (!reader_u32(r, &length) || r->offset > r->length ||
          length > r->length - r->offset) return 0;
      lua_pushlstring(L, (const char *)(r->data + r->offset), length);
      r->offset += length;
      return 1;
    case W_ARRAY:
      if (!reader_u32(r, &length) || length > MAX_WIRE_ITEMS ||
          length > r->length - r->offset) return 0;
      lua_createtable(L, (int)length, 0);
      for (i = 0; i < length; i++) {
        if (!wire_decode_value(L, r, depth + 1)) return 0;
        lua_rawseti(L, -2, (lua_Integer)i + 1);
      }
      return 1;
    case W_MAP:
      if (!reader_u32(r, &length) || length > MAX_WIRE_ITEMS ||
          length > (r->length - r->offset) / 2) return 0;
      lua_createtable(L, 0, (int)length);
      for (i = 0; i < length; i++) {
        if (!wire_decode_value(L, r, depth + 1)) return 0;
        if (lua_isnil(L, -1) ||
            (lua_type(L, -1) == LUA_TNUMBER &&
             lua_tonumber(L, -1) != lua_tonumber(L, -1))) return 0;
        if (!wire_decode_value(L, r, depth + 1)) return 0;
        lua_rawset(L, -3);
      }
      return 1;
    case W_LUAREF:
      if (!reader_u32(r, &ref)) return 0;
      if (!reader_take(r, &tag, 1)) return 0;  /* declared Lua type */
      if (!tracked_ref(vm_from_state(L)->value_refs,
                       vm_from_state(L)->value_ref_count, (int)ref)) return 0;
      lua_rawgeti(L, LUA_REGISTRYINDEX, (lua_Integer)ref);
      return 1;
    default: return 0;
  }
}

static int decode_wire(lua_State *L, const unsigned char *data, size_t length) {
  wire_reader reader;
  if (length < 5 || data[0] != 'W' || data[1] != 'L' ||
      data[2] != 'U' || data[3] != 1) return 0;
  reader.data = data;
  reader.length = length;
  reader.offset = 4;
  return wire_decode_value(L, &reader, 0) && reader.offset == reader.length;
}

static int decode_wire_arguments(lua_State *L, const unsigned char *data,
                                 size_t length) {
  wire_reader reader;
  unsigned char tag;
  uint32_t count, i;
  int top = lua_gettop(L);
  if (length < 9 || data[0] != 'W' || data[1] != 'L' ||
      data[2] != 'U' || data[3] != 1) return -1;
  reader.data = data;
  reader.length = length;
  reader.offset = 4;
  if (!reader_take(&reader, &tag, 1) || tag != W_ARRAY ||
      !reader_u32(&reader, &count) || count > MAX_WIRE_ITEMS ||
      count > reader.length - reader.offset) return -1;
  for (i = 0; i < count; i++) {
    if (!wire_decode_value(L, &reader, 0)) {
      lua_settop(L, top);
      return -1;
    }
  }
  return reader.offset == reader.length ? (int)count : -1;
}

static int output_print(lua_State *L) {
  wlua_vm *vm = vm_from_state(L);
  int count = lua_gettop(L), i;
  for (i = 1; i <= count; i++) {
    size_t length;
    size_t extra;
    const char *text = luaL_tolstring(L, i, &length);
    extra = length + (i > 1 ? 1u : 0u);
    if (vm->output.length > vm->output_limit ||
        extra > vm->output_limit - vm->output.length) {
      lua_pop(L, 1);
      return luaL_error(L, "output budget exceeded");
    }
    if (i > 1) bbyte(&vm->output, '\t');
    bwrite(&vm->output, text, length);
    lua_pop(L, 1);
  }
  if (vm->output.length >= vm->output_limit)
    return luaL_error(L, "output budget exceeded");
  bbyte(&vm->output, '\n');
  return 0;
}

static const char *safe_load_reader(lua_State *L, void *data, size_t *length) {
  int *first = (int *)data;
  luaL_checkstack(L, 2, "too many nested functions");
  if (*first) *first = 0;
  else lua_pop(L, 1);
  lua_pushvalue(L, 1);
  lua_call(L, 0, 1);
  if (lua_isnil(L, -1)) {
    *length = 0;
    return NULL;
  }
  if (!lua_isstring(L, -1))
    luaL_error(L, "reader function must return a string");
  return lua_tolstring(L, -1, length);
}

static int safe_load(lua_State *L) {
  size_t length;
  const char *source = lua_tolstring(L, 1, &length);
  const char *name;
  int env_index = lua_isnone(L, 4) ? 0 : 4;
  const char *mode = luaL_optstring(L, 3, "t");
  int status;
  if (strchr(mode, 't') == NULL || strspn(mode, "t") != strlen(mode)) {
    lua_pushnil(L);
    lua_pushliteral(L, "binary chunks are disabled in the safe profile");
    return 2;
  }
  if (source) {
    name = luaL_optstring(L, 2, source);
    status = luaL_loadbufferx(L, source, length, name, "t");
  } else {
    int first = 1;
    name = luaL_optstring(L, 2, "=(load)");
    luaL_checktype(L, 1, LUA_TFUNCTION);
    status = lua_load(L, safe_load_reader, &first, name, "t");
  }
  if (status != LUA_OK) {
    lua_pushnil(L);
    lua_insert(L, -2);
    return 2;
  }
  if (env_index) {
    lua_pushvalue(L, env_index);
    lua_setupvalue(L, -2, 1);
  }
  return 1;
}

static int internal_pending(lua_State *L) {
  wlua_vm *vm = vm_from_state(L);
  lua_pushboolean(L, vm && vm->pending != PENDING_NONE);
  return 1;
}

static int internal_bubble(lua_State *L) { return lua_yield(L, 0); }

static int js_continuation(lua_State *L, int status, lua_KContext context) {
  wlua_vm *vm = vm_from_state(L);
  (void)status;
  (void)context;
  if (vm->resume_rejected) {
    if (!decode_wire(L, vm->resume_value.data, vm->resume_value.length))
      lua_pushliteral(L, "JavaScript capability rejected");
    return lua_error(L);
  }
  if (!decode_wire(L, vm->resume_value.data, vm->resume_value.length))
    lua_pushnil(L);
  return 1;
}

static int js_call(lua_State *L) {
  wlua_vm *vm = vm_from_state(L);
  int count = lua_gettop(L), i;
  luaL_checktype(L, 1, LUA_TSTRING);
  vm->capability_token++;
  if (vm->capability_token == 0) vm->capability_token = 1;
  wire_begin(&vm->result);
  bbyte(&vm->result, W_ARRAY);
  bu32(&vm->result, (uint32_t)count);
  for (i = 1; i <= count; i++) wire_encode_value(vm, L, i, &vm->result);
  vm->pending = PENDING_CAPABILITY;
  vm->paused_state = L;
  return lua_yieldk(L, 0, (lua_KContext)vm->capability_token, js_continuation);
}

static int stack_depth(lua_State *L) {
  lua_Debug ar;
  int depth = 0;
  while (lua_getstack(L, depth, &ar)) depth++;
  return depth;
}

static int hook_gcd(int left, int right) {
  while (right != 0) {
    int next = left % right;
    left = right;
    right = next;
  }
  return left;
}

static void execution_hook(lua_State *L, lua_Debug *ar);

static void apply_execution_hook(lua_State *L, int user_mask,
                                 int user_count) {
  int mask = LUA_MASKCOUNT | user_mask;
  int interval = HOOK_QUANTUM;
#if WLUA_DEBUGGER
  mask |= LUA_MASKLINE;
#endif
  if (user_count > 0) interval = hook_gcd(interval, user_count);
  lua_sethook(L, execution_hook, mask, interval);
}

static int user_hook_event_mask(int event) {
  if (event == LUA_HOOKLINE) return LUA_MASKLINE;
  if (event == LUA_HOOKRET) return LUA_MASKRET;
  if (event == LUA_HOOKCALL || event == LUA_HOOKTAILCALL) return LUA_MASKCALL;
  return event == LUA_HOOKCOUNT ? LUA_MASKCOUNT : 0;
}

static const char *user_hook_event_name(int event) {
  static const char *const names[] = {
    "call", "return", "line", "count", "tail call"
  };
  return event >= LUA_HOOKCALL && event <= LUA_HOOKTAILCALL
    ? names[event] : "unknown";
}

static void dispatch_user_hook(lua_State *L, lua_Debug *ar,
                               int count_advance) {
  int top = lua_gettop(L), mask, count, progress;
  lua_getfield(L, LUA_REGISTRYINDEX, USER_HOOKS_KEY);
  if (!lua_istable(L, -1)) { lua_settop(L, top); return; }
  lua_pushthread(L);
  lua_rawget(L, -2);
  if (!lua_istable(L, -1)) { lua_settop(L, top); return; }
  lua_rawgeti(L, -1, 2); mask = (int)lua_tointeger(L, -1); lua_pop(L, 1);
  if (!(mask & user_hook_event_mask(ar->event))) {
    lua_settop(L, top);
    return;
  }
  if (ar->event == LUA_HOOKCOUNT) {
    lua_rawgeti(L, -1, 3); count = (int)lua_tointeger(L, -1); lua_pop(L, 1);
    lua_rawgeti(L, -1, 4); progress = (int)lua_tointeger(L, -1); lua_pop(L, 1);
    progress += count_advance;
    if (count <= 0 || progress < count) {
      lua_pushinteger(L, progress); lua_rawseti(L, -2, 4);
      lua_settop(L, top);
      return;
    }
    lua_pushinteger(L, progress % count); lua_rawseti(L, -2, 4);
  }
  lua_rawgeti(L, -1, 1);
  if (!lua_isfunction(L, -1)) { lua_settop(L, top); return; }
  lua_pushstring(L, user_hook_event_name(ar->event));
  if (ar->currentline >= 0) lua_pushinteger(L, ar->currentline);
  else lua_pushnil(L);
  lua_getinfo(L, "lS", ar);
  lua_call(L, 2, 0);
  lua_settop(L, top);
}

#if WLUA_DEBUGGER
/* A breakpoint range is a request to relocate to the first hookable line in
   that range, not permission to stop at whichever line happens to execute
   first.  The distinction matters for goto, branches and run-to-cursor: a
   supported line that was deliberately skipped must not make the breakpoint
   drift to a later statement.  Lua's public debug API exposes the active-line
   table for the current function, so the native hook can make this decision
   without inspecting Lua internals or modifying the Lua sources. */
static int range_starts_at_current_active_line(lua_State *L, lua_Debug *ar,
                                                int start, int line) {
  int top = lua_gettop(L), first = line;
  if (!lua_getinfo(L, "L", ar) || !lua_istable(L, -1)) {
    lua_settop(L, top);
    return 1; /* Preserve the old range fallback if a host omits 'L'. */
  }
  lua_pushnil(L);
  while (lua_next(L, -2) != 0) {
    if (lua_isinteger(L, -2)) {
      lua_Integer active = lua_tointeger(L, -2);
      if (active >= start && active < first) first = (int)active;
    }
    lua_pop(L, 1);
  }
  lua_settop(L, top);
  return first == line;
}

static int has_breakpoint(lua_State *L, lua_Debug *ar, wlua_vm *vm, int line) {
  uint32_t i;
  for (i = 0; i < vm->breakpoint_count; i++) {
    int start = vm->breakpoints[i];
    int end = vm->breakpoint_ends[i];
    if (line < start || line > end) continue;
    if (start == end || range_starts_at_current_active_line(L, ar, start, line))
      return 1;
  }
  return 0;
}
#endif

static void execution_hook(lua_State *L, lua_Debug *ar) {
  wlua_vm *vm = vm_from_state(L);
  int depth, breakpoint_pause = 0, step_pause = 0;
  if (!vm) return;
  if (ar->event == LUA_HOOKCOUNT) {
    int interval = lua_gethookcount(L);
    vm->instructions += (uint64_t)interval;
    vm->hook_progress += (uint64_t)interval;
    if (vm->instruction_limit && vm->instructions > vm->instruction_limit) {
      /* A normal Lua error can be swallowed by coroutine.resume. Bubble the
         resource-limit stop through the same internal-yield path as slices so
         it remains a VM-wide hard boundary. */
      vm->pending = PENDING_INSTRUCTION_LIMIT;
      vm->paused_state = L;
      lua_yield(L, 0);
      return;
    }
    dispatch_user_hook(L, ar, interval);
    if (vm->hook_progress < HOOK_QUANTUM) return;
    vm->hook_progress %= HOOK_QUANTUM;
    vm->pending = PENDING_SLICE;
    vm->paused_state = L;
    lua_yield(L, 0);
    return;
  }
  dispatch_user_hook(L, ar, 0);
#if WLUA_DEBUGGER
  if (ar->event != LUA_HOOKLINE) return;
  lua_getinfo(L, "l", ar);
  vm->current_line = ar->currentline;
  depth = stack_depth(L);
  breakpoint_pause = has_breakpoint(L, ar, vm, ar->currentline);
  if (vm->resume_mode == WLUA_STEP_IN && ar->currentline != vm->step_line)
    step_pause = 1;
  else if (vm->resume_mode == WLUA_STEP_OVER &&
           depth <= vm->step_depth && ar->currentline != vm->step_line)
    step_pause = 1;
  else if (vm->resume_mode == WLUA_STEP_OUT && depth < vm->step_depth)
    step_pause = 1;
  if (breakpoint_pause || step_pause) {
    vm->pending = PENDING_DEBUG;
    vm->paused_state = L;
    vm->debug_pause_reason =
      (breakpoint_pause ? WLUA_PAUSE_BREAKPOINT : 0u) |
      (step_pause ? WLUA_PAUSE_STEP : 0u);
    vm->resume_mode = WLUA_CONTINUE;
    lua_yield(L, 0);
  }
#else
  (void)depth;
  (void)breakpoint_pause;
  (void)step_pause;
#endif
}

static void evaluation_hook(lua_State *L, lua_Debug *ar) {
  wlua_vm *vm = vm_from_state(L);
  (void)ar;
  if (!vm) return;
  vm->instructions += (uint64_t)lua_gethookcount(L);
  if (vm->instruction_limit && vm->instructions > vm->instruction_limit)
    luaL_error(L, "instruction budget exceeded during debugger evaluation");
}

static lua_State *managed_hook_thread(lua_State *L, int *argument) {
  if (lua_isthread(L, 1)) {
    *argument = 1;
    return lua_tothread(L, 1);
  }
  *argument = 0;
  return L;
}

static int managed_sethook(lua_State *L) {
  int argument, mask = 0, count = 0, clearing;
  const char *mask_text = "";
  lua_State *target = managed_hook_thread(L, &argument);
  if (L == vm_from_state(L)->main_state && vm_from_state(L)->paused_state)
    return luaL_error(L, "cannot change hooks during debugger evaluation");
  if (!lua_isnoneornil(L, argument + 1)) {
    lua_Integer requested;
    luaL_checktype(L, argument + 1, LUA_TFUNCTION);
    mask_text = luaL_checkstring(L, argument + 2);
    requested = luaL_optinteger(L, argument + 3, 0);
    luaL_argcheck(L, requested >= 0 && requested <= INT_MAX,
                  argument + 3, "count is out of range");
    count = (int)requested;
    if (strchr(mask_text, 'c')) mask |= LUA_MASKCALL;
    if (strchr(mask_text, 'r')) mask |= LUA_MASKRET;
    if (strchr(mask_text, 'l')) mask |= LUA_MASKLINE;
    if (count > 0) mask |= LUA_MASKCOUNT;
  }
  clearing = lua_isnoneornil(L, argument + 1);
  if (!luaL_getsubtable(L, LUA_REGISTRYINDEX, USER_HOOKS_KEY)) {
    lua_pushliteral(L, "k"); lua_setfield(L, -2, "__mode");
    lua_pushvalue(L, -1); lua_setmetatable(L, -2);
  }
  lua_pushthread(target);
  if (target != L) lua_xmove(target, L, 1);
  if (clearing) lua_pushnil(L);
  else {
    lua_createtable(L, 4, 0);
    lua_pushvalue(L, argument + 1); lua_rawseti(L, -2, 1);
    lua_pushinteger(L, mask); lua_rawseti(L, -2, 2);
    lua_pushinteger(L, count); lua_rawseti(L, -2, 3);
    lua_pushinteger(L, 0); lua_rawseti(L, -2, 4);
  }
  lua_rawset(L, -3);
  apply_execution_hook(target, mask, count);
  return 0;
}

static int managed_gethook(lua_State *L) {
  int argument, mask, count, index = 0;
  char text[4];
  lua_State *target = managed_hook_thread(L, &argument);
  lua_getfield(L, LUA_REGISTRYINDEX, USER_HOOKS_KEY);
  if (!lua_istable(L, -1)) { lua_pushnil(L); return 1; }
  lua_pushthread(target);
  if (target != L) lua_xmove(target, L, 1);
  lua_rawget(L, -2);
  if (!lua_istable(L, -1)) { lua_pushnil(L); return 1; }
  lua_rawgeti(L, -1, 1);
  lua_rawgeti(L, -2, 2); mask = (int)lua_tointeger(L, -1); lua_pop(L, 1);
  lua_rawgeti(L, -2, 3); count = (int)lua_tointeger(L, -1); lua_pop(L, 1);
  if (mask & LUA_MASKCALL) text[index++] = 'c';
  if (mask & LUA_MASKRET) text[index++] = 'r';
  if (mask & LUA_MASKLINE) text[index++] = 'l';
  text[index] = '\0';
  lua_pushstring(L, text);
  lua_pushinteger(L, count);
  return 3;
}

static int internal_inherit_hook(lua_State *L) {
  lua_State *target;
  wlua_vm *vm = vm_from_state(L);
  luaL_checktype(L, 1, LUA_TTHREAD);
  target = lua_tothread(L, 1);
  *(wlua_vm **)lua_getextraspace(target) = vm;
  apply_execution_hook(target, 0, 0);
  lua_settop(L, 1);
  return 1;
}

static const char *coroutine_patch =
  "local raw_resume, raw_create = coroutine.resume, coroutine.create\n"
  "local pack, unpack = table.pack, table.unpack\n"
  "local internal_pending = __wlua_internal_pending\n"
  "local internal_bubble = __wlua_internal_bubble\n"
  "local inherit_hook = __wlua_internal_inherit_hook\n"
  "coroutine.create = function(fn)\n"
  "  local co = raw_create(fn)\n"
  "  inherit_hook(co)\n"
  "  return co\n"
  "end\n"
  "coroutine.resume = function(co, ...)\n"
  "  local r = pack(raw_resume(co, ...))\n"
  "  while internal_pending() do\n"
  "    internal_bubble()\n"
  "    r = pack(raw_resume(co))\n"
  "  end\n"
  "  return unpack(r, 1, r.n)\n"
  "end\n"
  "coroutine.wrap = function(fn)\n"
  "  local co = coroutine.create(fn)\n"
  "  return function(...)\n"
  "    local r = pack(coroutine.resume(co, ...))\n"
  "    if not r[1] then error(r[2], 2) end\n"
  "    return unpack(r, 2, r.n)\n"
  "  end\n"
  "end\n"
  "__wlua_internal_pending, __wlua_internal_bubble = nil, nil\n"
  "__wlua_internal_inherit_hook = nil\n";

static const char *module_patch =
  "local loaded, preload = {}, {}\n"
  "package = {loaded = loaded, preload = preload, path = '', cpath = ''}\n"
  "function require(name)\n"
  "  if type(name) ~= 'string' then error('module name must be a string', 2) end\n"
  "  if loaded[name] ~= nil then return loaded[name] end\n"
  "  local value\n"
  "  if preload[name] then value = preload[name](name)\n"
  "  else\n"
  "    local provided = js.call('module:' .. name, name)\n"
  "    if type(provided) == 'table' and type(provided.source) == 'string' then\n"
  "      local loader, message = load(provided.source, '@' .. name, 't')\n"
  "      if not loader then error(message, 2) end\n"
  "      value = loader(name)\n"
  "    else value = provided end\n"
  "  end\n"
  "  if value == nil then value = true end\n"
  "  loaded[name] = value\n"
  "  return value\n"
  "end\n"
  "vfs = {read = function(path) return js.call('vfs.read', path) end}\n";

static const char *os_patch =
  "local call = js.call\n"
  "local function unsupported(name)\n"
  "  return function() error('os.' .. name .. ' is disabled in the browser sandbox', 2) end\n"
  "end\n"
  "os = {}\n"
  "function os.clock() return call('__wlua.os.clock') end\n"
  "function os.difftime(t2, t1) return t2 - t1 end\n"
  "function os.date(format, time)\n"
  "  return call('__wlua.os.date', format, time)\n"
  "end\n"
  "function os.time(value)\n"
  "  if value == nil then return call('__wlua.os.time') end\n"
  "  if type(value) ~= 'table' then error('bad argument #1 to time (table expected)', 2) end\n"
  "  local result = call('__wlua.os.time', value.year, value.month, value.day,\n"
  "    value.hour, value.min, value.sec, value.isdst)\n"
  "  value.year, value.month, value.day = result.year, result.month, result.day\n"
  "  value.hour, value.min, value.sec = result.hour, result.min, result.sec\n"
  "  value.yday, value.wday, value.isdst = result.yday, result.wday, result.isdst\n"
  "  return result.timestamp\n"
  "end\n"
  "function os.getenv(name) return call('__wlua.os.getenv', name) end\n"
  "function os.tmpname() return call('__wlua.os.tmpname') end\n"
  "function os.remove(path)\n"
  "  local ok, result = pcall(call, '__wlua.os.remove', path)\n"
  "  if ok then return result else return nil, result end\n"
  "end\n"
  "function os.rename(from, to)\n"
  "  local ok, result = pcall(call, '__wlua.os.rename', from, to)\n"
  "  if ok then return result else return nil, result end\n"
  "end\n"
  "function os.setlocale(locale, category)\n"
  "  if locale == nil or locale == 'C' then return 'C' end\n"
  "  return nil\n"
  "end\n"
  "os.execute, os.exit = unsupported('execute'), unsupported('exit')\n";

/* A Lua-shaped file API backed exclusively by the per-runtime JavaScript
   memory VFS.  It never links or calls libc filesystem functions. */
static const char *io_patch =
  "local call, pack, unpack = js.call, table.pack, table.unpack\n"
  "local methods, states = {}, setmetatable({}, {__mode='k'})\n"
  "local default_input, default_output\n"
  "local function state(file, level)\n"
  "  local value = states[file]\n"
  "  if not value then error('bad file handle', level or 3) end\n"
  "  if value.closed then error('attempt to use a closed file', level or 3) end\n"
  "  return value\n"
  "end\n"
  "local mt = {__index=methods, __name='FILE*'}\n"
  "mt.__tostring = function(file)\n"
  "  local value = states[file]\n"
  "  if not value then return 'file (invalid)' end\n"
  "  return value.closed and 'file (closed)' or ('file (' .. value.path .. ')')\n"
  "end\n"
  "mt.__close = function(file) return methods.close(file) end\n"
  "mt.__gc = function(file) local value=states[file]; if value then value.closed=true end end\n"
  "local function open_file(path, mode)\n"
  "  if type(path) ~= 'string' then error('bad argument #1 to open (string expected)', 3) end\n"
  "  mode = mode or 'r'\n"
  "  local ok, info = pcall(call, '__wlua.vfs.open', path, mode)\n"
  "  if not ok then return nil, info end\n"
  "  local file = setmetatable({}, mt)\n"
  "  states[file] = {path=info.path, position=info.position, readable=info.readable,\n"
  "    writable=info.writable, append=info.append, closed=false}\n"
  "  return file\n"
  "end\n"
  "function methods:close()\n"
  "  local value = state(self, 2)\n"
  "  value.closed = true\n"
  "  if default_input == self then default_input = nil end\n"
  "  if default_output == self then default_output = nil end\n"
  "  return true\n"
  "end\n"
  "function methods:flush() state(self, 2); return true end\n"
  "function methods:write(...)\n"
  "  local value = state(self, 2)\n"
  "  if not value.writable then return nil, 'file is not open for writing' end\n"
  "  local args, chunks = pack(...), {}\n"
  "  for index=1,args.n do\n"
  "    local kind = type(args[index])\n"
  "    if kind ~= 'string' and kind ~= 'number' then\n"
  "      error('bad argument #' .. index .. ' to write (string or number expected)', 2)\n"
  "    end\n"
  "    chunks[index] = tostring(args[index])\n"
  "  end\n"
  "  local ok, position = pcall(call, '__wlua.vfs.write', value.path,\n"
  "    value.position, value.append, table.concat(chunks))\n"
  "  if not ok then return nil, position end\n"
  "  value.position = position\n"
  "  return self\n"
  "end\n"
  "function methods:read(...)\n"
  "  local value = state(self, 2)\n"
  "  if not value.readable then return nil, 'file is not open for reading' end\n"
  "  local formats = pack(...); if formats.n == 0 then formats = pack('*l') end\n"
  "  local results = {n=0}\n"
  "  for index=1,formats.n do\n"
  "    local format = formats[index]\n"
  "    if type(format) ~= 'string' and type(format) ~= 'number' then\n"
  "      error('bad argument #' .. index .. ' to read (string or number expected)', 2)\n"
  "    end\n"
  "    local ok, result = pcall(call, '__wlua.vfs.read', value.path, value.position, format)\n"
  "    if not ok then return nil, result end\n"
  "    value.position, results[index], results.n = result.position, result.value, index\n"
  "    if result.value == nil then break end\n"
  "  end\n"
  "  return unpack(results, 1, results.n)\n"
  "end\n"
  "function methods:seek(whence, offset)\n"
  "  local value = state(self, 2); whence, offset = whence or 'cur', offset or 0\n"
  "  if math.type(offset) ~= 'integer' then error('bad offset (integer expected)', 2) end\n"
  "  local base\n"
  "  if whence == 'set' then base = 0\n"
  "  elseif whence == 'cur' then base = value.position\n"
  "  elseif whence == 'end' then\n"
  "    local ok, size = pcall(call, '__wlua.vfs.size', value.path)\n"
  "    if not ok then return nil, size end\n"
  "    base = size\n"
  "  else error('invalid option to seek', 2) end\n"
  "  local position = base + offset\n"
  "  if position < 0 then return nil, 'invalid file position' end\n"
  "  value.position = position; return position\n"
  "end\n"
  "function methods:lines(...)\n"
  "  local file, formats = self, pack(...); state(file, 2)\n"
  "  return function()\n"
  "    local result = pack(file:read(unpack(formats, 1, formats.n)))\n"
  "    if result[1] == nil and result[2] ~= nil then error(result[2], 2) end\n"
  "    return unpack(result, 1, result.n)\n"
  "  end\n"
  "end\n"
  "io = {}\n"
  "io.open = function(path, mode) return open_file(path, mode) end\n"
  "io.type = function(file)\n"
  "  local value = states[file]\n"
  "  return value and (value.closed and 'closed file' or 'file') or nil\n"
  "end\n"
  "io.close = function(file) return methods.close(file or default_output) end\n"
  "io.flush = function() return default_output and default_output:flush() or true end\n"
  "io.input = function(file)\n"
  "  if file == nil then return default_input end\n"
  "  if type(file) == 'string' then local opened,message=open_file(file,'r');\n"
  "    if not opened then error(message,2) end; file=opened else state(file,2) end\n"
  "  default_input=file; return file\n"
  "end\n"
  "io.output = function(file)\n"
  "  if file == nil then return default_output end\n"
  "  if type(file) == 'string' then local opened,message=open_file(file,'w');\n"
  "    if not opened then error(message,2) end; file=opened else state(file,2) end\n"
  "  default_output=file; return file\n"
  "end\n"
  "io.read = function(...)\n"
  "  if not default_input then return nil, 'default VFS input is not set' end\n"
  "  return default_input:read(...)\n"
  "end\n"
  "io.write = function(...)\n"
  "  if not default_output then return nil, 'default VFS output is not set' end\n"
  "  return default_output:write(...)\n"
  "end\n"
  "io.tmpfile = function() return open_file(os.tmpname(), 'w+b') end\n"
  "io.lines = function(path, ...)\n"
  "  local file, owned, message\n"
  "  if path == nil then file=default_input else file,message=open_file(path,'r'); owned=true end\n"
  "  if not file then error(message or 'default VFS input is not set', 2) end\n"
  "  local formats=pack(...)\n"
  "  return function()\n"
  "    local result=pack(file:read(unpack(formats,1,formats.n)))\n"
  "    if result[1] == nil then\n"
  "      if owned and io.type(file) == 'file' then file:close() end\n"
  "      if result[2] ~= nil then error(result[2],2) end\n"
  "      return nil\n"
  "    end\n"
  "    return unpack(result,1,result.n)\n"
  "  end\n"
  "end\n"
  "vfs = {}\n"
  "vfs.read = function(path) return call('vfs.read', path) end\n"
  "vfs.write = function(path, data, mode)\n"
  "  local file,message=open_file(path, mode or 'wb'); if not file then return nil,message end\n"
  "  local ok,why=file:write(data); file:close(); if not ok then return nil,why end; return true\n"
  "end\n"
  "vfs.size = function(path) return call('__wlua.vfs.size', path) end\n"
  "vfs.exists = function(path) return pcall(call, '__wlua.vfs.size', path) end\n";

static const char *file_load_patch =
  "function loadfile(filename, mode, env)\n"
  "  if type(filename) ~= 'string' then\n"
  "    return nil, 'loadfile requires a VFS filename'\n"
  "  end\n"
  "  local file, why = io.open(filename, 'rb')\n"
  "  if not file then return nil, why end\n"
  "  local source, read_error = file:read('*a')\n"
  "  file:close()\n"
  "  if source == nil then return nil, read_error end\n"
  "  return load(source, '@' .. filename, mode, env)\n"
  "end\n"
  "function dofile(filename)\n"
  "  local chunk, why = loadfile(filename)\n"
  "  if not chunk then error(why, 2) end\n"
  "  return chunk()\n"
  "end\n";

static void configure_libraries(wlua_vm *vm) {
  lua_State *L = vm->main_state;
  /* Register only libraries with no host filesystem/process authority. This
     also avoids linking io/os/package implementations into either artifact. */
  luaL_requiref(L, LUA_GNAME, luaopen_base, 1); lua_pop(L, 1);
  luaL_requiref(L, LUA_COLIBNAME, luaopen_coroutine, 1); lua_pop(L, 1);
  luaL_requiref(L, LUA_TABLIBNAME, luaopen_table, 1); lua_pop(L, 1);
  luaL_requiref(L, LUA_STRLIBNAME, luaopen_string, 1); lua_pop(L, 1);
  luaL_requiref(L, LUA_MATHLIBNAME, luaopen_math, 1); lua_pop(L, 1);
  luaL_requiref(L, LUA_UTF8LIBNAME, luaopen_utf8, 1); lua_pop(L, 1);
  if (vm->profile == WLUA_PROFILE_TRUSTED) {
    luaL_requiref(L, LUA_DBLIBNAME, luaopen_debug, 1); lua_pop(L, 1);
    lua_getglobal(L, LUA_DBLIBNAME);
    lua_pushcfunction(L, managed_sethook); lua_setfield(L, -2, "sethook");
    lua_pushcfunction(L, managed_gethook); lua_setfield(L, -2, "gethook");
    lua_pop(L, 1);
  }
  lua_pushcfunction(L, output_print); lua_setglobal(L, "print");
  if (vm->profile != WLUA_PROFILE_TRUSTED) {
    lua_pushcfunction(L, safe_load); lua_setglobal(L, "load");
  }
  lua_pushnil(L); lua_setglobal(L, "loadfile");
  lua_pushnil(L); lua_setglobal(L, "dofile");
  lua_newtable(L);
  lua_pushcfunction(L, js_call); lua_setfield(L, -2, "call");
  lua_setglobal(L, "js");
  lua_pushcfunction(L, internal_pending); lua_setglobal(L, "__wlua_internal_pending");
  lua_pushcfunction(L, internal_bubble); lua_setglobal(L, "__wlua_internal_bubble");
  lua_pushcfunction(L, internal_inherit_hook);
  lua_setglobal(L, "__wlua_internal_inherit_hook");
  if (luaL_loadbufferx(L, coroutine_patch, strlen(coroutine_patch),
                      "=@wlua/coroutine", "t") == LUA_OK)
    lua_pcall(L, 0, 0, 0);
  else
    lua_pop(L, 1);
  if (luaL_loadbufferx(L, module_patch, strlen(module_patch),
                      "=@wlua/modules", "t") == LUA_OK)
    lua_pcall(L, 0, 0, 0);
  else
    lua_pop(L, 1);
  if (luaL_loadbufferx(L, os_patch, strlen(os_patch),
                      "=@wlua/os", "t") == LUA_OK)
    lua_pcall(L, 0, 0, 0);
  else
    lua_pop(L, 1);
  if (luaL_loadbufferx(L, io_patch, strlen(io_patch),
                      "=@wlua/io", "t") == LUA_OK)
    lua_pcall(L, 0, 0, 0);
  else
    lua_pop(L, 1);
  if (luaL_loadbufferx(L, file_load_patch, strlen(file_load_patch),
                      "=@wlua/loadfile", "t") == LUA_OK)
    lua_pcall(L, 0, 0, 0);
  else
    lua_pop(L, 1);
}

static void encode_error(wlua_vm *vm, lua_State *L) {
  size_t length;
  const char *message = lua_tolstring(L, -1, &length);
  if (!message) { message = "unknown error"; length = strlen(message); }
  wire_begin(&vm->result);
  bbyte(&vm->result, W_ERROR);
  bu32(&vm->result, (uint32_t)length);
  bwrite(&vm->result, message, length);
}

static void encode_error_message(wlua_vm *vm, const char *message) {
  size_t length = strlen(message);
  wire_begin(&vm->result);
  bbyte(&vm->result, W_ERROR);
  bu32(&vm->result, (uint32_t)length);
  bwrite(&vm->result, message, length);
}

static void discard_run(wlua_vm *vm) {
  vm->paused_state = NULL;
  vm->run_state = NULL;
  vm->pending = PENDING_NONE;
  if (vm->run_ref != LUA_NOREF) {
    luaL_unref(vm->main_state, LUA_REGISTRYINDEX, vm->run_ref);
    vm->run_ref = LUA_NOREF;
  }
}

static void begin_execution(wlua_vm *vm) {
  clear_debug_refs(vm);
  discard_run(vm);
  breset(&vm->output);
  breset(&vm->result);
  breset(&vm->resume_value);
  vm->instructions = 0;
  vm->hook_progress = 0;
  vm->resume_rejected = 0;
  vm->current_line = -1;
  vm->resume_mode = WLUA_CONTINUE;
  vm->step_line = -1;
  vm->step_depth = 0;
  vm->debug_pause_reason = WLUA_PAUSE_NONE;
  vm->execution = EXECUTION_RUNNING;
}

static int finish_resume(wlua_vm *vm, int status, int result_count) {
  if (status == LUA_OK) {
    int top = lua_gettop(vm->run_state);
    clear_debug_refs(vm);
    wire_encode_stack(vm, vm->run_state, top - result_count + 1, result_count);
    vm->execution = EXECUTION_COMPLETE;
    discard_run(vm);
    return WLUA_STATE_COMPLETE;
  }
  if (status == LUA_YIELD) {
    if (vm->pending == PENDING_CAPABILITY) {
      vm->execution = EXECUTION_YIELDED_CAPABILITY;
      return WLUA_STATE_CAPABILITY;
    }
    if (vm->pending == PENDING_DEBUG) {
      vm->execution = EXECUTION_PAUSED_DEBUG;
      return WLUA_STATE_PAUSED;
    }
    if (vm->pending == PENDING_SLICE) {
      vm->execution = EXECUTION_YIELDED_SLICE;
      return WLUA_STATE_SLICE;
    }
    if (vm->pending == PENDING_INSTRUCTION_LIMIT) {
      static const char message[] = "instruction budget exceeded";
      encode_error_message(vm, message);
      vm->pending = PENDING_NONE;
      vm->execution = EXECUTION_FAILED;
      return WLUA_STATE_ERROR;
    }
    wire_encode_stack(vm, vm->run_state,
                      lua_gettop(vm->run_state) - result_count + 1,
                      result_count);
    vm->paused_state = vm->run_state;
    vm->execution = EXECUTION_YIELDED_USER;
    return WLUA_STATE_USER_YIELD;
  }
  encode_error(vm, vm->run_state);
  vm->paused_state = vm->run_state;
  vm->pending = PENDING_NONE;
  vm->execution = EXECUTION_FAILED;
  return WLUA_STATE_ERROR;
}

WLUA_EXPORT uint32_t wlua_abi_version(void) { return WLUA_ABI_VERSION; }
WLUA_EXPORT uintptr_t wlua_alloc(uint32_t size) {
  return (uintptr_t)malloc(size ? size : 1);
}
WLUA_EXPORT void wlua_free(uintptr_t pointer) { free((void *)pointer); }

WLUA_EXPORT uintptr_t wlua_create(uint32_t profile, uint64_t heap_limit,
                                  uint64_t instruction_limit) {
  wlua_vm *vm = (wlua_vm *)calloc(1, sizeof(*vm));
  if (!vm) return 0;
  if (heap_limit > MAX_WASM_MEMORY) { free(vm); return 0; }
  vm->profile = profile == WLUA_PROFILE_TRUSTED
    ? WLUA_PROFILE_TRUSTED : WLUA_PROFILE_SAFE;
  vm->allocator.limit = (size_t)(heap_limit ? heap_limit
    : (vm->profile ? 268435456u : 67108864u));
  vm->instruction_limit = instruction_limit ? instruction_limit
    : (vm->profile ? 100000000u : 10000000u);
  vm->output_limit = vm->profile ? 16777216u : 1048576u;
  vm->run_ref = LUA_NOREF;
  vm->current_line = -1;
  vm->execution = EXECUTION_IDLE;
  /* Lua 5.5 adds an explicit hash seed to lua_newstate. A fixed non-zero
     seed keeps both WebAssembly backends deterministic for differential tests. */
  vm->main_state = lua_newstate(quota_alloc, &vm->allocator, 0x57534c55u);
  if (!vm->main_state) { free(vm); return 0; }
  *(wlua_vm **)lua_getextraspace(vm->main_state) = vm;
  configure_libraries(vm);
  return (uintptr_t)vm;
}

WLUA_EXPORT void wlua_destroy(uintptr_t handle) {
  wlua_vm *vm = (wlua_vm *)handle;
  if (!vm) return;
  if (vm->main_state) lua_close(vm->main_state);
  bfree(&vm->output);
  bfree(&vm->result);
  bfree(&vm->resume_value);
  bfree(&vm->json);
  free(vm);
}

WLUA_EXPORT int32_t wlua_run(uintptr_t handle, uintptr_t source,
                             uint32_t source_len, uintptr_t chunk_name,
                             uint32_t chunk_name_len) {
  wlua_vm *vm = (wlua_vm *)handle;
  int status, result_count = 0, mask = LUA_MASKCOUNT;
  char *name;
  if (!vm || !source || !chunk_name || chunk_name_len == UINT32_MAX)
    return WLUA_STATE_ERROR;
  begin_execution(vm);
  vm->run_state = lua_newthread(vm->main_state);
  vm->run_ref = luaL_ref(vm->main_state, LUA_REGISTRYINDEX);
  *(wlua_vm **)lua_getextraspace(vm->run_state) = vm;
  name = (char *)malloc((size_t)chunk_name_len + 1);
  if (!name) {
    encode_error_message(vm, "unable to allocate chunk name");
    vm->execution = EXECUTION_FAILED;
    vm->paused_state = vm->run_state;
    return WLUA_STATE_ERROR;
  }
  memcpy(name, (const void *)chunk_name, chunk_name_len);
  name[chunk_name_len] = '\0';
  status = luaL_loadbufferx(vm->run_state, (const char *)source,
                            source_len, name, "t");
  free(name);
  if (status != LUA_OK) {
    encode_error(vm, vm->run_state);
    vm->execution = EXECUTION_FAILED;
    vm->paused_state = vm->run_state;
    return WLUA_STATE_ERROR;
  }
#if WLUA_DEBUGGER
  mask |= LUA_MASKLINE;
#endif
  (void)mask;
  apply_execution_hook(vm->run_state, 0, 0);
  status = lua_resume(vm->run_state, vm->main_state, 0, &result_count);
  return finish_resume(vm, status, result_count);
}

WLUA_EXPORT int32_t wlua_check(uintptr_t handle, uintptr_t source,
                               uint32_t source_len, uintptr_t chunk_name,
                               uint32_t chunk_name_len) {
  wlua_vm *vm = (wlua_vm *)handle;
  lua_State *L;
  char *name;
  int status;
  if (!vm || !source || !chunk_name || chunk_name_len == UINT32_MAX)
    return WLUA_STATE_ERROR;
  L = vm->main_state;
  lua_settop(L, 0);
  name = (char *)malloc((size_t)chunk_name_len + 1);
  if (!name) return WLUA_STATE_ERROR;
  memcpy(name, (const void *)chunk_name, chunk_name_len);
  name[chunk_name_len] = '\0';
  status = luaL_loadbufferx(L, (const char *)source, source_len, name, "t");
  free(name);
  if (status != LUA_OK) {
    encode_error(vm, L);
    lua_settop(L, 0);
    return WLUA_STATE_ERROR;
  }
  lua_settop(L, 0);
  wire_begin(&vm->result);
  bbyte(&vm->result, W_ARRAY);
  bu32(&vm->result, 0);
  return WLUA_STATE_COMPLETE;
}

WLUA_EXPORT int32_t wlua_call(uintptr_t handle, int32_t reference,
                              uintptr_t arguments, uint32_t arguments_len) {
  wlua_vm *vm = (wlua_vm *)handle;
  int status, result_count = 0, argument_count, mask = LUA_MASKCOUNT;
  if (!vm || !arguments ||
      !tracked_ref(vm->value_refs, vm->value_ref_count, reference))
    return WLUA_STATE_ERROR;
  begin_execution(vm);
  vm->run_state = lua_newthread(vm->main_state);
  vm->run_ref = luaL_ref(vm->main_state, LUA_REGISTRYINDEX);
  *(wlua_vm **)lua_getextraspace(vm->run_state) = vm;
  lua_rawgeti(vm->run_state, LUA_REGISTRYINDEX, reference);
  if (!lua_isfunction(vm->run_state, -1)) {
    lua_pushliteral(vm->run_state, "LuaRef is not callable");
    encode_error(vm, vm->run_state);
    vm->execution = EXECUTION_FAILED;
    vm->paused_state = vm->run_state;
    return WLUA_STATE_ERROR;
  }
  argument_count = decode_wire_arguments(vm->run_state,
    (const unsigned char *)arguments, arguments_len);
  if (argument_count < 0) {
    lua_pushliteral(vm->run_state, "invalid call arguments");
    encode_error(vm, vm->run_state);
    vm->execution = EXECUTION_FAILED;
    vm->paused_state = vm->run_state;
    return WLUA_STATE_ERROR;
  }
#if WLUA_DEBUGGER
  mask |= LUA_MASKLINE;
#endif
  (void)mask;
  apply_execution_hook(vm->run_state, 0, 0);
  status = lua_resume(vm->run_state, vm->main_state,
                      argument_count, &result_count);
  return finish_resume(vm, status, result_count);
}

WLUA_EXPORT int32_t wlua_get(uintptr_t handle, int32_t reference,
                             uintptr_t key, uint32_t key_len) {
  wlua_vm *vm = (wlua_vm *)handle;
  lua_State *L;
  if (!vm || !key ||
      !tracked_ref(vm->value_refs, vm->value_ref_count, reference)) return 0;
  L = vm->main_state;
  lua_settop(L, 0);
  lua_rawgeti(L, LUA_REGISTRYINDEX, reference);
  if (!lua_istable(L, -1) ||
      !decode_wire(L, (const unsigned char *)key, key_len)) {
    lua_settop(L, 0);
    return 0;
  }
  lua_rawget(L, -2);
  wire_encode_stack(vm, L, -1, 1);
  lua_settop(L, 0);
  return 1;
}

WLUA_EXPORT int32_t wlua_set(uintptr_t handle, int32_t reference,
                             uintptr_t pair, uint32_t pair_len) {
  wlua_vm *vm = (wlua_vm *)handle;
  lua_State *L;
  int count;
  if (!vm || !pair ||
      !tracked_ref(vm->value_refs, vm->value_ref_count, reference)) return 0;
  L = vm->main_state;
  lua_settop(L, 0);
  lua_rawgeti(L, LUA_REGISTRYINDEX, reference);
  if (!lua_istable(L, -1)) { lua_settop(L, 0); return 0; }
  count = decode_wire_arguments(L, (const unsigned char *)pair, pair_len);
  if (count != 2) { lua_settop(L, 0); return 0; }
  lua_rawset(L, -3);
  lua_settop(L, 0);
  return 1;
}

static int32_t resume_execution(wlua_vm *vm, uint32_t mode,
                                int capability_resume,
                                int preserve_step_anchor) {
  int status, result_count = 0;
  int can_resume = capability_resume
    ? vm->execution == EXECUTION_YIELDED_CAPABILITY
    : (vm->execution == EXECUTION_PAUSED_DEBUG ||
       vm->execution == EXECUTION_YIELDED_SLICE ||
       vm->execution == EXECUTION_YIELDED_USER);
  if (!can_resume || !vm->run_state || lua_status(vm->run_state) != LUA_YIELD) {
    encode_error_message(vm, "Lua execution is not suspended and cannot be resumed");
    return WLUA_STATE_ERROR;
  }
  if (mode > WLUA_STEP_OUT) {
    encode_error_message(vm, "invalid debugger resume mode");
    return WLUA_STATE_ERROR;
  }
  if (!preserve_step_anchor &&
      vm->execution == EXECUTION_PAUSED_DEBUG && vm->paused_state) {
    vm->step_line = vm->current_line;
    vm->step_depth = stack_depth(vm->paused_state);
  }
  vm->resume_mode = (int)mode;
  vm->debug_pause_reason = WLUA_PAUSE_NONE;
  vm->pending = PENDING_NONE;
  vm->paused_state = NULL;
  vm->execution = EXECUTION_RUNNING;
  clear_debug_refs(vm);
  status = lua_resume(vm->run_state, vm->main_state, 0, &result_count);
  return finish_resume(vm, status, result_count);
}

WLUA_EXPORT int32_t wlua_resume(uintptr_t handle, uint32_t mode) {
  wlua_vm *vm = (wlua_vm *)handle;
  if (!vm) return WLUA_STATE_ERROR;
  return resume_execution(vm, mode, 0, 0);
}

WLUA_EXPORT int32_t wlua_debug_resume_filtered(uintptr_t handle,
                                                uint32_t mode) {
  wlua_vm *vm = (wlua_vm *)handle;
  if (!vm) return WLUA_STATE_ERROR;
  return resume_execution(vm, mode, 0, 1);
}

WLUA_EXPORT int32_t wlua_resume_value(uintptr_t handle, uintptr_t wire,
                                      uint32_t wire_len, uint32_t rejected,
                                      uint32_t mode) {
  wlua_vm *vm = (wlua_vm *)handle;
  if (!vm || (!wire && wire_len)) return WLUA_STATE_ERROR;
  if (vm->execution != EXECUTION_YIELDED_CAPABILITY) {
    encode_error_message(vm, "Lua execution is not waiting for a capability result");
    return WLUA_STATE_ERROR;
  }
  breset(&vm->resume_value);
  bwrite(&vm->resume_value, (const void *)wire, wire_len);
  vm->resume_rejected = rejected ? 1 : 0;
  return resume_execution(vm, mode, 1, 1);
}

WLUA_EXPORT uintptr_t wlua_output_ptr(uintptr_t handle) {
  wlua_vm *vm = (wlua_vm *)handle;
  return vm ? (uintptr_t)vm->output.data : 0;
}
WLUA_EXPORT uint32_t wlua_output_len(uintptr_t handle) {
  wlua_vm *vm = (wlua_vm *)handle;
  return vm ? (uint32_t)vm->output.length : 0;
}
WLUA_EXPORT void wlua_output_clear(uintptr_t handle) {
  wlua_vm *vm = (wlua_vm *)handle;
  if (vm) breset(&vm->output);
}
WLUA_EXPORT uintptr_t wlua_result_ptr(uintptr_t handle) {
  wlua_vm *vm = (wlua_vm *)handle;
  return vm ? (uintptr_t)vm->result.data : 0;
}
WLUA_EXPORT uint32_t wlua_result_len(uintptr_t handle) {
  wlua_vm *vm = (wlua_vm *)handle;
  return vm ? (uint32_t)vm->result.length : 0;
}
WLUA_EXPORT int32_t wlua_current_line(uintptr_t handle) {
  wlua_vm *vm = (wlua_vm *)handle;
  return vm ? vm->current_line : -1;
}
WLUA_EXPORT uint32_t wlua_debug_pause_reason(uintptr_t handle) {
  wlua_vm *vm = (wlua_vm *)handle;
  return vm ? vm->debug_pause_reason : WLUA_PAUSE_NONE;
}
WLUA_EXPORT uint32_t wlua_capability_token(uintptr_t handle) {
  wlua_vm *vm = (wlua_vm *)handle;
  return vm ? vm->capability_token : 0;
}

WLUA_EXPORT void wlua_debug_set_breakpoints(uintptr_t handle,
                                             uintptr_t lines, uint32_t count) {
  wlua_vm *vm = (wlua_vm *)handle;
  uint32_t i;
  if (!vm || (!lines && count)) return;
  if (count > MAX_BREAKPOINTS) count = MAX_BREAKPOINTS;
  if (count) {
    memcpy(vm->breakpoints, (const void *)lines, count * sizeof(int));
    for (i = 0; i < count; i++) vm->breakpoint_ends[i] = vm->breakpoints[i];
  }
  vm->breakpoint_count = count;
}

WLUA_EXPORT void wlua_debug_set_breakpoint_ranges(uintptr_t handle,
                                                   uintptr_t ranges,
                                                   uint32_t count) {
  wlua_vm *vm = (wlua_vm *)handle;
  const int *values = (const int *)ranges;
  uint32_t i;
  if (!vm || (!ranges && count)) return;
  if (count > MAX_BREAKPOINTS) count = MAX_BREAKPOINTS;
  for (i = 0; i < count; i++) {
    int start = values[i * 2u];
    int end = values[i * 2u + 1u];
    vm->breakpoints[i] = start;
    vm->breakpoint_ends[i] = end >= start ? end : start;
  }
  vm->breakpoint_count = count;
}

static void json_text(buffer *b, const char *text, size_t length) {
  size_t i;
  bbyte(b, '"');
  for (i = 0; i < length; i++) {
    unsigned char c = (unsigned char)text[i];
    switch (c) {
      case '"': braw(b, "\\\""); break;
      case '\\': braw(b, "\\\\"); break;
      case '\n': braw(b, "\\n"); break;
      case '\r': braw(b, "\\r"); break;
      case '\t': braw(b, "\\t"); break;
      default:
        if (c < 0x20) {
          char esc[7];
          snprintf(esc, sizeof(esc), "\\u%04x", c);
          bwrite(b, esc, 6);
        } else bbyte(b, c);
    }
  }
  bbyte(b, '"');
}

static void json_cstr(buffer *b, const char *text) {
  json_text(b, text ? text : "", text ? strlen(text) : 0);
}

static void json_number(buffer *b, long long value) {
  char digits[40];
  int length = snprintf(digits, sizeof(digits), "%lld", value);
  bwrite(b, digits, (size_t)length);
}

static int json_variable(wlua_vm *vm, lua_State *L, int index,
                         const char *name, int comma) {
  int type = lua_type(L, index), ref = 0;
  const char *type_name = lua_typename(L, type), *display = NULL;
  char number[96];
  size_t length = 0;
  if (comma) bbyte(&vm->json, ',');
  braw(&vm->json, "{\"name\":"); json_cstr(&vm->json, name);
  braw(&vm->json, ",\"type\":"); json_cstr(&vm->json, type_name);
  braw(&vm->json, ",\"value\":");
  switch (type) {
    case LUA_TNIL: display = "nil"; break;
    case LUA_TBOOLEAN:
      display = lua_toboolean(L, index) ? "true" : "false";
      break;
    case LUA_TNUMBER:
      if (lua_isinteger(L, index))
        snprintf(number, sizeof(number), "%" PRId64,
                 (int64_t)lua_tointeger(L, index));
      else
        snprintf(number, sizeof(number), "%.17g",
                 (double)lua_tonumber(L, index));
      display = number;
      break;
    case LUA_TSTRING:
      display = lua_tolstring(L, index, &length);
      break;
    default:
      snprintf(number, sizeof(number), "%s: %p",
               type_name, lua_topointer(L, index));
      display = number;
      ref = add_debug_ref(vm, L, index);
      if (ref == LUA_NOREF) ref = 0;
      break;
  }
  if (type == LUA_TSTRING)
    json_text(&vm->json, display, length > 4096 ? 4096 : length);
  else
    json_cstr(&vm->json, display);
  braw(&vm->json, ",\"variablesReference\":");
  json_number(&vm->json, ref);
  bbyte(&vm->json, '}');
  return 1;
}

WLUA_EXPORT uintptr_t wlua_debug_stack(uintptr_t handle) {
  wlua_vm *vm = (wlua_vm *)handle;
  lua_State *L;
  lua_Debug ar;
  int level = 0, comma = 0;
  if (!vm || !(L = vm->paused_state)) return 0;
  breset(&vm->json);
  bbyte(&vm->json, '[');
  while (lua_getstack(L, level, &ar)) {
    lua_getinfo(L, "nSlt", &ar);
    if (comma++) bbyte(&vm->json, ',');
    braw(&vm->json, "{\"id\":"); json_number(&vm->json, level);
    braw(&vm->json, ",\"name\":");
    json_cstr(&vm->json, ar.name ? ar.name : (ar.what ? ar.what : "chunk"));
    braw(&vm->json, ",\"source\":");
    json_cstr(&vm->json, ar.source ? ar.source : "");
    braw(&vm->json, ",\"line\":"); json_number(&vm->json, ar.currentline);
    braw(&vm->json, ",\"column\":1}");
    level++;
  }
  bbyte(&vm->json, ']');
  return (uintptr_t)vm->json.data;
}

static void variables_locals(wlua_vm *vm, lua_State *L, int frame) {
  lua_Debug ar;
  int i = 1, comma = 0;
  const char *name;
  if (!lua_getstack(L, frame, &ar)) return;
  while ((name = lua_getlocal(L, &ar, i++)) != NULL) {
    if (name[0] != '(')
      comma += json_variable(vm, L, -1, name, comma > 0);
    lua_pop(L, 1);
  }
}

static void variables_upvalues(wlua_vm *vm, lua_State *L, int frame) {
  lua_Debug ar;
  int i = 1, comma = 0;
  const char *name;
  if (!lua_getstack(L, frame, &ar) || !lua_getinfo(L, "f", &ar)) return;
  while ((name = lua_getupvalue(L, -1, i++)) != NULL) {
    comma += json_variable(vm, L, -1, name, comma > 0);
    lua_pop(L, 1);
  }
  lua_pop(L, 1);
}

static void variables_table(wlua_vm *vm, lua_State *L, int index) {
  int comma = 0, count = 0;
  char name[128];
  index = lua_absindex(L, index);
  lua_pushnil(L);
  while (count < 500 && lua_next(L, index)) {
    int key_type = lua_type(L, -2);
    if (key_type == LUA_TSTRING) {
      size_t length;
      const char *key = lua_tolstring(L, -2, &length);
      size_t shown = length >= sizeof(name) ? sizeof(name) - 1 : length;
      memcpy(name, key, shown);
      name[shown] = '\0';
    } else if (key_type == LUA_TNUMBER && lua_isinteger(L, -2)) {
      snprintf(name, sizeof(name), "%" PRId64,
               (int64_t)lua_tointeger(L, -2));
    } else if (key_type == LUA_TNUMBER) {
      snprintf(name, sizeof(name), "%.17g", (double)lua_tonumber(L, -2));
    } else if (key_type == LUA_TBOOLEAN) {
      snprintf(name, sizeof(name), "%s",
               lua_toboolean(L, -2) ? "true" : "false");
    } else {
      snprintf(name, sizeof(name), "%s: %p", lua_typename(L, key_type),
               lua_topointer(L, -2));
    }
    comma += json_variable(vm, L, -1, name, comma > 0);
    lua_pop(L, 1);
    count++;
  }
}

WLUA_EXPORT uintptr_t wlua_debug_variables(uintptr_t handle, int32_t frame,
                                            int32_t scope_or_ref) {
  wlua_vm *vm = (wlua_vm *)handle;
  lua_State *L;
  if (!vm || !(L = vm->paused_state)) return 0;
  breset(&vm->json);
  bbyte(&vm->json, '[');
  if (scope_or_ref == 0) variables_locals(vm, L, frame);
  else if (scope_or_ref == 1) variables_upvalues(vm, L, frame);
  else if (scope_or_ref == 2) {
    lua_pushglobaltable(L);
    variables_table(vm, L, -1);
    lua_pop(L, 1);
  } else if (tracked_ref(vm->debug_refs, vm->debug_ref_count,
                         scope_or_ref)) {
    lua_rawgeti(L, LUA_REGISTRYINDEX, scope_or_ref);
    if (lua_istable(L, -1)) variables_table(vm, L, -1);
    lua_pop(L, 1);
  }
  bbyte(&vm->json, ']');
  return (uintptr_t)vm->json.data;
}

static int debug_expression(wlua_vm *vm, lua_State *L, int frame,
                            uintptr_t expression, uint32_t expression_len) {
  lua_State *E = vm->main_state;
  lua_Debug ar;
  buffer source = {0};
  int status, i;
  const char *name;
  lua_settop(E, 0);
  braw(&source, "return (");
  bwrite(&source, (const void *)expression, expression_len);
  bbyte(&source, ')');
  status = luaL_loadbufferx(E, (const char *)source.data, source.length,
                            "=(debug evaluate)", "t");
  bfree(&source);
  if (status == LUA_OK) {
    lua_newtable(E);
    if (lua_getstack(L, frame, &ar)) {
      for (i = 1; (name = lua_getlocal(L, &ar, i)) != NULL; i++) {
        lua_xmove(L, E, 1);
        lua_setfield(E, -2, name);
      }
      if (lua_getinfo(L, "f", &ar)) {
        for (i = 1; (name = lua_getupvalue(L, -1, i)) != NULL; i++) {
          lua_xmove(L, E, 1);
          lua_setfield(E, -2, name);
        }
        lua_pop(L, 1);
      }
    }
    lua_newtable(E);
    lua_pushglobaltable(E);
    lua_setfield(E, -2, "__index");
    lua_setmetatable(E, -2);
    lua_setupvalue(E, -2, 1);
    lua_sethook(E, evaluation_hook, LUA_MASKCOUNT, HOOK_QUANTUM);
    status = lua_pcall(E, 0, 1, 0);
    lua_sethook(E, NULL, 0, 0);
  }
  return status;
}

static void debug_json_error(wlua_vm *vm, lua_State *E,
                             const char *fallback) {
  size_t length;
  const char *error = lua_tolstring(E, -1, &length);
  if (!error) { error = fallback; length = strlen(error); }
  braw(&vm->json, "{\"error\":");
  json_text(&vm->json, error, length);
  bbyte(&vm->json, '}');
}

WLUA_EXPORT uintptr_t wlua_debug_evaluate(uintptr_t handle, int32_t frame,
                                           uintptr_t expression,
                                           uint32_t expression_len) {
  wlua_vm *vm = (wlua_vm *)handle;
  lua_State *L, *E;
  int status;
  if (!vm || !(L = vm->paused_state)) return 0;
  E = vm->main_state;
  status = debug_expression(vm, L, frame, expression, expression_len);
  breset(&vm->json);
  if (status == LUA_OK) {
    bbyte(&vm->json, '[');
    json_variable(vm, E, -1, "result", 0);
    bbyte(&vm->json, ']');
  } else debug_json_error(vm, E, "evaluation failed");
  lua_settop(E, 0);
  return (uintptr_t)vm->json.data;
}

WLUA_EXPORT uintptr_t wlua_debug_set_variable(uintptr_t handle, int32_t frame,
                                               int32_t scope_or_ref,
                                               uintptr_t name_pointer,
                                               uint32_t name_len,
                                               uintptr_t expression,
                                               uint32_t expression_len) {
  wlua_vm *vm = (wlua_vm *)handle;
  lua_State *L, *E;
  lua_Debug ar;
  const char *candidate;
  char *name;
  int status, index, assigned = 0;
  if (!vm || !(L = vm->paused_state) || !name_pointer || !name_len ||
      name_len == UINT32_MAX || (!expression && expression_len)) return 0;
  E = vm->main_state;
  name = (char *)malloc((size_t)name_len + 1);
  if (!name) return 0;
  memcpy(name, (const void *)name_pointer, name_len);
  name[name_len] = '\0';
  breset(&vm->json);
  if (memchr(name, '\0', name_len)) {
    braw(&vm->json, "{\"error\":\"variable name contains NUL\"}");
    free(name);
    return (uintptr_t)vm->json.data;
  }
  status = debug_expression(vm, L, frame, expression, expression_len);
  if (status != LUA_OK) {
    debug_json_error(vm, E, "assignment expression failed");
    lua_settop(E, 0);
    free(name);
    return (uintptr_t)vm->json.data;
  }

  if (scope_or_ref == 0 && lua_getstack(L, frame, &ar)) {
    for (index = 1; (candidate = lua_getlocal(L, &ar, index)) != NULL;
         index++) {
      lua_pop(L, 1);
      if (strcmp(candidate, name) == 0) {
        lua_pushvalue(E, -1); lua_xmove(E, L, 1);
        lua_setlocal(L, &ar, index);
        assigned = 1;
        break;
      }
    }
  } else if (scope_or_ref == 1 && lua_getstack(L, frame, &ar) &&
             lua_getinfo(L, "f", &ar)) {
    for (index = 1; (candidate = lua_getupvalue(L, -1, index)) != NULL;
         index++) {
      lua_pop(L, 1);
      if (strcmp(candidate, name) == 0) {
        lua_pushvalue(E, -1); lua_xmove(E, L, 1);
        lua_setupvalue(L, -2, index);
        assigned = 1;
        break;
      }
    }
    lua_pop(L, 1);
  } else if (scope_or_ref == 2) {
    lua_pushglobaltable(L);
    lua_pushvalue(E, -1); lua_xmove(E, L, 1);
    lua_setfield(L, -2, name);
    lua_pop(L, 1);
    assigned = 1;
  } else if (scope_or_ref > 2 &&
             tracked_ref(vm->debug_refs, vm->debug_ref_count, scope_or_ref)) {
    lua_rawgeti(L, LUA_REGISTRYINDEX, scope_or_ref);
    if (lua_istable(L, -1)) {
      lua_pushvalue(E, -1); lua_xmove(E, L, 1);
      lua_setfield(L, -2, name);
      assigned = 1;
    }
    lua_pop(L, 1);
  }

  if (assigned) {
    bbyte(&vm->json, '[');
    json_variable(vm, E, -1, name, 0);
    bbyte(&vm->json, ']');
  } else {
    braw(&vm->json, "{\"error\":\"variable is not writable in this scope\"}");
  }
  lua_settop(E, 0);
  free(name);
  return (uintptr_t)vm->json.data;
}

WLUA_EXPORT uint32_t wlua_debug_json_len(uintptr_t handle) {
  wlua_vm *vm = (wlua_vm *)handle;
  return vm ? (uint32_t)vm->json.length : 0;
}

WLUA_EXPORT int32_t wlua_ref_release(uintptr_t handle, int32_t reference) {
  wlua_vm *vm = (wlua_vm *)handle;
  uint32_t i;
  if (!vm || !tracked_ref(vm->value_refs, vm->value_ref_count, reference))
    return 0;
  luaL_unref(vm->main_state, LUA_REGISTRYINDEX, reference);
  for (i = 0; i < vm->value_ref_count; i++)
    if (vm->value_refs[i] == reference) vm->value_refs[i] = LUA_NOREF;
  return 1;
}
