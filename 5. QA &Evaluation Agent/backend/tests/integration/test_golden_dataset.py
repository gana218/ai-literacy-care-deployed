import json
from pathlib import Path

from backend.evaluation.evaluation_pipeline import run_evaluation


ROOT_DIR = Path(__file__).resolve().parents[3]
GOLDEN_DIR = ROOT_DIR / "golden_dataset"


def test_golden_dataset_files_pass_threshold():
    dataset_files = sorted(GOLDEN_DIR.glob("article_*.json"))

    assert dataset_files, "golden_dataset에 article_*.json 파일이 필요합니다."

    for dataset_file in dataset_files:
        sample = json.loads(dataset_file.read_text(encoding="utf-8"))
        report = run_evaluation(sample)

        assert "faithfulness" in report
        assert "relevance" in report
        assert "average_score" in report
        assert report["average_score"] >= report["threshold"], (
            f"{dataset_file.name} 평가 실패: {report}"
        )
