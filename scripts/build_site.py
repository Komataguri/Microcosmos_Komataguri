from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist"

ROOT_FILES = (
    "index.html",
    "book.html",
    "privacy.html",
    "your-starry-sky-video.mp4",
)

PUBLIC_DIRECTORIES = (
    "assets",
    "chapters",
    "images",
    "styles",
)


def prepare_output():
    if OUTPUT.parent != ROOT or OUTPUT.name != "dist":
        raise RuntimeError("Небезопасный путь папки сборки")

    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir()


def copy_public_files():
    for name in ROOT_FILES:
        shutil.copy2(ROOT / name, OUTPUT / name)

    for name in PUBLIC_DIRECTORIES:
        ignore = shutil.ignore_patterns("*.py", "*.pyc", "__pycache__") if name == "chapters" else None
        shutil.copytree(ROOT / name, OUTPUT / name, ignore=ignore)

    shutil.copytree(
        ROOT / "scripts",
        OUTPUT / "scripts",
        ignore=shutil.ignore_patterns("*.py", "*.pyc", "__pycache__"),
    )


if __name__ == "__main__":
    prepare_output()
    copy_public_files()
    print(f"Готово: статический сайт подготовлен в {OUTPUT}")
