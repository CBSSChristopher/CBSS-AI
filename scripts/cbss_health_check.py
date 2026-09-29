#!/usr/bin/env python3
"""CBSS live connection and Container Exchange posted-price checks.

Never invent a price. Fail closed if the source did not post a wholesale number.
Do not complete live follow-ups or write invented notes.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.cookiejar import CookieJar

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
CRM = "https://cbsscrm.cbss.workers.dev"
DESK = "https://cbssbrain.cbss.workers.dev"
PROPOSAL = "https://cbsscompletetool.cbss.workers.dev"
PAY = "https://cbsspay.cbss.workers.dev"


def utc_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def opener():
    cj = CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj)), cj


def call(op, url, method="GET", data=None, headers=None, timeout=45):
    hdr = {"User-Agent": UA}
    if headers:
        hdr.update(headers)
    req = urllib.request.Request(url, data=data, headers=hdr, method=method)
    try:
        with op.open(req, timeout=timeout) as res:
            body = res.read()
            return res.status, dict(res.headers), body
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


def login(op, origin, email, password):
    status, _, body = call(
        op,
        origin + "/auth/login",
        "POST",
        json.dumps({"email": email, "password": password}).encode(),
        {"Content-Type": "application/json"},
    )
    try:
        payload = json.loads(body.decode() or "{}")
    except Exception:
        payload = {"raw": body[:200].decode("utf-8", "replace")}
    return status, payload


def check_systems(email, password):
    out = {"checkedAt": utc_now(), "mode": "systems", "ok": True, "tools": {}}

    # CRM
    op, _ = opener()
    st, loginj = login(op, CRM, email, password)
    crm = {"login": st, "email": loginj.get("email"), "ok": st == 200 and loginj.get("ok") is True}
    st, hdr, body = call(op, CRM + "/crm-data?action=get&omitNotes=1")
    try:
        data = json.loads(body)
        crm.update(
            {
                "data": st,
                "crmBuild": data.get("crmBuild"),
                "contacts": len(data.get("contacts") or []),
                "deals": len(data.get("deals") or []),
                "followups": len(data.get("followups") or {}),
            }
        )
        if st != 200 or not data.get("contacts"):
            crm["ok"] = False
    except Exception as e:
        crm["ok"] = False
        crm["dataError"] = str(e)
    st, _, body = call(op, CRM + "/auth/hop", "POST", b"", {"Content-Type": "application/json"})
    hop = json.loads(body.decode() or "{}")
    crm["hop"] = bool(hop.get("ok") and hop.get("token"))
    if not crm["hop"]:
        crm["ok"] = False
    out["tools"]["crm"] = crm
    if not crm["ok"]:
        out["ok"] = False

    # Desk
    op, _ = opener()
    st, loginj = login(op, DESK, email, password)
    user = (loginj.get("user") or {})
    desk = {
        "login": st,
        "email": user.get("email"),
        "crmLinked": user.get("crm") is True,
        "ok": st == 200 and loginj.get("ok") is True and user.get("crm") is True,
    }
    st, _, body = call(op, DESK + "/session")
    sess = json.loads(body.decode() or "{}")
    desk["session"] = sess.get("ok") is True
    st, _, body = call(op, DESK + "/templates")
    t = json.loads(body.decode() or "{}")
    desk["templates"] = bool(t.get("ok") and t.get("templates"))
    st, _, body = call(op, DESK + "/contacts?q=Moore")
    c = json.loads(body.decode() or "{}")
    desk["crmSearch"] = bool(c.get("ok") and c.get("contacts"))
    if not (desk["session"] and desk["templates"] and desk["crmSearch"]):
        desk["ok"] = False
    out["tools"]["desk"] = desk
    if not desk["ok"]:
        out["ok"] = False

    # Proposal
    op, _ = opener()
    st, loginj = login(op, PROPOSAL, email, password)
    prop = {"login": st, "email": loginj.get("email"), "ok": st == 200 and loginj.get("ok") is True}
    st, _, body = call(op, PROPOSAL + "/inventory")
    inv = json.loads(body.decode() or "{}")
    offers = inv.get("offers") or []
    priced = [
        o
        for o in offers
        if isinstance(o.get("wholesaleCost"), (int, float)) and o.get("wholesaleCost")
    ]
    prop.update(
        {
            "inventory": st,
            "offers": len(offers),
            "postedWholesale": len(priced),
            "source": inv.get("source"),
            "stale": inv.get("stale"),
            "refreshError": inv.get("refreshError"),
        }
    )
    if st != 200 or not priced:
        prop["ok"] = False
        prop["failClosed"] = "Container Exchange did not post usable wholesale numbers"
    out["tools"]["proposal"] = prop
    if not prop["ok"]:
        out["ok"] = False

    # Pay
    op, _ = opener()
    st, loginj = login(op, PAY, email, password)
    user = loginj.get("user") or {}
    pay = {
        "login": st,
        "email": user.get("email"),
        "veemFlag": loginj.get("veem"),
        "ok": st == 200 and loginj.get("ok") is True,
    }
    st, _, body = call(op, PAY + "/session")
    sess = json.loads(body.decode() or "{}")
    pay["session"] = sess.get("ok") is True
    st, _, body = call(op, PAY + "/pay/list")
    listing = json.loads(body.decode() or "{}")
    pay["listStatus"] = st
    pay["listError"] = listing.get("error")
    pay["veemProduction"] = listing.get("ok") is True
    # Restricted Veem production is the known live state, not an outage.
    if not pay["session"]:
        pay["ok"] = False
    out["tools"]["pay"] = pay
    if not pay["ok"]:
        out["ok"] = False

    out["knownGaps"] = {
        "veemProduction": "Veem production API tokens are not open; sandbox/restricted is expected until clientservices finishes production.",
        "metaLeads": "CRM Meta page token is not connected (hasPageToken false).",
    }
    return out


def check_xchange(email, password):
    out = {"checkedAt": utc_now(), "mode": "xchange", "ok": True}
    op, _ = opener()
    st, loginj = login(op, PROPOSAL, email, password)
    if st != 200 or loginj.get("ok") is not True:
        out["ok"] = False
        out["error"] = "Proposal login failed"
        return out
    st, _, body = call(
        op,
        PROPOSAL + "/inventory/refresh",
        "POST",
        b"{}",
        {"Content-Type": "application/json"},
        timeout=90,
    )
    try:
        inv = json.loads(body.decode() or "{}")
    except Exception as e:
        out["ok"] = False
        out["error"] = "Refresh did not return JSON: " + str(e)
        return out
    offers = inv.get("offers") or []
    priced = []
    for o in offers:
        cost = o.get("wholesaleCost")
        if isinstance(cost, (int, float)) and cost > 0:
            priced.append(
                {
                    "size": o.get("size"),
                    "condition": o.get("condition"),
                    "depot": o.get("depot") or o.get("city"),
                    "wholesaleCost": cost,
                    "qty": o.get("qty"),
                }
            )
    out.update(
        {
            "refreshStatus": st,
            "source": inv.get("source") or "container-xchange posted inventory",
            "pulledAt": inv.get("pulledAt"),
            "stale": inv.get("stale"),
            "refreshError": inv.get("refreshError"),
            "offers": len(offers),
            "postedWholesale": len(priced),
            "samples": priced[:8],
        }
    )
    if st != 200 or not priced:
        out["ok"] = False
        out["failClosed"] = "No posted Container Exchange wholesale number. Do not invent a price."
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["systems", "xchange", "both"], default="both")
    args = parser.parse_args()
    email = os.environ.get("CBSS_CRM_EMAIL", "").strip()
    password = os.environ.get("CBSS_CRM_PASSWORD", "")
    if not email or not password:
        print(json.dumps({"ok": False, "error": "CBSS_CRM_EMAIL / CBSS_CRM_PASSWORD missing"}))
        return 2
    report = {"checkedAt": utc_now()}
    if args.mode in ("systems", "both"):
        report["systems"] = check_systems(email, password)
    if args.mode in ("xchange", "both"):
        report["xchange"] = check_xchange(email, password)
    report["ok"] = all(report[k].get("ok") for k in report if isinstance(report.get(k), dict) and "ok" in report[k])
    print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
