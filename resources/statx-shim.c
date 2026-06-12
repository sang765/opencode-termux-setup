// statx seccomp shim for Android/Termux compatibility
// gcc -shared -fPIC -o libstatx-shim.so statx-shim.c
//
// Android seccomp-bpf blocks the statx() syscall. glibc's stat() internally
// tries statx first. When blocked, SIGSYS is delivered. This handler
// returns -ENOSYS so glibc falls back to fstatat().

#define _GNU_SOURCE
#include <signal.h>
#include <stddef.h>
#include <stdint.h>
#include <errno.h>

#if defined(__aarch64__)
#define STATX_NR 332
#elif defined(__x86_64__)
#define STATX_NR 383
#else
#define STATX_NR -1
#endif

static void handle_sigsys(int sig, siginfo_t *info, void *ctx) {
  (void)sig;
  if (sig != SIGSYS) return;

  // Extract syscall number from siginfo (SIGSYS provides si_syscall)
  int syscall_nr = 0;
#if defined(NSIGSYS)
  // Modern glibc: access via siginfo_t si_syscall field
  syscall_nr = info->si_syscall;
#else
  // Fallback: read from raw bytes
  unsigned char *p = (unsigned char *)info;
  // si_syscall is typically at offset ~40-48 in siginfo_t
  for (size_t off = 0; off < sizeof(siginfo_t) - 4; off++) {
    int v = *(int *)(p + off);
    if (v == STATX_NR) { syscall_nr = v; break; }
  }
#endif

  if (syscall_nr == STATX_NR) {
#if defined(__aarch64__)
    // On aarch64, ucontext has mcontext with registers
    // x0 is at offset 0 in mcontext, PC is at offset 256
    // After SVC, PC points to the instruction after SVC
    // We need to: set x0 = -ENOSYS, leave PC as-is (past SVC)
    unsigned long *regs = (unsigned long *)ctx;
    // Find the mcontext in ucontext - typically at offset 40 on aarch64
    // The exact layout varies by glibc version
    // Simple approach: just exit the signal handler and let the syscall
    // be restarted. Instead, we modify the register state.
    // For glibc on aarch64: ucontext_t has uc_mcontext at offset 0x20
    // mcontext_t has: regs[0..30] at offset 0, sp at 248, pc at 256
    // We need to find the beginning of the structure.
    unsigned long *base = (unsigned long *)((unsigned char *)ctx + 0x20);
    base[0] = (unsigned long)-ENOSYS;  // x0 = -ENOSYS
    // Advance PC past the SVC instruction (4 bytes)
    base[32] += 4;
#else
    // For other architectures, add support
#endif
    return;
  }

  // For unknown syscalls, chain to default handler
  struct sigaction sa;
  sa.sa_handler = SIG_DFL;
  sigemptyset(&sa.sa_mask);
  sa.sa_flags = 0;
  sigaction(SIGSYS, &sa, NULL);
}

__attribute__((constructor))
static void init(void) {
  struct sigaction sa;
  sa.sa_flags = SA_SIGINFO | SA_NODEFER;
  sa.sa_sigaction = handle_sigsys;
  sigemptyset(&sa.sa_mask);
  sigaction(SIGSYS, &sa, NULL);
}
