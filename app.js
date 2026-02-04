/* Nexus AI - App JS (Cart + Nav + Page helpers) */

const CART_KEY = "nexus_cart_v1";

/* -----------------------------
   CART STORAGE
----------------------------- */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(item) {
  // item = { id: "starshare_1y", name: "StarShare IPTV - 1 Year", price: 50 }
  const cart = getCart();
  const existing = cart.find((x) => x.id === item.id);

  if (existing) existing.qty += 1;
  else cart.push({ ...item, qty: 1 });

  saveCart(cart);
}

function removeFromCart(id) {
  const cart = getCart().filter((x) => x.id !== id);
  saveCart(cart);
}

function updateQty(id, qty) {
  const cart = getCart();
  const it = cart.find((x) => x.id === id);
  if (!it) return;

  const n = Number(qty || 1);

  // If user steps down to 0 (or below), remove the item
  if (n <= 0) {
    saveCart(cart.filter((x) => x.id !== id));
    return;
  }

  it.qty = Math.max(1, n);
  saveCart(cart);
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return getCart().reduce((sum, x) => sum + (x.qty || 0), 0);
}

function cartTotal() {
  return getCart().reduce((sum, x) => sum + (Number(x.price || 0) * Number(x.qty || 0)), 0);
}

function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}

/* -----------------------------
   CART BADGE
----------------------------- */
function updateCartBadge() {
  const badges = document.querySelectorAll("[data-cart-badge]");
  if (!badges.length) return;

  const count = cartCount();
  badges.forEach((badge) => {
    badge.textContent = count;
    badge.style.display = count ? "inline-flex" : "none";
  });
}

/* -----------------------------
   NAV (MOBILE TOGGLE)
   Requires:
   - button.nav-toggle
   - div.topnav-mobile
----------------------------- */
function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const mobileMenu = document.querySelector(".topnav-mobile");
  if (!toggle || !mobileMenu) return;

  toggle.addEventListener("click", () => {
    const isOpen = mobileMenu.hasAttribute("hidden") === false;
    if (isOpen) {
      mobileMenu.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
    } else {
      mobileMenu.removeAttribute("hidden");
      toggle.setAttribute("aria-expanded", "true");
    }
  });

  // Close menu when clicking a link
  mobileMenu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      mobileMenu.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* -----------------------------
   OPTIONAL ACTIVE LINK
   If your nav links have:
   <a class="toplink" data-nav="products" href="products.html">
----------------------------- */
function setActiveNav() {
  const current = window.location.pathname.split("/").pop() || "index.html";

  // Highlight top links
  const links = document.querySelectorAll(".toplink");
  links.forEach((a) => {
    const href = (a.getAttribute("href") || "").split("#")[0];
    const file = href.split("/").pop();
    if (!file) return;

    const match =
      (current === "index.html" && (file === "index.html" || href === "index.html")) ||
      (file === current);

    a.classList.toggle("active", match);
  });

  // Highlight cart pill when on checkout (cart is part of checkout now)
  const cartBtn = document.querySelector(".cart-btn");
  if (cartBtn) {
    cartBtn.classList.toggle("active", current === "checkout.html" || current === "cart.html");
  }
}

/* -----------------------------
   CART PAGE RENDER
   Requires:
   - #cartBox container
   - #cartActions container (optional)
----------------------------- */
function renderCartPage() {
  const box = document.getElementById("cartBox");
  if (!box) return;

  const actions = document.getElementById("cartActions");
  const cart = getCart();

  if (!cart.length) {
    box.innerHTML = `
      <div class="cart-empty">
        <div class="pill pill-outline">Empty</div>
        <h3 style="margin-top:10px;">Your cart is empty</h3>
        <p style="color:var(--text-muted); margin-top:6px;">
          Go to Products and add a subscription.
        </p>
        <div class="btn-group" style="margin-top:12px;">
          <a class="btn btn-primary btn-compact" href="products.html">Browse Products</a>
          <a class="btn btn-card btn-compact" href="index.html">Home</a>
        </div>
      </div>
    `;
    if (actions) actions.style.display = "none";
    return;
  }

  const qtyOptions = (selected) => {
    // Keep it simple + professional: 1..20
    let out = "";
    for (let i = 1; i <= 20; i++) {
      out += `<option value="${i}" ${i === Number(selected) ? "selected" : ""}>${i}</option>`;
    }
    return out;
  };

  const rows = cart
    .map(
      (item) => `
      <div class="cart-row">
        <div>
          <div class="cart-title">${item.name}</div>
          <div class="cart-sub">${money(item.price)} each</div>
        </div>

        <div class="cart-actions">
          <label class="sr-only" for="qty-${item.id}">Quantity</label>
          <select
            id="qty-${item.id}"
            class="cart-qty-select"
            onchange="updateQty('${item.id}', this.value); window.__renderCartNow && window.__renderCartNow();"
            aria-label="Quantity"
          >
            ${qtyOptions(item.qty)}
          </select>

          <button class="btn btn-card btn-compact" type="button"
            onclick="removeFromCart('${item.id}'); window.__renderCartNow && window.__renderCartNow();">
            Remove
          </button>
        </div>
      </div>
    `
    )
    .join("");

  box.innerHTML = `
    <div class="cart-list">${rows}</div>
    <div class="cart-total">
      <span>Total</span>
      <span>${money(cartTotal())}</span>
    </div>
  `;

  if (actions) actions.style.display = "flex";
}

/* -----------------------------
   CHECKOUT PAGE RENDER
   Requires:
   - #summary
   - #total
   - #orderItems (hidden input)
   - #orderTotal (hidden input)
----------------------------- */
function renderCheckoutSummary() {
  const summary = document.getElementById("summary");
  if (!summary) return;

  const totalEl = document.getElementById("total");
  const itemsInput = document.getElementById("orderItems");
  const totalInput = document.getElementById("orderTotal");

  const cart = getCart();

  if (!cart.length) {
    summary.innerHTML = `
      <div class="cart-empty">
        <div class="pill pill-outline">Empty</div>
        <h3 style="margin-top:10px;">Cart is empty</h3>
        <p style="color:var(--text-muted); margin-top:6px;">Add items before checkout.</p>
        <div class="btn-group" style="margin-top:12px;">
          <a class="btn btn-primary btn-compact" href="products.html">Browse Products</a>
          <a class="btn btn-card btn-compact" href="cart.html">View Cart</a>
        </div>
      </div>
    `;
    if (totalEl) totalEl.textContent = money(0);
    if (itemsInput) itemsInput.value = "";
    if (totalInput) totalInput.value = "0.00";
    return;
  }

  const qtyOptions2 = (selected) => {
    let out = "";
    for (let i = 1; i <= 20; i++) {
      out += `<option value="${i}" ${i === Number(selected) ? "selected" : ""}>${i}</option>`;
    }
    return out;
  };

  summary.innerHTML = cart
    .map(
      (x) => `
      <div class="cart-row cart-row-compact" data-item-id="${x.id}">
        <div>
          <div class="cart-title">${x.name}</div>
          <div class="cart-sub">${money(x.price)} each</div>
        </div>

        <div class="cart-actions">
          <label class="sr-only" for="co-qty-${x.id}">Quantity</label>
          <select
            id="co-qty-${x.id}"
            class="cart-qty-select"
            onchange="updateQty('${x.id}', this.value); window.__renderCheckoutNow && window.__renderCheckoutNow();"
            aria-label="Quantity"
          >
            ${qtyOptions2(x.qty)}
          </select>
        </div>

        <div class="cart-line-total">${money(x.price * x.qty)}</div>

        <button class="btn btn-card btn-compact" type="button"
          onclick="removeFromCart('${x.id}'); window.__renderCheckoutNow && window.__renderCheckoutNow();">
          Remove
        </button>
      </div>
    `
    )
    .join("");

  const total = cartTotal();
  if (totalEl) totalEl.textContent = money(total);

  if (itemsInput) itemsInput.value = cart.map((x) => `${x.name} x${x.qty}`).join(" | ");
  if (totalInput) totalInput.value = total.toFixed(2);
}

/* -----------------------------
   GLOBAL HELPERS FOR INLINE HTML
----------------------------- */
window.getCart = getCart;
window.saveCart = saveCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.cartTotal = cartTotal;
window.clearCart = clearCart;

/* Provide a safe re-render function cart.html can call */
window.__renderCartNow = function () {
  renderCartPage();
};

/* Provide a safe re-render function checkout.html can call */
window.__renderCheckoutNow = function () {
  renderCheckoutSummary();
};


/* Clear cart + re-render (used by cart.html button) */
window.clearCartAndRender = function () {
  clearCart();
  renderCartPage();
};
window.renderCartPage = renderCartPage;
window.renderCheckoutSummary = renderCheckoutSummary;

/* -----------------------------
   GALLERY CAROUSELS + LIGHTBOX
   - Uses HTML: .media-carousel[data-carousel='{"title":"App","items":[...]}']
   - Optional: data-interval="5000" (ms)
----------------------------- */

let __lbState = null;

function ensureLightbox() {
  let lb = document.getElementById("mediaLightbox");
  if (lb) return lb;

  lb = document.createElement("div");
  lb.id = "mediaLightbox";
  lb.className = "lightbox";
  lb.innerHTML = `
    <div class="lightbox-backdrop" data-close="1"></div>
    <div class="lightbox-panel" role="dialog" aria-modal="true" aria-label="Media preview">
      <button class="lightbox-close" type="button" aria-label="Close" data-close="1">✕</button>
      <button class="lightbox-nav prev" type="button" aria-label="Previous">‹</button>
      <div class="lightbox-body"></div>
      <button class="lightbox-nav next" type="button" aria-label="Next">›</button>
      <div class="lightbox-caption"></div>
    </div>
  `;
  document.body.appendChild(lb);

  lb.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.getAttribute && t.getAttribute("data-close")) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft" && __lbState && __lbState.onPrev) __lbState.onPrev(true);
    if (e.key === "ArrowRight" && __lbState && __lbState.onNext) __lbState.onNext(true);
  });

  return lb;
}

function closeLightbox() {
  const lb = document.getElementById("mediaLightbox");
  if (!lb) return;
  lb.classList.remove("open");
  const body = lb.querySelector(".lightbox-body");
  if (body) body.innerHTML = "";
  __lbState = null;
}

function renderLightbox() {
  const lb = document.getElementById("mediaLightbox");
  if (!lb || !__lbState) return;

  const { items, index, title } = __lbState;
  const item = items[index];

  const body = lb.querySelector(".lightbox-body");
  const cap = lb.querySelector(".lightbox-caption");
  if (!body || !cap) return;

  body.innerHTML = "";

  if (item.type === "video") {
    const v = document.createElement("video");
    v.src = item.src;
    v.controls = true;
    v.autoplay = true;
    v.playsInline = true;
    v.preload = "metadata";
    body.appendChild(v);
  } else {
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.alt || "";
    body.appendChild(img);
  }

  cap.textContent = (title || "").trim();
}

function openLightbox(state) {
  const lb = ensureLightbox();
  __lbState = state;
  lb.classList.add("open");
  renderLightbox();
}

function initGalleryCarousels() {
  const els = document.querySelectorAll(".media-carousel[data-carousel]");
  if (!els.length) return;

  els.forEach((el) => {
    let data = {};
    try {
      data = JSON.parse(el.getAttribute("data-carousel") || "{}");
    } catch {
      data = {};
    }

    const title = data.title || "";
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) return;

    const interval = Math.max(1200, Number(el.getAttribute("data-interval") || 5000));

    const track = el.querySelector(".carousel-track");
    const dots = el.querySelector(".carousel-dots");
    const prev = el.querySelector(".carousel-btn.prev");
    const next = el.querySelector(".carousel-btn.next");
    if (!track || !dots || !prev || !next) return;

    track.innerHTML = "";
    dots.innerHTML = "";

    const slides = items.map((it, i) => {
      const s = document.createElement("div");
      s.className = "carousel-slide";

      if (it.type === "video") {
        const v = document.createElement("video");
        v.src = it.src;
        v.controls = true;
        v.preload = "metadata";
        v.setAttribute("playsinline", "");
        s.appendChild(v);
      } else {
        const img = document.createElement("img");
        img.src = it.src;
        img.alt = it.alt || title || "";
        img.loading = "lazy";
        s.appendChild(img);

        // Zoom opens lightbox
        s.addEventListener("click", () => {
          openLightbox({
            title,
            items,
            index: idx,
            onPrev: () => setIndex(idx - 1, true),
            onNext: () => setIndex(idx + 1, true),
          });
        });
      }

      // keyboard
      s.tabIndex = 0;
      s.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          s.click();
        }
      });

      track.appendChild(s);

      const d = document.createElement("button");
      d.type = "button";
      d.className = "carousel-dot";
      d.setAttribute("aria-label", `Go to slide ${i + 1}`);
      d.addEventListener("click", () => setIndex(i, true));
      dots.appendChild(d);

      return { slide: s, dot: d };
    });

    let idx = 0;
    let timer = null;
    let paused = false;

    function setActive() {
      slides.forEach((x, i) => {
        x.slide.classList.toggle("active", i === idx);
        x.dot.classList.toggle("active", i === idx);
      });
    }

    function setIndex(nextIndex, userAction) {
      const n = slides.length;
      idx = (nextIndex + n) % n;
      setActive();

      // keep lightbox in sync
      const lb = document.getElementById("mediaLightbox");
      if (lb && lb.classList.contains("open") && __lbState && __lbState.items === items) {
        __lbState.index = idx;
        __lbState.onPrev = () => setIndex(idx - 1, true);
        __lbState.onNext = () => setIndex(idx + 1, true);
        renderLightbox();
      }

      if (userAction) restart();
    }

    function tick() {
      if (paused) return;
      setIndex(idx + 1, false);
    }

    function start() {
      stop();
      timer = window.setInterval(tick, interval);
    }
    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }
    function restart() {
      start();
    }

    prev.addEventListener("click", () => setIndex(idx - 1, true));
    next.addEventListener("click", () => setIndex(idx + 1, true));

    el.addEventListener("mouseenter", () => (paused = true));
    el.addEventListener("mouseleave", () => (paused = false));
    el.addEventListener("focusin", () => (paused = true));
    el.addEventListener("focusout", () => (paused = false));

    setActive();
    start();
  });
}

/* -----------------------------
   INIT
----------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  initNavToggle();
  setActiveNav();

  // If these elements exist on the page, render automatically:
  renderCartPage();
  renderCheckoutSummary();
  initGalleryCarousels();
});
