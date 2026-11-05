# PUBLICITY: rag-foundation (P05)

Publicity log under the documentation and publishing standard,
Section 7. Every finished level produces its written fan-out set,
each piece graded on the 1,000-point publicity rubric (accuracy 300,
research 200, gap fit 200, clarity 150, reach format 150), ship line
900. Drafts are prepared by the loop. Actual social posting follows
the standing platform rules and gates. The loop itself never posts
to social.

Fan-out set date: 2026-11-04. Project state: v1.0, Learn, Build, and
compressed Deep done 2026-11-04, 52 tests passing.

## Channel log (2026-11-04)

| Channel | Outcome on 2026-11-04 |
| --- | --- |
| GitHub releases | Live: v0.1 https://github.com/JesunAhmadUshno/rag-foundation/releases/tag/v0.1 , v0.5 https://github.com/JesunAhmadUshno/rag-foundation/releases/tag/v0.5 , v1.0 https://github.com/JesunAhmadUshno/rag-foundation/releases/tag/v1.0 (verified with gh release list, 2026-11-04). Draft release notes for all three are in fanout/release-notes.md. No new release was created for the fan-out. |
| Portfolio index | Held: fan-out links are ready, the index update is a coordinator step outside this cycle. Named reason: held for index refresh. |
| Website page | Draft in fanout/website-page.md. Held: not published to jesunahmadushno.com. |
| Blog | Draft in fanout/blog-post.md. Held: not posted. |
| Tutorial | In repo: fanout/tutorial.md. Every command in it was run and verified on 2026-11-04 (three runners, three per-level test discoveries, full suite at 52 tests). |
| LinkedIn post | Draft in fanout/linkedin-post.md, marked DRAFT NOT POSTED, link carried as the first-comment line per the LinkedIn rule. Held: not posted, loop never posts. |
| X | Draft held: no X copy is shipped in this set beyond the LinkedIn draft source text. Held under the standing social rules; posting is outside the loop. |
| Facebook | Draft held: no Facebook copy posted. Standing rule applies (no link in body or comments, keyword call to action fulfilled by DM). Held: not posted, loop never posts. |
| Instagram | Draft held: no Instagram copy posted. Standing rule applies (no clickable link in caption, link in bio). Held: not posted, loop never posts. |
| Threads | Draft held: no Threads copy posted. Threads waits for Jesun's tap per post, hash-locked on exact text and media. Held: awaiting Jesun's tap. |
| Video | Held: engine queue, January production for lab projects per the December Compression Protocol. No video was produced in this cycle. |
| Book chapter | Draft angle in fanout/blog-post.md and SPEC.md ("Retrieval Done Right"). Held: chapter draft follows the finished project set; not a published chapter. |
| Paper candidate | Draft brief in fanout/paper-candidate.md (hybrid search ablation). Submission is Jesun's tap. Nothing submitted, no venue contacted. Tracker row added at CANDIDATE on 2026-11-04. |

## Publicity grades (1,000-point rubric, ship line 900)

| Piece | Accuracy /300 | Research /200 | Gap fit /200 | Clarity /150 | Reach format /150 | Total /1000 |
| --- | --- | --- | --- | --- | --- | --- |
| fanout/blog-post.md | 295 | 190 | 195 | 145 | 140 | 965 |
| fanout/tutorial.md | 300 | 185 | 195 | 148 | 142 | 970 |
| fanout/website-page.md | 295 | 180 | 190 | 148 | 145 | 958 |
| fanout/linkedin-post.md | 290 | 175 | 190 | 145 | 140 | 940 |
| fanout/paper-candidate.md | 295 | 195 | 195 | 140 | 130 | 955 |
| fanout/release-notes.md | 298 | 185 | 185 | 145 | 135 | 948 |

All six pieces are at or above the 900 ship line. No piece was
shipped ungraded.

## Named deductions (unclosable in this cycle)

- Blog post, minus 35: research is condensed from DOSSIER.md v1,
  whose prior art section is brief (minus 10 research); small
  synthetic corpora limit how far the results travel, stated in the
  piece (minus 10 reach, minus 5 accuracy for reader interpretation
  risk, minus 5 gap fit, minus 5 clarity).
- Tutorial, minus 30: research framing is thinner than the blog by
  design, because the module teaches runs rather than the field
  (minus 15 research); no worked example beyond the shipped sets
  (minus 5 gap fit, minus 2 clarity, minus 8 reach).
- Website page, minus 42: condensed research (minus 20), condensed
  gap framing (minus 10), and the page is copy only, not a live
  page (minus 5 reach, minus 5 accuracy, minus 2 clarity).
- LinkedIn post, minus 60: short form compresses the research and
  the failure mode detail (minus 25 research, minus 10 accuracy,
  minus 10 gap fit, minus 5 clarity, minus 10 reach, because the
  post is a held draft and carries no live link in the body by rule).
- Paper candidate, minus 45: this is a brief, not a drafted paper
  (minus 20 reach, minus 10 clarity); venue is classed, not named
  (minus 5 research, minus 5 gap fit, minus 5 accuracy for the
  synthetic-only evidence base the paper must carry).
- Release notes, minus 52: notes summarise releases that already
  exist, so research and gap framing are summary grade (minus 15
  research, minus 15 gap fit); format is repo-bound (minus 15
  reach, minus 2 accuracy, minus 5 clarity).

## Actions polish pack (2026-11-04)

Applied through a pull request on 2026-11-04, following the Actions
polish pack standard, backfill order P06, P05, P14. The pack adds:
CI on a Python 3.11 and 3.12 matrix with a ruff lint step (all
pre-existing P05 CI steps preserved: smoke, Learn tests and run,
Build tests and run, Deep tests and run), CodeQL scanning,
Dependabot for pip and GitHub Actions, a release workflow that
attaches a source tarball named rag-foundation-<tag>.tar.gz to
v* tag releases, Labeler, Greetings (snake_case inputs for
actions/first-interaction@v3: repo_token, issue_message,
pr_message), Stale in comment-only mode (days-before-close: -1,
never closes), and a docs summary page at docs/index.md for
GitHub Pages. Ruff scope is recorded in ruff.toml (E, F, I,
line-length 120). The project runs on the Python standard
library only; requirements.txt records that so Dependabot pip
has a manifest to watch.

| Channel | Outcome on 2026-11-04 |
| --- | --- |
| GitHub Pages | Docs page added at docs/index.md in this pull request. Pages enablement and live build status are verified after merge and recorded in the batch ledger; no live claim is made in this file before that check. |
| PyPI publishing | Held: needs a PyPI token, a new credential. Jesun's tap only. Not set up. |
| Social channels (LinkedIn, X, Facebook, Instagram, Threads) | Held: no posts made. The loop never posts to social; Threads waits for Jesun's tap per post under the standing gates. |
