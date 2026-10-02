# Mathaka laptop helper (optional)

Runs the same AI as the phone, on a laptop on the **home Wi-Fi**. Use it when the family phone is too weak for Gemma, and for the eval scripts. Nothing goes to the internet.

- **Gemma** (vision) through [Ollama](https://ollama.com), model `gemma3:4b` by default.
- **Laya** (decision model) through `pip install laya`. This is optional, from M7.
- The prompts come from `packages/core/prompts.json`, the same file the app uses.

## 1. Install (once)

**Windows (PowerShell):**

```powershell
cd helper
py -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
```

**macOS:**

```sh
cd helper
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
```

Then install Ollama from <https://ollama.com/download>, and get Gemma. It is about 3.3 GB and downloads once:

```sh
ollama pull gemma3:4b
```

On a laptop without a strong GPU it runs on the CPU. That is slow (often 10–60 s per photo), but fine for calibration, which happens once.

## 2. Run

```powershell
.venv\Scripts\python -m uvicorn mathaka_helper.app:app --host 0.0.0.0 --port 8787
```

- Find the laptop's Wi-Fi address with `ipconfig` (Windows) or `ipconfig getifaddr en0` (macOS), for example `192.168.1.23`.
- In the app: **Family → AI engine → Laptop helper**, enter `http://192.168.1.23:8787`, then tap **Test connection**.
- When Windows asks, allow Python on **Private networks** only.
- Optional: set `HELPER_TOKEN=some-secret` before starting. The helper then requires that token.

## Settings (environment variables)

| Name | Default | What |
|---|---|---|
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama server |
| `GEMMA_MODEL` | `gemma3:4b` | any Ollama vision model |
| `LAYA_MODEL` | `laya` | `laya`, `laya-multilingual`, or a fine-tuned path |
| `HELPER_TOKEN` | none | require `X-Mathaka-Token` |

## Endpoints

Each endpoint has the same JSON contract as the app's `AiAdapter`:

| Method | Path | In | Out |
|---|---|---|---|
| GET | `/health` | – | `{ok, gemma_model, gemma_ready, laya}` |
| POST | `/gemma/extract-prescription` | `{image_base64}` | `{rows: [...]}` |
| POST | `/gemma/pill-imprint` | `{image_base64}` | `{text, confidence}` |
| POST | `/gemma/describe-pill` | `{image_base64?, attributes}` | `{description}` |
| POST | `/gemma/weekly-summary` | `{language, name, facts[]}` | `{sentences[]}` |
| POST | `/gemma/decide` | `{state, question, options[]}` | `{label, probs, confidence}` |
| POST | `/laya/decide` | same | same (503 if Laya is not installed) |

How errors work:
- If Gemma's output is not valid JSON, the helper retries once. If it is still wrong, it answers **502**.
- If Ollama is not running, it answers **503** with a clear message.

## Tests

```sh
.venv\Scripts\python -m pytest -q      # uses a fake Gemma; no Ollama needed
```

## Laya (M7)

`laya` needs PyTorch. PyTorch wheels usually lag behind the newest Python, so use **Python 3.11 or 3.12** for this:

```powershell
py -3.12 -m venv .venv-laya
.venv-laya\Scripts\python -m pip install -r requirements-laya.txt
```
