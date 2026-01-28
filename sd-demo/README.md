# Stable Diffusion Denoising – Frontend (Worker) + Backend (Local)

This project has two parts:

1. **Frontend (Cloudflare Worker)** – Serves the UI. You set your backend URL, enter a prompt, and click Generate. The frontend hashes the input to form a **transaction key**, sends the prompt and transaction key to the backend, then **polls** for status until the job is done, showing intermediate steps as they appear.
2. **Backend (local server)** – Python server you run on a machine with a GPU. It accepts jobs via `POST /api/request`, enqueues them in a **FIFO work queue**, and responds to **`GET /api/status/{transaction_key}`** with whatever has been generated so far (steps and, when finished, the final image).

The frontend is hosted on Workers; the backend runs on your own server and is called by the browser.

## Quick start

**1. Run the backend** (on your GPU machine):

```bash
cd sd-demo/backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

**2. Run or deploy the frontend**

- **Local**: `cd sd-demo && npm run dev` then open `http://localhost:8787?backend=http://localhost:8000`
- **Deploy**: `npm run deploy` then open your Worker URL and set “Backend URL” to your server (e.g. `http://your-server:8000` or `https://your-backend.example.com`).

**3. In the UI**

- Set **Backend URL** (e.g. `http://localhost:8000` when testing locally, or your server’s URL when using the deployed Worker).
- Enter a **prompt** and click **Generate**. The frontend creates a transaction key (hash of prompt + nonce), submits the job to the backend, then polls until the final image is ready, updating the UI with intermediate steps as they are produced.

## Layout

```
sd-demo/
├── backend/           # Local Python server (GPU)
│   ├── main.py        # FastAPI + Stable Diffusion + step capture
│   ├── requirements.txt
│   └── README.md
├── src/
│   └── index.ts       # Worker: serves the frontend only
├── wrangler.toml
├── package.json
└── README.md          # this file
```

## Backend (local server)

- **Submit**: `POST /api/request` with `{ "prompt": "…", "transaction_key": "…" }`. The job is queued; response is `{ "transaction_key", "status": "queued" }`.
- **Poll**: `GET /api/status/{transaction_key}` returns `{ "status", "steps", "final?", "seed?", "error?" }`. The frontend polls until `status` is `"done"` (or `"error"`), and displays `steps` (and `final`) as they arrive.
- Jobs are processed in **FIFO** order by a single worker.
- Uses SDXL; captures steps 5, 10, 15, 20, 25.
- CORS is set to allow requests from any origin.

See `backend/README.md` for setup and API details.

## Frontend (Cloudflare Worker)

- Serves a single page with:
  - **Backend URL** – base URL of your backend (e.g. `http://localhost:8000`).
  - **Prompt** – text for the image.
  - **Generate** – hashes the input (prompt + nonce) to form a transaction key, sends `{ prompt, transaction_key }` to `POST /api/request`, then polls `GET /api/status/{transaction_key}` every 1.5 s until `status === "done"`, updating the UI with `steps` and `final` as they become available.

You can pass the backend in the URL: `?backend=http://localhost:8000`.

## Cross-origin and networking

- The **browser** loads the HTML from the Worker and runs the JS.
- The **browser** calls your backend URL directly (same machine as backend, or another host). So:
  - For “me testing on my laptop”: Backend URL = `http://localhost:8000`.
  - For “others hitting my server”: Backend URL = `https://my-server.example.com` (or the IP), and your backend must be reachable from those users and allow CORS (which it does by default).

If the backend is on another host, ensure it’s reachable (firewall, HTTPS, etc.) and that the Backend URL in the UI matches (e.g. `https://…` if you use TLS).
