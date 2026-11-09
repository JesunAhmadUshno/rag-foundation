# 0002. Deep modes do not reapply the Build reranker

Date: 2026-11-04 (recorded 2026-11-08). Status: accepted.

Context. The Build ablation measured the coverage and F1 reranker as a
loss: it demoted b10-pollen to rank 2 (top-1 0.958 against 1.000 for
hybrid alone), because F1 precision rewards the shorter bees chunk when
coverage ties.

Decision. Deep modes (rewrite, HyDE, multi-hop, combined) run on the
hybrid fusion without the reranker. The reranked mode stays in every
table as a baseline column, and b10-pollen is a named regression case
in every future run.

Consequences. Part of the Deep result on b10-pollen is subtractive (no
reranker), not a rewriting win, and REPORT.md says so. A learned
reranker must be compared under the same rule (REPORT.md, item 3).
