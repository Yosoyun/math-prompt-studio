#!/usr/bin/env python3
"""Build the editable Word version of the Maths Prompt Studio from data/prompts.js."""
import json, os, re
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIG = "Indrajeet Yadav"
BLUE = RGBColor(0x2b, 0x3f, 0x6b)
GOLD = RGBColor(0xb1, 0x82, 0x2c)
VIOLET = RGBColor(0x6b, 0x4a, 0xa0)
GREY = RGBColor(0x55, 0x52, 0x4b)
INK = RGBColor(0x23, 0x26, 0x2d)

# ---- load data ----
src = open(os.path.join(ROOT, "data", "prompts.js"), encoding="utf-8").read()
js = src[src.index("window.PROMPT_DATA =") + len("window.PROMPT_DATA ="): src.rindex(";")]
DATA = json.loads(js)
CATS = DATA["categories"]
TOTAL = sum(len(c["prompts"]) for c in CATS)

# strip emoji / non-latin so Word renders cleanly everywhere
def clean(s):
    if s is None: return ""
    return re.sub(r"[^\x00-\x7f]", "", str(s)).strip()

doc = Document()
st = doc.styles["Normal"]
st.font.name = "Calibri"; st.font.size = Pt(10.5)
for s in doc.sections:
    s.top_margin = Inches(0.8); s.bottom_margin = Inches(0.8)
    s.left_margin = Inches(0.8); s.right_margin = Inches(0.8)

def para(text="", size=10.5, bold=False, italic=False, color=None, align=None, space_after=6, space_before=0):
    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(space_after); p.paragraph_format.space_before = Pt(space_before)
    if align is not None: p.alignment = align
    r = p.add_run(text); r.bold = bold; r.italic = italic; r.font.size = Pt(size)
    if color is not None: r.font.color.rgb = color
    return p

# ---- cover ----
for _ in range(4): doc.add_paragraph()
para("THE MATHS PROMPT STUDIO", 12, True, color=GOLD, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4)
para(f"{TOTAL} AI Prompts for Mathematics Teachers", 30, True, color=BLUE, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10)
para("Copy-paste prompts that turn any maths problem into beautiful handwritten solutions, "
     "question papers, worksheets, DPPs, formula sheets and more. Free forever.",
     12, italic=True, color=GREY, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=24)
para(f"{TOTAL} prompts   .   {len(CATS)} categories   .   {len(CATS[0]['prompts'])} handwritten art styles",
     11, True, color=VIOLET, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=30)
para("Created and authored by", 10, color=GREY, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
para(SIG, 22, True, color=GOLD, align=WD_ALIGN_PARAGRAPH.CENTER)
doc.add_page_break()

# ---- how to use ----
para("How to use this document (4 steps)", 20, True, color=BLUE, space_after=10)
steps = [
    ("1", "Pick a prompt.", " Browse the sections below. Each prompt is printed in full inside its own box."),
    ("2", "Select and copy the whole prompt text.", " It is the long block under 'COPY THIS PROMPT'."),
    ("3", "Open a free AI chat.", " ChatGPT, Google Gemini, Claude or Microsoft Copilot. If the prompt needs a figure, attach a clear photo of the question first."),
    ("4", "Paste, fill the [BRACKETS], and send.", " Replace details like [CLASS/GRADE] and [BOARD], press Enter, then download or print. Your name is signed on every output."),
]
for n, b, rest in steps:
    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(8)
    r = p.add_run(n + ".  "); r.bold = True; r.font.size = Pt(13); r.font.color.rgb = GOLD
    r = p.add_run(b); r.bold = True; r.font.size = Pt(11)
    r = p.add_run(rest); r.font.size = Pt(11); r.font.color.rgb = GREY
para("Tip: for a 5-page art style that comes one image at a time, just reply 'now generate Page 2', then 3, 4, 5. "
     "The prompt keeps the same look across all pages.", 10, italic=True, color=VIOLET, space_before=6, space_after=6)
para(f"Every prompt asks the AI to sign the work as '{SIG}', so your name travels with everything you create. Please keep it when you share.",
     10, italic=True, color=GREY)
doc.add_page_break()

# ---- contents ----
para("Contents", 20, True, color=BLUE, space_after=8)
for i, c in enumerate(CATS, 1):
    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(3)
    r = p.add_run(f"Section {i}.  {clean(c['categoryTitle'])}"); r.bold = True; r.font.size = Pt(11.5)
    r = p.add_run(f"   ({len(c['prompts'])} prompts)"); r.font.size = Pt(10); r.font.color.rgb = GREY
doc.add_page_break()

# ---- sections ----
for ci, c in enumerate(CATS, 1):
    para(f"Section {ci} of {len(CATS)}", 9, True, color=GOLD, space_after=0)
    para(clean(c["categoryTitle"]), 20, True, color=BLUE, space_after=2)
    para(clean(c["categoryBlurb"]), 10, italic=True, color=GREY, space_after=10)
    for pi, p in enumerate(c["prompts"], 1):
        para(f"{ci}.{pi}   {clean(p['title'])}", 13, True, color=VIOLET, space_before=8, space_after=2)
        tag = "Photo needed" if p.get("needsImage") else "Text only"
        para(f"[{tag}]   Best tool: {clean(p.get('bestTool','Any AI chat'))}", 9, True, color=GREY, space_after=2)
        wp = doc.add_paragraph(); wp.paragraph_format.space_after = Pt(1)
        r = wp.add_run("What you get: "); r.bold = True; r.font.size = Pt(9.5)
        r = wp.add_run(clean(p["whatYouGet"])); r.font.size = Pt(9.5); r.font.color.rgb = GREY
        hp = doc.add_paragraph(); hp.paragraph_format.space_after = Pt(4)
        r = hp.add_run("How to use: "); r.bold = True; r.font.size = Pt(9.5)
        r = hp.add_run(clean(p["howToUse"])); r.font.size = Pt(9.5); r.font.color.rgb = GREY
        para("COPY THIS PROMPT", 8, True, color=GOLD, space_after=2)
        # prompt in a shaded single-cell table
        tbl = doc.add_table(rows=1, cols=1); tbl.style = "Table Grid"; tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        shade = cell._tc.get_or_add_tcPr()
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement
        sh = OxmlElement("w:shd"); sh.set(qn("w:fill"), "F3ECDD"); shade.append(sh)
        cp = cell.paragraphs[0]; cp.paragraph_format.space_after = Pt(0)
        rr = cp.add_run(clean(p["promptText"]))
        rr.font.name = "Consolas"; rr.font.size = Pt(8); rr.font.color.rgb = INK
    if ci < len(CATS): doc.add_page_break()

# ---- footer ----
sec = doc.sections[0]
ftr = sec.footer.paragraphs[0]; ftr.alignment = WD_ALIGN_PARAGRAPH.CENTER
fr = ftr.add_run(f"Maths Prompt Studio  .  Created & authored by {SIG}  .  Free forever")
fr.font.size = Pt(8); fr.font.color.rgb = GREY

os.makedirs(os.path.join(ROOT, "downloads"), exist_ok=True)
out = os.path.join(ROOT, "downloads", "Maths-Prompt-Studio-by-Indrajeet-Yadav.docx")
doc.save(out)
print("wrote", out, f"({TOTAL} prompts)")
