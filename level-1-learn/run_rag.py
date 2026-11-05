"""Run the Level 1 RAG pipeline on hand-labelled questions.

Usage: python level-1-learn/run_rag.py
Prints, per question: the retrieved chunks with scores, the
extractive answer, the citation for each answer sentence, and
whether the expected source document was retrieved (top 1 and
top 3). Exit code 0 when the run completes: a miss is data, and
the summary prints either way.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rag import answer_question, build_retriever  # noqa: E402

# Hand-labelled: expected_doc is the document a human judges as the
# source for the question, labelled before any run.
QUESTIONS = [
    {
        "id": "q01-absorb",
        "question": "What gas do plants absorb from the air for photosynthesis?",
        "expected_doc": "photosynthesis",
    },
    {"id": "q02-clouds", "question": "What process forms clouds in the water cycle?", "expected_doc": "water-cycle"},
    {
        "id": "q03-newton",
        "question": "Who described gravity as a universal attraction between masses?",
        "expected_doc": "gravity",
    },
    {"id": "q04-bees", "question": "How do bees communicate the location of flowers?", "expected_doc": "bees"},
    {"id": "q05-magma", "question": "What does magma become when it reaches the surface?", "expected_doc": "volcanoes"},
    {"id": "q06-books", "question": "How many books can members borrow from the library?", "expected_doc": "library"},
    {
        "id": "q07-oxygen",
        "question": "What do plants release into the air during photosynthesis?",
        "expected_doc": "photosynthesis",
    },
    {"id": "q08-evaporation", "question": "What causes evaporation in the water cycle?", "expected_doc": "water-cycle"},
]


def main():
    retriever = build_retriever()
    print(f"corpus: {len(retriever.chunks)} chunks")
    hits_top1 = 0
    hits_top3 = 0
    print("id              top1_doc        top1  in_top3  hit1  answer")
    for item in QUESTIONS:
        result = answer_question(retriever, item["question"], top_k=3, max_sentences=2)
        retrieved = result["retrieved"]
        top_docs = [chunk.doc_id for chunk, _ in retrieved]
        top1_doc = top_docs[0] if top_docs else "-"
        top1_score = retrieved[0][1] if retrieved else 0.0
        in_top3 = item["expected_doc"] in top_docs
        hit1 = top1_doc == item["expected_doc"]
        hits_top1 += 1 if hit1 else 0
        hits_top3 += 1 if in_top3 else 0
        retrieved_str = ", ".join(f"{c.chunk_id}={s:.3f}" for c, s in retrieved) or "none"
        citations_str = "; ".join(f"[{doc}:{chunk}]" for _, doc, chunk in result["citations"]) or "none"
        print(f"[{item['id']}] Q: {item['question']}")
        print(f"  retrieved: {retrieved_str}")
        print(f"  answer: {result['answer'] or 'no answer'}")
        print(f"  citations: {citations_str}")
        print(
            f"{item['id']:<15} {top1_doc:<15} {top1_score:.3f}  "
            f"{'yes' if in_top3 else 'no':<7}  {'yes' if hit1 else 'no':<4}  "
            f"expected={item['expected_doc']}"
        )
    n = len(QUESTIONS)
    print(
        f"summary: top1 {hits_top1} of {n} (accuracy {hits_top1 / n:.3f}); "
        f"top3 {hits_top3} of {n} (recall at 3 {hits_top3 / n:.3f})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
