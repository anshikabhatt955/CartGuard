import asyncio
import os
import sys
import json
from playwright.async_api import async_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(r"C:\Users\anshi\.gemini\antigravity\scratch\cartguard")
EXT_DIR = os.path.join(ROOT_DIR, "extension")
MOCK_DIR = os.path.join(ROOT_DIR, "mock-site")

def get_latest_content():
    with open(os.path.join(EXT_DIR, "rules.json"), "r", encoding="utf-8") as f:
        rules_content = f.read()
    with open(os.path.join(EXT_DIR, "content.js"), "r", encoding="utf-8") as f:
        content_js = f.read()
    with open(os.path.join(EXT_DIR, "content.css"), "r", encoding="utf-8") as f:
        content_css = f.read()
    return rules_content, content_js, content_css

async def inject_cartguard(page):
    rules_content, content_js, content_css = get_latest_content()
    await page.add_style_tag(content=content_css)

    mock_chrome = f"""
    window.__CARTGUARD_RULES__ = {rules_content};
    window.chrome = window.chrome || {{}};
    window.chrome.runtime = window.chrome.runtime || {{}};
    window.chrome.runtime.getURL = function(path) {{
        return 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(window.__CARTGUARD_RULES__));
    }};
    window.chrome.runtime.onMessage = {{
        addListener: function(fn) {{ window.__cartguard_listener = fn; }}
    }};
    """
    await page.evaluate(mock_chrome)
    await page.add_script_tag(content=content_js)
    await page.wait_for_timeout(350)

async def test_all():
    print("=" * 65)
    print("CARTGUARD REGRESSION & FALSE-POSITIVE VERIFICATION SUITE")
    print("=" * 65)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # -------------------------------------------------------------
        # TEST FIXTURE: AMAZON-LIKE PRODUCT PAGE
        # -------------------------------------------------------------
        print("\n[TEST 1] Testing Amazon-like Product Page (amazon_product.html)...")
        amazon_url = f"file:///{MOCK_DIR.replace(os.sep, '/')}/amazon_product.html"
        await page.goto(amazon_url)
        await page.wait_for_timeout(500)
        await inject_cartguard(page)

        data_amazon = await page.evaluate("""() => {
            return new Promise((resolve) => {
                window.__cartguard_listener({ action: 'GET_DATA' }, {}, resolve);
            });
        }""")

        print(f"  ✓ Stage Classified: {data_amazon.get('pageStage')}")
        assert data_amazon.get('pageStage') == 'product', "Amazon product page must be classified as 'product' stage"

        # Check fees
        fee_findings = [f for f in data_amazon['findings'] if f['type'] == 'hidden_fee']
        print(f"  ✓ Fee findings on Amazon Product Page: {len(fee_findings)} (Expected: 0)")
        assert len(fee_findings) == 0, f"Expected 0 fee findings on product page, found: {fee_findings}"

        # Check total extra charges
        print(f"  ✓ Extra charged amount: ₹{data_amazon['extraCharged']} (Expected: 0)")
        assert data_amazon['extraCharged'] == 0, f"Expected 0 extra charges on product page, got {data_amazon['extraCharged']}"

        # Verify ONE summary badge and ZERO duplicate banners on DOM elements
        badge_count = await page.locator("#cartguard-floating-badge").count()
        assert badge_count == 1, f"Expected exactly 1 floating summary badge, found {badge_count}"
        stacked_banners = await page.locator(".cartguard-mandatory-tag, .cartguard-element-banner").count()
        print(f"  ✓ Stacked element banner count: {stacked_banners} (Expected: 0)")
        assert stacked_banners == 0, "No duplicate element banners should be injected"

        # -------------------------------------------------------------
        # TEST FIXTURE: LISTING PAGE (index.html)
        # -------------------------------------------------------------
        print("\n[TEST 2] Testing Mock Listing Page (index.html)...")
        listing_url = f"file:///{MOCK_DIR.replace(os.sep, '/')}/index.html"
        await page.goto(listing_url)
        await page.wait_for_timeout(500)
        await inject_cartguard(page)

        data_p1 = await page.evaluate("""() => {
            return new Promise((resolve) => {
                window.__cartguard_listener({ action: 'GET_DATA' }, {}, resolve);
            });
        }""")
        print(f"  ✓ Stage: {data_p1.get('pageStage')}")
        fee_p1 = [f for f in data_p1['findings'] if f['type'] == 'hidden_fee']
        print(f"  ✓ Hidden fee findings on listing: {len(fee_p1)} (Expected: 0, fees not allowed on listing)")
        assert len(fee_p1) == 0

        # Traps that SHOULD be detected on listing:
        patterns_p1 = [f['ccpa_pattern_name'] for f in data_p1['findings']]
        print("  ✓ CCPA Patterns on Listing:", set(patterns_p1))
        assert "Confirm Shaming" in patterns_p1
        assert "Trick Questions" in patterns_p1
        assert "Interface Interference" in patterns_p1
        assert "False Urgency" in patterns_p1

        # -------------------------------------------------------------
        # TEST FIXTURE: CART PAGE (cart.html)
        # -------------------------------------------------------------
        print("\n[TEST 3] Testing Mock Cart Page (cart.html)...")
        cart_url = f"file:///{MOCK_DIR.replace(os.sep, '/')}/cart.html"
        await page.goto(cart_url)
        await page.wait_for_timeout(500)
        await inject_cartguard(page)

        data_p2 = await page.evaluate("""() => {
            return new Promise((resolve) => {
                window.__cartguard_listener({ action: 'GET_DATA' }, {}, resolve);
            });
        }""")
        print(f"  ✓ Stage: {data_p2.get('pageStage')} (Expected: cart)")
        assert data_p2.get('pageStage') == 'cart'
        print(f"  ✓ Initial extra unnecessary charges: ₹{data_p2['extraCharged']} (Expected: ₹177)")
        assert data_p2['extraCharged'] == 177

        # Check High confidence for pre-ticked add-ons
        prechecked = [f for f in data_p2['findings'] if f['type'] == 'prechecked_addon']
        assert all(f['confidence'] == 'High' for f in prechecked), "Pre-ticked add-ons must have High confidence"
        print("  ✓ Pre-ticked add-ons flagged with High confidence: 'Detected'")

        # Test MutationObserver late add-on
        print("  -> Testing MutationObserver: Clicking Continue...")
        await page.click("#btn-continue-checkout")
        await page.wait_for_timeout(450)

        data_p2_late = await page.evaluate("""() => {
            return new Promise((resolve) => {
                window.__cartguard_listener({ action: 'GET_DATA' }, {}, resolve);
            });
        }""")
        print(f"  ✓ Updated extra charges with late add-on: ₹{data_p2_late['extraCharged']} (Expected: ₹236)")
        assert data_p2_late['extraCharged'] == 236

        # Test One-Tap De-Trap
        detrap_resp = await page.evaluate("""() => {
            return new Promise((resolve) => {
                window.__cartguard_listener({ action: 'EXECUTE_DETRAP' }, {}, resolve);
            });
        }""")
        print(f"  ✓ De-Trap executed. Saved: ₹{detrap_resp['savedAmount']}")
        assert detrap_resp['savedAmount'] == 236

        # Verify host cart subtotal dropped back to base ₹499
        cart_total_live = await page.locator("#grand-total-display").inner_text()
        print(f"  ✓ Host Cart Subtotal live updated: {cart_total_live}")
        assert "499" in cart_total_live

        # Test Undo
        await page.evaluate("""() => {
            return new Promise((resolve) => {
                window.__cartguard_listener({ action: 'EXECUTE_UNDO' }, {}, resolve);
            });
        }""")
        ins_restored = await page.is_checked("#addon-insurance")
        assert ins_restored, "Undo must restore checkboxes"
        print("  ✓ Undo restored optional add-ons successfully.")

        # -------------------------------------------------------------
        # TEST FIXTURE: PAYMENT PAGE (payment.html)
        # -------------------------------------------------------------
        print("\n[TEST 4] Testing Mock Payment Page (payment.html)...")
        pay_url = f"file:///{MOCK_DIR.replace(os.sep, '/')}/payment.html"
        await page.goto(pay_url)
        await page.wait_for_timeout(500)
        await inject_cartguard(page)

        data_p3 = await page.evaluate("""() => {
            return new Promise((resolve) => {
                window.__cartguard_listener({ action: 'GET_DATA' }, {}, resolve);
            });
        }""")
        print(f"  ✓ Stage: {data_p3.get('pageStage')} (Expected: checkout_payment)")
        assert data_p3.get('pageStage') == 'checkout_payment'

        # Check mandatory fees detected in order summary
        mand_fees = [f for f in data_p3['findings'] if f['type'] == 'hidden_fee' and f['fee_classification'] == 'mandatory']
        print(f"  ✓ Mandatory fees detected: {len(mand_fees)} (Convenience & Platform fees)")
        assert len(mand_fees) >= 2

        # Verify NO stacked banners on elements (outline only)
        mand_badges = await page.locator(".cartguard-mandatory-tag").count()
        print(f"  ✓ Stacked badge count: {mand_badges} (Expected: 0, outline only)")
        assert mand_badges == 0

        # Run De-Trap on Payment Page
        detrap_p3 = await page.evaluate("""() => {
            return new Promise((resolve) => {
                window.__cartguard_listener({ action: 'EXECUTE_DETRAP' }, {}, resolve);
            });
        }""")
        print(f"  ✓ De-Trap saved on optional pledge: ₹{detrap_p3['savedAmount']} (Expected: ₹20)")
        assert detrap_p3['savedAmount'] == 20

        # Mandatory fees preserved
        conv_visible = await page.locator("#fee-convenience").is_visible()
        plat_visible = await page.locator("#fee-platform").is_visible()
        assert conv_visible and plat_visible, "Mandatory fees must NEVER be removed"
        print("  ✓ Mandatory fees preserved on page summary without modification.")

        # -------------------------------------------------------------
        # TEST FIXTURE: CLEAN PAGE (0 Traps)
        # -------------------------------------------------------------
        print("\n[TEST 5] Testing Clean Page (0 Traps)...")
        clean_url = "data:text/html,<html><head><title>Clean</title></head><body><h1>Clean</h1><p>Price: ₹999</p></body></html>"
        await page.goto(clean_url)
        await inject_cartguard(page)

        data_clean = await page.evaluate("""() => {
            return new Promise((resolve) => {
                window.__cartguard_listener({ action: 'GET_DATA' }, {}, resolve);
            });
        }""")
        assert data_clean['score'] == 0
        assert data_clean['extraCharged'] == 0
        assert len(data_clean['findings']) == 0
        print("  ✓ Clean page: 0 findings, 0 extra charges, 0 score.")

        await browser.close()
        print("\n" + "=" * 65)
        print("ALL REGRESSION & FALSE-POSITIVE TESTS PASSED SUCCESSFULLY!")
        print("=" * 65)

if __name__ == "__main__":
    asyncio.run(test_all())
