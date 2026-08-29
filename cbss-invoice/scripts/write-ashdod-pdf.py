#!/usr/bin/env python3
"""Compact navy/gold Jamie Palmer Ashdod (load 2) packet."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

NAVY = (0.043, 0.122, 0.227)
GOLD = (0.788, 0.635, 0.153)
CREAM = (0.969, 0.957, 0.925)
INK = (0.07, 0.07, 0.07)
MUTED = (0.36, 0.40, 0.44)
WHITE = (1, 1, 1)
MINT = (0.925, 0.992, 0.953)
W, H = letter

BOX = 2300
INLAND = 3105
CBSS = BOX + INLAND
OCEAN = 4910.40
MILES = 621


def money(n):
    return f"${n:,.2f}"


def band(c, y, h, color):
    c.setFillColorRGB(*color)
    c.rect(0.45 * inch, y, W - 0.9 * inch, h, fill=1, stroke=0)


def header(c, label, number, date, due):
    band(c, H - 1.15 * inch, 0.78 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.circle(0.95 * inch, H - 0.76 * inch, 18, fill=0, stroke=1)
    c.setFont("Times-Bold", 12)
    c.drawCentredString(0.95 * inch, H - 0.80 * inch, "CB")
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(1.35 * inch, H - 0.62 * inch, "CB SHIPPING SOLUTIONS")
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(1.35 * inch, H - 0.76 * inch, "CBGC LLC  ·  EIN 99-2031187  ·  NEW & USED SHIPPING CONTAINERS")
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica", 8)
    c.drawString(1.35 * inch, H - 0.90 * inch, "1412 Lockwood Drive, Corning, AR 72422-3008  ·  (870) 323-2593")
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(W - 0.55 * inch, H - 0.58 * inch, label)
    c.setFillColorRGB(*GOLD)
    c.setFont("Times-Bold", 13)
    c.drawRightString(W - 0.55 * inch, H - 0.76 * inch, number)
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica", 8)
    c.drawRightString(W - 0.55 * inch, H - 0.90 * inch, date)
    c.drawRightString(W - 0.55 * inch, H - 1.02 * inch, due)
    c.setFillColorRGB(*GOLD)
    c.rect(0.45 * inch, H - 1.22 * inch, W - 0.9 * inch, 6, fill=1, stroke=0)


def footer(c, text, page):
    c.setFillColorRGB(*MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(0.5 * inch, 0.38 * inch, "CBGC LLC · 1412 Lockwood Drive, Corning, AR 72422 · (870) 323-2593")
    c.drawRightString(W - 0.5 * inch, 0.38 * inch, f"{text} · Page {page} of 5")


def wrap(c, text, x, y, width, leading=11, font="Helvetica", size=9):
    c.setFont(font, size)
    words = text.split()
    line = ""
    for word in words:
        trial = f"{line} {word}".strip()
        if c.stringWidth(trial, font, size) <= width:
            line = trial
        else:
            c.drawString(x, y, line)
            y -= leading
            line = word
    if line:
        c.drawString(x, y, line)
        y -= leading
    return y


def write_pdf(path):
    c = canvas.Canvas(path, pagesize=letter)
    c.setTitle("CBSS Jamie Palmer Ashdod packet")

    header(c, "PACKET", "CBS-2026-JP02 / QUOTE-1858652", "August 29, 2026", "Load 2 · two documents")
    band(c, H - 1.58 * inch, 0.28 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(W / 2, H - 1.50 * inch, "JAMIE PALMER  ·  LOAD 2  ·  40HC TO ASHDOD  ·  WHO PAYS WHAT")

    c.setFillColorRGB(*NAVY)
    c.roundRect(0.5 * inch, H - 3.55 * inch, 3.55 * inch, 1.75 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.65 * inch, H - 2.00 * inch, "INVOICE 1 · PAY CBSS NOW")
    c.setFillColorRGB(*WHITE)
    wrap(c, f"40HC + certificate {money(BOX)}. Inland round trip Minneapolis ↔ Williston {money(INLAND)}.", 0.65 * inch, H - 2.22 * inch, 3.2 * inch)
    c.setFillColorRGB(*GOLD)
    c.setFont("Times-Bold", 18)
    c.drawString(0.65 * inch, H - 2.78 * inch, money(CBSS))
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica", 8)
    wrap(c, "Invoice CBS-2026-JP02. Do not pay freight to CBSS.", 0.65 * inch, H - 3.02 * inch, 3.2 * inch, 10, "Helvetica", 8)

    c.setFillColorRGB(*CREAM)
    c.roundRect(4.2 * inch, H - 3.55 * inch, 3.8 * inch, 1.75 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(4.35 * inch, H - 2.00 * inch, "INVOICE 2 · ENCLOSED QUOTE")
    c.setFillColorRGB(*INK)
    wrap(c, "Freight-calculator #1858652. Pickup, drayage, and fuel removed. Not confirmed.", 4.35 * inch, H - 2.22 * inch, 3.45 * inch)
    c.setFillColorRGB(*NAVY)
    c.setFont("Times-Bold", 18)
    c.drawString(4.35 * inch, H - 2.78 * inch, money(OCEAN))
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica", 8)
    wrap(c, "Do not pay ocean to CBSS. Wait for booking confirmation.", 4.35 * inch, H - 3.02 * inch, 3.45 * inch, 10, "Helvetica", 8)

    c.setFillColorRGB(*MINT)
    c.roundRect(0.5 * inch, 1.85 * inch, 7.5 * inch, 3.20 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*NAVY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 4.80 * inch, "LOAD 2 · WHAT CBSS IS HANDLING")
    c.setFillColorRGB(*INK)
    y = 4.58 * inch
    for item in [
        "Billed to Jamie Palmer. Family billing: 7624 Coachlight Lane, Ellicott City, MD 21043.",
        "Load site: 15140 49 T Way NW, Williston, ND 58801. Destination: Ashdod Port, Israel.",
        "40HC cargo-worthy SOC with depot / sea-worthy certificate — $2,300.00.",
        f"CBSS inland carriage: Minneapolis ramp to Williston and loaded return. {MILES} one-way miles at $5.00/mile round trip ($2.50 each way) = $3,105.00.",
        "Residential pickup, Minneapolis drayage, and fuel are on the CBSS inland line — not on the ocean quote.",
        "Cargo: plumbing materials / supplies, water heaters, washers, dryers.",
        f"Ocean {money(OCEAN)} is the August 28 calculator quote after those inland lines were removed — subject to confirmation.",
    ]:
        y = wrap(c, "•  " + item, 0.7 * inch, y, 7.1 * inch, 11)
        y -= 1
    footer(c, "CBS-2026-JP02 / QUOTE-1858652", 1)
    c.showPage()

    header(c, "INVOICE", "CBS-2026-JP02", "August 29, 2026", "Due on receipt — before dispatch")
    band(c, H - 1.58 * inch, 0.28 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(W / 2, H - 1.50 * inch, "40HC EXPORT SOC  ·  CBSS INLAND CARRIAGE  ·  WILLISTON ↔ MINNEAPOLIS")
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(0.55 * inch, H - 1.85 * inch, "BILL TO")
    c.drawString(4.3 * inch, H - 1.85 * inch, "SHIP / LOAD")
    c.setFont("Helvetica", 9)
    c.drawString(0.55 * inch, H - 2.02 * inch, "Jamie Palmer")
    c.drawString(0.55 * inch, H - 2.16 * inch, "7624 Coachlight Lane, Ellicott City, MD 21043")
    c.drawString(0.55 * inch, H - 2.30 * inch, "jamiedpalmer@yahoo.com")
    c.drawString(4.3 * inch, H - 2.02 * inch, "15140 49 T Way NW, Williston, ND 58801")
    c.drawString(4.3 * inch, H - 2.16 * inch, "Destination: Ashdod Port, Israel")

    rows = [
        ("40HC cargo-worthy SOC with depot / sea-worthy certificate", "1", money(BOX), money(BOX)),
        ("Inland carriage — Minneapolis ↔ Williston round trip (621 mi × $5.00)", "1", money(INLAND), money(INLAND)),
    ]
    y = H - 2.60 * inch
    band(c, y, 0.22 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.55 * inch, y + 6, "DESCRIPTION")
    c.drawRightString(6.3 * inch, y + 6, "QTY")
    c.drawRightString(7.15 * inch, y + 6, "UNIT")
    c.drawRightString(8.0 * inch, y + 6, "AMOUNT")
    y -= 0.28 * inch
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica", 9)
    for title, qty, unit, amt in rows:
        c.drawString(0.55 * inch, y, title[:78])
        c.drawRightString(6.3 * inch, y, qty)
        c.drawRightString(7.15 * inch, y, unit)
        c.drawRightString(8.0 * inch, y, amt)
        y -= 0.22 * inch

    c.setFillColorRGB(*NAVY)
    c.roundRect(5.1 * inch, 4.55 * inch, 2.95 * inch, 0.85 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(5.25 * inch, 5.05 * inch, "TOTAL DUE CBSS")
    c.setFont("Times-Bold", 14)
    c.drawRightString(7.90 * inch, 5.05 * inch, money(CBSS))
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica", 8)
    c.drawString(5.25 * inch, 4.75 * inch, "Do not pay freight on this invoice.")
    wrap(
        c,
        f"Pay CB Shipping Solutions {money(CBSS)}: {money(BOX)} for the second-load container and certificate, plus {money(INLAND)} for one Minneapolis ↔ Williston inland round trip at $5.00 per one-way mile ($2.50 each way). Ocean is enclosed quote #1858652 and is not confirmed. Memo: CBS-2026-JP02.",
        0.55 * inch,
        4.95 * inch,
        4.3 * inch,
        11,
    )

    c.setFillColorRGB(*NAVY)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.55 * inch, 3.95 * inch, "INLAND CARRIAGE · CONDITIONS OF SERVICE")
    c.setFillColorRGB(*INK)
    y = wrap(
        c,
        "SCOPE. CBGC LLC shall exclusively furnish inland movement of the 40HC from the Minneapolis rail ramp or designated depot to 15140 49 T Way NW, Williston, ND 58801, permit loading, and return the sealed container to Minneapolis for tender to the ocean carrier. Customer shall not hire residential pickup, ramp drayage, or fuel for this lane.",
        0.55 * inch,
        3.78 * inch,
        7.4 * inch,
        10,
        "Helvetica",
        8,
    )
    y = wrap(
        c,
        f"MILEAGE AND RATE. $5.00 per one-way statute mile for the complete round trip, equal to $2.50 per mile each way. This invoice bills {MILES} published one-way miles (Minneapolis–Williston via I-94) × $5.00 = {money(INLAND)}. Actual routed miles, if greater, and out-of-route / second-trip miles bill at the same rate.",
        0.55 * inch,
        y - 4,
        7.4 * inch,
        10,
        "Helvetica",
        8,
    )
    y = wrap(
        c,
        "INCLUDED. Empty positioning, residential / site access, Minneapolis-area drayage, chassis for the scheduled window, and fuel for the billed round trip. Live load: two (2) hours free; $100.00 per additional hour. Container on chassis 4–4.5 feet above grade. Packing, ramps, crane, and loading labor are not furnished unless separately engaged.",
        0.55 * inch,
        y - 4,
        7.4 * inch,
        10,
        "Helvetica",
        8,
    )
    wrap(
        c,
        "NOT INCLUDED. Ocean freight, bunker, wharfage, B/L, personal-effects surcharge, SED, Israel destination charges, duties, insurance, drop-and-pick beyond the live-load window, chassis split, overweight, or rail / steamship per diem after tender. Site must be ready. Title transfers after CBSS funds clear. Load 1 to Tema is a separate packet.",
        0.55 * inch,
        y - 4,
        7.4 * inch,
        10,
        "Helvetica",
        8,
    )
    footer(c, "CBS-2026-JP02", 2)
    c.showPage()

    header(c, "INVOICE", "CBS-2026-JP02", "August 29, 2026", "How to pay CBSS")
    c.setFillColorRGB(*NAVY)
    c.setFont("Times-Bold", 20)
    c.drawString(0.55 * inch, H - 1.65 * inch, "How to Pay CBSS")
    wrap(c, f"USD only. Memo: CBS-2026-JP02. Do not wire the {money(OCEAN)} ocean quote here.", 0.55 * inch, H - 1.90 * inch, 7.4 * inch)
    c.setFillColorRGB(*NAVY)
    c.roundRect(0.5 * inch, 4.70 * inch, 7.5 * inch, 2.95 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 7.40 * inch, "ACH / E-CHECK — PREFERRED")
    rows = [
        ("Recipient", "CBGC LLC"),
        ("Bank", "Lead Bank · routing 101019644 · account 212719485341"),
        ("EIN", "99-2031187 · Checking"),
        ("Amount", f"{money(CBSS)} USD"),
        ("Wire", f"Wire {money(CBSS + 10)} to net {money(CBSS)}"),
        ("SWIFT", "REVOUS31 · intermediary CHASGB2L"),
    ]
    y = 7.10 * inch
    for label, value in rows:
        c.setFillColorRGB(*GOLD)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(0.7 * inch, y, label)
        c.setFillColorRGB(*WHITE)
        c.setFont("Helvetica", 9)
        c.drawString(2.2 * inch, y, value)
        y -= 0.32 * inch
    footer(c, "CBS-2026-JP02", 3)
    c.showPage()

    header(c, "ENCLOSED QUOTE", "QUOTE-1858652", "August 29, 2026", "Quote only — not confirmed")
    band(c, H - 1.58 * inch, 0.28 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(W / 2, H - 1.50 * inch, "OCEAN QUOTE #1858652  ·  MINNEAPOLIS → ASHDOD (ISRAEL)  ·  INLAND REMOVED")
    lines = [
        ("Freight — 40' container (Minneapolis to Ashdod)", 3985),
        ("Bunker Adjustment Factor (BAF)", 380),
        ("Wharfage (4.54 MT × $10.00)", 45.40),
        ("Bill of lading", 50),
        ("Surcharge for personal effects", 400),
        ("Shipper’s declaration on $5,000", 50),
    ]
    y = H - 1.90 * inch
    band(c, y, 0.20 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.55 * inch, y + 5, "DESCRIPTION")
    c.drawRightString(8.0 * inch, y + 5, "AMOUNT")
    y -= 0.22 * inch
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica", 9)
    for title, amt in lines:
        c.drawString(0.55 * inch, y, title)
        c.drawRightString(8.0 * inch, y, money(amt))
        y -= 0.20 * inch
    c.setFillColorRGB(*NAVY)
    c.roundRect(0.5 * inch, y - 0.85 * inch, 7.5 * inch, 0.75 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(0.7 * inch, y - 0.35 * inch, "QUOTED OCEAN")
    c.setFont("Times-Bold", 16)
    c.drawRightString(7.80 * inch, y - 0.35 * inch, money(OCEAN))
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica", 8)
    c.drawString(0.7 * inch, y - 0.60 * inch, "DO NOT PAY THIS AMOUNT TO CB SHIPPING SOLUTIONS")
    wrap(
        c,
        "August 28 calculator quote #1858652 after residential pickup, drayage, and fuel were moved to the CBSS inland line. Subject to pricing approval and written booking confirmation. Israel destination charges, duties, and insurance are not included.",
        0.55 * inch,
        y - 1.15 * inch,
        7.4 * inch,
        12,
    )
    footer(c, "QUOTE-1858652", 4)
    c.showPage()

    header(c, "ENCLOSED QUOTE", "QUOTE-1858652", "August 29, 2026", "Do not pay ocean yet")
    c.setFillColorRGB(*NAVY)
    c.setFont("Times-Bold", 20)
    c.drawString(0.55 * inch, H - 1.65 * inch, "Ocean quote — do not pay yet")
    wrap(c, f"Calculator total {money(OCEAN)} after inland lines were removed. Not a Lufran confirmation. Not a CBSS invoice.", 0.55 * inch, H - 1.90 * inch, 7.4 * inch)
    c.setFillColorRGB(*NAVY)
    c.roundRect(0.5 * inch, 5.55 * inch, 7.5 * inch, 2.05 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 7.30 * inch, "WAIT FOR BOOKING CONFIRMATION")
    y = 7.00 * inch
    for label, value in [
        ("Quote", "#1858652"),
        ("Lane", "Minneapolis → Ashdod (Israel)"),
        ("Quoted total", f"{money(OCEAN)} USD"),
        ("When confirmed", "Pay the ocean carrier — not CBGC LLC"),
    ]:
        c.setFillColorRGB(*GOLD)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(0.7 * inch, y, label)
        c.setFillColorRGB(*WHITE)
        c.setFont("Helvetica", 9)
        c.drawString(2.4 * inch, y, value)
        y -= 0.32 * inch
    wrap(
        c,
        f"This weekend: (1) Pay {money(CBSS)} to CBSS on CBS-2026-JP02 — {money(BOX)} box + {money(INLAND)} inland. (2) Hold the {money(OCEAN)} ocean quote until the carrier confirms. (3) Confirm Williston is ready for a live load. (4) Send the Ashdod packing list and bill-of-lading names.",
        0.55 * inch,
        5.25 * inch,
        7.4 * inch,
        12,
    )
    footer(c, "QUOTE-1858652", 5)
    c.save()


if __name__ == "__main__":
    import sys

    dest = sys.argv[1] if len(sys.argv) > 1 else "/opt/cursor/artifacts/jamie-palmer-packet/CBSS-Jamie-Palmer-Ashdod-Packet.pdf"
    write_pdf(dest)
    print(dest)
