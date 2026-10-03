# Sinhala care intents + yes/no answers

This is the dataset for the decision layer, the AI that is not allowed to speak. Real people write it: Binula and family. Aim for **300–600 lines** in total.

## Files

| File | Who writes it | Use |
|---|---|---|
| `dev_claude.jsonl` | Claude (synthetic) | only to check that the runner works. **Never** reported as the result |
| `test.jsonl` | real people (**different writers from train** if possible) | the gate test. **Freeze it before any training** |
| `train.jsonl` | real people | Kaggle fine-tune. Gemma may add more lines **only here** |

## One line = one example

```json
{"id":"t-0001","task":"intent","lang_form":"singlish","text":"mama beheth biwwada?","label":"did_i_take","writer":"amma"}
```

| Field | Values |
|---|---|
| `id` | unique, e.g. `t-0001` (test), `tr-0001` (train) |
| `task` | `intent` (a question to the app) or `yesno` (an answer to "Did you take your medicine?") |
| `lang_form` | `si` (Sinhala script), `singlish` (Sinhala in English letters), `en`, `mixed` |
| `label` | intent: `did_i_take`, `when_next`, `which_pills`, `other`. yesno: `yes`, `no`, `unsure` |
| `writer` | a short name for who wrote it (not shown anywhere). Never `claude…` in test |

## How to collect (about 1 hour with family)

1. Ask each person to say, in their own words, how an Amma or Thaththa might ask:
   - "did I take my medicine?"
   - "when is the next one?"
   - "which pills now?"
   - …and a few unrelated questions (`other`).
2. Ask the same for answers to "Did you take your medicine?": yes, no, and not sure.
3. Write them down **exactly as said**. Keep the spelling mistakes and the mixed English.
4. Aim for a balance: about a quarter each of `si`, `singlish`, `en` and `mixed`.
5. Put roughly 1 in 3 lines in `test.jsonl`, written by people who did **not** write `train.jsonl`.
6. Freeze the test before training anything:

   ```powershell
   eval\.venv\Scripts\python -m eval.freeze intents_si/test.jsonl
   ```

7. Run the gate:

   ```powershell
   eval\.venv\Scripts\python -m eval.run --name gate --suites intents --intents-set test --engines laya-ml,laya-en,gemma,rule
   ```

Tamil: add `ta` lines later. Until Laya is tested on Tamil, Tamil elders use buttons only (`RuleEngine`).
