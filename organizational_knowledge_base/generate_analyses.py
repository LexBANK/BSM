"""Generate advisory Markdown analyses from a CSV input file."""

from __future__ import annotations

import os
import re
from datetime import date
from pathlib import Path
from typing import Any

import pandas as pd
from openai import OpenAI

MODEL_NAME = "gpt-4o"
INPUT_CSV = Path("source_data/inputs.csv")
OUTPUT_DIR = Path("analyses")

SYSTEM_PROMPT = """
أنت مساعد تحليلي مهني.
دورك تقديم تحليل استشاري غير ملزم مبني على أفضل الممارسات المؤسسية.
لا تصدر قرارات، ولا توصيات إلزامية، ولا أحكام نهائية.
ركّز على إبراز المؤشرات، نقاط الانتباه، والاعتبارات المهنية.
التزم بالصيغة المطلوبة بدقة.
""".strip()


REQUIRED_COLUMNS = [
    "الإدارة",
    "الوحدة / القسم",
    "العنصر المدخل",
    "تقييم داخلي",
    "بيانات رقمية / وصفية",
]


def build_prompt(row: pd.Series) -> str:
    """Build a department-tailored Arabic prompt for a single CSV row."""
    dept = str(row["الإدارة"]).strip()

    base_data = f"""
- الإدارة: {row['الإدارة']}
- الوحدة / القسم: {row['الوحدة / القسم']}
- العنصر محل التحليل: {row['العنصر المدخل']}
- التقييم الداخلي: {row['تقييم داخلي']}
- التفاصيل: {row['بيانات رقمية / وصفية']}
""".strip()

    if "المخاطر" in dept or "الامتثال" in dept:
        return f"""
أنت محلل مخاطر وامتثال مؤسسي.

{base_data}

المطلوب:
قدّم تحليلًا استشاريًا وفق الصيغة التالية:

1. ملخص تنفيذي
2. مؤشرات تعرّض محتملة
3. نقاط انتباه تنظيمية أو تشغيلية
4. اعتبارات يجب أخذها في الحسبان قبل أي قرار
""".strip()
    if "الموارد البشرية" in dept:
        return f"""
أنت مستشار موارد بشرية مؤسسي.

{base_data}

المطلوب:
1. ملخص تنفيذي
2. مؤشرات أداء إيجابية
3. مؤشرات تحتاج تطوير
4. اعتبارات مهنية وتنظيمية
""".strip()
    if "المالية" in dept:
        return f"""
أنت محلل مالي مؤسسي.

{base_data}

المطلوب:
1. ملخص تنفيذي مالي
2. مؤشرات داعمة ماليًا
3. مؤشرات تتطلب تحليلًا أعمق
4. اعتبارات مالية عامة
""".strip()
    if "العمليات" in dept:
        return f"""
أنت مستشار عمليات وتشغيل.

{base_data}

المطلوب:
1. ملخص تنفيذي تشغيلي
2. مؤشرات كفاءة محتملة
3. نقاط تشغيلية تحتاج انتباه
4. اعتبارات تحسين مستقبلية
""".strip()

    return f"""
أنت مساعد تحليلي إداري.

{base_data}

المطلوب:
تحليل استشاري مختصر يركّز على المؤشرات ونقاط الانتباه.
""".strip()


def generate_markdown(row: pd.Series, analysis_text: str) -> str:
    """Render advisory analysis and source metadata as Markdown."""
    today = date.today().isoformat()
    return f"""# تحليل استشاري – {row['الإدارة']}

## الملخص التنفيذي
{analysis_text}

---

## بيانات الإدخال
- الإدارة: {row['الإدارة']}
- الوحدة / القسم: {row['الوحدة / القسم']}
- العنصر: {row['العنصر المدخل']}
- التقييم الداخلي: {row['تقييم داخلي']}

---

## ملاحظات تنظيمية
- هذا التحليل ذو طبيعة استشارية غير ملزمة.
- لا يُعد بديلًا عن التقييم الرسمي أو القرار الإداري.
- يُنصح بمراجعته من الجهة المختصة قبل أي إجراء.

---

**تاريخ التحليل:** {today}  
**المصدر:** أداة تحليل معرفية داخلية
"""


def safe_filename(text: str) -> str:
    """Return a file-system safe filename preserving Arabic text when possible."""
    cleaned = re.sub(r"[\\/:*?\"<>|]", "_", text).strip()
    return cleaned or "analysis"


def validate_columns(df: pd.DataFrame) -> None:
    """Validate input CSV includes all required columns."""
    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        missing_text = ", ".join(missing)
        raise ValueError(f"Missing required CSV columns: {missing_text}")


def call_model(client: OpenAI, prompt: str) -> str:
    """Call OpenAI chat completions and return stripped text output."""
    response: Any = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )
    return (response.choices[0].message.content or "").strip()


def main() -> None:
    """Run CSV-to-Markdown generation for each record."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError("OPENAI_API_KEY is not set.")

    if not INPUT_CSV.exists():
        raise FileNotFoundError(f"Input CSV not found: {INPUT_CSV}")

    df = pd.read_csv(INPUT_CSV)
    validate_columns(df)

    client = OpenAI(api_key=api_key)

    for idx, row in df.iterrows():
        prompt = build_prompt(row)
        analysis = call_model(client, prompt)

        dept_name = str(row["الإدارة"]).replace(" ", "_")
        dept_folder = OUTPUT_DIR / dept_name
        dept_folder.mkdir(parents=True, exist_ok=True)

        item_name = safe_filename(str(row["العنصر المدخل"]))
        file_path = dept_folder / f"{idx}_{item_name}.md"
        file_path.write_text(generate_markdown(row, analysis), encoding="utf-8")

        print(f"✔ تم إنشاء: {file_path}")


if __name__ == "__main__":
    main()
