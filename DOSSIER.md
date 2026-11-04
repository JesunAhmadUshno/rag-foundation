# DOSSIER: rag-foundation (P05) v1, 2026-11-04

Written under the documentation and publishing standard (past, present, future). Updated at ship time.

## Past

Prior art for this project is named in NOVELTY.md (framework RAG examples (LangChain and LlamaIndex tutorials)). The history of the problem, the key papers and systems, and what was tried before are recorded in the Roadmap v2 section text in SPEC.md and will be expanded with dated sources at the project's wave, before Build opens.

## Present

Current demand evidence: hiring value 3 of 5 (RAG named in 4/56, required at Apple and Mistral FDE) [confirmed, fleet and scoring pass 2026-11-04; for P23 to P29, the decision pack 2026-11-04]. The Round 3 research (2026-11-04) found the market centre at post-training, evals, environments, and inference depth [confirmed as the research finding; the report is at ~/workspace/research_notes/roadmap-v3-revaluation-research-20261104-0949/report.md]. Tools and versions are pinned at Build time, not in this v1.
Update 2026-11-04 (ship state, v1.0): Learn, Build, and compressed Deep are done. Ship state is a dependency-free RAG pipeline over a 20-document, 41-chunk synthetic corpus: TF-IDF retrieval with cited extractive answers (Learn), hybrid BM25 plus TF-IDF search with RRF fusion, reranking, and a query API (Build), and query rewriting, a lexical HyDE simulation, and bridge term multi-hop retrieval (Deep), all measured on 42 labelled questions in level-3-deep/results_deep.json. The measured Deep result is that deterministic rewriting closes the paraphrase gap on this vocabulary (top-1 0.500 to 1.000 on the paraphrase set, regression held at 1.000) while the HyDE simulation and multi-hop show no headline gain over hybrid on this corpus, with their failure modes written in level-3-deep/README.md. 52 unit tests pass in total. The v1.1 backlog (dense embeddings, LLM rewriting and HyDE, learned reranking, larger real corpus) is in ROADMAP.md at the repo root.

## Future

Open problems and the project's next steps sit in the Deep level scope in SPEC.md. Any forecast about this field is [unverified] unless a dated primary source is added here at the wave update.
