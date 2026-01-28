"""
Local Stable Diffusion backend. Runs on your GPU.
- POST /api/request: enqueue { prompt, transaction_key } → returns { transaction_key, status: "queued" }
- GET /api/status/<transaction_key>: returns { status, steps[], final?, seed? }; poll until status == "done".
Work is processed in FIFO order; status returns whatever has been generated thus far.
"""
import base64
import io
import random
import threading
from queue import Queue
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Lazy load heavy deps so server starts quickly
_pipe = None
NUM_INFERENCE_STEPS = 25
DEFAULT_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
SDXL_HEIGHT = 1024
SDXL_WIDTH = 1024

# FIFO work queue: (transaction_key, prompt, seed)
work_queue: Queue[tuple[str, str, int]] = Queue()
# transaction_key -> { "status": "queued"|"processing"|"done", "steps": [...], "final": str|None, "seed": int|None }
results: dict[str, dict[str, Any]] = {}
results_lock = threading.Lock()

# Limit in-memory completed jobs (evict oldest by key order when over capacity)
MAX_COMPLETED_JOBS = 100


def get_pipeline():
    global _pipe
    if _pipe is None:
        import torch
        from diffusers import StableDiffusionXLPipeline

        device = "cuda" if torch.cuda.is_available() else "cpu"
        _pipe = StableDiffusionXLPipeline.from_pretrained(
            DEFAULT_MODEL,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        )
        _pipe = _pipe.to(device)
    return _pipe


def latents_to_png_base64(pipe, latents: Any) -> str:
    import torch

    scaling_factor = getattr(pipe.vae.config, "scaling_factor", 0.13025)
    latents = (1 / scaling_factor) * latents
    # SDXL VAE decodes to black in fp16; run this decode in float32.
    if latents.dtype != torch.float32:
        latents = latents.float()
    with torch.no_grad():
        vae = pipe.vae
        orig_dtype = next(vae.parameters()).dtype
        try:
            if orig_dtype != torch.float32:
                vae.to(torch.float32)
            image = vae.decode(latents).sample
        finally:
            if orig_dtype != torch.float32:
                vae.to(orig_dtype)
    image = (image / 2 + 0.5).clamp(0, 1)
    image = image.cpu().permute(0, 2, 3, 1).float().numpy()
    from PIL import Image
    import numpy as np

    pil = Image.fromarray((image[0] * 255).astype(np.uint8))
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _evict_old_jobs():
    with results_lock:
        done_keys = [k for k, v in results.items() if v.get("status") == "done"]
        if len(done_keys) <= MAX_COMPLETED_JOBS:
            return
        to_remove = len(done_keys) - MAX_COMPLETED_JOBS
        for k in sorted(done_keys)[:to_remove]:
            results.pop(k, None)


def worker_loop():
    while True:
        transaction_key, prompt, seed = work_queue.get()
        with results_lock:
            if transaction_key not in results:
                work_queue.task_done()
                continue
            results[transaction_key]["status"] = "processing"
            results[transaction_key]["steps"] = []

        steps_out: list[dict[str, Any]] = []

        def callback(pipe, step_index: int, *rest):
            callback_kwargs = rest[-1] if rest else {}
            step = step_index + 1
            latents = callback_kwargs.get("latents")
            if latents is None:
                return callback_kwargs
            b64 = latents_to_png_base64(pipe, latents)
            step_obj = {"step": step, "image_base64": b64}
            steps_out.append(step_obj)
            with results_lock:
                if transaction_key in results:
                    results[transaction_key]["steps"] = list(steps_out)
            return callback_kwargs

        try:
            import torch
            pipe = get_pipeline()
            generator = None
            try:
                generator = torch.Generator(device=pipe.device).manual_seed(seed)
            except Exception:
                pass

            result = pipe(
                prompt,
                height=SDXL_HEIGHT,
                width=SDXL_WIDTH,
                num_inference_steps=NUM_INFERENCE_STEPS,
                generator=generator,
                callback_on_step_end=callback,
                callback_on_step_end_tensor_inputs=["latents"],
            )
            images = result.images
            if not images:
                raise RuntimeError("No image produced")

            steps_out.sort(key=lambda x: x["step"])
            buf = io.BytesIO()
            images[0].save(buf, format="PNG")
            final_b64 = base64.b64encode(buf.getvalue()).decode("ascii")

            with results_lock:
                if transaction_key in results:
                    results[transaction_key]["status"] = "done"
                    results[transaction_key]["steps"] = steps_out
                    results[transaction_key]["final"] = final_b64
                    results[transaction_key]["seed"] = seed
        except Exception as e:
            with results_lock:
                if transaction_key in results:
                    results[transaction_key]["status"] = "error"
                    results[transaction_key]["error"] = str(e)
        finally:
            work_queue.task_done()
            _evict_old_jobs()


worker_thread = threading.Thread(target=worker_loop, daemon=True)
worker_thread.start()

app = FastAPI(title="SD Denoising Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RequestBody(BaseModel):
    prompt: str
    transaction_key: str


class RequestResponse(BaseModel):
    transaction_key: str
    status: str


class StepOutput(BaseModel):
    step: int
    image_base64: str


class StatusResponse(BaseModel):
    status: str  # "queued" | "processing" | "done" | "error"
    steps: list[StepOutput]
    final: str | None = None
    seed: int | None = None
    error: str | None = None


@app.get("/")
def root():
    return {"service": "sd-denoising-backend", "health": "ok", "api": "POST /api/request, GET /api/status/{transaction_key}"}


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/request", response_model=RequestResponse)
def submit_request(req: RequestBody):
    prompt = (req.prompt or "").strip()
    key = (req.transaction_key or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    if not key:
        raise HTTPException(status_code=400, detail="transaction_key is required")

    seed = random.randint(0, 2**31 - 1)
    with results_lock:
        if key in results:
            existing = results[key]["status"]
            if existing == "done":
                return RequestResponse(transaction_key=key, status="done")
            if existing in ("queued", "processing"):
                return RequestResponse(transaction_key=key, status=existing)
        results[key] = {"status": "queued", "steps": [], "final": None, "seed": None}

    work_queue.put((key, prompt, seed))
    return RequestResponse(transaction_key=key, status="queued")


@app.get("/api/status/{transaction_key}", response_model=StatusResponse)
def get_status(transaction_key: str):
    with results_lock:
        data = results.get(transaction_key)
    if data is None:
        raise HTTPException(status_code=404, detail="Unknown transaction_key")

    steps = [StepOutput(step=s["step"], image_base64=s["image_base64"]) for s in data.get("steps", [])]
    return StatusResponse(
        status=data["status"],
        steps=steps,
        final=data.get("final"),
        seed=data.get("seed"),
        error=data.get("error"),
    )
