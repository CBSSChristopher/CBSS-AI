#!/usr/bin/env python3
"""Compact navy/gold Jamie Palmer packet. Keep under Drive MCP size limits."""

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


def box(c, x, y, w, h, fill):
    c.setFillColorRGB(*fill)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=0)


def write_pdf(path):
    c = canvas.Canvas(path, pagesize=letter)
    c.setTitle("CBSS Jamie Palmer Tema packet")

    # Page 1 — cover
    header(c, "PACKET", "CBS-2026-JP01 / QUOTE-1858440", "August 29, 2026", "Two payments · do not mix them")
    band(c, H - 1.58 * inch, 0.28 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(W / 2, H - 1.50 * inch, "JAMIE PALMER  ·  40HC TO TEMA  ·  WHO PAYS WHAT")

    box(c, 0.5 * inch, H - 3.55 * inch, 3.55 * inch, 1.75 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.65 * inch, H - 2.00 * inch, "INVOICE 1 · PAY CBSS NOW")
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica", 9)
    y = wrap(c, "Container, depot certificate, and CBSS logistics / handling the box.", 0.65 * inch, H - 2.22 * inch, 3.2 * inch)
    c.setFillColorRGB(*GOLD)
    c.setFont("Times-Bold", 18)
    c.drawString(0.65 * inch, y - 6, money(2300))
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica", 8)
    wrap(c, "Invoice CBS-2026-JP01. ACH or wire to CBGC LLC. Do not pay freight to CBSS.", 0.65 * inch, y - 26, 3.2 * inch, 10, "Helvetica", 8)

    box(c, 4.2 * inch, H - 3.55 * inch, 3.8 * inch, 1.75 * inch, CREAM)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(4.35 * inch, H - 2.00 * inch, "INVOICE 2 · PAY LUFRAN")
    c.setFillColorRGB(*INK)
    y = wrap(c, "Enclosed ocean quote — Lufran #1858440, confirmed August 27, 2026.", 4.35 * inch, H - 2.22 * inch, 3.45 * inch)
    c.setFillColorRGB(*NAVY)
    c.setFont("Times-Bold", 18)
    c.drawString(4.35 * inch, y - 6, money(7430.50))
    c.setFillColorRGB(*INK)
    wrap(c, "PayCargo payee LUFRAN INTERNATIONAL. Do not send this amount to CBSS.", 4.35 * inch, y - 26, 3.45 * inch, 10, "Helvetica", 8)

    box(c, 0.5 * inch, 2.15 * inch, 7.5 * inch, 3.0 * inch, MINT)
    c.setFillColorRGB(*NAVY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 4.90 * inch, "WHAT CBSS IS HANDLING ON THIS RUN")
    c.setFillColorRGB(*INK)
    bullets = [
        "Billed to Jamie Palmer. Family billing address on file: 7624 Coachlight Lane, Ellicott City, MD 21043.",
        "Load site: 15140 49 T Way NW, Williston, ND 58801. Destination: Tema Port, Ghana.",
        "40HC cargo-worthy SOC with depot / sea-worthy certificate.",
        "Export logistics and container handling: depot, Williston load, packing-list support, Lufran booking.",
        "Cargo: used kitchen appliances / washers / dryers · household goods.",
        "Nate Owusu (nowus002@gmail.com) stays the family contact on the load site.",
    ]
    y = 4.70 * inch
    for item in bullets:
        y = wrap(c, "•  " + item, 0.7 * inch, y, 7.1 * inch, 12)
        y -= 4
    footer(c, "CBS-2026-JP01 / QUOTE-1858440", 1)
    c.showPage()

    # Page 2 — CBSS invoice
    header(c, "INVOICE", "CBS-2026-JP01", "August 29, 2026", "Due on receipt — before the container is dispatched")
    band(c, H - 1.58 * inch, 0.28 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(W / 2, H - 1.50 * inch, "40HC EXPORT SOC · WILLISTON, ND → TEMA, GHANA · LOGISTICS INCLUDED")

    c.setFillColorRGB(*INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(0.55 * inch, H - 1.85 * inch, "BILL TO")
    c.drawString(4.3 * inch, H - 1.85 * inch, "SHIP / LOAD")
    c.setFont("Helvetica", 9)
    c.drawString(0.55 * inch, H - 2.02 * inch, "Jamie Palmer")
    c.drawString(0.55 * inch, H - 2.16 * inch, "7624 Coachlight Lane, Ellicott City, MD 21043")
    c.drawString(0.55 * inch, H - 2.30 * inch, "jamiedpalmer@yahoo.com")
    c.drawString(4.3 * inch, H - 2.02 * inch, "15140 49 T Way NW, Williston, ND 58801")
    c.drawString(4.3 * inch, H - 2.16 * inch, "Destination: Tema Port, Ghana")

    rows = [
        ("40HC cargo-worthy SOC with depot / sea-worthy certificate", "1", money(2300), money(2300)),
        ("Export logistics and container handling (included in CBSS cash)", "1", "Included", "Included"),
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
    c.roundRect(5.1 * inch, 3.55 * inch, 2.95 * inch, 0.85 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(5.25 * inch, 4.05 * inch, "TOTAL DUE CBSS")
    c.setFont("Times-Bold", 14)
    c.drawRightString(7.90 * inch, 4.05 * inch, money(2300))
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica", 8)
    c.drawString(5.25 * inch, 3.75 * inch, "Do not pay freight on this invoice.")

    c.setFillColorRGB(*INK)
    y = wrap(
        c,
        "Pay CB Shipping Solutions $2,300.00 only. That is the container, the depot certificate, and CBSS logistics / handling. Ocean is the enclosed Lufran quote. USD only. Memo: CBS-2026-JP01.",
        0.55 * inch,
        3.95 * inch,
        4.3 * inch,
        12,
    )
    y = wrap(
        c,
        "CERTIFICATE · EXPORT SOC. This unit is a cargo-worthy shipper-owned container with a depot / sea-worthy certificate. Not a domestic delivered storage sale.",
        0.55 * inch,
        y - 8,
        7.4 * inch,
        12,
    )
    wrap(
        c,
        "Family provides the packing list and exact shipper / consignee / notify names. Title transfers after CBSS funds clear.",
        0.55 * inch,
        y - 8,
        7.4 * inch,
        12,
    )
    footer(c, "CBS-2026-JP01", 2)
    c.showPage()

    # Page 3 — pay CBSS
    header(c, "INVOICE", "CBS-2026-JP01", "August 29, 2026", "How to pay CBSS")
    c.setFillColorRGB(*NAVY)
    c.setFont("Times-Bold", 20)
    c.drawString(0.55 * inch, H - 1.65 * inch, "How to Pay CBSS")
    c.setFillColorRGB(*INK)
    wrap(c, "USD only. Memo / addenda: CBS-2026-JP01. Do not wire the Lufran ocean amount here.", 0.55 * inch, H - 1.90 * inch, 7.4 * inch)

    box(c, 0.5 * inch, 4.55 * inch, 7.5 * inch, 3.15 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 7.45 * inch, "ACH / E-CHECK — PREFERRED · NO INCOMING FEE")
    rows = [
        ("Recipient", "CBGC LLC"),
        ("Address", "1412 Lockwood Drive, Corning, AR 72422-3008"),
        ("Bank", "Lead Bank · 1801 Main Street, Kansas City, MO 64108"),
        ("Routing (ACH)", "101019644"),
        ("Account", "212719485341"),
        ("EIN", "99-2031187 · Checking"),
        ("Amount", "$2,300.00 USD"),
    ]
    y = 7.20 * inch
    for label, value in rows:
        c.setFillColorRGB(*GOLD)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(0.7 * inch, y, label)
        c.setFillColorRGB(*WHITE)
        c.setFont("Helvetica", 9)
        c.drawString(2.4 * inch, y, value)
        y -= 0.28 * inch

    c.setFillColorRGB(*NAVY)
    c.roundRect(0.5 * inch, 2.85 * inch, 7.5 * inch, 1.50 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 4.05 * inch, "DOMESTIC WIRE · U.S. BANKS")
    c.setFillColorRGB(*WHITE)
    wrap(c, "Same recipient, bank, routing, and account. A $10 incoming wire fee is deducted. Wire $2,310.00 to net $2,300.00.", 0.7 * inch, 3.80 * inch, 7.1 * inch, 12)

    c.setFillColorRGB(*INK)
    wrap(c, "SWIFT / BIC REVOUS31 · Intermediary CHASGB2L · Revolut Technologies Inc, 107 Greenwich Street, Floor 20, New York, NY 10006.", 0.55 * inch, 2.55 * inch, 7.4 * inch, 12)
    footer(c, "CBS-2026-JP01", 3)
    c.showPage()

    # Page 4 — Lufran quote
    header(c, "ENCLOSED QUOTE", "QUOTE-1858440", "August 29, 2026", "Pay Lufran — not CBSS")
    band(c, H - 1.58 * inch, 0.28 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(W / 2, H - 1.50 * inch, "LUFRAN INTERNATIONAL  ·  QUOTE #1858440  ·  MINNEAPOLIS → TEMA")

    lines = [
        ("Freight — 40' container (Minneapolis rail ramp to Tema)", money(6950), money(6950)),
        ("Bunker Adjustment Factor (BAF)", money(380), money(380)),
        ("Bill of lading", money(50), money(50)),
        ("Shipper’s declaration (over $2,500) on $5,000", money(50), money(50)),
        ("Lufran printed total (email said US $7,430.50)", money(0.50), money(0.50)),
    ]
    y = H - 1.95 * inch
    band(c, y, 0.22 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.55 * inch, y + 6, "DESCRIPTION")
    c.drawRightString(8.0 * inch, y + 6, "AMOUNT")
    y -= 0.26 * inch
    c.setFillColorRGB(*INK)
    c.setFont("Helvetica", 9)
    for title, _unit, amt in lines:
        c.drawString(0.55 * inch, y, title)
        c.drawRightString(8.0 * inch, y, amt)
        y -= 0.22 * inch

    c.setFillColorRGB(*NAVY)
    c.roundRect(0.5 * inch, y - 1.15 * inch, 7.5 * inch, 1.00 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(0.7 * inch, y - 0.45 * inch, "PAY LUFRAN")
    c.setFont("Times-Bold", 16)
    c.drawRightString(7.80 * inch, y - 0.45 * inch, money(7430.50))
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica", 9)
    c.drawString(0.7 * inch, y - 0.75 * inch, "DO NOT PAY THIS AMOUNT TO CB SHIPPING SOLUTIONS")

    wrap(
        c,
        "Confirmed by Fiorella at Lufran International on August 27, 2026. Replaces the unconfirmed freight-calculator dump. Destination charges, Ghana duties, and insurance are not in this total.",
        0.55 * inch,
        y - 1.45 * inch,
        7.4 * inch,
        12,
    )
    footer(c, "QUOTE-1858440", 4)
    c.showPage()

    # Page 5 — pay Lufran
    header(c, "ENCLOSED QUOTE", "QUOTE-1858440", "August 29, 2026", "How to pay Lufran")
    c.setFillColorRGB(*NAVY)
    c.setFont("Times-Bold", 20)
    c.drawString(0.55 * inch, H - 1.65 * inch, "How to Pay Lufran")
    wrap(c, "This page is only the enclosed ocean quote of $7,430.50. Do not send it to CBGC LLC / Lead Bank.", 0.55 * inch, H - 1.90 * inch, 7.4 * inch)

    box(c, 0.5 * inch, 5.35 * inch, 7.5 * inch, 2.35 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 7.40 * inch, "PAYCARGO — PAYEE LUFRAN INTERNATIONAL")
    pay = [
        ("Payee", "LUFRAN INTERNATIONAL"),
        ("Amount", "$7,430.50 USD"),
        ("Quote", "#1858440"),
        ("PayCargo", "https://paycargo.com/paycargo-quick-pay/"),
        ("After you pay", "Email confirmation to Fiorella at Lufran and copy CBSS"),
    ]
    y = 7.10 * inch
    for label, value in pay:
        c.setFillColorRGB(*GOLD)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(0.7 * inch, y, label)
        c.setFillColorRGB(*WHITE)
        c.setFont("Helvetica", 9)
        c.drawString(2.3 * inch, y, value)
        y -= 0.30 * inch

    c.setFillColorRGB(*INK)
    y = wrap(
        c,
        "If you wire, pay only LUFRAN INTERNATIONAL CORP. Their banking is on Lufran’s own PDF. We do not reprint another company’s bank account. Do not use the CBSS routing / account numbers from page 3 for this amount.",
        0.55 * inch,
        5.05 * inch,
        7.4 * inch,
        12,
    )
    wrap(
        c,
        "After both payments: (1) $2,300.00 to CBSS on CBS-2026-JP01. (2) $7,430.50 to Lufran on #1858440. (3) Confirm Williston is ready. (4) Send the packing list and bill-of-lading names.",
        0.55 * inch,
        y - 10,
        7.4 * inch,
        12,
    )
    footer(c, "QUOTE-1858440", 5)
    c.save()


if __name__ == "__main__":
    import sys

    dest = sys.argv[1] if len(sys.argv) > 1 else "/opt/cursor/artifacts/jamie-palmer-packet/CBSS-Jamie-Palmer-Tema-Packet.pdf"
    write_pdf(dest)
    print(dest)
