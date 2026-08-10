// Thin retry wrapper around global fetch. Added after a real build hit a
// Node/undici internal error (`AssertionError: assert(!this.paused)` inside
// undici's socket-end handling, node v24.19.0) mid-build - confirmed
// transient by retrying the whole build once and having it succeed cleanly,
// but a multi-minute production build failing outright on one flaky socket
// is exactly the kind of thing worth not depending on luck for, since this
// same pipeline runs on every Netlify deploy.
async function fetchWithRetry(url, options, { retries = 2, retryDelayMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

module.exports = { fetchWithRetry };
