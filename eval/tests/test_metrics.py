from eval.metrics import decision_scores, ece


def row(i, label, pred, conf, form="si"):
    return {"id": f"r{i}", "label": label, "pred": pred, "confidence": conf, "lang_form": form, "ms": 10}


def test_wrong_action_counts_only_confident_unsafe_mistakes():
    rows = [
        row(1, "did_i_take", "did_i_take", 0.95),  # right, acted
        row(2, "did_i_take", "when_next", 0.95),  # WRONG ACTION
        row(3, "did_i_take", "when_next", 0.50),  # wrong but escalated (low confidence) -> safe
        row(4, "when_next", "other", 0.99),  # wrong but "other" always asks a human -> safe
    ]
    s = decision_scores(rows, 0.85)
    assert s["accuracy"] == 0.25
    assert s["wrong_action_rate"] == 0.25
    assert s["wrong_actions"] == ["r2"]
    assert s["escalation_rate"] == 0.5


def test_ece_perfect_and_bad():
    assert ece([1.0, 1.0], [True, True]) == 0.0
    assert abs(ece([0.9, 0.9], [False, False]) - 0.9) < 1e-9


def test_accuracy_by_form():
    s = decision_scores([row(1, "yes", "yes", 1, "si"), row(2, "yes", "no", 1, "singlish")], 0.85)
    assert s["accuracy_by_form"] == {"si": 1.0, "singlish": 0.0}
