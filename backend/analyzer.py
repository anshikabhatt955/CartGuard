import re
import asyncio
from typing import List, Dict, Any, Optional
from playwright.async_api import async_playwright

# Regex patterns for Rupee amounts
RUPEE_REGEX = re.compile(r'(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:₹|Rs\.?|INR)', re.IGNORECASE)

# Scarcity patterns
SCARCITY_PATTERNS = [
    re.compile(r'(?:only|just)\s+(\d+)\s+(?:items?|units?|pieces?|seats?|tickets?)?\s*(?:left|remaining|in\s+stock)', re.IGNORECASE),
    re.compile(r'(\d+)\s+(?:people|shoppers|users|customers)\s+(?:are\s+)?(?:viewing|looking|watching|paying|attempting)', re.IGNORECASE),
    re.compile(r'(\d+)\s+(?:people|shoppers|users)\s+have\s+this\s+in\s+(?:their\s+)?cart', re.IGNORECASE),
    re.compile(r'hurry[,\s!]+only\s+(\d+)', re.IGNORECASE),
    re.compile(r'high\s+(?:cart\s+volume|demand)[^.\n]*', re.IGNORECASE),
    re.compile(r'low\s+stock[^.\n]*', re.IGNORECASE)
]

# Confirmshaming patterns
CONFIRMSHAMING_PATTERNS = [
    re.compile(r'no[,\s]+(?:i\s+)?(?:don\'t|do\s+not)\s+want\s+to\s+save(?:\s+money)?', re.IGNORECASE),
    re.compile(r'no\s+thanks[,\s]+i(?:\'ll|\s+will)\s+pay\s+full\s+price', re.IGNORECASE),
    re.compile(r'no[,\s]+(?:i\s+)?prefer\s+paying\s+(?:more|full\s+price)', re.IGNORECASE),
    re.compile(r'no[,\s]+(?:i\s+)?(?:don\'t|do\s+not)\s+(?:care|want|need)\s+(?:about\s+)?(?:protection|discounts?|savings?|warranty|money)', re.IGNORECASE),
    re.compile(r'i(?:\'ll|\s+will)\s+risk\s+it', re.IGNORECASE),
    re.compile(r'no[,\s]+i\s+hate\s+(?:savings|discounts|money)', re.IGNORECASE),
    re.compile(r'no[,\s]+skip\s+(?:savings|deal|protection|warranty|discount)', re.IGNORECASE)
]

def extract_rupee_amount(text: str) -> Optional[float]:
    match = RUPEE_REGEX.search(text)
    if match:
        raw_val = match.group(1) or match.group(2)
        if raw_val:
            try:
                cleaned = raw_val.replace(',', '').strip()
                return float(cleaned)
            except ValueError:
                return None
    return None

def parse_timer_seconds(time_str: str) -> Optional[int]:
    parts = time_str.strip().split(':')
    try:
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except ValueError:
        return None
    return None

async def scan_page_with_playwright(url: str) -> List[Dict[str, Any]]:
    findings: List[Dict[str, Any]] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()

        try:
            # Navigate to URL
            response = await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            if not response or response.status >= 400:
                status_code = response.status if response else "Unknown"
                raise RuntimeError(f"HTTP error {status_code} when loading URL")

            # -------------------------------------------------------------
            # 1. PRE-CHECKED CHECKBOXES / TOGGLES WITH RUPEE AMOUNT
            # -------------------------------------------------------------
            checkbox_data = await page.evaluate('''() => {
                const results = [];
                const inputs = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'));
                const ariaInputs = Array.from(document.querySelectorAll('[role="checkbox"][aria-checked="true"], [role="switch"][aria-checked="true"]'));
                const all = [...new Set([...inputs, ...ariaInputs])];
                
                for (const el of all) {
                    let text = '';
                    if (el.labels && el.labels.length > 0) {
                        text = Array.from(el.labels).map(l => l.innerText).join(' ');
                    }
                    if (!text) {
                        const parent = el.closest('label') || el.closest('.addon-card') || el.parentElement;
                        if (parent) {
                            text = parent.innerText;
                        }
                    }
                    if (!text) {
                        text = el.innerText || '';
                    }
                    results.push({
                        id: el.id || '',
                        name: el.name || '',
                        text: text.trim().replace(/\\s+/g, ' ')
                    });
                }
                return results;
            }''')

            seen_checkboxes = set()
            for item in checkbox_data:
                text = item.get("text", "")
                if not text:
                    continue
                amount = extract_rupee_amount(text)
                if amount is not None:
                    snippet = text[:150]
                    if snippet not in seen_checkboxes:
                        seen_checkboxes.add(snippet)
                        findings.append({
                            "type": "prechecked_addon",
                            "ccpa_pattern_name": "Basket Sneaking",
                            "evidence_text": f"Pre-selected option with cost: \"{snippet}\"",
                            "amount_if_any": amount
                        })

            # -------------------------------------------------------------
            # 2. COUNTDOWN TIMERS: READ, RELOAD, READ AGAIN
            # -------------------------------------------------------------
            find_timer_js = '''() => {
                const timePattern = /\\b\\d{1,2}:\\d{2}(?::\\d{2})?\\b/;
                const elements = Array.from(document.querySelectorAll('*:not(script):not(style)'));
                const matches = [];
                for (const el of elements) {
                    if (el.children.length === 0 && el.innerText) {
                        const m = el.innerText.trim().match(timePattern);
                        if (m) {
                            const parentText = (el.parentElement ? el.parentElement.innerText : '').toLowerCase();
                            const idClass = ((el.id || '') + ' ' + (el.className || '')).toLowerCase();
                            const isLikelyTimer = idClass.includes('timer') || 
                                                idClass.includes('countdown') ||
                                                parentText.includes('expires') || 
                                                parentText.includes('deal') ||
                                                parentText.includes('ends') ||
                                                parentText.includes('ends in') ||
                                                parentText.includes('reserved') ||
                                                parentText.includes('within') ||
                                                parentText.includes('hurry') ||
                                                parentText.includes('cart');
                            if (isLikelyTimer) {
                                matches.push({
                                    id: el.id || '',
                                    text: m[0],
                                    context: (el.parentElement ? el.parentElement.innerText : el.innerText).trim().replace(/\\s+/g, ' ')
                                });
                            }
                        }
                    }
                }
                return matches;
            }'''

            # Read timer right after initial load
            timer_data_initial = await page.evaluate(find_timer_js)
            
            if timer_data_initial:
                # Wait 1.8 seconds to let timer tick
                await page.wait_for_timeout(1800)
                timer_data_ticked = await page.evaluate(find_timer_js)
                
                # Reload page
                await page.reload(wait_until="domcontentloaded")
                await page.wait_for_timeout(300)
                timer_data_reloaded = await page.evaluate(find_timer_js)

                # Check if timer reset to its start value
                for t_init in timer_data_initial:
                    init_sec = parse_timer_seconds(t_init["text"])
                    t_reloaded_matches = [r for r in timer_data_reloaded if r["id"] == t_init["id"] or t_init["text"] in r["context"]]
                    if not t_reloaded_matches and timer_data_reloaded:
                        t_reloaded_matches = timer_data_reloaded

                    for r in t_reloaded_matches:
                        reloaded_sec = parse_timer_seconds(r["text"])
                        # If reloaded value equals the initial starting value or reset back up
                        # (even if ticked value went down)
                        is_reset = False
                        if r["text"] == t_init["text"]:
                            is_reset = True
                        elif init_sec is not None and reloaded_sec is not None and abs(init_sec - reloaded_sec) <= 1:
                            is_reset = True

                        if is_reset:
                            findings.append({
                                "type": "resetting_timer",
                                "ccpa_pattern_name": "False Urgency",
                                "evidence_text": f"Resetting countdown timer detected: timer showed \"{t_init['text']}\" and reset back to \"{r['text']}\" upon page reload",
                                "amount_if_any": None
                            })
                            break
                    if any(f["type"] == "resetting_timer" for f in findings):
                        break

            # -------------------------------------------------------------
            # 3. SCARCITY TEXT ("only N left", "N people viewing")
            # -------------------------------------------------------------
            all_text_blocks = await page.evaluate('''() => {
                const texts = [];
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                while (walker.nextNode()) {
                    const nodeVal = walker.currentNode.nodeValue.trim();
                    if (nodeVal.length > 5) {
                        texts.push(nodeVal);
                    }
                }
                return texts;
            }''')

            seen_scarcity = set()
            for text_block in all_text_blocks:
                for pattern in SCARCITY_PATTERNS:
                    if pattern.search(text_block):
                        snippet = text_block.replace('\n', ' ').strip()
                        if snippet not in seen_scarcity:
                            seen_scarcity.add(snippet)
                            findings.append({
                                "type": "scarcity_pressure",
                                "ccpa_pattern_name": "False Urgency",
                                "evidence_text": f"Scarcity/Urgency claim: \"{snippet[:160]}\"",
                                "amount_if_any": None
                            })
                            break

            # -------------------------------------------------------------
            # 4. CONFIRMSHAMING BUTTON / ACTION TEXT
            # -------------------------------------------------------------
            clickable_elements = await page.evaluate('''() => {
                const candidates = [];
                const els = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"], .confirmshaming-btn'));
                for (const el of els) {
                    const t = (el.innerText || el.value || '').trim().replace(/\\s+/g, ' ');
                    if (t.length > 3) {
                        candidates.push(t);
                    }
                }
                return candidates;
            }''')

            seen_shame = set()
            for btn_text in clickable_elements:
                for pattern in CONFIRMSHAMING_PATTERNS:
                    if pattern.search(btn_text):
                        if btn_text not in seen_shame:
                            seen_shame.add(btn_text)
                            findings.append({
                                "type": "confirmshaming",
                                "ccpa_pattern_name": "Confirm Shaming",
                                "evidence_text": f"Confirmshaming button detected: \"{btn_text[:160]}\"",
                                "amount_if_any": None
                            })
                            break

        finally:
            await browser.close()

    return findings
