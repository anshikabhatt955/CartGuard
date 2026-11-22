import asyncio
import os
import sys
import tempfile
from playwright.async_api import async_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

EXT_PATH = os.path.abspath(r"C:\Users\anshi\.gemini\antigravity\scratch\cartguard\extension")
MOCK_DIR = os.path.abspath(r"C:\Users\anshi\.gemini\antigravity\scratch\cartguard\mock-site")
USER_DATA_DIR = os.path.join(tempfile.gettempdir(), "cartguard_playwright_profile")

async def test_extension():
    print("Testing CartGuard Extension with Playwright...")
    print("Extension Path:", EXT_PATH)
    print("Mock Site Path:", MOCK_DIR)

    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=False,
            channel="chromium",
            ignore_default_args=["--disable-extensions"],
            args=[
                f"--disable-extensions-except={EXT_PATH}",
                f"--load-extension={EXT_PATH}",
                "--no-sandbox"
            ]
        )

        page = context.pages[0] if context.pages else await context.new_page()

        # -------------------------------------------------------------
        # TEST 1: LISTING PAGE (index.html)
        # -------------------------------------------------------------
        print("\n==========================================")
        print("TEST 1: LISTING PAGE (₹499 Listing)")
        print("==========================================")
        listing_url = f"file:///{MOCK_DIR.replace(os.sep, '/')}/index.html"
        await page.goto(listing_url)
        await page.wait_for_timeout(2000)

        # Check if floating badge injected
        badge = page.locator("#cartguard-floating-badge")
        await badge.wait_for(state="attached", timeout=5000)
        badge_text = await badge.inner_text()
        print("✅ Floating Badge rendered successfully!")
        print("Badge Display:", badge_text.replace('\n', ' | '))

        # Verify Highlight classes for detected traps on Listing
        shame_count = await page.locator(".cartguard-highlight-shame").count()
        trick_count = await page.locator(".cartguard-highlight-trick").count()
        print(f"✅ Confirmshaming Highlighted: {shame_count > 0} (count={shame_count})")
        print(f"✅ Trick Question Highlighted: {trick_count > 0} (count={trick_count})")

        # -------------------------------------------------------------
        # TEST 2: CART PAGE (cart.html)
        # -------------------------------------------------------------
        print("\n==========================================")
        print("TEST 2: CART PAGE (3 Pre-Ticked Add-ons + Disguised Ad)")
        print("==========================================")
        cart_url = f"file:///{MOCK_DIR.replace(os.sep, '/')}/cart.html"
        await page.goto(cart_url)
        await page.wait_for_timeout(2000)

        cart_badge = await page.locator("#cartguard-floating-badge").inner_text()
        print("Cart Badge:", cart_badge.replace('\n', ' | '))

        # Verify initial pre-ticked add-ons (₹99 + ₹29 + ₹49 = ₹177)
        ins = await page.is_checked("#addon-insurance")
        pack = await page.is_checked("#addon-packing")
        prio = await page.is_checked("#addon-priority")
        print(f"Pre-ticked states: Insurance={ins}, Packing={pack}, Priority={prio}")
        assert ins and pack and prio, "All 3 add-ons should be pre-ticked initially"

        # Check initial host page total
        initial_total = await page.locator("#grand-total-display").inner_text()
        print("Initial Host Total:", initial_total)
        assert "676" in initial_total, "Cart total should be ₹676 with pre-ticked add-ons"

        # TEST LATE-APPEARING ADD-ON (MutationObserver catch)
        print("\n--- Testing MutationObserver: Clicking Continue for Late Add-on ---")
        await page.click("#btn-continue-checkout")
        await page.wait_for_timeout(1000)

        late_count = await page.locator("#addon-late-guarantee").count()
        print(f"✅ Late Add-on injected into DOM: {late_count > 0}")
        late_badge = await page.locator("#cartguard-floating-badge").inner_text()
        print("Badge after late add-on:", late_badge.replace('\n', ' | '))

        # TEST ONE-TAP DE-TRAP
        print("\n--- Testing One-Tap De-Trap ---")
        await page.click("#cartguard-badge-detrap-btn")
        await page.wait_for_timeout(1000)

        # Verify checkboxes were unticked
        ins_after = await page.is_checked("#addon-insurance")
        pack_after = await page.is_checked("#addon-packing")
        prio_after = await page.is_checked("#addon-priority")
        late_after = await page.is_checked("#addon-late-guarantee")
        print(f"After De-Trap states: Insurance={ins_after}, Packing={pack_after}, Priority={prio_after}, Late={late_after}")
        assert not (ins_after or pack_after or prio_after or late_after), "All optional add-ons must be unticked"

        # Verify host cart total dropped back to base ₹499!
        new_total = await page.locator("#grand-total-display").inner_text()
        print(f"✅ Host Cart Total after De-Trap: {new_total} (Base ₹499 restored!)")
        assert "499" in new_total, "Cart total should return to base ₹499"

        # Verify Toast with Undo
        toast = page.locator("#cartguard-toast")
        assert await toast.count() > 0, "Toast notification must appear after De-Trap"
        toast_msg = await toast.inner_text()
        print("Toast Message:", toast_msg.replace('\n', ' | '))

        # TEST UNDO
        print("\n--- Testing Undo Button ---")
        await page.click("#cartguard-undo-btn")
        await page.wait_for_timeout(1000)
        ins_undo = await page.is_checked("#addon-insurance")
        print(f"✅ After Undo: Insurance re-checked={ins_undo}")
        assert ins_undo, "Undo must restore checkboxes"

        # -------------------------------------------------------------
        # TEST 3: PAYMENT PAGE (payment.html)
        # -------------------------------------------------------------
        print("\n==========================================")
        print("TEST 3: PAYMENT PAGE (Mandatory vs Optional Fees)")
        print("==========================================")
        pay_url = f"file:///{MOCK_DIR.replace(os.sep, '/')}/payment.html"
        await page.goto(pay_url)
        await page.wait_for_timeout(2000)

        pay_badge = await page.locator("#cartguard-floating-badge").inner_text()
        print("Payment Badge:", pay_badge.replace('\n', ' | '))

        # Verify mandatory fee highlights with red tag
        mand_tags = await page.locator(".cartguard-mandatory-tag").count()
        print(f"✅ Mandatory fee red tags: {mand_tags} (Convenience & Platform fees marked)")
        assert mand_tags >= 2, "Mandatory fees must have red tags"

        # Test De-Trap on payment page: must untick voluntary green pledge (₹20) but NEVER remove mandatory fees!
        print("\n--- Testing De-Trap on Payment: Optional unticked, Mandatory preserved ---")
        await page.click("#cartguard-badge-detrap-btn")
        await page.wait_for_timeout(1000)

        tree_after = await page.is_checked("#addon-tree")
        conv_visible = await page.locator("#fee-convenience").is_visible()
        plat_visible = await page.locator("#fee-platform").is_visible()
        print(f"Optional tree pledge unticked: {not tree_after}")
        print(f"Mandatory convenience fee preserved: {conv_visible}")
        print(f"Mandatory platform fee preserved: {plat_visible}")
        assert not tree_after, "Optional pledge should be unticked"
        assert conv_visible and plat_visible, "Mandatory fees must NEVER be removed"

        # -------------------------------------------------------------
        # TEST 4: CLEAN PAGE WITHOUT TRAPS
        # -------------------------------------------------------------
        print("\n==========================================")
        print("TEST 4: CLEAN CHECKOUT PAGE (0 Traps)")
        print("==========================================")
        clean_html = "data:text/html,<html><head><title>Clean</title></head><body><h1>Clean Store</h1><p>Price: ₹500</p><button>Checkout</button></body></html>"
        await page.goto(clean_html)
        await page.wait_for_timeout(1500)

        clean_badge = await page.locator("#cartguard-floating-badge").inner_text()
        print("Clean page badge:", clean_badge.replace('\n', ' | '))
        assert "No Dark Patterns" in clean_badge, "Badge should state no dark patterns on clean page"

        await context.close()
        print("\n🎉 ALL TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    asyncio.run(test_extension())
