#!/usr/bin/env python3
"""Build the CBSS 40FT One-Trip + courtyard awning bid packet."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.colors import Color, white
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "output"
ART = Path("/opt/cursor/artifacts")

NAVY = Color(0.078, 0.118, 0.180)
ACCENT = Color(0.122, 0.310, 0.471)
GREEN = Color(0.051, 0.420, 0.220)
MUTED = Color(0.353, 0.396, 0.439)
LINE = Color(0.773, 0.816, 0.855)
PAPER = Color(0.957, 0.969, 0.980)
DARK = Color(0.08, 0.12, 0.18)

# Locked figures. Container cash was already told to the client.
CONTAINER = 4400.00
STRUCTURE = 27850.00
TOTAL = CONTAINER + STRUCTURE


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ):
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


def dim(draw: ImageDraw.ImageDraw, x1, y1, x2, y2, text: str, side: str = "bottom") -> None:
    ink = (31, 79, 120)
    draw.line([(x1, y1), (x2, y2)], fill=ink, width=2)
    for x, y in ((x1, y1), (x2, y2)):
        draw.line([(x - 4, y - 4), (x + 4, y + 4)], fill=ink, width=2)
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    if side == "bottom":
        my += 8
    elif side == "top":
        my -= 22
    elif side == "left":
        mx -= 70
    elif side == "right":
        mx += 8
    draw.text((mx, my), text, fill=ink, font=font(16, True))


def draw_plan() -> Path:
    img = Image.new("RGB", (1700, 1280), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 1700, 70), fill=(20, 30, 46))
    d.text((40, 22), "CBSS  |  COURTYARD AWNING  |  PLAN", fill=(255, 255, 255), font=font(28, True))
    d.text((1280, 26), "SHEET A1   NOT FOR CONSTRUCTION", fill=(184, 196, 208), font=font(16))

    # Scale: 1 ft = 16 px. Leave room under the boxes for both dim strings and notes.
    s = 16
    ox, oy = 220, 140

    def box(x, y, w, h, label, fill):
        d.rectangle((x, y, x + w, y + h), outline=(20, 30, 46), width=3, fill=fill)
        d.multiline_text((x + 10, y + h / 2 - 22), label, fill=(20, 30, 46), font=font(18, True), spacing=4)

    gap = 30 * s
    right_x = ox + 8 * s + gap
    box(ox, oy, 8 * s, 40 * s, "EXISTING\nUNIT", (232, 236, 240))
    box(right_x, oy, 8 * s, 40 * s, "NEW 40FT\nONE-TRIP DD", (232, 245, 238))
    roof = (ox + 8 * s - 1 * s, oy - 1 * s, right_x + 1 * s, oy + 40 * s + 1 * s)
    d.rectangle(roof, outline=(13, 107, 56), width=4)
    ridge_x = ox + 8 * s + gap / 2
    d.line([(ridge_x, roof[1]), (ridge_x, roof[3])], fill=(13, 107, 56), width=3)
    d.text((ridge_x + 8, oy + 16), "RIDGE", fill=(13, 107, 56), font=font(14, True))
    d.multiline_text((ox + 8 * s + 36, oy + 260), "30'-0\" CLEAR\nCOURTYARD\nAWNING", fill=(13, 107, 56), font=font(22, True), spacing=6)

    d.rectangle((right_x + 16, oy - 8, right_x + 8 * s - 16, oy + 6), outline=(31, 79, 120), width=2)
    d.rectangle((right_x + 16, oy + 40 * s - 6, right_x + 8 * s - 16, oy + 40 * s + 8), outline=(31, 79, 120), width=2)
    d.text((right_x + 10, oy - 34), "END DOORS CLEAR", fill=(31, 79, 120), font=font(14))

    bottom = oy + 40 * s
    dim(d, ox, bottom + 46, ox + 8 * s, bottom + 46, "8'-0\"")
    dim(d, ox + 8 * s, bottom + 46, right_x, bottom + 46, "30'-0\" CLEAR")
    dim(d, right_x, bottom + 46, right_x + 8 * s, bottom + 46, "8'-0\"")
    dim(d, ox + 8 * s - 1 * s, bottom + 96, right_x + 1 * s, bottom + 96, "32'-0\" TRUSS SPAN")
    dim(d, right_x + 8 * s + 44, oy - 1 * s, right_x + 8 * s + 44, oy + 40 * s + 1 * s, "42'-0\" ROOF", "right")
    dim(d, ox - 56, oy, ox - 56, oy + 40 * s, "40'-0\"", "left")

    notes = [
        "Two 40FT boxes, parallel. New unit is a One-Trip Double Door.",
        "Roof bears on PT sleepers on each container roof. Courtyard stays open.",
        "Trusses at 24\" O.C.  3:12 gable.  26-ga R-panel metal (cheaper complete system).",
        "End doors stay clear. Do not block with posts.",
        "Existing unit assumed 40FT. If shorter, roof trims to the shorter box.",
    ]
    d.rectangle((0, 1088, 1700, 1280), fill=(245, 248, 250))
    d.text((40, 1104), "NOTES", fill=(20, 30, 46), font=font(16, True))
    for i, n in enumerate(notes):
        d.text((40, 1130 + i * 24), f"{i + 1}.  {n}", fill=(90, 101, 112), font=font(16))
    path = OUT / "drawing_plan.png"
    img.save(path)
    return path


def draw_section() -> Path:
    img = Image.new("RGB", (1600, 900), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 1600, 70), fill=(20, 30, 46))
    d.text((40, 22), "CBSS  |  COURTYARD AWNING  |  SECTION", fill=(255, 255, 255), font=font(28, True))
    d.text((1180, 26), "SHEET A2   NOT FOR CONSTRUCTION", fill=(184, 196, 208), font=font(16))

    s = 16
    ground = 780
    d.line([(80, ground), (1520, ground)], fill=(90, 101, 112), width=3)
    # containers 8 wide, 9.5 tall
    def cont(x, label):
        d.rectangle((x, ground - 9.5 * s, x + 8 * s, ground), outline=(20, 30, 46), width=3, fill=(232, 236, 240))
        d.text((x + 10, ground - 5 * s), label, fill=(20, 30, 46), font=font(16, True))

    left = 220
    right = left + 8 * s + 30 * s
    cont(left, "EXISTING")
    cont(right, "NEW 40FT\nOT DD")
    # sleepers
    for x in (left, right):
        d.rectangle((x + 8, ground - 9.5 * s - 10, x + 8 * s - 8, ground - 9.5 * s), fill=(90, 60, 30))
    # truss triangle 32ft span, 3:12 → rise = 16*(3/12)=4ft
    span_l = left + 8 * s - 1 * s
    span_r = right + 1 * s
    ridge_x = (span_l + span_r) / 2
    base_y = ground - 9.5 * s - 10
    ridge_y = base_y - 4 * s
    d.line([(span_l, base_y), (ridge_x, ridge_y), (span_r, base_y), (span_l, base_y)], fill=(13, 107, 56), width=4)
    # webs
    d.line([(span_l + (ridge_x - span_l) * 0.33, base_y), (ridge_x, ridge_y)], fill=(31, 79, 120), width=2)
    d.line([(span_r - (span_r - ridge_x) * 0.33, base_y), (ridge_x, ridge_y)], fill=(31, 79, 120), width=2)
    d.line([(ridge_x, base_y), (ridge_x, ridge_y)], fill=(31, 79, 120), width=2)
    d.text((ridge_x + 12, ridge_y + 20), "3:12  FINK TRUSS", fill=(13, 107, 56), font=font(16, True))
    d.text((ridge_x - 80, base_y - 2 * s), "OPEN AWNING", fill=(31, 79, 120), font=font(16, True))

    dim(d, left, ground + 24, left + 8 * s, ground + 24, "8'-0\"")
    dim(d, left + 8 * s, ground + 24, right, ground + 24, "30'-0\" CLEAR")
    dim(d, right, ground + 24, right + 8 * s, ground + 24, "8'-0\"")
    dim(d, span_l, ground + 70, span_r, ground + 70, "32'-0\" TRUSS SPAN")
    dim(d, left - 70, ground - 9.5 * s, left - 70, ground, "9'-6\"", "left")
    dim(d, ridge_x + 40, ridge_y, ridge_x + 40, base_y, "4'-0\" RISE", "right")

    d.text((80, 100), "Sleepers are pressure-treated 2x10 on an isolation membrane, through-fastened to the top side rail — not to the roof skin only.", fill=(90, 101, 112), font=font(16))
    d.text((80, 128), "Metal R-panel on 2x4 purlins. No OSB deck. That is why metal beats shingles on this open span.", fill=(90, 101, 112), font=font(16))
    path = OUT / "drawing_section.png"
    img.save(path)
    return path


def draw_elevation() -> Path:
    img = Image.new("RGB", (1700, 900), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 1700, 70), fill=(20, 30, 46))
    d.text((40, 22), "CBSS  |  COURTYARD AWNING  |  END ELEVATION", fill=(255, 255, 255), font=font(28, True))
    d.text((1280, 26), "SHEET A3   NOT FOR CONSTRUCTION", fill=(184, 196, 208), font=font(16))

    s = 16
    ground = 760
    d.line([(60, ground), (1640, ground)], fill=(90, 101, 112), width=3)
    left = 240
    right = left + 8 * s + 30 * s

    def cont(x, label, fill):
        top = ground - 9.5 * s
        d.rectangle((x, top, x + 8 * s, ground), outline=(20, 30, 46), width=3, fill=fill)
        # corrugated suggestion
        for i in range(1, 8):
            px = x + i * s
            d.line([(px, top + 8), (px, ground - 8)], fill=(200, 206, 212), width=1)
        d.multiline_text((x + 10, top + 48), label, fill=(20, 30, 46), font=font(16, True), spacing=4)

    cont(left, "EXISTING", (232, 236, 240))
    cont(right, "NEW 40FT\nOT DD", (220, 236, 226))
    for x in (left, right):
        d.rectangle((x + 8, ground - 9.5 * s - 10, x + 8 * s - 8, ground - 9.5 * s), fill=(90, 60, 30))

    span_l = left + 8 * s - 1 * s
    span_r = right + 1 * s
    ridge_x = (span_l + span_r) / 2
    base_y = ground - 9.5 * s - 10
    ridge_y = base_y - 4 * s
    # metal roof faces
    d.polygon([(span_l, base_y), (ridge_x, ridge_y), (span_r, base_y)], outline=(13, 107, 56), fill=(176, 196, 178))
    d.line([(span_l, base_y), (ridge_x, ridge_y), (span_r, base_y)], fill=(13, 107, 56), width=4)
    d.text((ridge_x - 70, ridge_y - 28), "26-GA R-PANEL", fill=(13, 107, 56), font=font(16, True))
    d.text((ridge_x - 58, base_y - 36), "OPEN AWNING", fill=(31, 79, 120), font=font(16, True))

    dim(d, left, ground + 28, left + 8 * s, ground + 28, "8'-0\"")
    dim(d, left + 8 * s, ground + 28, right, ground + 28, "30'-0\" CLEAR")
    dim(d, right, ground + 28, right + 8 * s, ground + 28, "8'-0\"")
    dim(d, span_l, ground + 74, span_r, ground + 74, "32'-0\" TRUSS SPAN")

    d.text((80, 100), "View from the container ends. Courtyard stays open. No posts in the door swing.", fill=(90, 101, 112), font=font(16))
    d.text((80, 128), "3:12 gable. Gutters at both eaves. Metal is the cheaper complete roof versus shingles on this span.", fill=(90, 101, 112), font=font(16))
    path = OUT / "drawing_elevation.png"
    img.save(path)
    return path


def draw_presentation() -> Path:
    img = Image.new("RGB", (1600, 900), (236, 242, 236))
    d = ImageDraw.Draw(img)
    # sky / ground
    d.rectangle((0, 0, 1600, 520), fill=(210, 224, 232))
    d.rectangle((0, 520, 1600, 900), fill=(176, 186, 168))
    d.rectangle((0, 0, 1600, 64), fill=(20, 30, 46))
    d.text((40, 18), "CBSS  |  COURTYARD AWNING  |  PRESENTATION", fill=(255, 255, 255), font=font(26, True))
    d.text((1180, 22), "NOT A CONSTRUCTION DRAWING", fill=(184, 196, 208), font=font(15))

    # Simple 3/4 view: two boxes receding, metal roof between.
    def iso_box(x, y, w, dpth, h, fill, outline=(20, 30, 46)):
        # x,y = front-left ground
        sx, sy = 0.45 * dpth, -0.28 * dpth
        front = [(x, y - h), (x + w, y - h), (x + w, y), (x, y)]
        top = [(x, y - h), (x + sx, y - h + sy), (x + w + sx, y - h + sy), (x + w, y - h)]
        side = [(x + w, y - h), (x + w + sx, y - h + sy), (x + w + sx, y + sy), (x + w, y)]
        d.polygon(side, fill=tuple(max(0, c - 18) for c in fill), outline=outline)
        d.polygon(front, fill=fill, outline=outline)
        d.polygon(top, fill=tuple(min(255, c + 12) for c in fill), outline=outline)

    left_x, gy, box_w, box_d, box_h = 210, 700, 150, 420, 168
    gap = 520
    right_x = left_x + box_w + gap
    iso_box(left_x, gy, box_w, box_d, box_h, (196, 202, 208))
    iso_box(right_x, gy, box_w, box_d, box_h, (176, 196, 178))

    # roof plane between inner tops
    inner_l = left_x + box_w
    inner_r = right_x
    top_y = gy - box_h - 8
    sx, sy = 0.45 * box_d, -0.28 * box_d
    ridge_x = (inner_l + inner_r) / 2
    rise = 70
    # near face of roof
    d.polygon(
        [(inner_l - 12, top_y), (ridge_x, top_y - rise), (inner_r + 12, top_y)],
        fill=(120, 148, 122),
        outline=(13, 107, 56),
    )
    # far roof
    d.polygon(
        [
            (ridge_x, top_y - rise),
            (ridge_x + sx, top_y - rise + sy),
            (inner_r + 12 + sx, top_y + sy),
            (inner_r + 12, top_y),
        ],
        fill=(96, 128, 100),
        outline=(13, 107, 56),
    )
    d.polygon(
        [
            (inner_l - 12, top_y),
            (inner_l - 12 + sx, top_y + sy),
            (ridge_x + sx, top_y - rise + sy),
            (ridge_x, top_y - rise),
        ],
        fill=(140, 166, 140),
        outline=(13, 107, 56),
    )

    d.text((inner_l + 90, gy - 90), "30 FT OPEN COURTYARD", fill=(31, 79, 120), font=font(20, True))
    d.text((60, 820), "Existing unit", fill=(20, 30, 46), font=font(18, True))
    d.text((right_x, 820), "New 40FT One-Trip Double Door", fill=(20, 30, 46), font=font(18, True))
    d.text((520, 850), "Traditional truss roof  ·  26-ga metal  ·  no walls", fill=(90, 101, 112), font=font(18))
    path = OUT / "drawing_presentation.png"
    img.save(path)
    return path


def header(c: canvas.Canvas, title: str, page: int, pages: int) -> None:
    w, h = letter
    c.setFillColor(NAVY)
    c.rect(0, h - 56, w, 56, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Times-Bold", 11)
    c.drawString(36, h - 28, "CB SHIPPING SOLUTIONS")
    c.setFont("Times-Roman", 9)
    c.drawString(36, h - 42, "CBGC LLC DBA CBShippingSolutions")
    c.setFont("Times-Roman", 9)
    c.drawRightString(w - 36, h - 28, title)
    c.drawRightString(w - 36, h - 42, f"PRICING TERMS    Page {page} of {pages}")
    c.setFillColor(ACCENT)
    c.rect(0, h - 60, w, 4, fill=1, stroke=0)


def footer(c: canvas.Canvas) -> None:
    w, _ = letter
    c.setFillColor(MUTED)
    c.setFont("Times-Roman", 8)
    c.drawString(36, 28, "Text Christopher  870-323-2593    Direct  (870)-682-3867    Https://cbshippingsolutions.com/")
    c.drawRightString(w - 36, 28, "Figures are complete cash totals.")


def wrap(c: canvas.Canvas, text: str, x: float, y: float, max_w: float, size: int = 10, leading: float = 14, color=DARK) -> float:
    c.setFillColor(color)
    c.setFont("Times-Roman", size)
    words = text.split()
    line = ""
    for word in words:
        trial = (line + " " + word).strip()
        if c.stringWidth(trial, "Times-Roman", size) <= max_w:
            line = trial
        else:
            c.drawString(x, y, line)
            y -= leading
            line = word
    if line:
        c.drawString(x, y, line)
        y -= leading
    return y


def h2(c: canvas.Canvas, text: str, y: float) -> float:
    c.setFillColor(ACCENT)
    c.setFont("Times-Bold", 12)
    c.drawString(36, y, text)
    return y - 18


ROWS = [
    ("Engineered Fink trusses, 32' span, 3:12, 22 ea @ $220", 4840),
    ("Truss-plant engineering / stamp", 850),
    ("Truss freight to site", 375),
    ("PT 2x10 sleepers, isolation membrane, through-bolts", 980),
    ("Permanent bracing, ties, hangers", 810),
    ("2x4 purlins", 380),
    ("26-ga painted R-panel, ~1,500 sf with waste @ $2.20", 3291),
    ("Ridge, eave, rake, closures, gasketed screws", 980),
    ("6\" gutter and downspouts, both eaves", 672),
    ("Labor, lull / telehandler, set, metal, flash, cleanup", 8200),
]


def write_takeoff() -> Path:
    path = OUT / "materials_takeoff.csv"
    lines = ["item,qty_or_basis,unit_cost,amount"]
    mapped = [
        ("Engineered Fink trusses 32ft 3:12", "22 ea", "220", "4840"),
        ("Truss-plant engineering stamp", "1", "850", "850"),
        ("Truss freight", "1", "375", "375"),
        ("PT 2x10 sleepers isolation through-bolts", "lot", "980", "980"),
        ("Bracing ties hangers", "lot", "810", "810"),
        ("2x4 purlins", "lot", "380", "380"),
        ("26ga painted R-panel ~1500 sf", "1500 sf", "2.20", "3291"),
        ("Ridge eave rake closures screws", "lot", "980", "980"),
        ("6in gutter both eaves", "lot", "672", "672"),
        ("Labor lull set metal flash cleanup", "lot", "8200", "8200"),
        ("DIRECT_COST", "", "", "21378"),
        ("CONTAINER_DELIVERED_CASH_ALREADY_QUOTED", "", "", "4400"),
        ("STRUCTURE_COMPLETE_CASH_BID", "", "", "27850"),
        ("PROJECT_TOTAL_COMPLETE_CASH", "", "", "32250"),
    ]
    for row in mapped:
        lines.append(",".join(row))
    path.write_text("\n".join(lines) + "\n")
    return path


def build_pdf(plan: Path, section: Path, elevation: Path, presentation: Path) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    pdf_path = OUT / "CBSS_40FT_OneTrip_Courtyard_Awning_Proposal.pdf"
    c = canvas.Canvas(str(pdf_path), pagesize=letter)
    w, h = letter
    pages = 8

    # 1 cover
    header(c, "Official Proposal", 1, pages)
    y = h - 90
    c.setFillColor(ACCENT)
    c.setFont("Times-Bold", 20)
    c.drawString(36, y, "Official Proposal")
    y -= 22
    c.setFillColor(MUTED)
    c.setFont("Times-Roman", 11)
    c.drawString(36, y, "40FT One-Trip Double Door  +  courtyard awning roof")
    y -= 28
    y = wrap(c, "Prepared for the client who was quoted $4,400 delivered cash for one 40FT One-Trip Double Door, then asked us to roof across a 30-foot gap to a second unit with a traditional truss roof. Shingles or metal — whichever is cheaper.", 36, y, 540, 11, 15)
    y -= 8
    for line in (
        "Date: 19 August 2026",
        "Prepared by: Christopher Banks, President/Owner",
        "Company: CBGC LLC DBA CBShippingSolutions",
        "Site: Client to confirm delivery ZIP and that the existing unit is on the ground, parallel, 30 feet clear.",
    ):
        y = wrap(c, line, 36, y, 540, 10, 14)
    y -= 10
    y = h2(c, "COMPLETE CASH TOTAL", y)
    c.setFillColor(GREEN)
    c.setFont("Times-Bold", 22)
    c.drawString(36, y, f"${TOTAL:,.2f}")
    y -= 22
    c.setFillColor(DARK)
    c.setFont("Times-Roman", 11)
    c.drawString(36, y, f"40FT One-Trip Double Door, delivered          ${CONTAINER:,.2f}")
    y -= 16
    c.drawString(36, y, f"Courtyard awning roof, built                    ${STRUCTURE:,.2f}")
    y -= 28
    y = wrap(c, "These are complete cash totals. Standard weekday delivery of the container to a truck-accessible site is already inside the $4,400. The awning figure is turnkey labor and materials for the roof described in this packet. Do not add freight on top.", 36, y, 540, 10, 14)
    y -= 8
    y = wrap(c, "The One-Trip box carries a 10-year structural and 10-year no-leak warranty. The awning is a site-built wood-and-metal structure warrantied 2 years workmanship. Metal panel finish follows the mill warranty.", 36, y, 540, 10, 14)
    y -= 8
    y = h2(c, "CHEAPER ROOF", y)
    y = wrap(c, "We priced a shingle roof and a metal roof on the same trusses. Metal 26-gauge R-panel on purlins is the cheaper complete system. Shingles need a full OSB deck, a 4:12 pitch, and more labor on an open awning. Metal stays at 3:12, skips the deck, and sheds better with wind under the roof. That is what this bid uses.", 36, y, 540, 10, 14)
    footer(c)
    c.showPage()

    # 2 scope
    header(c, "Scope of Work", 2, pages)
    y = h - 88
    y = h2(c, "PART A  —  CONTAINER", y)
    bullets = [
        "Furnish one 40FT One-Trip Double Door shipping container.",
        "Weekday delivery to a truck-accessible pad. Tilt-bed drop. Client grades the pad.",
        "Place the box parallel to the existing unit with 30 feet clear between the inner faces.",
        "End doors remain operable. No posts in the door swing.",
        "The $4,400 already quoted is the delivered cash price for this box. It is not a starting point for a freight add-on.",
    ]
    for b in bullets:
        y = wrap(c, "•  " + b, 36, y, 540, 10, 14)
        y -= 4
    y -= 8
    y = h2(c, "PART B  —  COURTYARD AWNING", y)
    bullets = [
        "Install pressure-treated 2x10 sleepers on both container roofs over an isolation membrane. Through-fasten to the top side rails with backing. Do not hang the roof from the roof skin alone.",
        "Set 22 engineered wood Fink trusses, 32-foot span, 3:12 pitch, 24 inches on center, covering the 40-foot boxes plus 12-inch overhangs each end (42 feet of roof).",
        "Install permanent bracing, hurricane ties, and 2x4 purlins.",
        "Install 26-gauge painted R-panel metal, ridge, eave, rake, closures, and gasketed screws.",
        "Install a simple 6-inch gutter and downspouts on both eaves so water does not dump on the courtyard or the box doors.",
        "Flash the sleeper-to-container joint so the existing roofs stay dry.",
        "Leave the courtyard open. No walls, no slab, no interior finish in this bid.",
        "Broom-clean the site. Haul scrap metal and lumber.",
    ]
    for b in bullets:
        y = wrap(c, "•  " + b, 36, y, 540, 10, 14)
        y -= 3
    y -= 8
    y = h2(c, "WHAT THIS IS NOT", y)
    y = wrap(c, "This is not a building with walls. It is not a reroof of the container tops except at the sleeper and flash. It is not engineered for a snow country or hurricane coast until the ZIP is confirmed. It does not include permits, a site PE stamp beyond the truss-plant package, concrete, electric, plumbing, or moving the existing box.", 36, y, 540, 10, 14)
    footer(c)
    c.showPage()

    # 3 plan
    header(c, "Drawings — Plan", 3, pages)
    c.drawImage(ImageReader(str(plan)), 28, 70, width=556, height=418, preserveAspectRatio=True, mask="auto")
    footer(c)
    c.showPage()

    # 4 section
    header(c, "Drawings — Section", 4, pages)
    c.drawImage(ImageReader(str(section)), 28, 90, width=556, height=312, preserveAspectRatio=True, mask="auto")
    footer(c)
    c.showPage()

    # 5 elevation + presentation
    header(c, "Drawings — Elevation and Presentation", 5, pages)
    y = h - 88
    y = wrap(c, "End elevation and a client presentation view. Dimensions that govern the bid are on Sheets A1 and A2, not on the picture.", 36, y, 540, 10, 14)
    c.drawImage(ImageReader(str(elevation)), 36, 368, width=540, height=286, preserveAspectRatio=True, mask="auto")
    c.drawImage(ImageReader(str(presentation)), 36, 68, width=540, height=288, preserveAspectRatio=True, mask="auto")
    footer(c)
    c.showPage()

    # 6 takeoff
    header(c, "Materials and Cost", 6, pages)
    y = h - 88
    y = h2(c, "WHY METAL WINS", y)
    y = wrap(c, "Same 22 trusses either way. Shingles need 4:12, a 7/16 OSB deck, underlayment, and more labor on an open span. Metal stays 3:12 on purlins. Installed, metal is the cheaper complete roof for this awning.", 36, y, 540, 10, 14)
    y -= 6
    y = h2(c, "STRUCTURE TAKEOFF  (contractor cost used to build the bid)", y)
    c.setFont("Times-Roman", 9)
    for name, amt in ROWS:
        c.setFillColor(DARK)
        c.drawString(36, y, name)
        c.drawRightString(576, y, f"${amt:,.0f}")
        y -= 13
    cost = sum(a for _, a in ROWS)
    c.setFont("Times-Bold", 10)
    c.drawString(36, y, "Direct cost")
    c.drawRightString(576, y, f"${cost:,.0f}")
    y -= 16
    c.setFont("Times-Roman", 10)
    c.setFillColor(DARK)
    y = wrap(c, f"Direct cost ${cost:,.0f}. Complete cash bid for the structure is ${STRUCTURE:,.2f}. The spread covers mobilization, small tools, waste, and the 2-year workmanship warranty. It is not an invitation to rebid the pieces.", 36, y, 540, 10, 14)
    y -= 8
    y = h2(c, "SHINGLE ALTERNATE  (not used)", y)
    y = wrap(c, "If the client insisted on shingles: raise pitch to 4:12, add 48 sheets OSB, underlayment, 16.5 squares architectural shingles. Extra deck and labor runs about $2,800–$3,500 more installed. We are not bidding that unless you ask.", 36, y, 540, 10, 14)
    footer(c)
    c.showPage()

    # 7 pricing
    header(c, "Pricing Terms", 7, pages)
    y = h - 88
    y = h2(c, "PRICING TERMS", y)
    lines = [
        ("40FT One-Trip Double Door, delivered cash", CONTAINER),
        ("Courtyard awning roof, complete cash", STRUCTURE),
        ("Project total, complete cash", TOTAL),
    ]
    for name, amt in lines:
        c.setFont("Times-Roman", 12)
        c.setFillColor(DARK)
        c.drawString(36, y, name)
        c.setFont("Times-Bold", 12)
        c.drawRightString(576, y, f"${amt:,.2f}")
        y -= 20
    y -= 6
    y = wrap(c, "Quoted amounts are delivered cash prices. Standard weekday delivery of the container to a truck-accessible site is included in the container figure. The awning figure is a complete cash total for the labor and materials in this packet. Figures are not an invitation to separate or rebid cost pieces.", 36, y, 540, 10, 14)
    y -= 6
    y = wrap(c, "Home or farm drop: paid before the truck is dispatched and before the awning crew is scheduled. We do not collect on delivery. No COD.", 36, y, 540, 10, 14)
    y -= 8
    y = h2(c, "NOT IN THIS NUMBER", y)
    for item in (
        "Permits, impact fees, or a site PE stamp if the county wants more than the truss-plant package.",
        "Concrete, gravel pad, or moving the existing container.",
        "Electric, lights, or solar.",
        "Walls, roll-up doors, or closing in the courtyard.",
        "Weekend, crane, or off-road delivery.",
        "Snow-country or high-wind upgrades once the ZIP is known.",
        "Sales tax if the delivery state charges it on construction labor — billed as incurred.",
    ):
        y = wrap(c, "•  " + item, 36, y, 540, 10, 14)
        y -= 2
    y -= 8
    y = h2(c, "HOLD", y)
    y = wrap(c, "This bid holds 14 days. Lumber and metal move. After 14 days we reconfirm the structure number. The $4,400 on the box holds as already quoted unless the client changes size, grade, or doors.", 36, y, 540, 10, 14)
    footer(c)
    c.showPage()

    # 8 next
    header(c, "How We Build It", 8, pages)
    y = h - 88
    y = h2(c, "SEQUENCE", y)
    for item in (
        "Client confirms ZIP, photos of the existing box, and that the pad will take a tilt-bed and a lull.",
        "We write the container order and collect before the truck.",
        "Box lands parallel, 30 feet clear, doors unobstructed.",
        "Truss package is ordered to the field measure (we verify 30 feet on the ground before we cut).",
        "Sleepers, trusses, purlins, metal, gutters, flash, clean.",
        "Two to four working days on the roof after the box is set, weather allowing.",
    ):
        y = wrap(c, "•  " + item, 36, y, 540, 10, 14)
        y -= 3
    y -= 8
    y = h2(c, "WHAT WE NEED FROM YOU", y)
    y = wrap(c, "Delivery ZIP. A photo of the existing unit and the 30-foot gap. Whether that existing box is 20FT or 40FT. How we access the pad. Any county that will want a permit — we will say so before we collect.", 36, y, 540, 10, 14)
    y -= 10
    y = h2(c, "CLOSE", y)
    y = wrap(c, "IF you have any questions or concerns do not hesitate to reach out to me using the contact information below.", 36, y, 540, 10, 14)
    y -= 10
    c.setFillColor(DARK)
    c.setFont("Times-Roman", 11)
    for line in (
        "With thanks and my blessings!",
        "Christopher Banks",
        "President/Owner",
        "Direct Business Line: (870)-682-3867",
        "Personal Phone: (870)-323-2593",
        "Website: Https://cbshippingsolutions.com/",
    ):
        c.drawString(36, y, line)
        y -= 15
    footer(c)
    c.showPage()
    c.save()
    return pdf_path


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ART.mkdir(parents=True, exist_ok=True)
    plan = draw_plan()
    section = draw_section()
    elevation = draw_elevation()
    presentation = draw_presentation()
    takeoff = write_takeoff()
    pdf = build_pdf(plan, section, elevation, presentation)
    for src in (plan, section, elevation, presentation, takeoff, pdf):
        dest = ART / src.name
        dest.write_bytes(src.read_bytes())
    (ART / "awning_materials_takeoff.csv").write_bytes(takeoff.read_bytes())
    print(pdf)
    print(f"CONTAINER {CONTAINER:.2f}")
    print(f"STRUCTURE {STRUCTURE:.2f}")
    print(f"TOTAL {TOTAL:.2f}")


if __name__ == "__main__":
    main()
