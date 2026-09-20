#if defined(__wasi__)

#include <errno.h>
#include <locale.h>
#include <stdio.h>
#include <stdlib.h>

/* Test-runner-only shims for ISO C entry points that WASI Preview 1 cannot
   provide. They are intentionally not linked into either production bridge. */
int system(const char *command) {
  (void)command;
  errno = ENOSYS;
  return -1;
}

char *wlua_test_setlocale(int category, const char *locale) {
  if (locale == NULL || locale[0] == '\0' ||
      (locale[0] == 'C' && locale[1] == '\0'))
    return setlocale(category, locale);
  return NULL;
}

FILE *wlua_test_fopen(const char *path, const char *mode) {
  if (path == NULL || path[0] == '\0') {
    errno = ENOENT;
    return NULL;
  }
  return fopen(path, mode);
}

char *tmpnam(char *buffer) {
  static char fallback[L_tmpnam];
  static unsigned int sequence;
  char *target = buffer ? buffer : fallback;
  snprintf(target, L_tmpnam, "lua-wasi-%08x.tmp", ++sequence);
  return target;
}

FILE *tmpfile(void) {
  char name[L_tmpnam];
  FILE *file;
  tmpnam(name);
  file = fopen(name, "w+b");
  if (file) remove(name);
  return file;
}

#endif
