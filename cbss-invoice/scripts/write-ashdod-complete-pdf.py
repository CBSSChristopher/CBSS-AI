#!/usr/bin/env python3
"""Full 7-page Jamie Palmer Ashdod packet. Separate from the compact 5-page file."""

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
PAGES = 7
BOX, INLAND, CBSS, OCEAN, DEST, MILES = 2300, 3105, 5405, 7910.40, 3000, 621


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
    c.setFont("Times-Bold", 12)
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
    c.drawRightString(W - 0.5 * inch, 0.38 * inch, f"{text} · Page {page} of {PAGES}")


def wrap(c, text, x, y, width, leading=11, font="Helvetica", size=8.5):
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


def party(c, x, y, w, h, title, lines):
    c.setFillColorRGB(*CREAM)
    c.roundRect(x, y, w, h, 5, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x + 8, y + h - 14, title)
    c.setFillColorRGB(*INK)
    yy = y + h - 28
    for i, line in enumerate(lines):
        c.setFont("Helvetica-Bold" if i == 0 else "Helvetica", 8)
        c.drawString(x + 8, yy, line[:46])
        yy -= 11


def write_pdf(path):
    c = canvas.Canvas(path, pagesize=letter)
    c.setTitle("CBSS Jamie Palmer Ashdod complete packet")

    header(c, "PACKET", "CBS-2026-JP02 / QUOTE-1858652", "August 29, 2026", "Two documents · do not mix them")
    band(c, H - 1.58 * inch, 0.26 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(W / 2, H - 1.50 * inch, "JAMIE PALMER  ·  LOAD 2  ·  40HC TO ASHDOD  ·  WHO PAYS WHAT")
    party(c, 0.5 * inch, H - 3.15 * inch, 2.45 * inch, 1.42 * inch, "FROM / SELLER", [
        "CBGC LLC", "d/b/a CB Shipping Solutions", "1412 Lockwood Drive",
        "Corning, AR 72422-3008", "EIN 99-2031187  ·  (870) 323-2593",
    ])
    party(c, 3.05 * inch, H - 3.15 * inch, 2.45 * inch, 1.42 * inch, "BILL TO", [
        "Jamie Palmer", "Family billing address on file", "7624 Coachlight Lane",
        "Ellicott City, MD 21043", "jamiedpalmer@yahoo.com",
    ])
    party(c, 5.60 * inch, H - 3.15 * inch, 2.4 * inch, 1.42 * inch, "LOAD / DESTINATION", [
        "Load site · Williston, ND", "15140 49 T Way NW", "Williston, ND 58801",
        "Destination: Ashdod Port, Israel", "Plumbing / HHG · 40HC SOC",
    ])

    c.setFillColorRGB(*NAVY)
    c.roundRect(0.5 * inch, H - 4.95 * inch, 3.7 * inch, 1.65 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.65 * inch, H - 3.48 * inch, "INVOICE 1 · PAY CBSS NOW")
    c.setFillColorRGB(*WHITE)
    wrap(c, f"Second-load 40HC and certificate {money(BOX)}. Inland Minneapolis ↔ Williston {money(INLAND)}.", 0.65 * inch, H - 3.68 * inch, 3.4 * inch)
    c.setFillColorRGB(*GOLD)
    c.setFont("Times-Bold", 18)
    c.drawString(0.65 * inch, H - 4.18 * inch, money(CBSS))
    c.setFillColorRGB(*WHITE)
    wrap(c, "Invoice CBS-2026-JP02 · ACH or wire to CBGC LLC. Pages 2–4. Do not pay freight to CBSS.", 0.65 * inch, H - 4.42 * inch, 3.4 * inch, 10, "Helvetica", 8)

    c.setFillColorRGB(*CREAM)
    c.roundRect(4.35 * inch, H - 4.95 * inch, 3.65 * inch, 1.65 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(4.5 * inch, H - 3.48 * inch, "INVOICE 2 · ENCLOSED QUOTE")
    c.setFillColorRGB(*INK)
    wrap(c, "Freight-calculator #1858652, dated August 28, 2026. Minneapolis → Ashdod. Pickup, drayage, and fuel removed.", 4.5 * inch, H - 3.68 * inch, 3.35 * inch)
    c.setFillColorRGB(*NAVY)
    c.setFont("Times-Bold", 18)
    c.drawString(4.5 * inch, H - 4.18 * inch, money(OCEAN))
    wrap(c, "Not a Lufran booking confirmation. Do not pay this amount to CBSS. Pages 5–7.", 4.5 * inch, H - 4.42 * inch, 3.35 * inch, 10, "Helvetica", 8)

    c.setFillColorRGB(*MINT)
    c.roundRect(0.5 * inch, 3.05 * inch, 7.5 * inch, 2.55 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*NAVY)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(0.65 * inch, 5.38 * inch, "WHAT CBSS IS HANDLING ON LOAD 2")
    c.setFillColorRGB(*INK)
    y = wrap(c, "Same family job as Tema, second box. CBSS sells the 40HC and is the inland carrier from Minneapolis to Williston and back.", 0.65 * inch, 5.20 * inch, 7.2 * inch)
    for item in [
        "Source and hold the second 40HC cargo-worthy SOC and the depot / sea-worthy certificate.",
        "Position the empty box from the Minneapolis ramp to 15140 49 T Way NW, Williston, ND 58801, live-load, and return the loaded box to Minneapolis.",
        f"Inland rate: $5.00 per one-way mile for the round trip ($2.50 each way) × {MILES} miles = {money(INLAND)}.",
        "Book Minneapolis rail ramp → Ashdod and stay on the ocean carrier until they confirm. Help with the packing list and bill-of-lading names.",
    ]:
        y = wrap(c, "•  " + item, 0.65 * inch, y - 1, 7.2 * inch, 10, "Helvetica", 8)

    c.setFillColorRGB(*CREAM)
    c.roundRect(0.5 * inch, 0.58 * inch, 7.5 * inch, 2.38 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*NAVY)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(0.65 * inch, 2.74 * inch, "CURRENT MARKET QUOTATION  ·  DEDICATED FAMILY LANE")
    c.setFillColorRGB(*INK)
    wrap(
        c,
        f"The {money(OCEAN)} ocean figure is the August 28 calculator quote after CBSS pulled residential pickup, drayage, and fuel onto this invoice, plus {money(DEST)} in estimated Ashdod destination charges (DTHC, Israel customs clearance, and consignee handling at Ashdod Port). These ocean figures are a current-market quotation as of August 28, 2026. Freight, bunker, destination THC, customs-clearance handling, and related charges do change — they move with the market, vessel space, bunker, and carrier filing until a booking is confirmed and accepted. As previously promised on the Tema run: CBSS has stood up dedicated family export lanes (Minneapolis rail ramp ↔ Williston, then Minneapolis → destination port). Because those lanes are already in place — SOC supply, inland carriage, and booking support — we are working this Ashdod load at the current quoted total rather than re-shopping it as a one-off spot. That is a CBSS family-lane commitment, not a carrier booking confirmation. Israel duties, VAT, and cargo insurance are not in that total. Do not pay ocean until the carrier confirms.",
        0.65 * inch,
        2.56 * inch,
        7.2 * inch,
        10,
        "Helvetica",
        8,
    )
    footer(c, "CBS-2026-JP02 / QUOTE-1858652", 1)
    c.showPage()

    header(c, "INVOICE", "CBS-2026-JP02", "August 29, 2026", "Due on receipt — before dispatch")
    band(c, H - 1.58 * inch, 0.26 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(W / 2, H - 1.50 * inch, "40HC EXPORT SOC  ·  CBSS INLAND CARRIAGE  ·  WILLISTON ↔ MINNEAPOLIS · ASHDOD")
    party(c, 0.5 * inch, H - 3.00 * inch, 2.45 * inch, 1.28 * inch, "FROM / SELLER", [
        "CBGC LLC", "d/b/a CB Shipping Solutions", "1412 Lockwood Drive", "Corning, AR 72422-3008",
    ])
    party(c, 3.05 * inch, H - 3.00 * inch, 2.45 * inch, 1.28 * inch, "BILL TO", [
        "Jamie Palmer", "7624 Coachlight Lane", "Ellicott City, MD 21043", "jamiedpalmer@yahoo.com",
    ])
    party(c, 5.60 * inch, H - 3.00 * inch, 2.4 * inch, 1.28 * inch, "SHIP TO", [
        "Load site · Williston, ND", "15140 49 T Way NW", "Williston, ND 58801", "Destination: Ashdod Port, Israel",
    ])
    rows = [
        ("40HC cargo-worthy SOC with depot / sea-worthy certificate", "Second family load. One 40' high cube, cargo-worthy, with the depot / sea-worthy certificate required for export. Container sale only — inland is the next line.", BOX),
        ("Inland carriage — Minneapolis ↔ Williston round trip", f"CBGC LLC shall exclusively furnish inland movement of the 40HC between the Minneapolis rail ramp and 15140 49 T Way NW, Williston, ND 58801, and return the loaded box to Minneapolis. One complete round trip at $5.00 per one-way mile ($2.50 each way). {MILES} published miles = {money(INLAND)}. Residential access, Minneapolis drayage, chassis, and fuel are on this line — not payable to the ocean carrier.", INLAND),
    ]
    y = H - 3.28 * inch
    band(c, y, 0.20 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.55 * inch, y + 5, "DESCRIPTION")
    c.drawRightString(8.0 * inch, y + 5, "AMOUNT")
    y -= 0.18 * inch
    for title, detail, amt in rows:
        c.setFillColorRGB(*INK)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(0.55 * inch, y, title)
        c.drawRightString(8.0 * inch, y, money(amt))
        y = wrap(c, detail, 0.55 * inch, y - 12, 7.4 * inch, 10, "Helvetica", 8)
        y -= 8

    c.setFillColorRGB(*NAVY)
    c.roundRect(5.15 * inch, y - 0.85 * inch, 2.85 * inch, 0.78 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(5.30 * inch, y - 0.32 * inch, "TOTAL DUE CBSS")
    c.setFont("Times-Bold", 13)
    c.drawRightString(7.85 * inch, y - 0.32 * inch, money(CBSS))
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica", 7.5)
    c.drawString(5.30 * inch, y - 0.58 * inch, "Do not pay freight on this invoice.")

    notes_y = y
    c.setFillColorRGB(*NAVY)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.55 * inch, notes_y, "INVOICE NOTES")
    c.setFillColorRGB(*INK)
    ny = notes_y - 14
    for note in [
        f"Pay CB Shipping Solutions {money(CBSS)} only: {money(BOX)} for the second-load 40HC and certificate, plus {money(INLAND)} for one Minneapolis ↔ Williston inland round trip.",
        "Do not pay ocean freight, residential pickup, drayage, or fuel to CBSS. Those inland items were pulled off the enclosed ocean quote because CBSS is the inland carrier.",
        "USD only. Put invoice CBS-2026-JP02 in the payment memo / addenda.",
        "Family contact on the job: Nathaniel “Nate” Owusu · nowus002@gmail.com. Cargo: plumbing materials / supplies · water heaters · washers · dryers · household goods.",
        "Current market quotation · dedicated family lane. Enclosed ocean is quoted at current prices as of August 28, 2026. Ocean rates do change until booking. As promised on Tema, dedicated family export lanes are already stood up, so this load is worked at the current quoted ocean total — not re-shopped as a spot.",
    ]:
        ny = wrap(c, "•  " + note, 0.55 * inch, ny, 4.4 * inch, 10, "Helvetica", 7.5)
        ny -= 2

    c.setFillColorRGB(*MINT)
    c.roundRect(0.5 * inch, 0.55 * inch, 7.5 * inch, 1.15 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*NAVY)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.65 * inch, 1.50 * inch, "CERTIFICATE · EXPORT SOC")
    c.setFillColorRGB(*INK)
    wrap(
        c,
        "This unit is sold as a cargo-worthy shipper-owned container (SOC) with a depot / sea-worthy certificate for export. The certificate is the export condition document. This is not a domestic delivered-and-placed storage sale. Ocean freight, destination charges, duties, and cargo insurance are not on this CBSS invoice unless a line says so.",
        0.65 * inch,
        1.32 * inch,
        7.2 * inch,
        10,
        "Helvetica",
        8,
    )
    footer(c, "CBS-2026-JP02", 2)
    c.showPage()

    header(c, "INVOICE", "CBS-2026-JP02", "August 29, 2026", "Due on receipt — before dispatch")
    c.setFillColorRGB(*NAVY)
    c.setFont("Times-Bold", 18)
    c.drawString(0.55 * inch, H - 1.62 * inch, "Inland carriage — conditions of service")
    wrap(c, "Billed to Jamie Palmer. These terms belong to invoice CBS-2026-JP02 for the Minneapolis ↔ Williston inland move. They are not ocean-carrier terms.", 0.55 * inch, H - 1.86 * inch, 7.4 * inch)
    c.setFillColorRGB(*CREAM)
    c.roundRect(0.5 * inch, 0.58 * inch, 7.5 * inch, 7.05 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*NAVY)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(0.65 * inch, 7.40 * inch, "INLAND CARRIAGE · CONDITIONS OF SERVICE")
    c.setFillColorRGB(*INK)
    y = 7.18 * inch
    for para in [
        "SCOPE. CBGC LLC shall perform motor / intermodal inland carriage of one (1) 40' high-cube shipper-owned container from the Minneapolis, Minnesota rail ramp or designated depot to 15140 49 T Way NW, Williston, ND 58801, permit loading at that site, and return the sealed container to the Minneapolis ramp for tender to the ocean carrier. Customer shall not independently hire residential pickup, ramp drayage, or fuel for this lane.",
        f"MILEAGE AND RATE. The agreed rate is $5.00 per one-way statute mile for the complete round trip, equal to $2.50 per mile each way. This invoice bills {MILES} published one-way statute miles (Minneapolis–Williston via I-94) × $5.00 = {money(INLAND)}. Actual routed miles certified on the completed move, if greater, bill at the same rate. Out-of-route miles, a second trip, or a change of load site bill extra at the same rate.",
        "INCLUDED IN THE INLAND CHARGE. Positioning of the empty SOC, residential / site access to the Williston address, Minneapolis-area terminal or ramp drayage, chassis use for the scheduled window, and fuel for the billed round trip. Live load: two (2) hours free; One Hundred and 00/100 Dollars ($100.00) per additional hour or fraction thereafter. The container will be presented on a chassis approximately four (4) to four and one-half (4.5) feet above grade. Packing materials, ramps, cranes, and loading labor are not furnished unless separately engaged in writing.",
        "NOT INCLUDED. Ocean freight, bunker, wharfage, bills of lading, personal-effects surcharge, shipper’s export declaration, Ashdod destination THC, Israel customs clearance, destination port delivery, duties, taxes, VAT, cargo insurance, drop-and-pick beyond the scheduled live-load window, chassis split, overweight, hazardous, or storage / per diem assessed by the railroad or steamship line after tender. Destination lines are estimated on the enclosed ocean quote, not on this CBSS invoice.",
        "CUSTOMER WARRANTIES. The load site will be ready for inspection, packing, and loading on the scheduled date; will support a standard over-the-road chassis; and will furnish a complete packing list and the exact shipper, consignee, and notify names for the bill of lading. Delay, abort, or redelivery caused by an unready site, blocked access, or missing paperwork is for the customer’s account.",
        "LIABILITY AND TITLE. Inland carriage is performed as a domestic logistics service of CBGC LLC and is separate from the ocean contract of carriage. Title to the container transfers after CBSS funds clear. Risk of cargo after tender to the rail ramp or ocean carrier is governed by the ocean bill of lading, not this invoice. This is load 2. Load 1 to Tema (CBS-2026-JP01 / Lufran #1858440) is a separate packet — do not mix payments.",
    ]:
        y = wrap(c, para, 0.65 * inch, y, 7.2 * inch, 11, "Helvetica", 8.5)
        y -= 8
    footer(c, "CBS-2026-JP02", 3)
    c.showPage()

    header(c, "INVOICE", "CBS-2026-JP02", "August 29, 2026", "How to pay CBSS")
    c.setFillColorRGB(*NAVY)
    c.setFont("Times-Bold", 20)
    c.drawString(0.55 * inch, H - 1.65 * inch, "How to Pay CBSS")
    wrap(c, f"Billed to Jamie Palmer. USD only. Memo / addenda: CBS-2026-JP02. This page is only the {money(CBSS)} second-load CBSS invoice. Do not wire the ocean quote here.", 0.55 * inch, H - 1.90 * inch, 7.4 * inch)
    c.setFillColorRGB(*NAVY)
    c.roundRect(0.5 * inch, 4.55 * inch, 7.5 * inch, 3.05 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 7.35 * inch, "ACH / E-CHECK — PREFERRED · NO INCOMING FEE")
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica", 8)
    c.drawString(0.7 * inch, 7.16 * inch, f"Pay {money(CBSS)} USD by ACH or e-check. Usually arrives in 1–3 business days.")
    y = 6.92 * inch
    for label, value in [
        ("Recipient", "CBGC LLC"),
        ("Address", "1412 Lockwood Drive"),
        ("City / ZIP", "Corning, AR 72422-3008"),
        ("Phone", "(870) 323-2593"),
        ("EIN / tax ID", "99-2031187"),
        ("Account type", "Checking"),
        ("Bank", "Lead Bank · 1801 Main Street, Kansas City, MO 64108"),
        ("Routing (ACH)", "101019644"),
        ("Account number", "212719485341"),
        ("Amount", f"{money(CBSS)} USD"),
    ]:
        c.setFillColorRGB(*GOLD)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(0.7 * inch, y, label)
        c.setFillColorRGB(*WHITE)
        c.setFont("Helvetica", 8)
        c.drawString(2.35 * inch, y, value)
        y -= 0.22 * inch

    c.setFillColorRGB(*NAVY)
    c.roundRect(0.5 * inch, 3.15 * inch, 7.5 * inch, 1.25 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 4.15 * inch, "DOMESTIC WIRE · U.S. BANKS")
    c.setFillColorRGB(*WHITE)
    wrap(c, f"Same recipient, address, bank, account number, and routing as above. Wire routing number: 101019644. A $10 incoming wire fee is deducted. Wire {money(CBSS + 10)} to net {money(CBSS)}.", 0.7 * inch, 3.92 * inch, 7.1 * inch, 11, "Helvetica", 8.5)

    c.setFillColorRGB(*CREAM)
    c.roundRect(0.5 * inch, 1.35 * inch, 7.5 * inch, 1.65 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*NAVY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 2.75 * inch, "INTERNATIONAL SWIFT · IF PAYING FROM OUTSIDE THE U.S.")
    c.setFillColorRGB(*INK)
    wrap(
        c,
        "Recipient: CBGC LLC · 1412 Lockwood Drive, Corning, AR 72422-3008, United States. Account number: 212719485341 · Wire routing: 101019644. SWIFT / BIC: REVOUS31 · Intermediary BIC: CHASGB2L. Bank: Revolut Technologies Inc, 107 Greenwich Street, Floor 20, New York, NY 10006.",
        0.7 * inch,
        2.52 * inch,
        7.1 * inch,
        11,
        "Helvetica",
        8.5,
    )
    footer(c, "CBS-2026-JP02", 4)
    c.showPage()

    header(c, "ENCLOSED QUOTE", "QUOTE-1858652", "August 29, 2026", "Quote only — not confirmed")
    band(c, H - 1.58 * inch, 0.26 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(W / 2, H - 1.50 * inch, "OCEAN QUOTE #1858652  ·  MINNEAPOLIS → ASHDOD (ISRAEL)")
    party(c, 0.5 * inch, H - 3.00 * inch, 2.45 * inch, 1.28 * inch, "ISSUED THROUGH", [
        "CBGC LLC", "Enclosed calculator quote.", "CBSS is not the ocean carrier.", "Do not pay this to CBGC LLC.",
    ])
    party(c, 3.05 * inch, H - 3.00 * inch, 2.45 * inch, 1.28 * inch, "BILL TO", [
        "Jamie Palmer", "7624 Coachlight Lane", "Ellicott City, MD 21043", "jamiedpalmer@yahoo.com",
    ])
    party(c, 5.60 * inch, H - 3.00 * inch, 2.4 * inch, 1.28 * inch, "OCEAN LANE", [
        "Quote #1858652", "Dated August 28, 2026", "1 x 40HC SOC · 10,000 lb", "Minneapolis → Ashdod, Israel",
    ])
    lines = [
        ("Freight — 40' container (Minneapolis to Ashdod)", "Minneapolis rail ramp to Ashdod. 1 x 40HC SOC. Port-to-port / ramp-to-port only.", 3985),
        ("Bunker Adjustment Factor (BAF)", "40' container fuel adjustment.", 380),
        ("Wharfage (4.54 MT × $10.00)", "", 45.40),
        ("Bill of lading", "", 50),
        ("Surcharge for personal effects (with or without cars)", "", 400),
        ("Shipper’s declaration (over $2,500) on $5,000", "", 50),
        ("Destination THC (DTHC) — Ashdod Port, 40HC", "Estimated dest THC. Calculator said pending confirmation (up to five days).", 1200),
        ("Dest. customs clearance & docs (Israel)", "Duties, VAT, and cargo insurance are not included.", 850),
        ("Dest. delivery / consignee handling at Ashdod Port", "Port handling only. No Israel door address is billed.", 950),
    ]
    y = H - 3.28 * inch
    band(c, y, 0.18 * inch, NAVY)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(0.55 * inch, y + 4, "DESCRIPTION")
    c.drawRightString(8.0 * inch, y + 4, "AMOUNT")
    y -= 0.20 * inch
    for title, detail, amt in lines:
        c.setFillColorRGB(*INK)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(0.55 * inch, y, title)
        c.drawRightString(8.0 * inch, y, money(amt))
        y -= 0.12 * inch
        if detail:
            c.setFont("Helvetica", 7.5)
            c.setFillColorRGB(*MUTED)
            c.drawString(0.55 * inch, y, detail[:110])
            y -= 0.14 * inch
        else:
            y -= 0.04 * inch
    c.setFillColorRGB(*NAVY)
    c.roundRect(0.5 * inch, 0.70 * inch, 7.5 * inch, 0.72 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(0.7 * inch, 1.12 * inch, "QUOTED OCEAN")
    c.setFont("Times-Bold", 16)
    c.drawRightString(7.80 * inch, 1.12 * inch, money(OCEAN))
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica", 8)
    c.drawString(0.7 * inch, 0.88 * inch, "DO NOT PAY THIS AMOUNT TO CB SHIPPING SOLUTIONS")
    footer(c, "QUOTE-1858652", 5)
    c.showPage()

    header(c, "ENCLOSED QUOTE", "QUOTE-1858652", "August 29, 2026", "Quote only — not confirmed")
    c.setFillColorRGB(*NAVY)
    c.setFont("Times-Bold", 20)
    c.drawString(0.55 * inch, H - 1.65 * inch, "Ocean quote notes")
    wrap(c, f"Billed to Jamie Palmer. Quote #1858652 · {money(OCEAN)}. These notes belong with the enclosed calculator quote, not the CBSS invoice.", 0.55 * inch, H - 1.90 * inch, 7.4 * inch)
    c.setFillColorRGB(*CREAM)
    c.roundRect(0.5 * inch, 3.15 * inch, 7.5 * inch, 4.40 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*NAVY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 7.30 * inch, "QUOTE NOTES")
    c.setFillColorRGB(*INK)
    y = 7.08 * inch
    for para in [
        f"These nine lines are the freight-calculator ocean for quote #1858652 dated August 28, 2026, after residential pickup, drayage, and fuel were removed, plus estimated Ashdod destination THC, Israel customs clearance (duties/VAT not included), and destination delivery / consignee handling at Ashdod Port. They add to {money(OCEAN)}.",
        "Cargo: Plumbing materials / supplies · water heaters · washers · dryers · household goods. Inland movement is on CBSS invoice CBS-2026-JP02, not on this quote. No Israel door address is billed.",
        "Current market quotation · dedicated family lane. These ocean figures are a current-market quotation as of August 28, 2026. Freight, bunker, destination THC, customs-clearance handling, and related charges do change — they move with the market, vessel space, bunker, and carrier filing until a booking is confirmed and accepted.",
        "As previously promised on the Tema run: CBSS has stood up dedicated family export lanes for this program (Minneapolis rail ramp ↔ Williston load site, then Minneapolis → destination port). Because those lanes are already in place — SOC supply, inland carriage, and booking support — we are working this Ashdod load at the current quoted total rather than re-shopping it as a one-off spot. That is a CBSS family-lane commitment, not a carrier booking confirmation. Destination THC, clearance, and port delivery may take up to five days to confirm. Israel duties, VAT, and cargo insurance are not in this total.",
    ]:
        y = wrap(c, para, 0.7 * inch, y, 7.1 * inch, 11, "Helvetica", 8.5)
        y -= 8
    c.setFillColorRGB(*NAVY)
    c.roundRect(0.5 * inch, 1.70 * inch, 7.5 * inch, 1.25 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(0.7 * inch, 2.65 * inch, "DO NOT PAY THIS AMOUNT TO CB SHIPPING SOLUTIONS")
    c.setFillColorRGB(*WHITE)
    wrap(c, "Do not pay this ocean figure until the carrier sends a booking confirmation. When they do, pay the ocean carrier — not CBSS.", 0.7 * inch, 2.38 * inch, 7.1 * inch, 11, "Helvetica", 9)
    footer(c, "QUOTE-1858652", 6)
    c.showPage()

    header(c, "ENCLOSED QUOTE", "QUOTE-1858652", "August 29, 2026", "Do not pay ocean yet")
    c.setFillColorRGB(*NAVY)
    c.setFont("Times-Bold", 20)
    c.drawString(0.55 * inch, H - 1.65 * inch, "Ocean quote — do not pay yet")
    wrap(c, f"Calculator total {money(OCEAN)} on quote #1858652. This is not a Lufran confirmation and not a CBSS invoice.", 0.55 * inch, H - 1.90 * inch, 7.4 * inch)
    c.setFillColorRGB(*NAVY)
    c.roundRect(0.5 * inch, 4.55 * inch, 7.5 * inch, 3.05 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 7.35 * inch, "WAIT FOR BOOKING CONFIRMATION")
    c.setFillColorRGB(*WHITE)
    c.setFont("Helvetica", 8)
    c.drawString(0.7 * inch, 7.14 * inch, "No ocean contract exists until the booking confirmation is accepted.")
    y = 6.88 * inch
    for label, value in [
        ("Quote", "#1858652"),
        ("Lane", "Minneapolis → Ashdod (Israel)"),
        ("Quoted total", f"{money(OCEAN)} USD"),
        ("Rate basis", "Current market quotation · dedicated family lane"),
        ("Status", "Current-market quote · prices do change until booking"),
        ("When confirmed", "Pay the ocean carrier — PayCargo payee will be on that confirmation, not CBGC LLC"),
    ]:
        c.setFillColorRGB(*GOLD)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(0.7 * inch, y, label)
        c.setFillColorRGB(*WHITE)
        c.setFont("Helvetica", 8)
        c.drawString(2.15 * inch, y, value)
        y -= 0.28 * inch

    c.setFillColorRGB(*NAVY)
    c.roundRect(0.5 * inch, 3.25 * inch, 7.5 * inch, 1.10 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*GOLD)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 4.08 * inch, "DO NOT USE CBSS BANK DETAILS FOR OCEAN")
    c.setFillColorRGB(*WHITE)
    wrap(c, f"Page 4 is only the {money(CBSS)} CBSS pay instructions (box + inland round trip). Do not wire the ocean quote to Lead Bank / CBGC LLC.", 0.7 * inch, 3.82 * inch, 7.1 * inch, 11, "Helvetica", 8.5)

    c.setFillColorRGB(*CREAM)
    c.roundRect(0.5 * inch, 1.05 * inch, 7.5 * inch, 2.05 * inch, 6, fill=1, stroke=0)
    c.setFillColorRGB(*NAVY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(0.7 * inch, 2.85 * inch, "THIS WEEKEND · LOAD 2")
    c.setFillColorRGB(*INK)
    y = 2.62 * inch
    for step in [
        f"1. Pay {money(CBSS)} to CBSS on invoice CBS-2026-JP02 — {money(BOX)} for the box and {money(INLAND)} for the Minneapolis ↔ Williston round trip.",
        f"2. Hold the enclosed {money(OCEAN)} ocean quote until the carrier confirms. Do not pay pickup, drayage, or fuel to the ocean carrier.",
        "3. Confirm Williston is ready for inspection, packing, and a live load (two hours free).",
        "4. Send the packing list and the exact bill-of-lading names for Ashdod.",
    ]:
        y = wrap(c, step, 0.7 * inch, y, 7.1 * inch, 11, "Helvetica", 8.5)
    footer(c, "QUOTE-1858652", 7)
    c.save()


if __name__ == "__main__":
    import sys

    dest = sys.argv[1] if len(sys.argv) > 1 else "/opt/cursor/artifacts/jamie-palmer-packet/CBSS-Jamie-Palmer-Ashdod-Complete-Packet.pdf"
    write_pdf(dest)
    print(dest)
