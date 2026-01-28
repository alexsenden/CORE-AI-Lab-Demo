# Stable Diffusion Denoising Backend

Local Python server that runs **Stable Diffusion XL (SDXL)** on your GPU. Requests are processed in a **FIFO work queue**. The frontend submits a job with a transaction key, then polls for status until the final image is ready; each poll returns whatever has been generated so far (intermediate steps and, when done, the final image).

## Requirements

- Python 3.10+
- GPU with enough VRAM for SDXL (~8–12 GB for 1024×1024, fp16)
- CUDA set up if using NVIDIA GPU

## Setup

```bash
cd sd-demo/backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

- Base URL: `http://localhost:8000`
- Health: `GET http://localhost:8000/health`

## API

**`POST /api/request`**

- **Body**: `{ "prompt": "your text", "transaction_key": "..." }`  
  - `prompt` (required): text description for the image  
  - `transaction_key` (required): unique id for this job (frontend derives it by hashing the input)
- **Response**: `{ "transaction_key": "...", "status": "queued" }`  
  - The job is enqueued; a single worker processes jobs in FIFO order.

**`GET /api/status/{transaction_key}`** (poll until `status` is `"done"` or `"error"`)

- **Response**:  
  `{ "status": "queued"|"processing"|"done"|"error", "steps": [ { "step": 5, "image_base64": "…" }, … ], "final": "…" | null, "seed": 12345 | null, "error": "…" | null }`  
  - `status`: `"queued"` (waiting), `"processing"` (running), `"done"`, or `"error"`  
  - `steps`: intermediate step images generated so far (base64 PNG)  
  - `final`: base64 PNG of the final 25-step image when `status === "done"`  
  - `seed`: seed used when done  
  - `error`: error message when `status === "error"`  

The frontend polls this endpoint (e.g. every 1.5 s) and updates the UI with `steps` (and `final` when available).

## Queue behaviour

- One worker thread processes the queue in FIFO order.
- While a job is running, the worker updates that job’s `steps` in memory; each poll returns the latest `steps` (and `final` when the run finishes).
- Completed jobs are kept in memory up to `MAX_COMPLETED_JOBS` (default 100); older ones are evicted.

## CORS

CORS is enabled for all origins so the Worker-served frontend can call this backend. For production, restrict `allow_origins` in `main.py` if needed.

## Model

Uses **Stable Diffusion XL** `stabilityai/stable-diffusion-xl-base-1.0` by default, at 1024×1024 with 25 inference steps. Intermediate images are captured at steps 5, 10, 15, 20, 25.
