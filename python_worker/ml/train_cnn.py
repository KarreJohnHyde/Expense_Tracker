"""Train a lightweight CNN for character recognition and export a SavedModel."""
from __future__ import annotations

import argparse
from pathlib import Path

import tensorflow as tf
from tensorflow import keras



def build_model(input_shape=(28, 28, 1), classes=10) -> keras.Model:
    model = keras.Sequential(
        [
            keras.layers.Input(shape=input_shape),
            keras.layers.Rescaling(1.0 / 255),
            keras.layers.Conv2D(32, 3, activation="relu"),
            keras.layers.MaxPool2D(),
            keras.layers.Conv2D(64, 3, activation="relu"),
            keras.layers.MaxPool2D(),
            keras.layers.Flatten(),
            keras.layers.Dense(128, activation="relu"),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(classes, activation="softmax"),
        ]
    )
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return model



def train(output_dir: Path, epochs: int = 5) -> None:
    (x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()
    x_train = x_train[..., None]
    x_test = x_test[..., None]

    augmenter = keras.Sequential(
        [
            keras.layers.RandomRotation(0.08),
            keras.layers.RandomTranslation(0.1, 0.1),
            keras.layers.RandomZoom(0.12),
            keras.layers.RandomContrast(0.12),
        ]
    )

    model = build_model(classes=10)

    train_ds = tf.data.Dataset.from_tensor_slices((x_train, y_train)).shuffle(10000).batch(128)
    train_ds = train_ds.map(lambda x, y: (augmenter(x, training=True), y), num_parallel_calls=tf.data.AUTOTUNE)
    test_ds = tf.data.Dataset.from_tensor_slices((x_test, y_test)).batch(256)

    model.fit(train_ds, validation_data=test_ds, epochs=epochs)

    output_dir.mkdir(parents=True, exist_ok=True)
    model.export(str(output_dir / "saved_model"))



def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train OCR character CNN")
    parser.add_argument("--output-dir", default="python_worker/ml/artifacts/cnn", help="Model output path")
    parser.add_argument("--epochs", type=int, default=5)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train(Path(args.output_dir), epochs=args.epochs)