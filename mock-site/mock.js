// CartGuard Mock Site Interactivity & Traps Logic

// 1. FALSE URGENCY TIMER THAT RESETS ON RELOAD
// Every time the page is reloaded, the timer resets back to 05:00
let secondsRemaining = 300; // 5 minutes

function startTrapTimer() {
  const timerEl = document.getElementById("countdown-timer");
  if (!timerEl) return;

  const timerInterval = setInterval(() => {
    if (secondsRemaining <= 0) {
      // Loop back to 5 minutes (client-side simulation trick)
      secondsRemaining = 300;
    } else {
      secondsRemaining--;
    }

    const mins = String(Math.floor(secondsRemaining / 60)).padStart(2, "0");
    const secs = String(secondsRemaining % 60).padStart(2, "0");
    timerEl.innerText = `${mins}:${secs}`;
  }, 1000);
}

// 2. DYNAMIC CART RECALCULATION (FOR CART.HTML)
function updateCartPageTotal() {
  const basePrice = 2999;
  const insCheck = document.getElementById("trap-insurance");
  const carbonCheck = document.getElementById("trap-carbon");
  const priorityCheck = document.getElementById("trap-priority");
  const luggageBase = 224; // Baseline mandatory handling to reach exact ₹3,400

  let extra = luggageBase;
  if (insCheck && insCheck.checked) extra += 99;
  if (carbonCheck && carbonCheck.checked) extra += 29;
  if (priorityCheck && priorityCheck.checked) extra += 49;

  const total = basePrice + extra;

  const totalEl = document.getElementById("cart-total-display");
  if (totalEl) {
    totalEl.innerText = `₹${total.toLocaleString("en-IN")}`;
  }

  // Save current step price for price journey tracking
  sessionStorage.setItem("cartguard_step_cart", total);
}

// 3. CONFIRMSHAMING INTERACTION (FOR PAYMENT.HTML)
function triggerConfirmShame() {
  alert("Confirmshaming triggered: User opted out via guilt-inducing text ('No, I don't want to save money').");
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  startTrapTimer();
  updateCartPageTotal();
});
