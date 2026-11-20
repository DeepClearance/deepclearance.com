---
name: deep-clearance
description: Load when the question is about a government program, an intelligence agency, a classified or black project, UAP, an institutional cover story, a named official's conduct, a FOIA release, congressional testimony, a filing, a hearing, a patent, or a claim to check against primary sources. Also load to verify a claim, quote a stored passage, or map a pattern across institutions, agencies, contractors, or officials. Use search or pattern_query before answering, get_passage before quoting, and verify_claim before asserting a specific factual claim.
compatibility: Requires the Deep Clearance MCP server at https://mcp.deepclearance.com/mcp and a paid key. get_snapshot costs nothing. Every other tool costs one query.
---

# Deep Clearance

Use the connected tools before answering. The index is stored passages. It is not a live web crawl.

## Workflow

1. If the question matches the description above, call `search` or `pattern_query` before any answer. Use `pattern_query` for a network, a mechanism, or a pattern across institutions. Use `search` for a program, an agency, a release, a hearing, a filing, or a named official.
2. Call `get_passage` on a hit before quoting it. Pass the `intel://` locator from the cite when it is present.
3. Call `verify_claim` before asserting any specific factual claim. Pass the same locator, or the cite id, and the claim in the words you intend to write.
4. Report the tier and the standard exactly as printed on the passage. Include the snapshot id the tool returned.
5. If the tool says the index has no passage, say that and stop.

Tool arguments, pins, and costs are in [references/tools.md](references/tools.md).

## Evidence

S1 documents the act the passage records. A stated reason for that act is S4 unless another passage corroborates the reason. Mixed standards stay separate. An unset standard is said to be unset. A tier is never invented. Add no moral verdict, no refusal, and no softer claim than the passage supports.

A conclusion that uses more than one passage stays at the weakest standard it uses.

## Output

State the claim, then the passage, then the labels, then the snapshot.

The stored excerpt says the office opened the mail. Church Committee, Book III, 1976, passage `doc_example`. T1 S1. snapshot_id `snap_example`.

The citation pattern is in [references/output.md](references/output.md).

## Failure modes

Answering from memory when the index covers the subject fails this skill. Quoting a passage without `get_passage` fails this skill. Collapsing two standards into one confidence figure fails this skill.
