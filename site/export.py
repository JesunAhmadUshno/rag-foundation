"""Export the repo's corpus and pipeline constants for the live dashboard.

Usage: python3 site/export.py  (run by `npm run build`)

Imports the real modules and writes site/src/data/repo.json, so the
in-browser port reads the same documents, stopwords, expansion table
and constants as the Python pipeline. Nothing is hand-copied.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "level-3-deep"))
sys.path.insert(0, os.path.join(ROOT, "level-2-build"))

import corpus  # noqa: E402
import deep_pipeline  # noqa: E402
import pipeline  # noqa: E402

data = {
    "documents": corpus.DOCUMENTS,
    "stopwords": sorted(pipeline.STOPWORDS),
    "constants": {
        "K1": pipeline.K1,
        "B": pipeline.B,
        "RRF_K": pipeline.RRF_K,
        "RERANK_DEPTH": pipeline.RERANK_DEPTH,
        "MIN_SECOND_COVERAGE": pipeline.MIN_SECOND_COVERAGE,
        "CHUNK_SIZE": pipeline.chunk_document.__defaults__[0],
        "OVERLAP": pipeline.chunk_document.__defaults__[1],
        "BRIDGE_MIN_DOCS": deep_pipeline.BRIDGE_MIN_DOCS,
        "BRIDGE_MAX_DOCS": deep_pipeline.BRIDGE_MAX_DOCS,
        "BRIDGE_TERMS": deep_pipeline.BRIDGE_TERMS,
        "HYDE_TERMS_PER_TERM": deep_pipeline.HYDE_TERMS_PER_TERM,
    },
    "expansions": deep_pipeline.EXPANSIONS,
}

out_dir = os.path.join(HERE, "src", "data")
os.makedirs(out_dir, exist_ok=True)
with open(os.path.join(out_dir, "repo.json"), "w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=1, sort_keys=True)
print(f"export ok: {len(data['documents'])} documents, {len(data['expansions'])} expansion keys")
