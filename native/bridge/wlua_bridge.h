#ifndef WLUA_BRIDGE_H
#define WLUA_BRIDGE_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define WLUA_ABI_VERSION 0x00010000u

enum wlua_profile {
  WLUA_PROFILE_SAFE = 0,
  WLUA_PROFILE_TRUSTED = 1,
  WLUA_PROFILE_FULL_ACCESS = 2
};
enum wlua_state {
  WLUA_STATE_COMPLETE = 0,
  WLUA_STATE_PAUSED = 1,
  WLUA_STATE_CAPABILITY = 2,
  WLUA_STATE_SLICE = 3,
  WLUA_STATE_USER_YIELD = 4,
  WLUA_STATE_ERROR = -1
};
enum wlua_resume_mode {
  WLUA_CONTINUE = 0,
  WLUA_STEP_IN = 1,
  WLUA_STEP_OVER = 2,
  WLUA_STEP_OUT = 3
};
enum wlua_pause_reason {
  WLUA_PAUSE_NONE = 0,
  WLUA_PAUSE_BREAKPOINT = 1,
  WLUA_PAUSE_STEP = 2
};

uint32_t wlua_abi_version(void);
uintptr_t wlua_create(uint32_t profile, uint64_t heap_limit, uint64_t instruction_limit);
void wlua_destroy(uintptr_t handle);
uintptr_t wlua_alloc(uint32_t size);
void wlua_free(uintptr_t pointer);
int32_t wlua_run(uintptr_t handle, uintptr_t source, uint32_t source_len,
                 uintptr_t chunk_name, uint32_t chunk_name_len);
int32_t wlua_call(uintptr_t handle, int32_t reference,
                  uintptr_t arguments, uint32_t arguments_len);
int32_t wlua_get(uintptr_t handle, int32_t reference,
                 uintptr_t key, uint32_t key_len);
int32_t wlua_set(uintptr_t handle, int32_t reference,
                 uintptr_t pair, uint32_t pair_len);
int32_t wlua_check(uintptr_t handle, uintptr_t source, uint32_t source_len,
                   uintptr_t chunk_name, uint32_t chunk_name_len);
int32_t wlua_resume(uintptr_t handle, uint32_t mode);
int32_t wlua_debug_resume_filtered(uintptr_t handle, uint32_t mode);
int32_t wlua_resume_value(uintptr_t handle, uintptr_t wire, uint32_t wire_len,
                          uint32_t rejected, uint32_t mode);
uintptr_t wlua_output_ptr(uintptr_t handle);
uint32_t wlua_output_len(uintptr_t handle);
void wlua_output_clear(uintptr_t handle);
uintptr_t wlua_result_ptr(uintptr_t handle);
uint32_t wlua_result_len(uintptr_t handle);
int32_t wlua_current_line(uintptr_t handle);
uint32_t wlua_debug_pause_reason(uintptr_t handle);
uint32_t wlua_capability_token(uintptr_t handle);
void wlua_debug_set_breakpoints(uintptr_t handle, uintptr_t lines, uint32_t count);
void wlua_debug_set_breakpoint_ranges(uintptr_t handle, uintptr_t ranges,
                                      uint32_t count);
uintptr_t wlua_debug_stack(uintptr_t handle);
uintptr_t wlua_debug_variables(uintptr_t handle, int32_t frame, int32_t scope_or_ref);
uintptr_t wlua_debug_evaluate(uintptr_t handle, int32_t frame, uintptr_t expression,
                              uint32_t expression_len);
uintptr_t wlua_debug_set_variable(uintptr_t handle, int32_t frame,
                                  int32_t scope_or_ref, uintptr_t name,
                                  uint32_t name_len, uintptr_t expression,
                                  uint32_t expression_len);
uint32_t wlua_debug_json_len(uintptr_t handle);
int32_t wlua_ref_release(uintptr_t handle, int32_t reference);

#ifdef __cplusplus
}
#endif
#endif
