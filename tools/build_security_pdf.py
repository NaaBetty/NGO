from pathlib import Path
import re
import textwrap
import zlib

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "SECURITY_ASSESSMENT.md"
OUTPUT = ROOT / "Le-Shelter-Security-Assessment-2026-08-26.pdf"

PAGE_W, PAGE_H = 612, 792
LEFT, RIGHT, TOP, BOTTOM = 54, 54, 55, 48


def pdf_text(value):
    value = value.replace("`", "").replace("**", "")
    value = value.replace("->", "to").replace("approximately", "approx.")
    value = value.encode("cp1252", "replace").decode("cp1252")
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def strip_md(value):
    value = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", value)
    return value.replace("**", "").replace("`", "")


class Document:
    def __init__(self):
        self.pages = []
        self.ops = []
        self.y = PAGE_H - TOP
        self.page_no = 0
        self.new_page()

    def new_page(self):
        if self.ops:
            self.pages.append("\n".join(self.ops))
        self.page_no += 1
        self.ops = []
        self.y = PAGE_H - TOP
        if self.page_no > 1:
            self.rule(PAGE_H - 39, color=(0.82, 0.85, 0.88))
            self.text(LEFT, PAGE_H - 31, "Le Shelter Foundation - Security Assessment", 8, "F2", (0.25, 0.30, 0.35))

    def ensure(self, height):
        if self.y - height < BOTTOM:
            self.footer()
            self.new_page()

    def text(self, x, y, value, size=10, font="F1", color=(0.12, 0.15, 0.18)):
        r, g, b = color
        self.ops.append(f"BT /{font} {size} Tf {r} {g} {b} rg 1 0 0 1 {x:.1f} {y:.1f} Tm ({pdf_text(value)}) Tj ET")

    def rule(self, y, color=(0.2, 0.55, 0.35), width=1):
        r, g, b = color
        self.ops.append(f"{r} {g} {b} RG {width} w {LEFT} {y:.1f} m {PAGE_W-RIGHT} {y:.1f} l S")

    def footer(self):
        self.rule(35, color=(0.84, 0.86, 0.88), width=0.5)
        self.text(LEFT, 23, "Confidential review copy - 26 August 2026", 7.5, "F1", (0.4, 0.43, 0.46))
        self.text(PAGE_W - RIGHT - 40, 23, f"Page {self.page_no}", 7.5, "F1", (0.4, 0.43, 0.46))

    def paragraph(self, value, font="F1", size=9.4, indent=0, color=(0.12, 0.15, 0.18), leading=12.3):
        value = strip_md(value).strip()
        if not value:
            self.y -= 4
            return
        width = max(30, int((PAGE_W - LEFT - RIGHT - indent) / (size * 0.51)))
        lines = textwrap.wrap(value, width=width, break_long_words=False, break_on_hyphens=False) or [""]
        self.ensure(len(lines) * leading + 5)
        for line in lines:
            self.text(LEFT + indent, self.y, line, size, font, color)
            self.y -= leading
        self.y -= 3

    def heading(self, value, level):
        value = strip_md(value)
        if level == 1:
            self.ensure(42)
            self.y -= 6
            self.text(LEFT, self.y, value, 16, "F2", (0.08, 0.33, 0.20))
            self.y -= 9
            self.rule(self.y, color=(0.95, 0.48, 0.12), width=1.4)
            self.y -= 18
        elif level == 2:
            self.ensure(31)
            self.y -= 3
            self.text(LEFT, self.y, value, 12.5, "F2", (0.08, 0.33, 0.20))
            self.y -= 20
        else:
            self.ensure(27)
            self.text(LEFT, self.y, value, 10.5, "F2", (0.75, 0.30, 0.05))
            self.y -= 17

    def bullet(self, value, ordered=None):
        marker = f"{ordered}." if ordered is not None else "-"
        self.ensure(20)
        self.text(LEFT + 6, self.y, marker, 9.2, "F2", (0.75, 0.30, 0.05))
        self.paragraph(value, indent=22, size=9.2, leading=12)

    def code(self, lines):
        wrapped = []
        for line in lines:
            clean = line.rstrip().replace("\t", "  ")
            wrapped.extend(textwrap.wrap(clean, width=88, subsequent_indent="  ", replace_whitespace=False) or [""])
        height = len(wrapped) * 9.3 + 13
        self.ensure(min(height, PAGE_H - TOP - BOTTOM))
        for line in wrapped:
            if self.y < BOTTOM + 15:
                self.footer()
                self.new_page()
            self.text(LEFT + 8, self.y, line, 7.4, "F3", (0.18, 0.21, 0.24))
            self.y -= 9.3
        self.y -= 7

    def table(self, rows):
        if not rows:
            return
        clean = [[strip_md(c.strip()) for c in row] for row in rows]
        if len(clean) > 1 and all(set(c) <= set("-: ") for c in clean[1]):
            clean.pop(1)
        for idx, row in enumerate(clean):
            joined = " | ".join(row)
            self.paragraph(joined, font="F2" if idx == 0 else "F1", size=8.1, indent=4,
                           color=(0.08, 0.33, 0.20) if idx == 0 else (0.15, 0.18, 0.20), leading=10.5)
            if idx == 0:
                self.rule(self.y + 1, color=(0.75, 0.80, 0.77), width=0.5)
        self.y -= 4

    def finish(self):
        self.footer()
        self.pages.append("\n".join(self.ops))


def parse_markdown(text):
    doc = Document()
    lines = text.splitlines()
    in_code = False
    code = []
    table = []
    paragraph = []

    def flush_paragraph():
        nonlocal paragraph
        if paragraph:
            doc.paragraph(" ".join(x.strip() for x in paragraph))
            paragraph = []

    def flush_table():
        nonlocal table
        if table:
            doc.table(table)
            table = []

    for raw in lines:
        line = raw.rstrip()
        if line.startswith("```"):
            flush_paragraph(); flush_table()
            if in_code:
                doc.code(code); code = []; in_code = False
            else:
                in_code = True
            continue
        if in_code:
            code.append(line)
            continue
        if line.startswith("|") and line.endswith("|"):
            flush_paragraph()
            table.append(line.strip("|").split("|"))
            continue
        flush_table()
        if not line.strip():
            flush_paragraph()
            continue
        if line.strip() == "---":
            flush_paragraph(); doc.y -= 5
            continue
        heading = re.match(r"^(#{1,3})\s+(.+)$", line)
        if heading:
            flush_paragraph(); doc.heading(heading.group(2), len(heading.group(1)))
            continue
        bullet = re.match(r"^-\s+(.+)$", line)
        if bullet:
            flush_paragraph(); doc.bullet(bullet.group(1))
            continue
        numbered = re.match(r"^(\d+)\.\s+(.+)$", line)
        if numbered:
            flush_paragraph(); doc.bullet(numbered.group(2), int(numbered.group(1)))
            continue
        paragraph.append(line)
    flush_paragraph(); flush_table()
    doc.finish()
    return doc.pages


def build_pdf(pages):
    objects = []
    def add(data):
        objects.append(data)
        return len(objects)

    catalog_id = add(b"")
    pages_id = add(b"")
    font_regular = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    font_bold = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
    font_mono = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>")
    page_ids = []
    for content in pages:
        raw = content.encode("cp1252", "replace")
        compressed = zlib.compress(raw, 9)
        stream_id = add(f"<< /Length {len(compressed)} /Filter /FlateDecode >>\nstream\n".encode() + compressed + b"\nendstream")
        page_id = add(
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] "
            f"/Resources << /Font << /F1 {font_regular} 0 R /F2 {font_bold} 0 R /F3 {font_mono} 0 R >> >> "
            f"/Contents {stream_id} 0 R >>".encode()
        )
        page_ids.append(page_id)
    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    objects[pages_id - 1] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode()
    objects[catalog_id - 1] = f"<< /Type /Catalog /Pages {pages_id} 0 R /PageMode /UseNone >>".encode()

    info_id = add(
        b"<< /Title (Le Shelter Foundation Security Assessment) "
        b"/Author (OpenAI Codex) /Subject (Website security and architecture review) "
        b"/Keywords (security, NGO, XSS, DoS, Apps Script, remediation) >>"
    )
    output = bytearray(b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for number, obj in enumerate(objects, 1):
        offsets.append(len(output))
        output.extend(f"{number} 0 obj\n".encode())
        output.extend(obj)
        output.extend(b"\nendobj\n")
    xref = len(output)
    output.extend(f"xref\n0 {len(objects)+1}\n".encode())
    output.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode())
    output.extend(
        f"trailer\n<< /Size {len(objects)+1} /Root {catalog_id} 0 R /Info {info_id} 0 R >>\n"
        f"startxref\n{xref}\n%%EOF\n".encode()
    )
    OUTPUT.write_bytes(output)


if __name__ == "__main__":
    pages = parse_markdown(SOURCE.read_text(encoding="utf-8"))
    build_pdf(pages)
    print(f"Created {OUTPUT.name}: {len(pages)} pages, {OUTPUT.stat().st_size} bytes")
