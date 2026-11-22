// CartGuard Content Script - Manifest V3
// Runs 100% on-device. Zero external network calls. No PII reading.

(function () {
  'use strict';

  // Synchronous embedded rules (Zero fetch dependency, immune to site CSP)
  const DEFAULT_RULES = {
    version: "1.2.0",
    stage_rules: {
      drip_pricing_allowed_stages: ["cart", "checkout_payment"],
      stage_cues: {
        checkout_payment: {
          url_patterns: ["/checkout", "/payment", "/pay", "payment.html", "order-summary", "placeorder", "review-order"],
          dom_keywords: ["place your order", "pay now", "payment method", "complete payment", "total payable", "order summary", "proceed to pay", "pay securely"]
        },
        cart: {
          url_patterns: ["/cart", "/viewcart", "basket", "shopping-cart", "cart.html"],
          dom_keywords: ["shopping cart", "cart subtotal", "items in your cart", "proceed to checkout", "proceed to buy", "continue to payment"]
        },
        product: {
          url_patterns: ["/dp/", "/product/", "/p/", "/item/", "listing.html", "index.html", "amazon_product.html"],
          dom_keywords: ["add to cart", "buy now", "in stock", "inclusive of all taxes", "m.r.p", "emi starts"]
        }
      }
    },
    allowlist_and_ignore: {
      ignore_fee_keywords: [
        "emi", "no cost emi", "emi starts at", "per month", "/month", "/mo",
        "m.r.p", "mrp", "list price", "discount", "save ₹", "savings", "off",
        "cashback", "rewards", "inclusive of all taxes", "inclusive of taxes",
        "taxes included", "gst", "free delivery", "delivery-free", "delivery free", "free shipping"
      ],
      ignore_strike_through_selectors: [
        "del", "s", "strike", ".original-price", "[style*='line-through']", ".a-text-strike", "._3I9_wc"
      ],
      order_summary_containers: [
        ".summary-table", ".order-summary", ".price-summary", ".price-breakdown", ".summary-line",
        "[id*='summary']", "[class*='summary']", "[id*='breakdown']", "[class*='breakdown']",
        "[id*='price-details']", "[class*='price-details']"
      ]
    },
    patterns: {
      basket_sneaking: {
        name: "Basket Sneaking",
        simple_title: "Sneaky Pre-checked Add-on",
        simple_explanation: "The store selected a paid warranty or extra service for you without asking. You can remove it to save money.",
        ccpa_section: "CCPA 2023 Guideline 4(b)",
        severity_score: 25
      },
      drip_pricing: {
        name: "Drip Pricing",
        simple_title: "Surprise Fee at Checkout",
        simple_explanation: "This extra fee was hidden on the product page and only appeared when you went to pay.",
        ccpa_section: "CCPA 2023 Guideline 4(e)",
        severity_score: 20,
        fee_keywords: [
          "convenience fee", "convenience charge", "convenience",
          "platform fee", "platform charge", "platform service fee", "platform",
          "handling fee", "handling charge", "handling",
          "surcharge", "processing fee", "processing charge", "processing",
          "gateway fee", "gateway charge", "service fee",
          "secured packaging fee", "packaging fee", "packaging charge",
          "protect promise fee", "open box delivery fee",
          "delivery surcharge"
        ]
      },
      confirmshaming: {
        name: "Confirm Shaming",
        simple_title: "Manipulative Guilt-Trip Button",
        simple_explanation: "The store uses wording like 'No, I don't want to save money' to make you feel bad for declining an upsell.",
        ccpa_section: "CCPA 2023 Guideline 4(c)",
        severity_score: 15,
        keywords: [
          "no, i don't want to save money", "no, i dont want to save money",
          "no, i do not want to save money", "no, i don't want to save",
          "no, i hate discounts", "no, i hate saving",
          "no thanks, i'll pay full price", "no thanks, i will pay full price",
          "no, i prefer paying full price", "no, i prefer paying more",
          "i'll risk it", "i will risk it",
          "no, skip protection", "no, i don't care about protection",
          "no, i dont need warranty", "no, i don't want to protect",
          "no, i dont want to protect", "no, i like paying more",
          "decline discount", "decline protection",
          "pay without buyer protection", "i'll take my chances",
          "no, i don't deserve this discount", "skip & continue", "skip and continue"
        ]
      },
      trick_questions: {
        name: "Trick Questions",
        simple_title: "Confusing Double-Negative Checkbox",
        simple_explanation: "Phrased with confusing negatives (e.g. 'Don't un-subscribe') so you accidentally opt into spam or charges.",
        ccpa_section: "CCPA 2023 Guideline 4(j)",
        severity_score: 15,
        double_negative_regexes: [
          "don'?t\\s+un-?subscribe", "do\\s+not\\s+un-?subscribe",
          "do\\s+not\\s+uncheck", "don'?t\\s+uncheck",
          "uncheck\\s+if\\s+you\\s+(?:do\\s+not|don'?t)\\s+wish",
          "uncheck\\s+to\\s+not\\s+receive", "do\\s+not\\s+opt\\s+out",
          "don'?t\\s+wish\\s+to\\s+opt\\s+out", "avoid\\s+missing", "prevent\\s+cancellation"
        ]
      },
      disguised_ads: {
        name: "Disguised Advertisement",
        simple_title: "Promoted Third-Party Ads",
        simple_explanation: "These are paid advertisements from sellers disguised to look like genuine customer recommendations.",
        ccpa_section: "CCPA 2023 Guideline 4(f)",
        severity_score: 15,
        sponsored_keywords: [
          "sponsored", "promoted", "advertisement", "ad:", "ad •",
          "recommended partner", "paid partner"
        ]
      },
      interface_interference: {
        name: "Interface Interference",
        simple_title: "Manipulative Visual Bias",
        simple_explanation: "The expensive button is huge and bright, while the decline button is made tiny and grey to hide it.",
        ccpa_section: "CCPA 2023 Guideline 4(g)",
        severity_score: 15
      },
      false_urgency: {
        name: "False Urgency",
        simple_title: "Artificial Pressure / Timer",
        simple_explanation: "Urgency claims (like fake countdowns or 'Only 1 left') designed to rush you into buying before comparing.",
        ccpa_section: "CCPA 2023 Guideline 4(a)",
        severity_score: 15,
        scarcity_patterns: [
          "(?:only|just)\\s+(\\d+)\\s+(?:left|remaining|in\\s+stock)",
          "hurry[!,\\s]+(?:only\\s+)?(?:a\\s+few|\\d+)\\s+left",
          "(\\d+)\\s+people\\s+(?:are\\s+)?viewing",
          "(\\d+)\\s+people\\s+have\\s+this\\s+in\\s+(?:their\\s+)?cart",
          "deal\\s+ends\\s+in", "lightning\\s+deal", "ends\\s+in\\s+\\d+",
          "high\\s+demand", "selling\\s+fast"
        ],
        social_proof_patterns: [
          "([A-Za-z]+)\\s+from\\s+([A-Za-z\\s]+)\\s+just\\s+bought",
          "recent\\s+purchase\\s+by\\s+([A-Za-z]+)"
        ]
      }
    }
  };

  let rules = DEFAULT_RULES;
  let findings = [];
  let deTrappedElements = [];
  let savedAmount = 0;
  let observer = null;
  let isScanning = false;
  let scanDebounceTimer = null;
  let isDrawerOpen = false;
  let currentPageStage = 'product';

  const RUPEE_REGEX = /(?:₹|Rs\.?|INR|\u20B9)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:₹|Rs\.?|INR|\u20B9)/i;

  function parseRupeeAmount(text) {
    if (!text) return null;
    const cleaned = text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
    const match = cleaned.match(RUPEE_REGEX);
    if (match) {
      const raw = match[1] || match[2];
      if (raw) {
        const num = parseFloat(raw.replace(/,/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }
    return null;
  }

  function getElementKey(el) {
    if (!el) return '';
    const tag = el.tagName || '';
    const id = el.id ? '#' + el.id : '';
    const cls = el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '';
    const textSnippet = (el.innerText || el.textContent || '').slice(0, 30).trim();
    return `${tag}${id}${cls}|${textSnippet}`;
  }

  function isSensitiveElement(el) {
    if (!el) return false;
    const type = (el.type || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    const auto = (el.autocomplete || '').toLowerCase();

    if (type === 'password' || type === 'tel') return true;
    if (auto.includes('cc-') || auto.includes('cvv') || auto.includes('card')) return true;
    if (name.includes('card') || name.includes('cvv') || name.includes('upi') || name.includes('pin') || name.includes('pass')) return true;
    if (id.includes('card') || id.includes('cvv') || id.includes('upi') || id.includes('pin') || id.includes('pass')) return true;
    return false;
  }

  function isStrikeThrough(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    if (['del', 's', 'strike'].includes(tag)) return true;
    if (el.classList && (el.classList.contains('original-price') || el.classList.contains('a-text-strike') || el.classList.contains('_3I9_wc'))) return true;
    const style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (style && style.textDecorationLine && style.textDecorationLine.includes('line-through')) return true;
    if (el.closest('del, s, strike, .original-price, .a-text-strike, [style*="line-through"]')) return true;
    return false;
  }

  // =========================================================================
  // STORE & PRODUCT IDENTITY (Simple English metadata)
  // =========================================================================
  function getStoreMetadata() {
    const host = window.location.hostname.toLowerCase();
    let storeName = 'Online Store';
    let storeEmoji = '🛍️';

    if (host.includes('amazon.in')) {
      storeName = 'Amazon India';
      storeEmoji = '🛒';
    } else if (host.includes('amazon.')) {
      storeName = 'Amazon';
      storeEmoji = '🛒';
    } else if (host.includes('flipkart.com')) {
      storeName = 'Flipkart';
      storeEmoji = '🛍️';
    } else if (host.includes('myntra.com')) {
      storeName = 'Myntra';
      storeEmoji = '👗';
    } else if (host.includes('swiggy.com')) {
      storeName = 'Swiggy';
      storeEmoji = '🍔';
    } else if (host.includes('zomato.com')) {
      storeName = 'Zomato';
      storeEmoji = '🍕';
    } else if (host.includes('localhost') || host === '127.0.0.1') {
      storeName = 'CartGuard Test Store';
      storeEmoji = '🏪';
    } else if (host) {
      storeName = host.replace('www.', '').split('.')[0];
      storeName = storeName.charAt(0).toUpperCase() + storeName.slice(1);
    }

    // Scrape product title
    let productName = '';
    const titleCandidates = [
      '#productTitle', 'h1#title', 'h1.product-title',
      'span.B_NuCI', 'h1._6EBuvT', 'h1.VU-ZEz', 'h1'
    ];
    for (const sel of titleCandidates) {
      const el = document.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 3) {
        productName = el.innerText.trim();
        break;
      }
    }
    if (!productName) {
      const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
      if (ogTitle) productName = ogTitle.trim();
    }
    if (!productName) {
      productName = document.title.split(/[:\-|]/)[0].trim();
    }
    if (!productName || productName.toLowerCase().includes('shopping cart') || productName.toLowerCase().includes('checkout')) {
      productName = currentPageStage === 'cart' ? 'Shopping Cart Review' : (currentPageStage === 'checkout_payment' ? 'Payment Checkout' : 'Current Product');
    }

    // Truncate cleanly if too long
    if (productName.length > 55) {
      productName = productName.slice(0, 52) + '...';
    }

    // Live price
    const priceCandidates = Array.from(document.querySelectorAll(
      '.deal-price, .product-price, .price-tag, [id*="grand-total"], [id*="final-total"], .summary-total, .a-price .a-offscreen'
    ));
    let listedPrice = '';
    for (const el of priceCandidates) {
      if (isStrikeThrough(el)) continue;
      const amt = parseRupeeAmount(el.innerText || el.textContent);
      if (amt !== null) {
        listedPrice = `₹${amt.toLocaleString('en-IN')}`;
        break;
      }
    }

    return { storeName, storeEmoji, productName, listedPrice };
  }

  // =========================================================================
  // PAGE-STAGE DETECTION & PRICE TRAIL PER TAB
  // =========================================================================
  function detectPageStage() {
    const rawPath = window.location.pathname.toLowerCase();
    const filename = rawPath.split('/').pop() || '';
    const pageText = (document.body ? document.body.innerText : '').toLowerCase();

    // 1. Explicit payment / checkout check
    if (filename === 'payment.html' || rawPath.endsWith('/checkout') || rawPath.endsWith('/payment') || rawPath.includes('/checkout/') || rawPath.includes('/payment/')) {
      return 'checkout_payment';
    }

    // 2. Explicit cart check
    if (filename === 'cart.html' || rawPath.endsWith('/cart') || rawPath.endsWith('/viewcart') || rawPath.includes('/cart/') || rawPath.includes('/viewcart/')) {
      return 'cart';
    }

    // 3. Explicit product check
    if (filename === 'amazon_product.html' || filename === 'listing.html' || filename === 'index.html' || rawPath.includes('/dp/') || rawPath.includes('/product/') || rawPath.includes('/p/')) {
      return 'product';
    }

    // Fallback based on DOM cues:
    const cues = rules.stage_rules.stage_cues;
    let checkoutCues = 0;
    for (const kw of cues.checkout_payment.dom_keywords) {
      if (pageText.includes(kw)) checkoutCues++;
    }
    if (checkoutCues >= 2 && (pageText.includes('total payable') || pageText.includes('payment method') || pageText.includes('pay securely'))) {
      return 'checkout_payment';
    }

    let cartCues = 0;
    for (const kw of cues.cart.dom_keywords) {
      if (pageText.includes(kw)) cartCues++;
    }
    if (cartCues >= 2 && (pageText.includes('shopping cart') || pageText.includes('proceed to checkout') || pageText.includes('proceed to buy'))) {
      return 'cart';
    }

    return 'product';
  }

  function getPriceTrail() {
    try {
      const raw = sessionStorage.getItem('cartguard_price_trail');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function updatePriceTrail(stage, price) {
    if (!price || typeof price !== 'number') return;
    try {
      const trail = getPriceTrail();
      trail[stage] = price;
      sessionStorage.setItem('cartguard_price_trail', JSON.stringify(trail));
    } catch {}
  }

  function extractVisiblePagePrice() {
    const priceCandidates = Array.from(document.querySelectorAll(
      '.product-price, .deal-price, [id*="grand-total"], [id*="final-total"], .summary-total, .price-tag, .a-price .a-offscreen'
    ));
    for (const el of priceCandidates) {
      if (isStrikeThrough(el)) continue;
      const amt = parseRupeeAmount(el.innerText || el.textContent);
      if (amt !== null) return amt;
    }
    return null;
  }

  // =========================================================================
  // DETECTOR 1: PRE-TICKED ADD-ONS (Basket Sneaking)
  // =========================================================================
  function detectPreCheckedAddons(flaggedKeys) {
    const list = [];
    const checkboxes = Array.from(document.querySelectorAll(
      'input[type="checkbox"]:checked, [role="checkbox"][aria-checked="true"], [role="switch"][aria-checked="true"]'
    ));

    for (const el of checkboxes) {
      if (isSensitiveElement(el)) continue;
      if (el.closest('#cartguard-floating-badge') || el.closest('#cartguard-toast') || el.closest('#cartguard-drawer-overlay')) continue;

      const key = getElementKey(el);
      if (flaggedKeys.has(key)) continue;

      let container = el.closest('label') || el.closest('.addon-row') || el.closest('.addon-card') || el.closest('tr') || el.parentElement;
      let text = '';
      if (el.labels && el.labels.length > 0) {
        text = Array.from(el.labels).map(l => l.innerText || l.textContent).join(' ');
      }
      if (!text && container) {
        text = container.innerText || container.textContent || '';
      }

      // Skip trick questions
      const isTrick = rules?.patterns?.trick_questions?.double_negative_regexes?.some(rx => new RegExp(rx, 'i').test(text));
      if (isTrick) continue;

      // Skip terms from ignore list
      const lower = text.toLowerCase();
      if (rules.allowlist_and_ignore.ignore_fee_keywords.some(ign => lower.includes(ign))) continue;

      const amount = parseRupeeAmount(text);
      if (amount !== null) {
        flaggedKeys.add(key);
        const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 100);
        list.push({
          id: 'precheck_' + Math.random().toString(36).substr(2, 9),
          type: 'prechecked_addon',
          ccpa_pattern_name: rules?.patterns?.basket_sneaking?.name || 'Basket Sneaking',
          simple_title: rules?.patterns?.basket_sneaking?.simple_title || 'Sneaky Pre-checked Add-on',
          simple_explanation: rules?.patterns?.basket_sneaking?.simple_explanation || 'Pre-selected for you without explicit consent.',
          ccpa_section: rules?.patterns?.basket_sneaking?.ccpa_section || 'CCPA 2023 Guideline 4(b)',
          evidence_text: `Pre-ticked option: "${snippet}"`,
          amount: amount,
          isOptional: true,
          confidence: 'High',
          element: el,
          container: container
        });

        if (container && !container.classList.contains('cartguard-highlight-optional')) {
          container.classList.add('cartguard-highlight-optional');
        }
      }
    }
    return list;
  }

  // =========================================================================
  // DETECTOR 2: STRICT HIDDEN FEES (Drip Pricing)
  // =========================================================================
  function detectHiddenFees(flaggedKeys, alreadyFoundCheckboxes = new Set()) {
    // Only reported on cart or checkout_payment stages
    if (!rules.stage_rules.drip_pricing_allowed_stages.includes(currentPageStage)) {
      return [];
    }

    const list = [];
    const feeKeywords = rules?.patterns?.drip_pricing?.fee_keywords || [];
    const ignoreKeywords = rules?.allowlist_and_ignore?.ignore_fee_keywords || [];
    const summarySelectors = rules?.allowlist_and_ignore?.order_summary_containers || [];

    const summaryContainers = Array.from(document.querySelectorAll(summarySelectors.join(','))).filter(c => {
      if (c.closest('#cartguard-floating-badge') || c.closest('#cartguard-toast') || c.closest('#cartguard-drawer-overlay')) return false;
      return true;
    });

    const allDivs = Array.from(document.querySelectorAll('div, table, section'));
    for (const d of allDivs) {
      if (summaryContainers.includes(d)) continue;
      if (d.closest('#cartguard-floating-badge') || d.closest('#cartguard-toast') || d.closest('#cartguard-drawer-overlay')) continue;
      const headText = (d.querySelector('h1, h2, h3, h4, th, .header')?.innerText || '').toLowerCase();
      if (headText.includes('summary') || headText.includes('price details') || headText.includes('bill details') || headText.includes('payment summary')) {
        summaryContainers.push(d);
      }
    }

    if (summaryContainers.length === 0) {
      return [];
    }

    const seenLineElements = new Set();
    const priceTrail = getPriceTrail();
    const hasStagePriceIncrease = (priceTrail.product && priceTrail.cart && priceTrail.cart > priceTrail.product) ||
                                  (priceTrail.cart && priceTrail.checkout_payment && priceTrail.checkout_payment > priceTrail.cart);

    for (const container of summaryContainers) {
      const lineElements = Array.from(container.querySelectorAll('tr, .summary-line, div, p, li'));

      for (const lineEl of lineElements) {
        if (lineEl.children.length > 4) continue;
        if (seenLineElements.has(lineEl)) continue;

        const lineText = (lineEl.innerText || lineEl.textContent || '').replace(/\s+/g, ' ').trim();
        const lineTextLower = lineText.toLowerCase();

        const matchedKw = feeKeywords.find(kw => lineTextLower.includes(kw));
        if (!matchedKw) continue;

        if (ignoreKeywords.some(ign => lineTextLower.includes(ign))) continue;
        if (isStrikeThrough(lineEl)) continue;

        const checkbox = lineEl.querySelector('input[type="checkbox"], input[type="radio"], [role="checkbox"]');
        if (checkbox && alreadyFoundCheckboxes.has(checkbox)) continue;

        const amount = parseRupeeAmount(lineText);
        if (amount !== null) {
          seenLineElements.add(lineEl);
          const key = getElementKey(lineEl);
          if (flaggedKeys.has(key)) continue;
          flaggedKeys.add(key);

          const isOptional = !!checkbox;
          const confidence = (hasStagePriceIncrease || currentPageStage === 'checkout_payment') ? 'High' : 'Medium';

          list.push({
            id: 'fee_' + Math.random().toString(36).substr(2, 9),
            type: 'hidden_fee',
            fee_classification: isOptional ? 'optional' : 'mandatory',
            ccpa_pattern_name: rules?.patterns?.drip_pricing?.name || 'Drip Pricing',
            simple_title: rules?.patterns?.drip_pricing?.simple_title || 'Surprise Fee at Checkout',
            simple_explanation: rules?.patterns?.drip_pricing?.simple_explanation || 'Fee not shown on the product page.',
            ccpa_section: rules?.patterns?.drip_pricing?.ccpa_section || 'CCPA 2023 Guideline 4(e)',
            evidence_text: `${isOptional ? 'Optional' : 'Mandatory'} fee in summary: "${lineText.slice(0, 100)}"`,
            amount: amount,
            isOptional: isOptional,
            confidence: confidence,
            element: checkbox || lineEl,
            container: lineEl
          });

          if (!isOptional && lineEl) {
            lineEl.classList.add('cartguard-highlight-mandatory');
          } else if (isOptional && lineEl) {
            lineEl.classList.add('cartguard-highlight-optional');
          }
        }
      }
    }

    return list;
  }

  // =========================================================================
  // DETECTOR 3: CONFIRMSHAMING (Confirm Shaming)
  // =========================================================================
  function detectConfirmshaming(flaggedKeys) {
    const list = [];
    const keywords = rules?.patterns?.confirmshaming?.keywords || [];
    const clickables = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"], .confirmshame-btn, .decline-btn-tiny'));

    for (const el of clickables) {
      if (el.closest('#cartguard-floating-badge') || el.closest('#cartguard-toast') || el.closest('#cartguard-drawer-overlay')) continue;
      const text = (el.innerText || el.value || el.textContent || '').toLowerCase().trim();
      if (!text || text.length > 150) continue;

      for (const kw of keywords) {
        if (text.includes(kw)) {
          const key = getElementKey(el);
          if (flaggedKeys.has(key)) continue;
          flaggedKeys.add(key);

          list.push({
            id: 'shame_' + Math.random().toString(36).substr(2, 9),
            type: 'confirmshaming',
            ccpa_pattern_name: rules?.patterns?.confirmshaming?.name || 'Confirm Shaming',
            simple_title: rules?.patterns?.confirmshaming?.simple_title || 'Manipulative Guilt-Trip Button',
            simple_explanation: rules?.patterns?.confirmshaming?.simple_explanation || 'Uses guilt-inducing words to nudge you into accepting offers.',
            ccpa_section: rules?.patterns?.confirmshaming?.ccpa_section || 'CCPA 2023 Guideline 4(c)',
            evidence_text: `Guilt-trip button: "${(el.innerText || el.value).trim().slice(0, 80)}"`,
            amount: null,
            isOptional: false,
            confidence: 'Medium',
            element: el
          });
          el.classList.add('cartguard-highlight-shame');
          break;
        }
      }
    }
    return list;
  }

  // =========================================================================
  // DETECTOR 4: TRICK QUESTIONS (Trick Questions)
  // =========================================================================
  function detectTrickQuestions(flaggedKeys) {
    const list = [];
    const regexes = rules?.patterns?.trick_questions?.double_negative_regexes || [];
    const labels = Array.from(document.querySelectorAll('label, div, p, span'));

    for (const el of labels) {
      if (el.closest('#cartguard-floating-badge') || el.closest('#cartguard-toast') || el.closest('#cartguard-drawer-overlay')) continue;
      if (el.children.length > 2) continue;

      const text = (el.innerText || el.textContent || '').trim();
      if (!text || text.length > 160) continue;

      for (const rxStr of regexes) {
        const rx = new RegExp(rxStr, 'i');
        if (rx.test(text)) {
          const checkbox = el.querySelector('input[type="checkbox"]') || el.closest('label')?.querySelector('input[type="checkbox"]');
          const key = getElementKey(checkbox || el);
          if (flaggedKeys.has(key)) continue;
          flaggedKeys.add(key);

          list.push({
            id: 'trick_' + Math.random().toString(36).substr(2, 9),
            type: 'trick_question',
            ccpa_pattern_name: rules?.patterns?.trick_questions?.name || 'Trick Questions',
            simple_title: rules?.patterns?.trick_questions?.simple_title || 'Confusing Double-Negative Checkbox',
            simple_explanation: rules?.patterns?.trick_questions?.simple_explanation || 'Phrased with confusing negatives to misdirect user choice.',
            ccpa_section: rules?.patterns?.trick_questions?.ccpa_section || 'CCPA 2023 Guideline 4(j)',
            evidence_text: `Double-negative phrasing: "${text.slice(0, 100)}"`,
            amount: null,
            isOptional: false,
            confidence: 'Medium',
            element: checkbox || el
          });
          el.classList.add('cartguard-highlight-trick');
          break;
        }
      }
    }
    return list;
  }

  // =========================================================================
  // DETECTOR 5: DISGUISED ADS (Grouped, clean, no breadcrumb false positives)
  // =========================================================================
  function detectDisguisedAds(flaggedKeys) {
    const list = [];
    const adKeywords = rules?.patterns?.disguised_ads?.sponsored_keywords || [];
    const items = Array.from(document.querySelectorAll('.disguised-ad-item, [class*="sponsored"], [data-component-type*="sponsored"], .addon-row, tr'));

    let totalAdsCount = 0;
    let sampleText = '';

    for (const el of items) {
      if (el.closest('#cartguard-floating-badge') || el.closest('#cartguard-toast') || el.closest('#cartguard-drawer-overlay')) continue;

      const text = (el.innerText || el.textContent || '').toLowerCase();
      if (!text || text.length > 250) continue;

      if (text.includes('>') || el.closest('nav, #wayfinding-breadcrumbs_container, .a-breadcrumb')) continue;

      for (const kw of adKeywords) {
        if (text.includes(kw)) {
          totalAdsCount++;
          if (!sampleText) {
            sampleText = (el.innerText || el.textContent).replace(/\s+/g, ' ').trim().slice(0, 70);
          }
          break;
        }
      }
    }

    if (totalAdsCount > 0) {
      const isCart = currentPageStage === 'cart';
      const label = isCart
        ? `Disguised sponsored item styled like a cart line item: "${sampleText}"`
        : `Promotional seller placement (${totalAdsCount} sponsored section${totalAdsCount > 1 ? 's' : ''} on page)`;

      list.push({
        id: 'ad_summary',
        type: 'disguised_ad',
        ccpa_pattern_name: rules?.patterns?.disguised_ads?.name || 'Disguised Advertisement',
        simple_title: rules?.patterns?.disguised_ads?.simple_title || 'Promoted Third-Party Ads',
        simple_explanation: rules?.patterns?.disguised_ads?.simple_explanation || 'Paid seller advertisements promoted on this page.',
        ccpa_section: rules?.patterns?.disguised_ads?.ccpa_section || 'CCPA 2023 Guideline 4(f)',
        evidence_text: label,
        amount: null,
        isOptional: false,
        confidence: isCart ? 'High' : 'Low',
        element: null
      });
    }

    return list;
  }

  // =========================================================================
  // DETECTOR 6: INTERFACE INTERFERENCE (Interface Interference)
  // =========================================================================
  function detectInterfaceInterference(flaggedKeys) {
    const list = [];
    const accepts = Array.from(document.querySelectorAll('.accept-btn, button[class*="primary"], a[class*="primary"], button[class*="accept"], [id*="accept"], [id*="continue"]'));
    const declines = Array.from(document.querySelectorAll('.decline-btn-tiny, button[class*="secondary"], button[class*="decline"], [id*="decline"], [id*="skip"]'));

    for (const accept of accepts) {
      for (const decline of declines) {
        const acceptRect = accept.getBoundingClientRect();
        const declineRect = decline.getBoundingClientRect();

        if (acceptRect.width > 0 && declineRect.width > 0) {
          const acceptArea = acceptRect.width * acceptRect.height;
          const declineArea = declineRect.width * declineRect.height;
          const areaRatio = acceptArea / Math.max(declineArea, 1);

          const declineStyle = window.getComputedStyle ? window.getComputedStyle(decline) : {};
          const fontSize = parseFloat(declineStyle.fontSize) || 16;
          const opacity = parseFloat(declineStyle.opacity) || 1;

          if (areaRatio > 3.5 || (fontSize <= 11 && opacity < 0.8)) {
            const pairKey = 'interface|' + getElementKey(accept) + '|' + getElementKey(decline);
            if (flaggedKeys.has(pairKey)) continue;
            flaggedKeys.add(pairKey);

            list.push({
              id: 'interface_' + Math.random().toString(36).substr(2, 9),
              type: 'interface_interference',
              ccpa_pattern_name: rules?.patterns?.interface_interference?.name || 'Interface Interference',
              simple_title: rules?.patterns?.interface_interference?.simple_title || 'Manipulative Visual Bias',
              simple_explanation: rules?.patterns?.interface_interference?.simple_explanation || 'Primary option is prominent, while alternative choices are made tiny and obscure.',
              ccpa_section: rules?.patterns?.interface_interference?.ccpa_section || 'CCPA 2023 Guideline 4(g)',
              evidence_text: `Visual bias: Primary action "${(accept.innerText || '').trim().slice(0, 30)}" is ${Math.round(areaRatio)}x larger than obscured choice "${(decline.innerText || '').trim().slice(0, 30)}"`,
              amount: null,
              isOptional: false,
              confidence: 'Medium',
              element: decline
            });
            return list;
          }
        }
      }
    }
    return list;
  }

  // =========================================================================
  // DETECTOR 7: FAKE SOCIAL PROOF & FALSE URGENCY
  // =========================================================================
  function detectFakeSocialProofAndUrgency(flaggedKeys) {
    const list = [];
    const elements = Array.from(document.querySelectorAll('.social-proof-toast, .scarcity-box, .timer-banner, [id*="scarcity"], [id*="toast"], [id*="timer"], p, span, div'));
    const seenTexts = new Set();

    for (const el of elements) {
      if (el.closest('#cartguard-floating-badge') || el.closest('#cartguard-toast') || el.closest('#cartguard-drawer-overlay')) continue;
      if (el.children.length > 3) continue;

      const text = (el.innerText || el.textContent || '').trim();
      if (!text || text.length > 200 || seenTexts.has(text)) continue;

      // 1. Social proof claim
      if (/([A-Za-z]+)\s+from\s+([A-Za-z\\s]+)\s+just\s+bought/i.test(text)) {
        seenTexts.add(text);
        const key = getElementKey(el);
        if (flaggedKeys.has(key)) continue;
        flaggedKeys.add(key);

        list.push({
          id: 'social_' + Math.random().toString(36).substr(2, 9),
          type: 'fake_social_proof',
          ccpa_pattern_name: rules?.patterns?.false_urgency?.name || 'False Urgency',
          simple_title: 'Social Proof Claim',
          simple_explanation: 'Popups showing recent purchases designed to create peer pressure.',
          ccpa_section: rules?.patterns?.false_urgency?.ccpa_section || 'CCPA 2023 Guideline 4(a)',
          evidence_text: `Social proof: "${text.slice(0, 100)}"`,
          amount: null,
          isOptional: false,
          confidence: 'Low',
          element: el
        });
        continue;
      }

      // 2. Scarcity text
      if (/(?:only|just)\s+\d+\s+(?:left|remaining|in\s+stock)/i.test(text) || /hurry[!,\\s]+(?:only\s+)?(?:a\s+few|\d+)\s+left/i.test(text)) {
        seenTexts.add(text);
        const key = getElementKey(el);
        if (flaggedKeys.has(key)) continue;
        flaggedKeys.add(key);

        list.push({
          id: 'scarcity_' + Math.random().toString(36).substr(2, 9),
          type: 'scarcity_pressure',
          ccpa_pattern_name: rules?.patterns?.false_urgency?.name || 'False Urgency',
          simple_title: 'Scarcity Pressure',
          simple_explanation: 'Stock count claims to make you feel you might miss out if you do not buy immediately.',
          ccpa_section: rules?.patterns?.false_urgency?.ccpa_section || 'CCPA 2023 Guideline 4(a)',
          evidence_text: `Scarcity: "${text.slice(0, 100)}"`,
          amount: null,
          isOptional: false,
          confidence: 'Low',
          element: el
        });
        continue;
      }

      // 3. Countdown timer
      if ((el.id.includes('timer') || el.className.includes('timer') || /ends\s+in/i.test(text)) && /\b\d{1,2}:\d{2}\b/.test(text)) {
        seenTexts.add(text);
        const key = getElementKey(el);
        if (flaggedKeys.has(key)) continue;
        flaggedKeys.add(key);

        list.push({
          id: 'timer_' + Math.random().toString(36).substr(2, 9),
          type: 'resetting_timer',
          ccpa_pattern_name: rules?.patterns?.false_urgency?.name || 'False Urgency',
          simple_title: 'Deal Countdown Timer',
          simple_explanation: 'Countdown timers to push you to complete your order quickly.',
          ccpa_section: rules?.patterns?.false_urgency?.ccpa_section || 'CCPA 2023 Guideline 4(a)',
          evidence_text: `Timer: "${text.slice(0, 80)}"`,
          amount: null,
          isOptional: false,
          confidence: 'Low',
          element: el
        });
      }
    }
    return list;
  }

  // =========================================================================
  // MASTER SCANNER & COMPUTATIONS
  // =========================================================================
  function runFullScan() {
    if (isScanning) return;
    isScanning = true;

    try {
      currentPageStage = detectPageStage();
      const visiblePrice = extractVisiblePagePrice();
      if (visiblePrice) {
        updatePriceTrail(currentPageStage, visiblePrice);
      }

      const flaggedKeys = new Set();
      const prechecked = detectPreCheckedAddons(flaggedKeys);
      const precheckedCheckboxes = new Set(prechecked.map(p => p.element));
      const fees = detectHiddenFees(flaggedKeys, precheckedCheckboxes);

      const allFindings = [
        ...prechecked,
        ...fees,
        ...detectConfirmshaming(flaggedKeys),
        ...detectTrickQuestions(flaggedKeys),
        ...detectDisguisedAds(flaggedKeys),
        ...detectInterfaceInterference(flaggedKeys),
        ...detectFakeSocialProofAndUrgency(flaggedKeys)
      ];

      const unique = [];
      const seen = new Set();
      for (const f of allFindings) {
        const key = f.type + '|' + f.evidence_text;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(f);
        }
      }

      findings = unique;
      updateFloatingBadge();
      if (isDrawerOpen) renderInPageDrawer();
    } finally {
      isScanning = false;
    }
  }

  function debouncedScan() {
    if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(runFullScan, 300);
  }

  function calculateExtraCharges() {
    let sum = 0;
    for (const f of findings) {
      if ((f.type === 'prechecked_addon' || f.type === 'hidden_fee') && typeof f.amount === 'number') {
        sum += f.amount;
      }
    }
    return Math.round(sum * 100) / 100;
  }

  function calculateDarkPatternScore() {
    let score = 0;
    const reasons = [];

    const prechecked = findings.filter(f => f.type === 'prechecked_addon');
    if (prechecked.length > 0) {
      const pts = Math.min(30, prechecked.length * 10);
      score += pts;
      reasons.push(`${prechecked.length} pre-ticked add-on(s) (+${pts} pts)`);
    }

    const fees = findings.filter(f => f.type === 'hidden_fee');
    if (fees.length > 0) {
      const mandCount = fees.filter(f => f.fee_classification === 'mandatory').length;
      const optCount = fees.filter(f => f.fee_classification === 'optional').length;
      const pts = Math.min(25, mandCount * 15 + optCount * 10);
      score += pts;
      reasons.push(`Drip pricing fees (+${pts} pts)`);
    }

    const shame = findings.filter(f => f.type === 'confirmshaming');
    if (shame.length > 0) {
      score += 15;
      reasons.push(`Guilt-trip button phrasing (+15 pts)`);
    }

    const trick = findings.filter(f => f.type === 'trick_question');
    if (trick.length > 0) {
      score += 15;
      reasons.push(`Double-negative checkboxes (+15 pts)`);
    }

    const ads = findings.filter(f => f.type === 'disguised_ad');
    if (ads.length > 0) {
      score += 10;
      reasons.push(`Promoted seller ads on page (+10 pts)`);
    }

    const interference = findings.filter(f => f.type === 'interface_interference');
    if (interference.length > 0) {
      score += 15;
      reasons.push(`Visual button bias (+15 pts)`);
    }

    const urgency = findings.filter(f => f.type === 'fake_social_proof' || f.type === 'scarcity_pressure' || f.type === 'resetting_timer');
    if (urgency.length > 0) {
      score += 10;
      reasons.push(`Urgency / scarcity claims (+10 pts)`);
    }

    return { score: Math.min(100, score), reasons };
  }

  // =========================================================================
  // ONE SUMMARY FLOATING BADGE & PLAIN ENGLISH IN-PAGE DRAWER
  // =========================================================================
  function updateFloatingBadge() {
    let badge = document.getElementById('cartguard-floating-badge');
    const extraCharges = calculateExtraCharges();
    const meta = getStoreMetadata();

    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'cartguard-floating-badge';
      document.body.appendChild(badge);
    }

    if (extraCharges > 0) {
      badge.className = 'cartguard-badge-alert';
      badge.innerHTML = `
        <span class="cartguard-badge-icon">🛡️</span>
        <div class="cartguard-badge-text">
          <span>Extra charges:</span>
          <span class="cartguard-badge-amount">₹${extraCharges}</span>
          <span>Click to fix</span>
        </div>
        <button class="cartguard-badge-btn" id="cartguard-badge-detrap-btn">De-Trap</button>
      `;

      badge.querySelector('#cartguard-badge-detrap-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        executeDeTrap();
      });

      badge.onclick = () => toggleInPageDrawer();
    } else if (findings.length > 0) {
      badge.className = 'cartguard-badge-alert';
      badge.innerHTML = `
        <span class="cartguard-badge-icon">🛡️</span>
        <div class="cartguard-badge-text">
          <span>${meta.storeName}: Price is Fair (₹0 Extra)</span>
        </div>
        <button class="cartguard-badge-btn" id="cartguard-badge-review-btn">View</button>
      `;

      badge.querySelector('#cartguard-badge-review-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleInPageDrawer();
      });

      badge.onclick = () => toggleInPageDrawer();
    } else {
      badge.className = 'cartguard-badge-clean';
      badge.innerHTML = `
        <span class="cartguard-badge-icon">🛡️</span>
        <div class="cartguard-badge-text">
          <span>CartGuard: No Dark Patterns Detected</span>
        </div>
      `;
      badge.onclick = () => toggleInPageDrawer();
    }
  }

  function toggleInPageDrawer() {
    isDrawerOpen = !isDrawerOpen;
    let drawer = document.getElementById('cartguard-drawer-overlay');
    if (isDrawerOpen) {
      if (!drawer) {
        drawer = document.createElement('div');
        drawer.id = 'cartguard-drawer-overlay';
        document.body.appendChild(drawer);
      }
      renderInPageDrawer();
    } else if (drawer) {
      drawer.remove();
    }
  }

  function renderInPageDrawer() {
    const drawer = document.getElementById('cartguard-drawer-overlay');
    if (!drawer) return;

    const extraCharges = calculateExtraCharges();
    const scoreData = calculateDarkPatternScore();
    const meta = getStoreMetadata();

    let findingsHtml = '';
    if (findings.length === 0) {
      findingsHtml = `
        <div style="text-align: center; padding: 24px 16px; background: #1e293b; border-radius: 12px; border: 1px dashed #334155;">
          <div style="font-size: 2rem; margin-bottom: 6px;">✅</div>
          <div style="font-weight: 700; font-size: 0.95rem; color: #34d399;">100% Genuine & Clean Checkout</div>
          <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 6px; line-height: 1.4;">
            ${meta.storeName} is not sneaking any extra charges or pre-selected services. You only pay what is shown.
          </div>
        </div>
      `;
    } else {
      findings.forEach(f => {
        const isMandatory = f.fee_classification === 'mandatory';
        const isHigh = f.confidence === 'High';
        const statusLabel = isHigh ? 'Detected Trap' : 'Informational Notice';
        const statusColor = isHigh ? '#f43f5e' : '#38bdf8';

        findingsHtml += `
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <div>
                <div style="font-size: 0.85rem; font-weight: 700; color: #f8fafc;">
                  ${f.simple_title || f.ccpa_pattern_name}
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px; line-height: 1.35;">
                  ${f.simple_explanation || ''}
                </div>
              </div>
              ${typeof f.amount === 'number' ? `<span style="font-weight: 800; font-size: 0.95rem; color: ${isMandatory ? '#f87171' : '#fbbf24'}; flex-shrink: 0;">₹${f.amount}</span>` : ''}
            </div>

            <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 10px; border-radius: 6px; font-size: 0.75rem; color: #cbd5e1; border-left: 3px solid #38bdf8; margin-top: 4px;">
              ${escapeHtml(f.evidence_text)}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 0.65rem;">
              <span style="color: ${statusColor}; font-weight: 700;">${statusLabel}</span>
              <span style="color: #64748b;">${f.ccpa_section || 'CCPA 2023'}</span>
            </div>
          </div>
        `;
      });
    }

    drawer.innerHTML = `
      <div class="cartguard-drawer-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.2rem;">🛡️</span>
          <div>
            <div style="font-weight: 800; font-size: 1rem; color: #38bdf8; line-height: 1.2;">CartGuard</div>
            <div style="font-size: 0.65rem; color: #94a3b8;">Consumer Protection Shield</div>
          </div>
        </div>
        <button class="cartguard-drawer-close" id="cartguard-drawer-close-btn">&times;</button>
      </div>

      <div class="cartguard-drawer-content">
        <!-- Store & Product Context Card (Understood by anyone) -->
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 12px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.7rem; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px;">
              ${meta.storeEmoji} ${meta.storeName}
            </span>
            <span style="font-size: 0.65rem; background: #0f172a; color: #94a3b8; padding: 2px 6px; border-radius: 4px;">
              ${currentPageStage === 'product' ? 'Product Page' : (currentPageStage === 'cart' ? 'Cart Stage' : 'Payment Stage')}
            </span>
          </div>
          <div style="font-weight: 700; font-size: 0.9rem; color: #f8fafc; line-height: 1.3;">
            ${escapeHtml(meta.productName)}
          </div>
          ${meta.listedPrice ? `
            <div style="margin-top: 6px; font-size: 0.8rem; color: #10b981; font-weight: 700;">
              Listed Price: ${meta.listedPrice}
            </div>
          ` : ''}
        </div>

        <!-- Plain English Verdict Card -->
        <div style="background: ${extraCharges > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; border: 1.5px solid ${extraCharges > 0 ? '#ef4444' : '#10b981'}; border-radius: 12px; padding: 14px; text-align: center;">
          <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: ${extraCharges > 0 ? '#fca5a5' : '#a7f3d0'}; font-weight: 700;">
            ${extraCharges > 0 ? '⚠️ Sneaky Extra Charges Added' : '🟢 Price is Fair & Genuine'}
          </div>
          <div style="font-size: 1.8rem; font-weight: 800; color: ${extraCharges > 0 ? '#f87171' : '#34d399'}; margin: 4px 0;">
            ${extraCharges > 0 ? `+₹${extraCharges}` : '₹0 Extra'}
          </div>
          <div style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.35;">
            ${extraCharges > 0
              ? `You are being charged ₹${extraCharges} more than the product price. Click De-Trap below to remove unnecessary add-ons.`
              : `You only pay the genuine price shown. No hidden checkout fees were sneaked onto this item.`}
          </div>
        </div>

        <!-- One-Tap De-Trap Actions -->
        ${extraCharges > 0 ? `
          <button id="cartguard-drawer-detrap-btn" style="background: #10b981; color: #0f172a; border: none; padding: 12px; border-radius: 10px; font-weight: 800; font-size: 0.95rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
            🛡️ Remove Sneaky Add-ons (Save ₹${extraCharges})
          </button>
        ` : ''}

        ${deTrappedElements.length > 0 ? `
          <button id="cartguard-drawer-undo-btn" style="background: #334155; color: #fff; border: 1px solid #475569; padding: 10px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer;">
            ↩️ Undo (Put Add-ons Back)
          </button>
        ` : ''}

        <!-- Itemized Breakdown in Simple English -->
        <div style="font-size: 0.8rem; font-weight: 700; color: #cbd5e1; margin-top: 4px; display: flex; justify-content: space-between;">
          <span>What Was Scanned on this Page</span>
          <span>${findings.length} item(s)</span>
        </div>
        ${findingsHtml}
      </div>
    `;

    document.getElementById('cartguard-drawer-close-btn')?.addEventListener('click', toggleInPageDrawer);
    document.getElementById('cartguard-drawer-detrap-btn')?.addEventListener('click', () => {
      executeDeTrap();
      renderInPageDrawer();
    });
    document.getElementById('cartguard-drawer-undo-btn')?.addEventListener('click', () => {
      executeUndoDeTrap();
      renderInPageDrawer();
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  // =========================================================================
  // ONE-TAP DE-TRAP (Unticks ONLY optional add-ons, preserves mandatory)
  // =========================================================================
  function executeDeTrap() {
    let totalSaved = 0;
    deTrappedElements = [];

    for (const f of findings) {
      if (f.isOptional && f.element) {
        const input = f.element.tagName === 'INPUT' ? f.element : f.element.querySelector('input[type="checkbox"], input[type="radio"]');
        if (input && input.checked) {
          input.checked = false;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('click', { bubbles: true }));

          deTrappedElements.push({
            input: input,
            amount: f.amount || 0
          });
          if (typeof f.amount === 'number') {
            totalSaved += f.amount;
          }
        }
      }
    }

    savedAmount = Math.round(totalSaved * 100) / 100;
    showToast(`Saved ₹${savedAmount} by unticking optional add-ons!`, true);
    debouncedScan();
    return savedAmount;
  }

  function executeUndoDeTrap() {
    for (const item of deTrappedElements) {
      if (item.input) {
        item.input.checked = true;
        item.input.dispatchEvent(new Event('change', { bubbles: true }));
        item.input.dispatchEvent(new Event('click', { bubbles: true }));
      }
    }
    deTrappedElements = [];
    savedAmount = 0;
    showToast('De-Trap undone. Optional items restored.', false);
    debouncedScan();
  }

  function showToast(message, allowUndo = false) {
    let toast = document.getElementById('cartguard-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cartguard-toast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <span>🛡️ ${message}</span>
      ${allowUndo ? '<button class="cartguard-toast-undo" id="cartguard-undo-btn">Undo</button>' : ''}
    `;

    if (allowUndo) {
      toast.querySelector('#cartguard-undo-btn')?.addEventListener('click', () => {
        executeUndoDeTrap();
        toast.remove();
      });
    }

    setTimeout(() => {
      if (toast && toast.parentElement) toast.remove();
    }, 6000);
  }

  // =========================================================================
  // SPA NAVIGATION HOOK & DEBOUNCED MUTATION OBSERVER (300 ms)
  // =========================================================================
  function hookSPANavigation() {
    const origPushState = history.pushState;
    if (origPushState) {
      history.pushState = function () {
        origPushState.apply(this, arguments);
        setTimeout(runFullScan, 300);
      };
    }

    const origReplaceState = history.replaceState;
    if (origReplaceState) {
      history.replaceState = function () {
        origReplaceState.apply(this, arguments);
        setTimeout(runFullScan, 300);
      };
    }

    window.addEventListener('popstate', () => setTimeout(runFullScan, 300));
    window.addEventListener('hashchange', () => setTimeout(runFullScan, 300));
  }

  function initMutationObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      for (const m of mutations) {
        if (m.target && (
          m.target.id === 'cartguard-floating-badge' ||
          m.target.id === 'cartguard-toast' ||
          m.target.id === 'cartguard-drawer-overlay' ||
          m.target.closest?.('#cartguard-drawer-overlay')
        )) {
          continue;
        }
        if (m.addedNodes.length > 0 || m.type === 'attributes') {
          shouldRescan = true;
          break;
        }
      }
      if (shouldRescan) {
        debouncedScan();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['checked', 'style', 'class', 'aria-checked']
    });
  }

  // =========================================================================
  // EXTENSION POPUP COMMUNICATION
  // =========================================================================
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_DATA') {
      const scoreData = calculateDarkPatternScore();
      const meta = getStoreMetadata();
      const cleanFindings = findings.map(f => ({
        id: f.id,
        type: f.type,
        ccpa_pattern_name: f.ccpa_pattern_name,
        simple_title: f.simple_title,
        simple_explanation: f.simple_explanation,
        ccpa_section: f.ccpa_section,
        evidence_text: f.evidence_text,
        amount: f.amount,
        isOptional: f.isOptional,
        confidence: f.confidence,
        fee_classification: f.fee_classification
      }));

      sendResponse({
        findings: cleanFindings,
        extraCharged: calculateExtraCharges(),
        score: scoreData.score,
        reasons: scoreData.reasons,
        savedAmount: savedAmount,
        hasUndo: deTrappedElements.length > 0,
        pageStage: currentPageStage,
        storeMeta: meta
      });
      return true;
    }

    if (request.action === 'EXECUTE_DETRAP') {
      const saved = executeDeTrap();
      sendResponse({ savedAmount: saved });
      return true;
    }

    if (request.action === 'EXECUTE_UNDO') {
      executeUndoDeTrap();
      sendResponse({ status: 'undone' });
      return true;
    }
  });

  // INITIALIZATION
  function init() {
    hookSPANavigation();
    runFullScan();
    initMutationObserver();
    setTimeout(runFullScan, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
