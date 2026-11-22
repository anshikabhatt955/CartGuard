// CartGuard Popup Script - Manifest V3

document.addEventListener('DOMContentLoaded', async () => {
  const extraAmountDisplay = document.getElementById('extra-amount-display');
  const extraDescDisplay = document.getElementById('extra-desc-display');
  const alertSubDisplay = document.getElementById('alert-sub-display');
  const alertBanner = document.getElementById('alert-banner');
  const detrapBtn = document.getElementById('detrap-btn');
  const detrapBtnText = document.getElementById('detrap-btn-text');
  const undoBtn = document.getElementById('undo-btn');
  const mandatoryWarning = document.getElementById('mandatory-warning');
  const findingsList = document.getElementById('findings-list');
  const findingsCountBadge = document.getElementById('findings-count-badge');
  const emptyState = document.getElementById('empty-state');
  const liveIndicator = document.getElementById('live-indicator');
  const storeNameBadge = document.getElementById('store-name-badge');
  const stageBadge = document.getElementById('stage-badge');
  const productTitleDisplay = document.getElementById('product-title-display');
  const productPriceDisplay = document.getElementById('product-price-display');

  let [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!activeTab || !activeTab.id) {
    extraDescDisplay.innerText = 'Unable to connect to active browser tab.';
    return;
  }

  function fetchPageData() {
    chrome.tabs.sendMessage(activeTab.id, { action: 'GET_DATA' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        extraDescDisplay.innerText = 'CartGuard is active. Refresh your shopping tab to scan.';
        return;
      }
      renderData(response);
    });
  }

  function renderData(data) {
    const { findings, extraCharged, score, reasons, savedAmount, hasUndo, pageStage, storeMeta } = data;

    // 1. Store & Product Metadata
    if (storeMeta) {
      if (storeNameBadge) storeNameBadge.innerText = `${storeMeta.storeEmoji} ${storeMeta.storeName}`;
      if (productTitleDisplay) productTitleDisplay.innerText = storeMeta.productName;
      if (liveIndicator) liveIndicator.innerText = storeMeta.storeName;

      if (productPriceDisplay && storeMeta.listedPrice) {
        productPriceDisplay.innerText = `Listed Price: ${storeMeta.listedPrice}`;
        productPriceDisplay.style.display = 'block';
      }
    }

    if (stageBadge && pageStage) {
      stageBadge.innerText = pageStage === 'product' ? 'Product Page' : (pageStage === 'cart' ? 'Cart Review' : 'Payment Checkout');
    }

    // 2. Plain English Verdict Banner
    if (extraCharged > 0) {
      alertBanner.classList.remove('clean');
      alertSubDisplay.innerText = '⚠️ Sneaky Extra Charges Added';
      extraAmountDisplay.innerText = `+₹${extraCharged}`;
      extraDescDisplay.innerText = `You are being charged ₹${extraCharged} more than the product price. Click 'Remove Sneaky Add-ons' below to save this money.`;
    } else {
      alertBanner.classList.add('clean');
      alertSubDisplay.innerText = '🟢 Price is Fair & Genuine';
      extraAmountDisplay.innerText = '₹0 Extra';
      extraDescDisplay.innerText = storeMeta?.storeName
        ? `${storeMeta.storeName} is not sneaking any extra charges on this item. You only pay the listed price.`
        : 'No hidden checkout fees or pre-checked add-ons detected.';
    }

    // 3. De-Trap and Undo buttons
    if (hasUndo) {
      undoBtn.style.display = 'flex';
      detrapBtnText.innerText = savedAmount > 0 ? `Saved ₹${savedAmount}!` : 'Add-ons Removed';
    } else {
      undoBtn.style.display = 'none';
      detrapBtnText.innerText = extraCharged > 0 ? `Remove Sneaky Add-ons (Save ₹${extraCharged})` : 'Remove Sneaky Add-ons';
    }

    // 4. Mandatory Fees Alert
    const hasMandatory = findings.some(f => f.fee_classification === 'mandatory');
    mandatoryWarning.style.display = hasMandatory ? 'flex' : 'none';

    // 5. Findings List in Simple English
    findingsCountBadge.innerText = findings.length;

    if (findings.length === 0) {
      findingsList.innerHTML = '';
      findingsList.appendChild(emptyState);
      emptyState.style.display = 'block';
    } else {
      findingsList.innerHTML = '';
      emptyState.style.display = 'none';

      findings.forEach(f => {
        const card = document.createElement('div');
        card.className = 'finding-card';

        let amountHtml = '';
        if (typeof f.amount === 'number') {
          const isMandatory = f.fee_classification === 'mandatory';
          amountHtml = `<span class="finding-amount-tag ${isMandatory ? '' : 'optional'}">₹${f.amount}</span>`;
        }

        const isHigh = f.confidence === 'High';
        const confidenceLabel = isHigh ? 'Detected Trap' : 'Informational Notice';
        const confidenceClass = isHigh ? 'mandatory' : 'optional';

        card.innerHTML = `
          <div class="finding-top">
            <div>
              <div class="finding-title">${escapeHtml(f.simple_title || f.ccpa_pattern_name)}</div>
              <div class="finding-explanation">${escapeHtml(f.simple_explanation || '')}</div>
            </div>
            ${amountHtml}
          </div>
          <div class="finding-evidence">${escapeHtml(f.evidence_text)}</div>
          <div class="finding-footer">
            <span class="classification-badge ${confidenceClass}">${confidenceLabel}</span>
            <span style="color: #64748b;">${escapeHtml(f.ccpa_section || 'CCPA 2023')}</span>
          </div>
        `;

        findingsList.appendChild(card);
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  detrapBtn.addEventListener('click', () => {
    chrome.tabs.sendMessage(activeTab.id, { action: 'EXECUTE_DETRAP' }, () => {
      fetchPageData();
    });
  });

  undoBtn.addEventListener('click', () => {
    chrome.tabs.sendMessage(activeTab.id, { action: 'EXECUTE_UNDO' }, () => {
      fetchPageData();
    });
  });

  fetchPageData();
});
