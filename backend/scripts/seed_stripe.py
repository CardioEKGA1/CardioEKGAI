# Copyright 2026 SoulMD Inc. All Rights Reserved.
# Unauthorized copying, modification, distribution or use of this software is strictly prohibited.

"""
Idempotent Stripe product + price seeder for SoulMD.

Usage:
    STRIPE_SECRET_KEY=sk_live_or_test_... python backend/scripts/seed_stripe.py

Matches products/prices by metadata.slug + metadata.tier, so re-running does not duplicate.
Prints the Railway env vars to set at the end.
"""
import os
import sys
import json
import stripe
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
if not stripe.api_key:
    print("ERROR: set STRIPE_SECRET_KEY in environment.")
    sys.exit(1)

CATALOG = [
    ("ekgscan",      "EKGScan",          "12-lead EKG interpretation in seconds",                      999,  8999),
    ("xrayread",     "XrayRead",         "Structured radiology report from any X-ray image",           999,  8999),
    ("rxcheck",      "RxCheck",          "Full medication interaction safety check",                   999,  8999),
    ("infectid",     "InfectID",         "IDSA-based antibiotic recommendations",                      999,  8999),
    ("cerebralai",   "CerebralAI",       "Brain and spine MRI and CT interpretation",                  999,  8999),
    ("clinicalnote", "ClinicalNote AI",  "SOAP notes from bullet points in seconds",                   999,  8999),
    ("nephroai",     "NephroAI",         "Comprehensive nephrology decision support",                 2499, 17999),
    ("palliativemd", "PalliativeMD",     "AI-guided palliative care — goals of care, prognosis, family meetings", 2499, 17999),
    ("suite",        "SoulMD Suite",     "All clinical AI tools in one subscription",                 8888, 88800),
]


def find_or_create_product(slug: str, name: str, description: str):
    for p in stripe.Product.list(limit=100, active=True).auto_paging_iter():
        if getattr(p.metadata, "slug", None) == slug:
            if p.name != name or p.description != description:
                stripe.Product.modify(p.id, name=name, description=description)
            print(f"  [=] product: {p.id} ({name})")
            return p
    p = stripe.Product.create(name=name, description=description, metadata={"slug": slug})
    print(f"  [+] product: {p.id} ({name})")
    return p


def find_or_create_price(product_id: str, slug: str, tier: str, amount_cents: int):
    interval = "month" if tier == "monthly" else "year"
    for pr in stripe.Price.list(product=product_id, active=True, limit=100).auto_paging_iter():
        md_slug = getattr(pr.metadata, "slug", None)
        md_tier = getattr(pr.metadata, "tier", None)
        rec_interval = getattr(pr.recurring, "interval", None) if pr.recurring else None
        if (md_slug == slug
                and md_tier == tier
                and pr.unit_amount == amount_cents
                and rec_interval == interval):
            print(f"    [=] price: {pr.id} ({tier} ${amount_cents/100:.2f})")
            return pr
    pr = stripe.Price.create(
        product=product_id,
        unit_amount=amount_cents,
        currency="usd",
        recurring={"interval": interval},
        metadata={"slug": slug, "tier": tier},
    )
    print(f"    [+] price: {pr.id} ({tier} ${amount_cents/100:.2f})")
    return pr


def main():
    price_map = {}
    for slug, name, description, monthly_cents, yearly_cents in CATALOG:
        print(f"\n-- {name} ({slug}) --")
        product = find_or_create_product(slug, name, description)
        for tier, cents in (("monthly", monthly_cents), ("yearly", yearly_cents)):
            pr = find_or_create_price(product.id, slug, tier, cents)
            price_map[f"{slug}_{tier}"] = pr.id

    out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "stripe_prices.json")
    with open(out_path, "w") as f:
        json.dump(price_map, f, indent=2, sort_keys=True)
    print(f"\nWrote {out_path}")

    print("\n--- Railway env vars to set (copy/paste into Railway → Variables) ---")
    for key, pid in sorted(price_map.items()):
        print(f"STRIPE_PRICE_{key.upper()}={pid}")
    print(f"\nTotal: {len(price_map)} prices across {len(CATALOG)} products.")


if __name__ == "__main__":
    main()
