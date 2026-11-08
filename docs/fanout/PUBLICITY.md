# PUBLICITY: rag-foundation (P05)

Publicity log under the documentation and publishing standard,
Section 7. Every finished level produced its written fan-out set.
Drafts are prepared by the loop. Actual social posting follows the
standing platform rules and gates. The loop itself never posts to
social. Per-piece review scores are internal and are not published.

Fan-out set date: 2026-11-04. Project state: v1.0, Learn, Build, and
compressed Deep done 2026-11-04, 52 tests passing.

## Channel log (2026-11-04)

| Channel | Outcome on 2026-11-04 |
| --- | --- |
| GitHub releases | Live: v0.1 https://github.com/JesunAhmadUshno/rag-foundation/releases/tag/v0.1 , v0.5 https://github.com/JesunAhmadUshno/rag-foundation/releases/tag/v0.5 , v1.0 https://github.com/JesunAhmadUshno/rag-foundation/releases/tag/v1.0 (verified with gh release list, 2026-11-04). Draft release notes for all three are in docs/fanout/release-notes.md. No new release was created for the fan-out. |
| Portfolio index | Held: fan-out links are ready, the index update is a coordinator step outside this cycle. Named reason: held for index refresh. |
| Website page | Draft in docs/fanout/website-page.md. Held: not published to jesunahmadushno.com. |
| Blog | Draft in docs/fanout/blog-post.md. Held: not posted. |
| Tutorial | In repo: docs/fanout/tutorial.md. Every command in it was run and verified on 2026-11-04 (three runners, three per-level test discoveries, full suite at 52 tests). |
| LinkedIn post | Draft in docs/fanout/linkedin-post.md, marked DRAFT NOT POSTED, link carried as the first-comment line per the LinkedIn rule. Held: not posted, loop never posts. |
| X | Draft held: no X copy is shipped in this set beyond the LinkedIn draft source text. Held under the standing social rules; posting is outside the loop. |
| Facebook | Draft held: no Facebook copy posted. Standing rule applies (no link in body or comments, keyword call to action fulfilled by DM). Held: not posted, loop never posts. |
| Instagram | Draft held: no Instagram copy posted. Standing rule applies (no clickable link in caption, link in bio). Held: not posted, loop never posts. |
| Threads | Draft held: no Threads copy posted. Threads waits for Jesun's tap per post, hash-locked on exact text and media. Held: awaiting Jesun's tap. |
| Video | Held: engine queue, January production for lab projects per the December Compression Protocol. No video was produced in this cycle. |
| Book chapter | Draft angle in docs/fanout/blog-post.md and PROPOSAL.md ("Retrieval Done Right"). Held: chapter draft follows the finished project set; not a published chapter. |
| Paper candidate | Draft brief in docs/fanout/paper-candidate.md (hybrid search ablation). Submission is Jesun's tap. Nothing submitted, no venue contacted. Tracker row added at CANDIDATE on 2026-11-04. |

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

Update 2026-11-08: docs/index.md was removed in the portfolio standard v2
restructure (its text duplicated the README). GitHub Pages now serves
the live dashboard built from site/. This log moved from the repo root
to docs/fanout/.
