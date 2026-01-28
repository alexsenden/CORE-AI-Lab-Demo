/**
 * Stable Diffusion demo – frontend only. Served by this Worker.
 * The backend (GPU Stable Diffusion) runs on your local server;
 * set its URL in the UI or via ?backend=...
 */

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const backendFromQuery = url.searchParams.get("backend") ?? "";
      return new Response(FRONTEND_HTML(backendFromQuery), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};

function FRONTEND_HTML(initialBackendUrl: string): string {
  const defaultBackend = initialBackendUrl || "http://localhost:8000";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stable Diffusion – Denoising Steps</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0d0d0f;
      --surface: #16161a;
      --border: #2a2a2e;
      --text: #e4e4e7;
      --muted: #71717a;
      --accent: #a78bfa;
      --accent-dim: rgba(167, 139, 250, 0.15);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.5;
    }
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .sub {
      color: var(--muted);
      font-size: 0.95rem;
      margin-bottom: 2rem;
    }
    .backend-row {
      margin-bottom: 1rem;
    }
    .backend-row label {
      display: block;
      font-size: 0.8rem;
      color: var(--muted);
      margin-bottom: 0.35rem;
    }
    .backend-row input {
      width: 100%;
      font: inherit;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      padding: 0.5rem 0.75rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      outline: none;
    }
    .backend-row input:focus {
      border-color: var(--accent);
    }
    .prompt-row {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }
    .prompt-row input {
      flex: 1;
      font: inherit;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      padding: 0.75rem 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      outline: none;
    }
    .prompt-row input::placeholder { color: var(--muted); }
    .prompt-row input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-dim);
    }
    .prompt-row button {
      font: inherit;
      font-weight: 600;
      padding: 0.75rem 1.5rem;
      background: var(--accent);
      color: #0d0d0f;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      white-space: nowrap;
    }
    .prompt-row button:hover { opacity: 0.9; }
    .prompt-row button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .status {
      color: var(--muted);
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
      min-height: 1.5em;
    }
    .status.loading { color: var(--accent); }
    .status.error { color: #f87171; }
    .steps-label {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 0.75rem;
    }
    .step-viewer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }
    .step-viewer img {
      max-width: 100%;
      max-height: 70vh;
      width: auto;
      height: auto;
      display: block;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--surface);
    }
    .step-arrow {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 2px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font-size: 1.25rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .step-arrow:hover:not(:disabled) {
      border-color: var(--accent);
      background: var(--accent-dim);
    }
    .step-arrow:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .step-viewer-label {
      font-size: 0.9rem;
      font-family: 'JetBrains Mono', monospace;
      color: var(--muted);
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .final-label {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 0.75rem;
    }
    .final-wrap {
      max-width: 512px;
      margin: 0 auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    .final-wrap img {
      width: 100%;
      display: block;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Stable Diffusion – Denoising Steps</h1>

    <div class="backend-row">
      <label for="backend">Backend URL</label>
      <input type="url" id="backend" placeholder="http://localhost:8000" value="${escapeAttr(defaultBackend)}" />
    </div>

    <div class="prompt-row">
      <input type="text" id="prompt" placeholder="e.g. a cyberpunk cat on a rainy street" autocomplete="off" />
      <button type="button" id="generate">Generate</button>
    </div>

    <div id="status" class="status" aria-live="polite"></div>

    <div id="steps-section" style="display: none;">
      <div class="steps-label">Intermediate steps</div>
      <div class="step-viewer">
        <button type="button" id="step-prev" class="step-arrow" aria-label="Previous step">‹</button>
        <div id="step-img-wrap"><img id="step-img" alt="" /></div>
        <button type="button" id="step-next" class="step-arrow" aria-label="Next step">›</button>
      </div>
      <div id="step-viewer-label" class="step-viewer-label">Step 0 of 0</div>
      <div class="final-label">Final image</div>
      <div id="final-wrap" class="final-wrap"></div>
    </div>
  </div>

  <script>
    const backendEl = document.getElementById('backend');
    const promptEl = document.getElementById('prompt');
    const btn = document.getElementById('generate');
    const statusEl = document.getElementById('status');
    const stepsSection = document.getElementById('steps-section');
    const stepImg = document.getElementById('step-img');
    const stepLabel = document.getElementById('step-viewer-label');
    const stepPrev = document.getElementById('step-prev');
    const stepNext = document.getElementById('step-next');
    const finalWrap = document.getElementById('final-wrap');
    var stepsData = [];
    var displayedStepIndex = 0;
    var isPinned = false;

    function setStatus(msg, kind) {
      statusEl.textContent = msg;
      statusEl.className = 'status' + (kind ? ' ' + kind : '');
    }

    function setGenerating(ongoing) {
      btn.disabled = ongoing;
      btn.textContent = ongoing ? 'Generating…' : 'Generate';
    }

    function getBaseUrl() {
      const u = (backendEl.value || '').trim().replace(/\\/$/, '');
      return u || '';
    }

    async function sha256Hex(input) {
      const msg = new TextEncoder().encode(input);
      const hash = await crypto.subtle.digest('SHA-256', msg);
      return Array.from(new Uint8Array(hash)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }

    function renderStepViewer() {
      var n = stepsData.length;
      if (n === 0) {
        stepImg.removeAttribute('src');
        stepImg.alt = '';
        stepImg.style.visibility = 'hidden';
        stepLabel.textContent = 'Step 0 of 0';
        stepPrev.disabled = true;
        stepNext.disabled = true;
        return;
      }
      stepImg.style.visibility = '';
      var idx = Math.max(0, Math.min(displayedStepIndex, n - 1));
      displayedStepIndex = idx;
      var s = stepsData[idx];
      stepImg.src = 'data:image/png;base64,' + s.image_base64;
      stepImg.alt = 'Step ' + s.step;
      stepLabel.textContent = 'Step ' + s.step + ' of ' + (stepsData[n - 1].step);
      stepPrev.disabled = idx <= 0;
      stepNext.disabled = idx >= n - 1;
    }

    function updateProgress(data) {
      stepsSection.style.display = 'block';
      stepsData = data.steps || [];
      if (!isPinned) displayedStepIndex = Math.max(0, stepsData.length - 1);
      renderStepViewer();
      finalWrap.innerHTML = '';
      if (data.final) {
        var finalImg = document.createElement('img');
        finalImg.alt = 'Final image';
        finalImg.src = 'data:image/png;base64,' + data.final;
        finalWrap.appendChild(finalImg);
      }
    }

    async function generate() {
      const baseUrl = getBaseUrl();
      if (!baseUrl) {
        setStatus('Set Backend URL (e.g. http://localhost:8000).', 'error');
        return;
      }
      const prompt = promptEl.value.trim();
      if (!prompt) {
        setStatus('Enter a prompt.', 'error');
        return;
      }
      isPinned = false;
      setGenerating(true);
      setStatus('Submitting…', 'loading');
      var pollTimer = null;
      try {
        const transactionKey = await sha256Hex(prompt + Date.now() + Math.random());
        const submitRes = await fetch(baseUrl + '/api/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt, transaction_key: transactionKey })
        });
        const submitData = await submitRes.json();
        if (!submitRes.ok) {
          setStatus(submitData.detail || submitData.error || 'Submit failed', 'error');
          setGenerating(false);
          return;
        }
        setStatus('Queued. Polling for updates…', 'loading');
        function poll() {
          fetch(baseUrl + '/api/status/' + encodeURIComponent(transactionKey))
            .then(function (r) { return r.json(); })
            .then(function (data) {
              updateProgress(data);
              if (data.status === 'done') {
                if (pollTimer) clearInterval(pollTimer);
                pollTimer = null;
                setStatus('Done. Seed: ' + (data.seed ?? '—'));
                setGenerating(false);
              } else if (data.status === 'error') {
                if (pollTimer) clearInterval(pollTimer);
                pollTimer = null;
                setStatus('Error: ' + (data.error || 'Unknown'), 'error');
                setGenerating(false);
              } else {
                var stepCount = (data.steps || []).length;
                setStatus((data.status === 'processing' ? 'Processing… ' : 'Queued. ') + stepCount + ' step(s) so far', 'loading');
              }
            })
            .catch(function (e) {
              if (pollTimer) clearInterval(pollTimer);
              pollTimer = null;
              setStatus('Network error: ' + (e && e.message ? e.message : 'Unknown'), 'error');
              setGenerating(false);
            });
        }
        poll();
        pollTimer = setInterval(poll, 1500);
      } catch (e) {
        if (pollTimer) clearInterval(pollTimer);
        setStatus('Error: ' + (e && e.message ? e.message : 'Unknown'), 'error');
        setGenerating(false);
      }
    }

    stepPrev.addEventListener('click', function () {
      isPinned = true;
      displayedStepIndex = Math.max(0, displayedStepIndex - 1);
      renderStepViewer();
    });
    stepNext.addEventListener('click', function () {
      isPinned = true;
      displayedStepIndex = Math.min(stepsData.length - 1, displayedStepIndex + 1);
      renderStepViewer();
    });

    btn.addEventListener('click', generate);
    promptEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') generate();
    });
  </script>
</body>
</html>`;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
