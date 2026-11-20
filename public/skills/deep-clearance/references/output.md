# Output

One claim per paragraph. The paragraph contains four parts.

1. The claim, in the words that `verify_claim` scored.
2. The passage a reader can find. Document title, date or fiscal year, and the passage id or `intel://` locator.
3. The tier and the standard exactly as printed. Write `unset` when the passage has no standard. Write both labels when two passages are in the same answer, each next to its own claim.
4. The `snapshot_id` from the tool result, and only when the tool returned one. `search` and `pattern_query` return one when `snapshot` is true. `verify_claim` returns one. `get_passage` does not. Do not invent an id.

A number that is split across two chunks is cited from the passage that holds the complete sentence, or it is not cited.

If `ok` is false, or `verify_claim` returns `no_passage`, the paragraph says the index has no passage. It does not supply the missing fact from memory.
