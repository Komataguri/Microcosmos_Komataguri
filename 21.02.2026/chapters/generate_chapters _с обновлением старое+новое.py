import os
import json
import re
import sys

# -----------------------------
# Проверка аргументов
# -----------------------------
if len(sys.argv) < 2:
    print("Использование: python generate_chapters.py <папка_книги>")
    sys.exit(1)

BOOK_DIR = sys.argv[1]

if not os.path.isdir(BOOK_DIR):
    print(f"Ошибка: папка не найдена: {BOOK_DIR}")
    sys.exit(1)

OUTPUT_JSON = os.path.join(BOOK_DIR, "chapters.json")

# -----------------------------
# Вспомогательные функции
# -----------------------------
def extract_title(file_path):
    """Читает первую строку файла и возвращает заголовок"""
    with open(file_path, "r", encoding="utf-8") as f:
        first_line = f.readline().strip()
    if first_line.startswith("#"):
        return first_line[1:].strip()
    return os.path.basename(file_path)

def extract_index(file_name):
    """Попытка извлечь номер главы из имени файла"""
    match = re.search(r'Глава\s*0*(\d+)', file_name)
    if match:
        return int(match.group(1))
    match = re.match(r'0*(\d+)', file_name)
    if match:
        return int(match.group(1))
    return 9999

# -----------------------------
# Основная логика
# -----------------------------
# Загружаем существующий chapters.json, если есть
if os.path.exists(OUTPUT_JSON):
    with open(OUTPUT_JSON, "r", encoding="utf-8") as f:
        chapters = json.load(f)
    existing_files = {c['file'] for c in chapters}
else:
    chapters = []
    existing_files = set()

md_files = [f for f in os.listdir(BOOK_DIR) if f.lower().endswith(".md")]

new_count = 0
for f in md_files:
    if f in existing_files:
        continue  # уже есть в chapters.json, пропускаем
    title = extract_title(os.path.join(BOOK_DIR, f))
    index = extract_index(f)
    chapters.append({
        "index": index,
        "file": f,
        "title": title
    })
    new_count += 1

# сортировка по индексу
chapters.sort(key=lambda x: x['index'])

# запись JSON
with open(OUTPUT_JSON, "w", encoding="utf-8") as out:
    json.dump(chapters, out, ensure_ascii=False, indent=2)

print(f"Готово! Найдено {len(chapters)} глав (добавлено новых: {new_count}). Файл chapters.json обновлен в {BOOK_DIR}")