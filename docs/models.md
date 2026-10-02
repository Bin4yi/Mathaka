# Models used by Mathaka

Every model is open-weight and runs **on the phone** or on the family's **own laptop**. Nothing is sent to a cloud API. The only internet use is the one-time model download. Each download is checked against the SHA-256 published by Hugging Face.

## Heavy AI once (family phone, during calibration)

| Model | File | Size | Licence | Used for |
|---|---|---|---|---|
| Gemma 3 4B instruct, Q4_K_M | `ggml-org/gemma-3-4b-it-GGUF` → `gemma-3-4b-it-Q4_K_M.gguf` | 2.49 GB | [Gemma Terms of Use](https://ai.google.dev/gemma/terms) | prescription reading, pill imprint, pill description, weekly summary |
| Gemma 3 4B vision projector | same repo → `mmproj-model-f16.gguf` | 0.85 GB | Gemma Terms of Use | lets Gemma see images |
| SmolVLM 500M instruct, Q8_0 (+ mmproj Q8_0) | `ggml-org/SmolVLM-500M-Instruct-GGUF` | 0.55 GB | Apache-2.0 | fallback for phones with less than ~6 GB RAM |
| Ollama `gemma3:4b` (laptop helper) | ollama.com library | ~3.3 GB | Gemma Terms of Use | same jobs, on the laptop |

Runtime: [`llama.rn`](https://github.com/mybigday/llama.rn) 0.13.0-rc.6 (llama.cpp for React Native, MIT), CPU only for now (`n_gpu_layers: 0`).
Context 4096 tokens, images capped at 512 tokens, temperature 0.1.
Every call uses a **JSON schema**, is validated with `zod`, and is retried once.
The model is released from memory after 90 s idle.
**Gemma is never loaded on the elder phone** (the code refuses).

## Light AI every day (elder phone)

| Model | Size | Licence | Used for |
|---|---|---|---|
| Pill features: pure TypeScript pipeline (`packages/core/src/vision`) | 0 MB | Apache-2.0 (ours) | markers, size, colour, shape, score line |
| Marker detector: js-aruco2 2.0.0, vendored | tiny | MIT | finding the calibration mat |
| Laya (decision model), INT8 ONNX | M7 | Apache-2.0 | intent of a spoken question, yes/no/unsure answers; only after the gate test |

## What the AI is NOT allowed to do

- No model writes words for the elder. Every elder sentence is a fixed template (`packages/core/src/templates.ts`).
- Decisions only pick from a short option list (under 20). Labels outside the list are rejected.
- No medical advice. Prompts say so, and the weekly summary gets only counted facts from the log, with no medicine names.

## Measured (to fill in M10)

| Phone | RAM | Model | Load time | Prescription | Imprint | Notes |
|---|---|---|---|---|---|---|
| | | | | | | |
