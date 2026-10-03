# Fine-tune Laya for Sinhala / Singlish care intents (Kaggle, free 2×T4)

The goal is an open decision model that understands how Sri Lankan elders ask about their medicine. If it is good, we share it back on Hugging Face.

**Only after** the test set is frozen (see `eval/sets/intents_si/README.md`).

## 1. Export the training data (laptop)

```powershell
eval\.venv\Scripts\python -m eval.finetune.export_laya_dataset
```

This writes `eval/finetune/out/mathaka_intents_train.jsonl`. It refuses to run if any test line is in train (leak check).

## 2. Kaggle

1. kaggle.com → **Datasets → New dataset** → upload `mathaka_intents_train.jsonl` → name it `mathaka-intents`.
2. Open Laya's official notebook: <https://github.com/NandhaKishorM/laya/blob/main/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb> → **Open in Kaggle** (or File → Import notebook → GitHub link).
3. Notebook options (right side): **Accelerator: GPU T4 ×2**, **Internet: On**. **Add input** → your dataset `mathaka-intents`.
4. **Choose the base model in cell 6** (the "Download & Preprocess" cell):
   - for Sinhala-script text: `MODEL_ID = "convaiinnovations/laya-multilingual"`
   - if our gate test shows English Laya does better on Singlish: keep `convaiinnovations/laya`
5. **In the same cell, change ONE line** so it reads our data instead of the benchmark:

   ```python
   # was: ds_train = load_dataset("LocalLLaMA/typed-decisions", "all", split="train")
   ds_train = load_dataset("json", data_files="/kaggle/input/mathaka-intents/mathaka_intents_train.jsonl", split="train")
   ```

6. **Skip the last evaluation cells.** They use the benchmark's test split. We evaluate on our own frozen test set on the laptop instead.
7. **Run all.** With a few hundred rows this takes minutes, not hours.
8. **Download** `/kaggle/working/laya_finetuned_typed_decisions/` (the whole folder) from the Output tab.

## 3. Back on the laptop

Put the folder at `eval/finetune/checkpoints/laya-si-v1/`, then:

```powershell
# PyTorch result on the frozen test
eval\.venv\Scripts\python -m eval.run --name finetuned --suites intents --intents-set test --engines laya-ft:eval/finetune/checkpoints/laya-si-v1,laya-ml,rule

# INT8 ONNX for the phone, plus the TypeScript parity check
eval\.venv\Scripts\python -m eval.laya_onnx.export --model-dir eval/finetune/checkpoints/laya-si-v1 --out apps/mobile/models/laya-si-v1
```

## 4. Share it back (if it passes the gate)

- Hugging Face → New model → `laya-sinhala-care-intents`.
- Upload the checkpoint + `model_card.md` from this folder (fill in the numbers from `eval/report.md`).
- Licence: Apache-2.0 (same as Laya). Do **not** upload the test set if it has family members' words they did not agree to share.
