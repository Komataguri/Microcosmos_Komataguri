from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parents[1]
ERRORS = []
WARNINGS = []


class LocalReferenceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        for attribute in ("href", "src"):
            value = values.get(attribute)
            if value:
                self.references.append((tag, value))


def is_local_reference(value):
    parsed = urlparse(value)
    return not parsed.scheme and not parsed.netloc and not value.startswith(("#", "data:"))


def validate_html():
    for name in ("index.html", "book.html", "privacy.html"):
        path = ROOT / name
        if not path.exists():
            ERRORS.append(f"Отсутствует страница {name}")
            continue

        parser = LocalReferenceParser()
        parser.feed(path.read_text(encoding="utf-8"))
        for tag, reference in parser.references:
            if not is_local_reference(reference):
                continue
            target = unquote(reference.split("?", 1)[0])
            if not (ROOT / target).exists():
                ERRORS.append(f"{name}: не найден ресурс {reference} для <{tag}>")


def validate_chapters():
    for book_dir in sorted((ROOT / "chapters").glob("Book*")):
        if not book_dir.is_dir():
            continue

        toc_path = book_dir / "chapters.json"
        if not toc_path.exists():
            ERRORS.append(f"{book_dir.name}: отсутствует chapters.json")
            continue

        try:
            chapters = json.loads(toc_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as error:
            ERRORS.append(f"{book_dir.name}: chapters.json повреждён: {error}")
            continue

        if not isinstance(chapters, list):
            ERRORS.append(f"{book_dir.name}: chapters.json должен содержать список")
            continue

        listed_files = []
        for chapter in chapters:
            if not isinstance(chapter, dict) or not {"index", "file", "title"} <= chapter.keys():
                ERRORS.append(f"{book_dir.name}: неверная запись оглавления {chapter!r}")
                continue

            listed_files.append(chapter["file"])
            chapter_path = book_dir / chapter["file"]
            if not chapter_path.exists():
                ERRORS.append(f"{book_dir.name}: не найден файл {chapter['file']}")
                continue

            lines = chapter_path.read_text(encoding="utf-8-sig").splitlines()
            first_line = lines[0].strip() if lines else ""
            expected_title = first_line[1:].strip() if first_line.startswith("#") else chapter_path.name
            if chapter["title"] != expected_title:
                ERRORS.append(f"{book_dir.name}: заголовок не совпадает в {chapter['file']}")

            text = "\n".join(lines)
            patterns = (
                r"!\[[^\]]*\]\(([^)]+)\)",
                r"<img\b[^>]*\bsrc=[\"']([^\"']+)[\"']",
            )
            for pattern in patterns:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    reference = unquote(match.group(1).strip().split()[0].strip("<>"))
                    if is_local_reference(reference) and not (book_dir / reference.lstrip("./")).exists():
                        ERRORS.append(f"{chapter_path.name}: не найдено изображение {reference}")

        duplicates = [name for name, count in Counter(listed_files).items() if count > 1]
        if duplicates:
            ERRORS.append(f"{book_dir.name}: повторяющиеся файлы в оглавлении: {duplicates}")

        actual_files = {path.name for path in book_dir.glob("*.md")}
        unlisted = sorted(actual_files - set(listed_files))
        if unlisted:
            ERRORS.append(f"{book_dir.name}: главы отсутствуют в оглавлении: {unlisted}")

        duplicate_indexes = [
            index for index, count in Counter(chapter.get("index") for chapter in chapters).items()
            if count > 1
        ]
        if duplicate_indexes:
            WARNINGS.append(f"{book_dir.name}: повторяющиеся номера материалов: {duplicate_indexes}")


def validate_javascript():
    node = shutil.which("node")
    if not node:
        WARNINGS.append("Node.js не найден, проверка синтаксиса JavaScript пропущена")
        return

    for path in sorted((ROOT / "scripts").rglob("*.js")):
        result = subprocess.run(
            [node, "--check", str(path)],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode:
            ERRORS.append(f"{path.relative_to(ROOT)}: {result.stderr.strip()}")


def main():
    validate_html()
    validate_chapters()
    validate_javascript()

    for warning in WARNINGS:
        print(f"ПРЕДУПРЕЖДЕНИЕ: {warning}")
    for error in ERRORS:
        print(f"ОШИБКА: {error}")

    if ERRORS:
        print(f"Проверка завершена. Ошибок: {len(ERRORS)}")
        return 1

    print("Проверка завершена успешно")
    return 0


if __name__ == "__main__":
    sys.exit(main())
