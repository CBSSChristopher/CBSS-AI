import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { isApprovedPricingRequest, isValidManagerApprovalCode, parseApprovedCash } from "./approval.js";
import { jsonResponse, optionsResponse, readSession } from "./auth.js";
import {
  buildClientProposalCopy,
  notesHaveCostLeak,
  readClientOptions,
  sanitizeClientFacingText,
} from "./client-options.js";
import { clampNetMargin, customerCashTotal, isPickupFulfillment, MIN_NET_MARGIN } from "./container.js";

const MIN_MARGIN = MIN_NET_MARGIN;
const FROM_NAME = "CBShippingSolutions";
const FROM_EMAIL = "cbshippingsolutionsai@gmail.com";

function ownerEmail() {
  return ["christopher", "cbshippingsolutions.com"].join("@");
}

function internalRecipients() {
  return [
    { email: ownerEmail(), name: "Christopher Banks" },
    { email: "Bryan@cbshippingsolutions.com", name: "Bryan" },
  ];
}

async function ingestProposal(env, data, status) {
  const url = (env && env.CRM_INGEST_URL) || "";
  const secret = (env && env.CRM_INGEST_SECRET) || "";
  if (!url || !secret) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ingest-secret": secret },
      body: JSON.stringify({
        action: "ingestProposal",
        status,
        customerName: data.customerName,
        company: data.company,
        email: data.email,
        phone: data.phone,
        zip: data.zip,
        delivery: data.delivery,
        depot: data.depot,
        depotCity: data.depotCity,
        containerDesc: data.containerDesc,
        containerSize: data.containerSize,
        condition: data.condition,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        wholesaleCost: data.wholesaleCost,
        paymentMode: data.paymentMode,
        flexSelected: data.flexSelected,
        flexTermMonths: data.flexTermMonths,
        clientType: data.clientType,
        repName: data.repName,
        repEmail: data.repEmail,
        notes: data.notes || data.containerNotes,
        containerNotes: data.containerNotes,
        fulfillment: isPickupFulfillment(data.fulfillment) ? "pickup" : "deliver",
        approvedPricing: Boolean(data.approvedPricing),
        flagged: status === "flagged",
      }),
    });
    if (!res.ok) console.error("CRM ingest failed", res.status);
  } catch (err) {
    console.error("CRM ingest error", err.message);
  }
}

function calculateDeliveryFromData(data) {
  if (isPickupFulfillment(data && data.fulfillment)) return 0;
  const RATE_SHEET = {
    Midwest: { base: 475, perMile: 5 },
    "East Coast": { base: 600, perMile: 7 },
    "West Coast": { base: 600, perMile: 8 },
  };
  const SIZE_SURCHARGE = { "20ft": 0, "40ft": 125, Specialized: 200 };
  const region = data.region;
  const miles = parseFloat(data.miles) || 0;
  const size = data.containerSize || "40ft";
  if (!region || miles <= 0) return 0;
  const rates = RATE_SHEET[region];
  if (!rates) return 0;
  let fee = rates.base;
  if (miles > 100) fee += (miles - 100) * rates.perMile;
  fee += SIZE_SURCHARGE[size] || 0;
  return fee;
}

function applyEnv(env) {
  const keys = ["BREVO_API_KEY", "XAI_API_KEY", "CRM_INGEST_SECRET", "CRM_INGEST_URL", "AUTH_SECRET"];
  if (typeof process !== "undefined" && process.env) {
    for (const k of keys) {
      if (env[k] && !process.env[k]) process.env[k] = env[k];
    }
  }
}

async function generateProposalWithGrok(data) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY missing");
  const isResidential = data.clientType === "Residential";
  const tone = isResidential
    ? "clean, clear, approachable, and confidence-building for a residential customer"
    : "formal, detailed, and professional for a commercial client";
  const systemPrompt = `You are the proposal writing engine for CBShippingSolutions, owned by Christopher Banks (Corning, AR).
Company style: Transparent pricing, reliable delivery, straightforward American small-business voice. Family-owned, direct depot sourcing.
Never invent pricing. Use only the numbers given.
Write in a ${tone} style.
The cash figure you are given is the complete cash price. Do not add freight, miles, depot cost, a delivery line, or a pickup fee on top of it. Do not name depots or rate sheets.

Key company facts you must respect:
- Used units (As-Is, WWT, CW, Multi-trip): 5-year structural + 5-year no-leak warranty
- One-Trip units: 10-year structural + 10-year no-leak warranty
- Every unit is air/water leak tested and inspected before it leaves the depot
- If a repair is needed, we send a welder for a proper repair (within reason) instead of just a fiberglass patch

Return ONLY valid JSON with these keys:
{
  "intro": "2-4 sentence personalized opening letter",
  "whatToExpect": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
  "deliveryNotes": ["note 1", "note 2", "note 3"],
  "closing": "1-2 sentence confident next-steps closing"
}
Keep language professional and natural. Do not include markdown.`;
  let flexLine = "";
  if (data.flexSelected === true || data.flexSelected === "true") {
    flexLine = `
Payment Option: Flex Buy Financing
Term: ${data.flexTermMonths} months
APR: ${(parseFloat(data.flexApr || 0) * 100).toFixed(0)}%
Monthly Payment: $${parseFloat(data.flexMonthlyPayment || 0).toFixed(2)}
Upfront due: $${parseFloat(data.flexUpfront || 0).toFixed(2)}
Amount Financed: $${parseFloat(data.flexAmountFinanced || 0).toFixed(2)}`;
  } else {
    flexLine = "\nPayment Option: Cash / Full Payment";
  }
  const copy = buildClientProposalCopy(data);
  const optionBlock = copy.chooseOne
    ? `This is ONE proposal with alternate options. The customer picks ONE option. Do not add the cash prices together.
${copy.optionCards.map((card) => `Option ${card.letter}: ${card.title} · qty ${card.qty}${card.depotCity ? " · depot " + card.depotCity : ""} · ${card.cashLabel} · ${copy.options.find((o) => o.letter === card.letter)?.warranty || ""}`).join("\n")}`
    : `Container: ${sanitizeClientFacingText(data.containerDesc)}
Quantity: ${data.quantity}
${isPickupFulfillment(data.fulfillment)
    ? `Pickup cash price (each): $${data.unitPrice}
This is depot pickup. The customer collects the container at the depot city. Do not add weekday delivery. Do not add a pickup fee.`
    : `Delivered cash price (each): $${data.unitPrice}
This price already includes standard weekday delivery. Do not add a delivery charge.`}`;
  const userPrompt = `Create proposal content for:
Client Type: ${data.clientType}
Customer: ${data.customerName}${data.company ? " / " + data.company : ""}
${optionBlock}
${isPickupFulfillment(data.fulfillment) ? `Pickup location: ${data.delivery}` : `Delivery Location: ${data.delivery}`}
Client-safe notes: ${copy.notes || "None"}
Do not mention wholesale, posted price, delivery fee, margin, or a buy-both total.
${flexLine}`;
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "grok-4.5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    }),
  });
  if (!res.ok) throw new Error(`Grok API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || "";
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON returned from Grok");
  return JSON.parse(match[0]);
}

async function sendBrevoEmail({ to, subject, htmlContent, textContent, attachment }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY missing");
  const payload = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to,
    subject,
    htmlContent,
    textContent,
    replyTo: { email: FROM_EMAIL, name: "CBShippingSolutions" },
  };
  if (attachment) payload.attachment = [{ name: attachment.name, content: attachment.content }];
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { accept: "application/json", "api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function generateClientPDF(data, aiContent) {
  const copy = buildClientProposalCopy(data);
  const pdfDoc = await PDFDocument.create();
  const pageSize = [612, 792];
  let page = pdfDoc.addPage(pageSize);
  let { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const footerH = 42;
  const navy = rgb(0.08, 0.12, 0.18);
  const accent = rgb(0.12, 0.31, 0.47);
  const green = rgb(0.05, 0.42, 0.22);
  const draw = (text, x, yPos, size = 11, bold = false, color = rgb(0.12, 0.12, 0.12)) => {
    page.drawText(String(text || ""), { x, y: yPos, size, font: bold ? fontBold : font, color });
  };
  const wrap = (text, maxChars = 85) => {
    const words = String(text || "").split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  const paintHeader = () => {
    page.drawRectangle({ x: 0, y: height - 88, width, height: 88, color: navy });
    draw("CB SHIPPING SOLUTIONS", margin, height - 36, 18, true, rgb(1, 1, 1));
    draw("Shipping Containers  |  Since 2023", margin, height - 54, 10, false, rgb(0.75, 0.8, 0.85));
    const rightTag = (text, yPos) => {
      const tw = font.widthOfTextAtSize(text, 10);
      draw(text, width - margin - tw, yPos, 10, false, rgb(0.92, 0.94, 0.96));
    };
    rightTag("Transparent Pricing", height - 36);
    rightTag("Reliable Delivery", height - 54);
  };
  const paintFooter = (target) => {
    target.drawRectangle({ x: 0, y: 0, width, height: footerH, color: navy });
    target.drawText("CBShippingSolutions  |  Transparent Pricing  |  Reliable Delivery", {
      x: margin, y: 24, size: 9, font, color: rgb(0.85, 0.88, 0.92),
    });
    target.drawText("US Roots. Global Reach. Unbreakable Solutions.", {
      x: margin, y: 10, size: 8, font, color: rgb(0.65, 0.7, 0.75),
    });
  };
  const newPage = () => {
    paintFooter(page);
    page = pdfDoc.addPage(pageSize);
    ({ width, height } = page.getSize());
    paintHeader();
    return height - 115;
  };
  const ensureSpace = (need) => {
    if (y - need < footerH + 16) y = newPage();
  };
  paintHeader();
  let y = height - 115;
  draw("CONTAINER PROPOSAL", margin, y, 15, true, accent);
  y -= 24;
  draw("PREPARED FOR", margin, y, 9, true, accent);
  y -= 15;
  draw(`${data.customerName}${data.company ? "  |  " + data.company : ""}`, margin, y, 12, true);
  y -= 14;
  draw(`Phone: ${data.phone || "-"}   |   Email: ${data.email || "-"}`, margin, y, 10);
  y -= 22;
  if (aiContent && aiContent.intro) {
    ensureSpace(40);
    draw("PROJECT OVERVIEW", margin, y, 11, true, accent);
    y -= 16;
    for (const line of wrap(sanitizeClientFacingText(aiContent.intro), 92)) {
      ensureSpace(16);
      draw(line, margin, y, 10);
      y -= 13;
    }
    y -= 10;
  }
  ensureSpace(28);
  draw(copy.heading, margin, y, 11, true, accent);
  y -= 16;
  if (copy.chooseOne) {
    const cards = copy.optionCards;
    const gap = 14;
    const perRow = cards.length === 1 ? 1 : 2;
    const cardW = (width - margin * 2 - (perRow - 1) * gap) / perRow;
    const cardH = cards.length > 2 ? 156 : 168;
    const headerH = 22;
    for (let i = 0; i < cards.length; i += perRow) {
      const row = cards.slice(i, i + perRow);
      ensureSpace(cardH + 12);
      row.forEach((card, index) => {
        const x = margin + index * (cardW + gap);
        const top = y;
        page.drawRectangle({
          x,
          y: top - cardH + 16,
          width: cardW,
          height: cardH,
          color: rgb(0.93, 0.96, 0.99),
          borderColor: accent,
          borderWidth: 1,
        });
        page.drawRectangle({
          x,
          y: top - headerH + 16,
          width: cardW,
          height: headerH,
          color: navy,
        });
        draw(card.header, x + 8, top, 9, true, rgb(1, 1, 1));
        const badgeW = font.widthOfTextAtSize(card.badge, 8);
        draw(card.badge, x + cardW - badgeW - 8, top, 8, false, rgb(0.85, 0.9, 0.95));
        let by = top - 26;
        for (const bullet of card.bullets) {
          draw("-  " + bullet, x + 8, by, 8);
          by -= 12;
        }
        draw(card.cashLabel, x + 8, by - 2, 15, true, green);
        draw(card.cashSub, x + 8, by - 16, 8, false, rgb(0.35, 0.38, 0.42));
        draw(card.warranty, x + 8, by - 28, 8, false, rgb(0.35, 0.38, 0.42));
      });
      y -= cardH + 10;
    }
  } else {
    draw(sanitizeClientFacingText(data.containerDesc) || "Shipping Container", margin, y, 12, true);
    y -= 14;
    draw(`Quantity: ${copy.options[0].qty}`, margin, y, 10);
    y -= 13;
    if (copy.options[0].depotCity) {
      draw("Depot " + copy.options[0].depotCity, margin, y, 10);
      y -= 13;
    }
    if (copy.notes && !notesHaveCostLeak(copy.notes)) {
      draw(`Notes: ${copy.notes}`, margin, y, 10);
      y -= 13;
    }
    y -= 10;
  }
  if (!copy.chooseOne) {
    ensureSpace(40);
    draw("WHAT TO EXPECT", margin, y, 11, true, accent);
    y -= 15;
    const expect = aiContent && aiContent.whatToExpect
      ? aiContent.whatToExpect
      : getConditionExpectations(
        copy.optionCards.map((card) => card.title).join(" "),
        copy.notes,
      );
    for (const bullet of expect) {
      for (const line of wrap("-  " + sanitizeClientFacingText(bullet), 90)) {
        ensureSpace(16);
        draw(line, margin, y, 10);
        y -= 13;
      }
    }
    y -= 10;
  }
  const priceLines = copy.pricing;
  const priceBoxH = copy.chooseOne ? 36 + priceLines.length * 14 + 26 : 86;
  ensureSpace(priceBoxH + 12);
  page.drawRectangle({
    x: margin - 4,
    y: y - priceBoxH + 8,
    width: width - margin * 2 + 8,
    height: priceBoxH,
    color: rgb(1, 1, 1),
    borderColor: accent,
    borderWidth: 1.2,
  });
  draw("PRICING TERMS", margin, y, 11, true, accent);
  y -= 18;
  for (const line of priceLines) {
    draw(line, margin, y, 11);
    y -= 14;
  }
  if (copy.chooseOne && copy.chooseOneBar) {
    page.drawRectangle({
      x: margin - 4,
      y: y - 16,
      width: width - margin * 2 + 8,
      height: 22,
      color: rgb(0.93, 0.96, 0.99),
    });
    draw(copy.chooseOneBar, margin, y - 6, 9, true, green);
    y -= 28;
  } else if (!copy.chooseOne) {
    const grandTotal = customerCashTotal(copy.options[0].cash, copy.options[0].qty);
    y -= 2;
    draw("TOTAL INVESTMENT                 " + (copy.optionCards[0] && copy.optionCards[0].cashLabel ? copy.optionCards[0].cashLabel : "$" + grandTotal.toFixed(2)), margin, y, 12, true, green);
    y -= 20;
  } else {
    y -= 8;
  }
  ensureSpace(40);
  draw("PAYMENT TERMS", margin, y, 11, true, accent);
  y -= 15;
  const isFlex = data.flexSelected === true || data.flexSelected === "true";
  if (isFlex && data.flexTermMonths) {
    draw(`Flex Buy Financing Selected  -  ${data.flexTermMonths}-Month Term`, margin, y, 11, true, green);
    y -= 14;
    draw(`Upfront due:  $${parseFloat(data.flexUpfront || 0).toFixed(2)}`, margin, y, 10);
    y -= 13;
    draw(`Amount Financed:  $${parseFloat(data.flexAmountFinanced || 0).toFixed(2)}   |   APR: ${(parseFloat(data.flexApr || 0) * 100).toFixed(0)}%`, margin, y, 10);
    y -= 13;
    draw(`Monthly Payment:  $${parseFloat(data.flexMonthlyPayment || 0).toFixed(2)}`, margin, y, 11, true);
    y -= 14;
    draw("Remaining balance is paid in equal monthly installments over the selected term.", margin, y, 9);
    y -= 12;
    draw("We accept bank transfer, cashier's check, and major credit cards for the upfront amount.", margin, y, 9);
  } else if (data.clientType === "Residential") {
    draw(isPickupFulfillment(data.fulfillment)
      ? "Full payment is required before pickup is scheduled."
      : "Full payment is required before delivery is scheduled.", margin, y, 10);
    y -= 13;
    draw("We accept bank transfer, cashier's check, and major credit cards.", margin, y, 10);
  } else {
    draw(isPickupFulfillment(data.fulfillment)
      ? "Commercial terms: Deposit required to lock pricing and schedule pickup."
      : "Commercial terms: Deposit required to lock pricing and schedule delivery.", margin, y, 10);
    y -= 13;
    draw(isPickupFulfillment(data.fulfillment)
      ? "Remaining balance due prior to pickup."
      : "Remaining balance due prior to or upon delivery.", margin, y, 10);
  }
  y -= 18;
  ensureSpace(40);
  draw("WARRANTY & ASSURANCE", margin, y, 11, true, accent);
  y -= 15;
  for (const line of copy.warranties) {
    ensureSpace(16);
    draw(line, margin, y, 10);
    y -= 13;
  }
  ensureSpace(40);
  draw(isPickupFulfillment(data.fulfillment)
    ? "Every container is air/water leak tested and inspected before pickup."
    : "Every container is air/water leak tested and inspected before delivery.", margin, y, 10);
  y -= 13;
  draw("If a repair is ever needed, we send a welder for a proper repair (within reason)", margin, y, 10);
  y -= 12;
  draw("instead of a simple fiberglass patch.", margin, y, 10);
  y -= 18;
  ensureSpace(40);
  draw(isPickupFulfillment(data.fulfillment) ? "PICKUP INFORMATION" : "DELIVERY INFORMATION", margin, y, 11, true, accent);
  y -= 15;
  const dest = String(data.delivery || data.depotCity || "").trim();
  const delNotes = aiContent && aiContent.deliveryNotes ? aiContent.deliveryNotes : (
    copy.chooseOne
      ? [
          dest
            ? (isPickupFulfillment(data.fulfillment)
              ? "Pickup at " + dest + "."
              : "Delivery to " + dest + ".")
            : (isPickupFulfillment(data.fulfillment) ? "Depot pickup." : "Delivered to the site on this proposal."),
          isPickupFulfillment(data.fulfillment)
            ? "This is depot pickup. Weekday delivery is not included."
            : "Weekday delivery is included in the cash price.",
        ]
      : (isPickupFulfillment(data.fulfillment)
        ? [
            "This is a depot pickup. The customer collects the container at the depot city.",
            "Standard weekday delivery is not included.",
            "Bring a truck and trailer that can take this container.",
            "Confirm pickup hours with the office before you go.",
          ]
        : [
            "Site must be accessible by standard delivery truck and trailer.",
            "A clear, level area is required for safe off-loading.",
            "Customer is responsible for any required permits or site preparation.",
            "Delivery windows are scheduled in advance - please ensure someone is on site.",
          ])
  );
  for (const note of delNotes) {
    for (const line of wrap("-  " + note, 90)) {
      ensureSpace(16);
      draw(line, margin, y, 10);
      y -= 13;
    }
  }
  y -= 12;
  ensureSpace(40);
  draw("NEXT STEPS", margin, y, 11, true, accent);
  y -= 15;
  const closingText = aiContent && aiContent.closing
    ? aiContent.closing
    : (isPickupFulfillment(data.fulfillment)
      ? "When you are ready, reply to confirm and we will lock in your container and pickup."
      : "When you are ready, reply to confirm and we will lock in your container and delivery schedule.");
  for (const line of wrap(closingText, 90)) {
    ensureSpace(16);
    draw(line, margin, y, 10);
    y -= 13;
  }
  paintFooter(page);
  return pdfDoc.save();
}

function getConditionExpectations(desc = "", notes = "") {
  const text = `${desc} ${notes}`.toLowerCase();
  if (text.includes("cargo worthy") || text.includes("cw")) {
    return [
      "Cargo Worthy units are structurally sound and suitable for transport.",
      "Expect normal wear from previous use - minor surface rust and dents are common.",
      "Floors, walls, and doors are functional and weather-resistant.",
      "Ideal for storage, shipping, or conversion projects.",
    ];
  }
  if (text.includes("wind") || text.includes("water") || text.includes("wwt")) {
    return [
      "Wind & Water Tight units provide solid weather protection.",
      "Suitable for long-term storage and most conversion uses.",
      "May show cosmetic wear while remaining structurally sound.",
      "Doors seal properly and the structure remains intact.",
    ];
  }
  return [
    "Unit is in good working condition for the stated grade.",
    "Normal cosmetic wear from previous service is expected.",
    "Structure, doors, and weather sealing are functional.",
  ];
}

async function generateInternalPDF(data, deliveryPer, marginPer) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  let y = height - 40;
  const draw = (text, x, yPos, size = 11, bold = false, color = rgb(0.12, 0.12, 0.12)) => {
    page.drawText(String(text || "").substring(0, 90), { x, y: yPos, size, font: bold ? fontBold : font, color });
  };
  page.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: rgb(0.12, 0.31, 0.47) });
  draw("CBShippingSolutions - INTERNAL", margin, height - 38, 16, true, rgb(1, 1, 1));
  draw("Full Proposal Details + Margin", margin, height - 55, 10, false, rgb(0.85, 0.9, 0.95));
  y = height - 100;
  draw(`Sales Rep: ${data.repName}  <${data.repEmail}>`, margin, y, 11, true);
  y -= 20;
  draw("CUSTOMER", margin, y, 11, true, rgb(0.12, 0.31, 0.47));
  y -= 15;
  draw(`${data.customerName}${data.company ? " / " + data.company : ""}`, margin, y);
  y -= 13;
  draw(`Phone: ${data.phone}  |  Email: ${data.email}`, margin, y);
  y -= 13;
  draw(`${isPickupFulfillment(data.fulfillment) ? "Pickup" : "Delivery"}: ${data.delivery}`, margin, y);
  y -= 20;
  draw("CONTAINER & COSTS", margin, y, 11, true, rgb(0.12, 0.31, 0.47));
  y -= 15;
  draw(data.containerDesc, margin, y, 11, true);
  y -= 13;
  draw(`Depot city: ${data.depotCity || ""}`, margin, y);
  y -= 13;
  draw(`Purchasing yard: ${data.depot || ""}`, margin, y);
  y -= 14;
  draw(`Qty: ${data.quantity}  |  Wholesale: $${Number(data.wholesaleCost).toFixed(2)}  |  ${isPickupFulfillment(data.fulfillment) ? "Pickup" : "Delivered"} cash: $${Number(data.unitPrice).toFixed(2)}`, margin, y);
  y -= 13;
  const internalOptions = readClientOptions(data);
  if (internalOptions.chooseOne) {
    draw("OPTIONS (client picks one)", margin, y, 11, true, rgb(0.12, 0.31, 0.47));
    y -= 14;
    for (const option of internalOptions.options) {
      draw(`Option ${option.letter} ${option.label}  cash $${Number(option.cash).toFixed(2)}  posted $${Number(option.wholesale).toFixed(2)}  delivery $${Number(option.delivery).toFixed(2)}`, margin, y, 10);
      y -= 13;
    }
  }
  if (data.approvedPricing) {
    draw("Christopher approved pricing", margin, y, 11, true, rgb(0.12, 0.31, 0.47));
    y -= 13;
  }
  y -= 18;
  if (isPickupFulfillment(data.fulfillment)) {
    draw("INTERNAL PICKUP (no delivery in cash price)", margin, y, 11, true, rgb(0.12, 0.31, 0.47));
    y -= 15;
    draw(`Depot city pickup. Delivery is $0.00. Do not add a pickup fee.`, margin, y, 11, true);
  } else {
    draw("INTERNAL DELIVERY (already inside cash price)", margin, y, 11, true, rgb(0.12, 0.31, 0.47));
    y -= 15;
    draw(`Region: ${data.region}  |  Miles: ${data.miles}  |  Size: ${data.containerSize}`, margin, y);
    y -= 13;
    draw(`Delivery already included: $${Number(deliveryPer).toFixed(2)}  (do not add again)`, margin, y, 11, true);
  }
  y -= 22;
  const totalSell = customerCashTotal(data.unitPrice, data.quantity).toFixed(2);
  const totalMargin = (parseFloat(data.quantity || 1) * marginPer).toFixed(2);
  page.drawRectangle({
    x: margin - 4,
    y: y - 55,
    width: width - margin * 2 + 8,
    height: 62,
    color: rgb(0.94, 0.97, 1),
    borderColor: rgb(0.7, 0.82, 0.95),
    borderWidth: 1,
  });
  draw("MARGIN SUMMARY", margin, y, 11, true);
  y -= 16;
  draw(`Total Selling: $${totalSell}   |   Net Margin/unit: $${marginPer.toFixed(2)}`, margin, y);
  y -= 14;
  draw(`Total Net Margin: $${totalMargin}`, margin, y, 12, true, rgb(0.05, 0.45, 0.2));
  page.drawText("INTERNAL USE ONLY - Do not forward to customer", {
    x: margin,
    y: 28,
    size: 9,
    font,
    color: rgb(0.6, 0.2, 0.2),
  });
  return pdfDoc.save();
}

function buildSalesRepHtml(data) {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
    <div style="background:#1F4E79;color:white;padding:18px 22px;border-radius:8px 8px 0 0;">
      <h2 style="margin:0;font-size:17px;">Your Client Proposal is Ready</h2>
    </div>
    <div style="border:1px solid #e0e6ed;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
      <p>Hi ${data.repName},</p>
      <p>The client-ready proposal for <strong>${data.customerName}</strong> is attached. You can forward it directly.</p>
      <p style="font-size:13px;color:#666;">${isPickupFulfillment(data.fulfillment) ? "The cash figure is depot pickup. Do not add a pickup fee or a delivery line." : "The cash figure is delivered. Do not add a delivery line."}</p>
    </div>
  </div>`;
}

function buildInternalHtml(data, marginPer, deliveryPer) {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
    <div style="background:#1F4E79;color:white;padding:18px 22px;border-radius:8px 8px 0 0;">
      <h2 style="margin:0;font-size:17px;">Internal Proposal Copy</h2>
    </div>
    <div style="border:1px solid #e0e6ed;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
      <p><strong>Rep:</strong> ${data.repName} (${data.repEmail})</p>
      <p><strong>Customer:</strong> ${data.customerName}</p>
      <p><strong>Container:</strong> ${data.containerDesc} x ${data.quantity}</p>
      <p><strong>Depot city:</strong> ${data.depotCity || ""}</p>
      <p><strong>Purchasing yard:</strong> ${data.depot || ""}</p>
      <p><strong>${isPickupFulfillment(data.fulfillment) ? "Pickup cash" : "Delivered cash"}:</strong> $${Number(data.unitPrice).toFixed(2)} &nbsp;|&nbsp; <strong>Margin/unit:</strong> $${marginPer.toFixed(2)}</p>
      ${data.approvedPricing ? "<p><strong>Christopher approved pricing</strong></p>" : ""}
      <p><strong>${isPickupFulfillment(data.fulfillment) ? "Pickup — delivery is $0.00. Do not add a pickup fee." : `Delivery already inside that cash price: $${Number(deliveryPer).toFixed(2)}`}</strong></p>
    </div>
  </div>`;
}

function buildLowMarginHtml(data, marginPer) {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
    <div style="background:#b42318;color:white;padding:18px 22px;border-radius:8px 8px 0 0;">
      <h2 style="margin:0;font-size:17px;">LOW MARGIN FLAG</h2>
    </div>
    <div style="border:1px solid #e0e6ed;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
      <p><strong>Rep:</strong> ${data.repName}</p>
      <p><strong>Customer:</strong> ${data.customerName}</p>
      <p style="color:#b42318;font-weight:700;">Margin/unit: $${marginPer.toFixed(2)} (below $300)</p>
      <p>No proposal was sent to the sales rep.</p>
    </div>
  </div>`;
}

function sanitizeFilename(name) {
  return String(name || "Customer").replace(/[^a-z0-9]/gi, "_").substring(0, 40);
}

export function resolveProposalPricing(data, env) {
  const { options, chooseOne } = readClientOptions(data);
  const wholesale = parseFloat(data && data.wholesaleCost) || (options[0] && options[0].wholesale) || 0;
  const deliveryPer = isPickupFulfillment(data && data.fulfillment)
    ? 0
    : (parseFloat(data && data.deliveryCost) || (options[0] && options[0].delivery) || calculateDeliveryFromData(data));
  const approved = isApprovedPricingRequest(data);
  if (approved) {
    if (!isValidManagerApprovalCode(data && data.managerApprovalCode, env)) {
      return { ok: false, status: 403, error: "Manager approval code required for Christopher approved pricing." };
    }
    const sell = parseApprovedCash(data && data.unitPrice);
    if (sell == null) {
      return { ok: false, status: 400, error: "Approved cash price must be a number greater than 0." };
    }
    return {
      ok: true,
      approved: true,
      skipLowMargin: true,
      isLowMargin: false,
      sell,
      wholesale,
      deliveryPer,
      marginPer: sell - wholesale - deliveryPer,
      chooseOne,
    };
  }
  const sell = parseFloat(data && data.unitPrice) || (options[0] && options[0].cash) || 0;
  const marginPer = sell - wholesale - deliveryPer;
  const optionLow = options.some((option) => {
    const haul = option.fulfillment === "pickup" ? 0 : (option.delivery || 0);
    return option.wholesale > 0 && (option.cash - option.wholesale - haul) < MIN_MARGIN;
  });
  return {
    ok: true,
    approved: false,
    skipLowMargin: false,
    isLowMargin: chooseOne ? optionLow : marginPer < MIN_MARGIN,
    sell,
    wholesale,
    deliveryPer,
    marginPer,
    chooseOne,
  };
}

async function handleSubmit(event, env) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    if (!event._user) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    const data = JSON.parse(event.body || "{}");
    Object.keys(data).forEach((key) => {
      if (typeof data[key] === "string") {
        data[key] = data[key]
          .replace(/→/g, "->")
          .replace(/←/g, "<-")
          .replace(/[“”]/g, '"')
          .replace(/[‘’]/g, "'")
          .replace(/–|—/g, "-")
          .replace(/[^\x00-\x7F]/g, "");
      }
    });
    data.containerNotes = sanitizeClientFacingText(data.containerNotes);
    data.notes = sanitizeClientFacingText(data.notes);
    if (notesHaveCostLeak(data.containerNotes)) data.containerNotes = "";
    if (notesHaveCostLeak(data.notes)) data.notes = "";
    if (!data.repEmail || !data.repName || !data.customerName || !data.unitPrice) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
    }
    const priced = resolveProposalPricing(data, env);
    if (!priced.ok) {
      return { statusCode: priced.status, body: JSON.stringify({ error: priced.error }) };
    }
    const deliveryPer = priced.deliveryPer;
    const marginPer = priced.marginPer;
    data.unitPrice = priced.sell;
    data.wholesaleCost = priced.wholesale;
    data.approvedPricing = priced.approved;
    delete data.managerApprovalCode;
    data.netMargin = priced.approved ? marginPer : clampNetMargin(data.netMargin || marginPer);
    const isLowMargin = priced.isLowMargin;
    if (isLowMargin) {
      await sendBrevoEmail({
        to: internalRecipients(),
        subject: `LOW MARGIN FLAG - ${data.customerName} (Rep: ${data.repName})`,
        htmlContent: buildLowMarginHtml(data, marginPer),
        textContent: `Low margin flag for ${data.customerName}. Margin: $${marginPer.toFixed(2)}`,
      });
      await ingestProposal(env, data, "flagged");
      return { statusCode: 200, body: JSON.stringify({ status: "flagged" }) };
    }
    let aiContent = null;
    try {
      aiContent = await generateProposalWithGrok(data);
    } catch (aiErr) {
      console.error("Grok generation failed, falling back to template:", aiErr.message);
    }
    const clientPdfBytes = await generateClientPDF(data, aiContent);
    const internalPdfBytes = await generateInternalPDF(data, deliveryPer, marginPer);
    const clientBase64 = Buffer.from(clientPdfBytes).toString("base64");
    const internalBase64 = Buffer.from(internalPdfBytes).toString("base64");
    await sendBrevoEmail({
      to: [{ email: data.repEmail, name: data.repName }],
      subject: `Your Proposal is Ready - ${data.customerName} | ${data.containerDesc}`,
      htmlContent: buildSalesRepHtml(data),
      textContent: `Client-ready proposal for ${data.customerName} is attached.`,
      attachment: { name: `CBSS_Proposal_${sanitizeFilename(data.customerName)}.pdf`, content: clientBase64 },
    });
    await sendBrevoEmail({
      to: internalRecipients(),
      subject: `Internal Copy - ${data.customerName} | ${data.approvedPricing ? "Approved pricing" : `Margin $${marginPer.toFixed(0)}`} | Rep: ${data.repName}`,
      htmlContent: buildInternalHtml(data, marginPer, deliveryPer),
      textContent: `Internal details for ${data.customerName}. Margin: $${marginPer.toFixed(2)}`,
      attachment: { name: `INTERNAL_${sanitizeFilename(data.customerName)}.pdf`, content: internalBase64 },
    });
    await ingestProposal(env, data, "sent");
    return { statusCode: 200, body: JSON.stringify({ status: "sent" }) };
  } catch (err) {
    console.error("submit-proposal error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", message: err.message || "Unknown error" }) };
  }
}

export async function handleSubmitProposal(request, env) {
  if (request.method === "OPTIONS") return optionsResponse(request);
  const user = await readSession(request, env);
  const body = request.method === "GET" ? "" : await request.text();
  applyEnv(env);
  const result = await handleSubmit({
    httpMethod: request.method,
    headers: Object.fromEntries(request.headers),
    body,
    _user: user,
  }, env);
  return jsonResponse(request, result.statusCode || 200, JSON.parse(result.body || "{}"));
}
