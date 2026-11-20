# Tools

Call these on the Deep Clearance MCP server at `https://mcp.deepclearance.com/mcp`. A call needs a paid key. Login does not mint a free key.

| Tool | When | Returns | Cost |
|---|---|---|---|
| `search` | A program, agency, classified or black project, UAP, cover story, named official, FOIA release, hearing, filing, patent, or a claim to check | Cited stored passages. `ok` false means the index has no passage | 1 query |
| `pattern_query` | A network, mechanism, or pattern across institutions | Events and cited passages. Each claim keeps its own standard | 1 query |
| `get_passage` | Before quoting a hit | The stored excerpt | 1 query |
| `verify_claim` | Before asserting a specific factual claim | `noul` from 0 to 1, `skipped` if the judge is unavailable, or `no_passage`. The score is not a source | 1 query |
| `corruption_lookup` | An actor, jurisdiction, mechanism, or date range | Matching events. Each event keeps its own standard | 1 query |
| `get_snapshot` | A later turn needs the same dated report | The stored report. It does not re-search | nothing |
| `flag_gap` | Results came back and did not answer the question | A recorded gap | 1 query |
| `gap_log` | Corpus maintenance | Gaps sorted by hit count | 1 query |

`search` takes `query`. Optional `source` pins one topic. Optional `when` is `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`. Optional `snapshot` true stores the result.

Pins: `origin_literature`, `secrecy_labels`, `contractor_layer`, `postwar_record`, `financial_control`, `fiction_contamination`, `disclosure_pressure`, `epstein_record`, `declassified_record`, `shelf`, `industry_record`, `wire`. Omit `source` to search the documentary index. Do not pass `system`. That pin is not returned as a cite.

`get_passage` takes `uri`, or `id`, or `source` plus `doc`. Prefer the `intel://` locator on the cite.

`verify_claim` takes `claim` and the same locator fields as `get_passage`.

`pattern_query` takes `query`.

Daily caps. Trial 50. Researcher 250. Control 500. `get_snapshot` does not count.

Prompts on the server: `research_subject`, `verify_a_claim`, `map_a_pattern`. The skill file is the resource `https://deepclearance.com/skills/deep-clearance/SKILL.md`.
