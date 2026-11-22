# CartGuard - Chrome Extension

On-device dark pattern detection and De-Trap for live e-commerce checkout pages under Central Consumer Protection Authority (**CCPA 2023**) Guidelines.
- Manifest V3, plain JavaScript, zero frameworks, zero external network calls.
- Privacy-safe: Never reads credit/debit card numbers, CVVs, passwords, UPI IDs, or personal data.

---

## Folder Structure

```
cartguard/
├── extension/                 # Chrome Extension (Manifest V3)
│   ├── manifest.json          # Extension manifest
│   ├── rules.json             # CCPA 2023 dark pattern detector rules, allowlists & ignore lists
│   ├── content.js             # Stage classifier, MutationObserver & De-Trap
│   ├── content.css            # Floating badge, element outlines (no stacked banners)
│   ├── popup.html             # Extension popup UI
│   ├── popup.js               # Risk score 0-100, confidence levels ("Detected" vs "Possible")
│   ├── popup.css              # Popup styling
│   └── icons/                 # 16x16, 48x48, 128x128 shield icons
├── mock-site/                 # Test Fixtures & 3-Page E-Commerce Checkout
│   ├── amazon_product.html    # Amazon-like product page fixture (EMI, taxes, MRP -> 0 fee findings)
│   ├── index.html             # Page 1: Listing (₹499)
│   ├── cart.html              # Page 2: Cart (₹676 with pre-ticked add-ons)
│   ├── payment.html           # Page 3: Payment (₹796 with mandatory hidden fees)
│   └── style.css              # Store styling
├── run_mock.py                # Local HTTP server (port 3000)
└── verify_all_traps.py        # Automated regression & false-positive verification suite
```

---

## Required Fixes Implemented

1. **Page-Stage Detection & Price Trail**:
   - Classifies page as `product`, `cart`, or `checkout_payment` from URL paths and DOM cues.
   - **Drip Pricing / Hidden Fees are strictly prohibited on `product` stage pages** (eliminating false positive fees on Amazon/Flipkart product listings).
   - Tracks session price trail per tab to identify unannounced price hikes across stages.

2. **Stricter Fee Matching & Allowlist/Ignore List**:
   - ₹ amounts only count as fees if their line contains fee keywords (`convenience`, `platform`, `handling`, `surcharge`, `processing`) **AND** they are inside an order summary / bill breakdown block.
   - Ignores EMI ("EMI starts at ₹141", "No Cost EMI"), MRP / List Price ("M.R.P.: ₹2,999"), discounts ("Save ₹1,500"), cashback, "inclusive of all taxes", and "free delivery".
   - Strike-through elements (`<del>`, `<s>`, `.a-text-strike`) are completely ignored.

3. **De-duplication**:
   - Unique element key hashing prevents duplicate findings.
   - Elements inside CartGuard's own UI are never re-scanned.
   - MutationObserver is debounced to 300 ms.

4. **Confidence Levels & Objective Wording**:
   - `High` confidence: Price increase across stages or pre-ticked add-on checkbox -> Displayed as **"Detected"**.
   - `Medium` / `Low` confidence: Heuristic matches -> Displayed as **"Possible, please verify"**.
   - All violation labels state **"Possible [pattern]"**, never stating legal violations as definitive facts.

5. **Single Summary Badge (No Stacked Banners)**:
   - Elements are highlighted using clean CSS outlines only (`outline: 2px dashed ...`, `outline: 2.5px solid ...`).
   - Stacked injected badges on DOM elements were completely removed. Exactly one summary floating badge appears per page.

6. **Rules.json Allowlist / Ignore List**:
   - Stored in `rules.json` under `allowlist_and_ignore` and mirrored in `content.js` for zero-latency, CSP-safe execution.

---

## Verification Test Results

```powershell
python verify_all_traps.py
```
Output:
- `[TEST 1] Amazon-like Product Page (amazon_product.html)`:
  - Stage Classified: `product`
  - Fee findings: **0** (Expected: 0)
  - Extra charged amount: **₹0** (Expected: 0)
  - Stacked element banner count: **0**
- `[TEST 2] Mock Listing Page (index.html)`:
  - Stage: `product`
  - Hidden fees: **0**
  - Traps detected: Confirm Shaming, Trick Questions, False Urgency, Interface Interference
- `[TEST 3] Mock Cart Page (cart.html)`:
  - Stage: `cart`
  - Initial extra charges: **₹177**
  - Pre-ticked add-ons flagged with High confidence: **"Detected"**
  - Late add-on detected via MutationObserver -> **₹236**
  - One-Tap De-Trap saved **₹236**, restored base ₹499
  - Undo restored add-ons
- `[TEST 4] Mock Payment Page (payment.html)`:
  - Stage: `checkout_payment`
  - Mandatory fees: 2 detected (Convenience & Platform fees)
  - Stacked element banner count: **0** (outline only)
  - De-Trap unticked optional pledge (Saved ₹20), mandatory fees preserved
- `[TEST 5] Clean Page`:
  - 0 findings, 0 extra charges, 0 score
