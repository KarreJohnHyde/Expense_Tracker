"""Train HOG + SVM baseline for character recognition."""
from __future__ import annotations

import argparse
import pickle
from pathlib import Path

import numpy as np
from skimage.feature import hog
from sklearn import datasets, metrics, model_selection, svm



def extract_hog_features(images: np.ndarray) -> np.ndarray:
    features = [
        hog(image, orientations=9, pixels_per_cell=(4, 4), cells_per_block=(2, 2), feature_vector=True)
        for image in images
    ]
    return np.array(features)



def train(output_path: Path) -> None:
    digits = datasets.load_digits()
    X = extract_hog_features(digits.images)
    y = digits.target

    X_train, X_test, y_train, y_test = model_selection.train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = svm.LinearSVC(max_iter=10000)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    print("SVM accuracy:", metrics.accuracy_score(y_test, preds))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as fh:
        pickle.dump(model, fh)



def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train SVM baseline OCR model")
    parser.add_argument("--output", default="python_worker/ml/artifacts/svm_hog.pkl", help="Model pickle output")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train(Path(args.output))