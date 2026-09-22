/** Client-facing proposal options. Never put posted/delivery dollars on the PDF. */

export function sanitizeClientFacingText(text) {
  let s = String(text == null ? "" : text);
  if (!s) return "";
  s = s.replace(/\bposted\s+\$?[\d,]+(?:\.\d+)?/gi, "");
  s = s.replace(/\bwholesale\s+\$?[\d,]+(?:\.\d+)?/gi, "");
  s = s.replace(/\bdelivery\s+\$?[\d,]+(?:\.\d+)?/gi, "");
  s = s.replace(/\bmargin\s+\$?[\d,]+(?:\.\d+)?/gi, "");
  s = s.replace(/\s*·\s*·+/g, " · ");
  s = s.replace(/[ \t]{2,}/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.replace(/^[ ·]+|[ ·]+$/g, "").trim();
}

export function notesHaveCostLeak(text) {
  const s = String(text == null ? "" : text);
  return /\bposted\b/i.test(s) || /\bdelivery\s+\$?\d/i.test(s) || /\bwholesale\b/i.test(s);
}

export function optionLetter(index) {
  return String.fromCharCode(65 + Math.max(0, Number(index) || 0));
}

export function normalizeGrade(grade) {
  const n = String(grade || "").toLowerCase().replace(/[\s_\-/().]/g, "");
  if (n === "cw" || n.includes("cargo")) return "CW";
  if (n === "wwt" || n.includes("wind") || n.includes("water")) return "WWT";
  if (n.includes("onetrip") || n === "new") return "OneTrip";
  if (n.includes("iicl") || n.includes("multi")) return "IICL";
  if (n.includes("asis")) return "AsIs";
  return String(grade || "").trim() || "CW";
}

export function gradeLabel(grade) {
  const key = normalizeGrade(grade);
  if (key === "CW") return "Cargo Worthy";
  if (key === "WWT") return "Wind & Water Tight";
  if (key === "OneTrip") return "One-Trip";
  if (key === "IICL") return "IICL / Multi-Trip";
  if (key === "AsIs") return "As-Is";
  return String(grade || "Container").trim() || "Container";
}

export function warrantyForGrade(grade) {
  return normalizeGrade(grade) === "OneTrip"
    ? "10-year structural + 10-year no-leak"
    : "5-year structural + 5-year no-leak";
}

export function warrantyBody(warranty, grade) {
  const raw = String(warranty || warrantyForGrade(grade) || "").trim();
  return raw.replace(/\s+warranty\.?$/i, "").trim() || warrantyForGrade(grade);
}

export function optionsHeading(count) {
  const n = Math.max(0, Number(count) || 0);
  if (n <= 1) return "ONE OPTION";
  if (n === 2) return "TWO OPTIONS";
  if (n === 3) return "THREE OPTIONS";
  return "YOUR OPTIONS";
}

export function gradeBadge(grade) {
  const key = normalizeGrade(grade);
  if (key === "CW") return "Used CW";
  if (key === "WWT") return "Used WWT";
  if (key === "OneTrip") return "One-Trip";
  if (key === "IICL") return "IICL";
  if (key === "AsIs") return "As-Is";
  return key;
}

export function formatCash(value) {
  const n = Number(value) || 0;
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function cashTimesQty(unitPrice, quantity = 1) {
  const sell = Number(unitPrice) || 0;
  const qty = Math.max(1, Number(quantity) || 1);
  return Math.round(sell * qty * 100) / 100;
}

/** Drop a trailing / glued qty so `OneTrip × 2` or `OneTrip 2` never becomes the title. */
export function stripGluedQty(text, qty) {
  const n = Math.max(1, Number(qty) || 1);
  const raw = String(text == null ? "" : text);
  if (!raw || n <= 1) return raw;
  return raw
    .split("\n")
    .map((line) => {
      let s = line;
      s = s.replace(new RegExp("\\s*[×xX]\\s*" + n + "(?=\\s*(?:·|$|depot\\b))", "gi"), "");
      s = s.replace(new RegExp("(?<=\\w)\\s+" + n + "(?=\\s*(?:·|$|depot\\b))", "g"), "");
      return s.replace(/[ \t]{2,}/g, " ").replace(/\s+·/g, " ·").trim();
    })
    .join("\n")
    .trim();
}

export function clientDetailsTitle(option, fallbackDesc) {
  const cleaned = stripGluedQty(fallbackDesc, option && option.qty);
  if (cleaned) return cleaned;
  const height = option && option.height === "HC"
    ? "high cube"
    : option && option.height === "DC"
      ? "standard"
      : String((option && option.height) || "").trim();
  return [option && option.size ? option.size + " ft" : "", height, (option && (option.configLabel || option.config)) || "", (option && option.grade) || ""]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function optionBullets(option, pickup) {
  const grade = normalizeGrade(option.grade);
  const inspect = grade === "OneTrip"
    ? "Wind- and water-tight, residential ready"
    : grade === "WWT"
      ? "Wind- and water-tight storage"
      : "Fully inspected & leak-tested";
  return [
    optionTitle(option),
    "Qty " + option.qty + (option.depotCity ? " · depot " + option.depotCity : ""),
    inspect,
    "Welder repair (within reason), not a patch",
  ];
}

export function depotCityOnly(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (!s) return "";
  const tail = s.match(/([A-Za-z .'-]+,\s*[A-Z]{2})\s*$/);
  if (tail) return tail[1].replace(/\s+/g, " ").trim();
  return s.replace(/\s+/g, " ");
}

function moneyNum(value) {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function heightWord(height) {
  if (height === "HC") return "high cube";
  if (height === "DC") return "standard";
  return String(height || "").trim();
}

export function optionTitle(option) {
  const size = option.size ? option.size + " ft" : "";
  const height = heightWord(option.height);
  const config = option.configLabel && option.configLabel !== "Standard" ? option.configLabel : "";
  return [size, height, config, option.label || gradeLabel(option.grade)].filter(Boolean).join(" ");
}

export function readClientOptions(data) {
  const raw = data && Array.isArray(data.options) ? data.options : [];
  const options = raw.map((row, index) => {
    if (!row || typeof row !== "object") return null;
    const cash = moneyNum(row.cash ?? row.unitPrice);
    if (cash <= 0) return null;
    const grade = normalizeGrade(row.grade || row.condition || row.label || "");
    const qty = Math.max(1, Number(row.qty ?? row.quantity) || 1);
    return {
      letter: String(row.letter || optionLetter(index)),
      label: String(row.label || gradeLabel(grade)),
      size: String(row.size || "").replace(/ft$/i, "").trim(),
      height: String(row.height || ""),
      config: String(row.config || "standard"),
      configLabel: String(row.configLabel || "Standard"),
      grade,
      qty,
      cash,
      depotCity: depotCityOnly(row.depotCity || row.city || row.depot || data.depotCity || ""),
      warranty: String(row.warranty || warrantyForGrade(grade)),
      fulfillment: String(row.fulfillment || data.fulfillment || "deliver") === "pickup" ? "pickup" : "deliver",
      notes: sanitizeClientFacingText(row.notes || ""),
      wholesale: moneyNum(row.wholesale ?? row.wholesaleCost),
      delivery: moneyNum(row.delivery ?? row.deliveryCost),
      margin: moneyNum(row.margin ?? row.netMargin),
    };
  }).filter(Boolean);

  if (options.length) {
    return {
      options,
      chooseOne: options.length >= 2 || data.chooseOne === true,
    };
  }

  const cash = moneyNum(data && data.unitPrice);
  const qty = Math.max(1, Number(data && data.quantity) || 1);
  const desc = String((data && data.containerDesc) || "Shipping Container");
  const gradeGuess = /one[\s-]*trip/i.test(desc + " " + ((data && data.containerNotes) || ""))
    ? "OneTrip"
    : /wwt|wind/i.test(desc) ? "WWT" : "CW";
  return {
    options: [{
      letter: "A",
      label: gradeLabel(data && data.condition ? data.condition : gradeGuess),
      size: String((data && data.containerSize) || "").replace(/ft$/i, "").trim(),
      height: "",
      config: "standard",
      configLabel: "Standard",
      grade: normalizeGrade((data && data.condition) || gradeGuess),
      qty,
      cash,
      depotCity: depotCityOnly(data && (data.depotCity || data.depot)),
      warranty: warrantyForGrade((data && data.condition) || gradeGuess),
      fulfillment: String((data && data.fulfillment) || "deliver") === "pickup" ? "pickup" : "deliver",
      notes: sanitizeClientFacingText(data && data.containerNotes),
      wholesale: moneyNum(data && data.wholesaleCost),
      delivery: moneyNum(data && data.deliveryCost),
      margin: moneyNum(data && data.netMargin),
    }],
    chooseOne: false,
  };
}

export function buildClientProposalCopy(data) {
  const { options, chooseOne } = readClientOptions(data);
  const pickup = String((data && data.fulfillment) || "") === "pickup"
    || options.every((option) => option.fulfillment === "pickup");
  const cashWord = pickup ? "Pickup cash" : "Delivered cash";
  const includeWord = pickup ? "depot pickup · no delivery fee" : "weekday delivery included";
  const buyAllQty = Math.max(1, Number(options[0].qty) || 1);
  const buyAllTotal = cashTimesQty(options[0].cash, buyAllQty);
  const pricing = chooseOne
    ? options.map((option) => (
      "Option " + option.letter + " - " + (option.size ? option.size + " ft " : "") + option.label + " (each) ... " + formatCash(option.cash)
    ))
    : [
      cashWord + " price (each)     " + formatCash(options[0].cash),
      "Quantity " + buyAllQty,
      pickup
        ? "This is depot pickup. Delivery is not included. Do not add a pickup fee."
        : "Standard weekday delivery is already included.",
    ];
  const warranties = chooseOne
    ? options.map((option) => option.label + " carries a " + warrantyBody(option.warranty, option.grade) + " warranty.")
    : ["This unit carries a " + warrantyBody(options[0].warranty, options[0].grade) + " warranty."];

  return {
    options,
    chooseOne,
    heading: chooseOne ? optionsHeading(options.length) : "CONTAINER DETAILS",
    chooseOneBar: chooseOne
      ? "Choose one option - total is the delivered cash price for that unit."
      : "",
    optionCards: options.map((option) => ({
      letter: option.letter,
      header: "Option " + option.letter + " - " + option.label,
      badge: gradeBadge(option.grade),
      title: optionTitle(option),
      qty: option.qty,
      depotCity: option.depotCity,
      bullets: optionBullets(option, pickup),
      warranty: "Warranty: " + option.warranty,
      cash: option.cash,
      cashLabel: formatCash(option.cash),
      cashSub: cashWord + " · " + includeWord,
    })),
    detailsTitle: clientDetailsTitle(options[0], data && data.containerDesc),
    notes: sanitizeClientFacingText(chooseOne ? (data && data.containerNotes) : stripGluedQty(data && data.containerNotes, buyAllQty)),
    extraNotes: sanitizeClientFacingText(data && data.notes),
    pricing,
    totalCash: chooseOne ? options[0].cash : buyAllTotal,
    totalLabel: formatCash(chooseOne ? options[0].cash : buyAllTotal),
    warranties,
    chooseOneHint: chooseOne ? "The customer picks one option." : "",
  };
}
