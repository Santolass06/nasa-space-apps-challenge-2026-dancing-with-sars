"""Manifest caveat of a coherence pair, from where its two dates fall against the fire.

In:  the two acquisition dates (ISO strings) of a coherence pair.
Out: the English caveat the app shows in the legend.
Reads: no product. Standard library only, so CI can run the check below.

The fire burned from 2 to 5 July 2026 (ICNF REE_2026_004 and the press accounts in
docs/DOSSIER.md). A pair is "before" or "after" the fire only when BOTH dates are,
and a pair that only touches the fire window must not claim to bracket it.

Run `python -m caramulo.caveats` (inside pipeline/) to check the cases.
"""

FIRE_START = "2026-07-02"
FIRE_END = "2026-07-05"
_BASE = "Low coherence also occurs over water and dense forest; "
_WINDOW = "(2-5 Jul 2026)."


def coherence_caveat(first: str, second: str) -> str:
    """The caveat for a pair acquired on `first` and `second` (ISO dates, first < second)."""
    if second < FIRE_START:
        return f"{_BASE}both acquisitions are before the fire {_WINDOW}"
    if first > FIRE_END:
        return f"{_BASE}both acquisitions are after the fire {_WINDOW}"
    if FIRE_START <= first <= FIRE_END:
        return f"{_BASE}the first acquisition falls during the fire {_WINDOW}"
    if second <= FIRE_END:
        return f"{_BASE}the second acquisition falls during the fire {_WINDOW}"
    return f"{_BASE}this pair brackets the fire {_WINDOW}"


if __name__ == "__main__":
    cases = {
        ("2026-06-17", "2026-06-29"): "before",  # D52, pre-fire
        ("2026-06-29", "2026-07-11"): "brackets",  # D52, the fire pair
        ("2026-07-11", "2026-07-23"): "after",  # D52, the control pair
        ("2026-06-27", "2026-07-09"): "brackets",  # A15
        ("2026-06-22", "2026-07-04"): "second acquisition falls during",  # A116, D124
        ("2026-07-03", "2026-07-15"): "first acquisition falls during",
        ("2026-10-03", "2026-10-15"): "after",  # D52, October
    }
    for (first, second), word in cases.items():
        text = coherence_caveat(first, second)
        assert word in text, (first, second, text)
        assert ("brackets" in text) == (word == "brackets"), (first, second, text)
    print("caveats self-check ok")
