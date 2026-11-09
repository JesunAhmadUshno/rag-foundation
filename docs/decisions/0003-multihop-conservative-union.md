# 0003. Multi-hop keeps the hop 1 order and only appends

Date: 2026-11-04 (recorded 2026-11-08). Status: accepted.

Context. A second retrieval hop can push a correct hop 1 document down,
repeating the reranker pattern of a Deep step making the headline
number worse.

Decision. The multi-hop ranking keeps the hop 1 document order exactly
and appends hop 2 documents that are not already in it.

Consequences. By construction the mode cannot change top-1 or recall
at 3; any gain shows only at rank 5 and beyond, or where hop 1 misses
a document entirely. "No multi-hop gain" on this corpus is partly a
property of this design (REPORT.md, Review findings, item 5).
