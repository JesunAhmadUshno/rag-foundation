"""Portfolio standard checks: required files exist and no public file carries a grade.

No lock test: the repo is not pre-registered (PROPOSAL.md). When the
confirmatory proposal is tagged proposal-v1, pin its SHA-256 here.
"""
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQUIRED = [
    "README.md", "PROPOSAL.md", "REPORT.md", "CHANGELOG.md", "CITATION.cff", "SECURITY.md", "LICENSE",
    "src/rag.py", "src/run_rag.py", "src/corpus.py", "src/pipeline.py", "src/run_build.py",
    "src/deep_pipeline.py", "src/run_deep.py",
    "experiments/questions_build.json", "experiments/questions_deep.json",
    "results/results_build.json", "results/results_deep.json",
    "docs/decisions/0001-standard-library-only.md",
]
README_HEADS = ["**Question.**", "**Headline.**", "**Field.**", "**Job family.**", "**Verdict.**",
                "## Reproduce", "## Lifecycle", "## Layout"]
GRADE = re.compile(r"of 10,000|\d\s*/\s*10,?000\b|Grade:|Grades on record|/1000\b|\bRubric grades\b")
PUBLIC_EXT = (".md", ".jsx", ".js", ".mjs", ".html", ".cff", ".yml", ".py")


def public_files():
    for top, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "dist", "data", "__pycache__")]
        for name in files:
            if name.endswith(PUBLIC_EXT) and name != "test_layout.py":
                yield os.path.join(top, name)


class Layout(unittest.TestCase):
    def test_required_files_exist(self):
        missing = [p for p in REQUIRED if not os.path.exists(os.path.join(ROOT, p))]
        self.assertFalse(missing, "missing: " + ", ".join(missing))

    def test_readme_opens_with_the_abstract(self):
        text = open(os.path.join(ROOT, "README.md"), encoding="utf-8").read()
        for head in README_HEADS:
            self.assertIn(head, text)
        self.assertLess(text.index("**Question.**"), text.index("## Reproduce"))

    def test_no_public_grade(self):
        hits = []
        for path in public_files():
            for n, line in enumerate(open(path, encoding="utf-8"), 1):
                if GRADE.search(line):
                    hits.append(f"{os.path.relpath(path, ROOT)}:{n}")
        self.assertFalse(hits, "grades are internal; found: " + ", ".join(hits))

    def test_grade_check_catches_a_grade(self):
        self.assertTrue(GRADE.search("Grades on record (of 10,000): Learn 8,700"))
        self.assertTrue(GRADE.search("Total 965/1000"))


if __name__ == "__main__":
    unittest.main()
