// iOS In-App Purchase Configurator — browser-only, no API.
// Generates StoreKit 2 configuration files and product ID exports.

const PRICE_TIERS = [
  { label: "Free ($0.00)", price: "0.00" },
  { label: "Tier 1 ($0.99)", price: "0.99" },
  { label: "Tier 2 ($1.99)", price: "1.99" },
  { label: "Tier 3 ($2.99)", price: "2.99" },
  { label: "Tier 4 ($3.99)", price: "3.99" },
  { label: "Tier 5 ($4.99)", price: "4.99" },
  { label: "Tier 6 ($5.99)", price: "5.99" },
  { label: "Tier 7 ($6.99)", price: "6.99" },
  { label: "Tier 8 ($7.99)", price: "7.99" },
  { label: "Tier 9 ($8.99)", price: "8.99" },
  { label: "Tier 10 ($9.99)", price: "9.99" },
  { label: "Tier 15 ($14.99)", price: "14.99" },
  { label: "Tier 20 ($19.99)", price: "19.99" },
  { label: "Tier 25 ($24.99)", price: "24.99" },
  { label: "Tier 30 ($29.99)", price: "29.99" },
  { label: "Tier 40 ($39.99)", price: "39.99" },
  { label: "Tier 50 ($49.99)", price: "49.99" },
  { label: "Tier 75 ($74.99)", price: "74.99" },
  { label: "Tier 100 ($99.99)", price: "99.99" },
];

const SUB_PERIODS = [
  { label: "Weekly",   value: "P1W" },
  { label: "Monthly",  value: "P1M" },
  { label: "2 Months", value: "P2M" },
  { label: "3 Months", value: "P3M" },
  { label: "6 Months", value: "P6M" },
  { label: "Annual",   value: "P1Y" },
];

const TYPE_LABELS = {
  Consumable: "Consumable",
  NonConsumable: "Non-Consumable",
  NonRenewingSubscription: "Non-Renewing Subscription",
};

const TYPE_COLORS = {
  Consumable: "var(--ok)",
  NonConsumable: "var(--accent)",
  NonRenewingSubscription: "var(--warn)",
  RecurringSubscription: "#c084fc",
};

const STORAGE_KEY = "iap_config_v1";

let state = {
  bundleId: "",
  products: [],   // Consumable | NonConsumable | NonRenewingSubscription
  groups: [],     // { id, internalID, name, subscriptions: [] }
};

function genUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function save() {
  state.bundleId = document.getElementById("bundleId").value.trim();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) {}
}

// ── Products (consumable / non-consumable / non-renewing) ─────────────────────

function addProduct(type) {
  state.products.push({
    id: genUUID(),
    internalID: genUUID(),
    type,
    productID: "",
    referenceName: "",
    price: "0.99",
    displayName: "",
    description: "",
    familyShareable: false,
    period: "P1M", // for non-renewing only
  });
  save();
  renderProducts();
}

function removeProduct(id) {
  state.products = state.products.filter(p => p.id !== id);
  save();
  renderProducts();
}

function updateProduct(id, field, value) {
  const p = state.products.find(p => p.id === id);
  if (!p) return;
  if (field === "familyShareable") p[field] = value;
  else p[field] = value;
  save();
  updateStats();
}

function renderProducts() {
  const el = document.getElementById("productList");
  if (state.products.length === 0) {
    el.innerHTML = `<div class="empty-msg">No products yet — use the buttons above to add one.</div>`;
    updateStats();
    return;
  }

  el.innerHTML = state.products.map(p => {
    const color = TYPE_COLORS[p.type];
    const label = TYPE_LABELS[p.type] || p.type;
    const tierOptions = PRICE_TIERS.map(t =>
      `<option value="${t.price}" ${p.price === t.price ? "selected" : ""}>${t.label}</option>`
    ).join("");
    const periodRow = p.type === "NonRenewingSubscription" ? `
      <div class="field-col">
        <label class="field-label">Duration</label>
        <select onchange="updateProduct('${p.id}','period',this.value)">
          ${SUB_PERIODS.map(s => `<option value="${s.value}" ${p.period === s.value ? "selected" : ""}>${s.label}</option>`).join("")}
        </select>
      </div>` : "";

    return `
    <div class="product-card" id="pc_${p.id}">
      <div class="product-header">
        <span class="type-badge" style="color:${color};border-color:${color}40">${label}</span>
        <button class="remove-btn" onclick="removeProduct('${p.id}')">✕ Remove</button>
      </div>
      <div class="product-fields">
        <div class="field-col span2">
          <label class="field-label">Product ID <span class="field-hint">(reverse-DNS, e.g. com.yourapp.premium)</span></label>
          <input type="text" placeholder="com.yourapp.product_id" value="${esc(p.productID)}"
            oninput="updateProduct('${p.id}','productID',this.value)" spellcheck="false" />
        </div>
        <div class="field-col">
          <label class="field-label">Reference Name <span class="field-hint">(internal, not user-facing)</span></label>
          <input type="text" placeholder="My Product" value="${esc(p.referenceName)}"
            oninput="updateProduct('${p.id}','referenceName',this.value)" />
        </div>
        <div class="field-col">
          <label class="field-label">Price Tier (USD)</label>
          <select onchange="updateProduct('${p.id}','price',this.value)">${tierOptions}</select>
        </div>
        <div class="field-col">
          <label class="field-label">Display Name <span class="field-hint">(shown to users, ≤30 chars)</span></label>
          <input type="text" placeholder="Premium Upgrade" maxlength="30" value="${esc(p.displayName)}"
            oninput="updateProduct('${p.id}','displayName',this.value)" />
        </div>
        <div class="field-col">
          <label class="field-label">Description <span class="field-hint">(≤45 chars)</span></label>
          <input type="text" placeholder="Unlock all features" maxlength="45" value="${esc(p.description)}"
            oninput="updateProduct('${p.id}','description',this.value)" />
        </div>
        ${periodRow}
        <div class="field-col share-row">
          <label class="toggle-label">
            <input type="checkbox" ${p.familyShareable ? "checked" : ""} onchange="updateProduct('${p.id}','familyShareable',this.checked)" />
            <span>Family Shareable</span>
          </label>
        </div>
      </div>
    </div>`;
  }).join("");

  updateStats();
}

// ── Subscription Groups ───────────────────────────────────────────────────────

function addGroup() {
  state.groups.push({ id: genUUID(), internalID: genUUID(), name: "", subscriptions: [] });
  save();
  renderGroups();
}

function removeGroup(gid) {
  state.groups = state.groups.filter(g => g.id !== gid);
  save();
  renderGroups();
}

function updateGroup(gid, field, value) {
  const g = state.groups.find(g => g.id === gid);
  if (g) g[field] = value;
  save();
  updateStats();
}

function addSubscription(gid) {
  const g = state.groups.find(g => g.id === gid);
  if (!g) return;
  g.subscriptions.push({
    id: genUUID(),
    internalID: genUUID(),
    productID: "",
    referenceName: "",
    price: "9.99",
    period: "P1M",
    displayName: "",
    description: "",
    familyShareable: false,
    introEnabled: false,
    introPrice: "0.00",
    introPeriod: "P1W",
    introType: "FreeTrial",
  });
  save();
  renderGroups();
}

function removeSubscription(gid, sid) {
  const g = state.groups.find(g => g.id === gid);
  if (g) g.subscriptions = g.subscriptions.filter(s => s.id !== sid);
  save();
  renderGroups();
}

function updateSubscription(gid, sid, field, value) {
  const g = state.groups.find(g => g.id === gid);
  if (!g) return;
  const s = g.subscriptions.find(s => s.id === sid);
  if (!s) return;
  s[field] = value;
  save();
  if (field === "introEnabled") renderGroups();
  else updateStats();
}

function renderGroups() {
  const el = document.getElementById("groupList");
  if (state.groups.length === 0) {
    el.innerHTML = `<div class="empty-msg">No subscription groups yet — click "Add Subscription Group" above.</div>`;
    updateStats();
    return;
  }

  el.innerHTML = state.groups.map(g => {
    const subsHtml = g.subscriptions.map(s => {
      const tierOptions = PRICE_TIERS.map(t =>
        `<option value="${t.price}" ${s.price === t.price ? "selected" : ""}>${t.label}</option>`
      ).join("");
      const periodOptions = SUB_PERIODS.map(p =>
        `<option value="${p.value}" ${s.period === p.value ? "selected" : ""}>${p.label}</option>`
      ).join("");
      const introPeriodOptions = SUB_PERIODS.map(p =>
        `<option value="${p.value}" ${s.introPeriod === p.value ? "selected" : ""}>${p.label}</option>`
      ).join("");
      const introTierOptions = PRICE_TIERS.map(t =>
        `<option value="${t.price}" ${s.introPrice === t.price ? "selected" : ""}>${t.label}</option>`
      ).join("");
      const introRow = s.introEnabled ? `
        <div class="intro-section">
          <div class="intro-title">Introductory Offer</div>
          <div class="sub-fields">
            <div class="field-col">
              <label class="field-label">Offer Type</label>
              <select onchange="updateSubscription('${g.id}','${s.id}','introType',this.value)">
                <option value="FreeTrial" ${s.introType==="FreeTrial"?"selected":""}>Free Trial</option>
                <option value="PayUpFront" ${s.introType==="PayUpFront"?"selected":""}>Pay Up Front</option>
                <option value="PayAsYouGo" ${s.introType==="PayAsYouGo"?"selected":""}>Pay As You Go</option>
              </select>
            </div>
            <div class="field-col">
              <label class="field-label">Duration</label>
              <select onchange="updateSubscription('${g.id}','${s.id}','introPeriod',this.value)">${introPeriodOptions}</select>
            </div>
            ${s.introType !== "FreeTrial" ? `<div class="field-col">
              <label class="field-label">Intro Price</label>
              <select onchange="updateSubscription('${g.id}','${s.id}','introPrice',this.value)">${introTierOptions}</select>
            </div>` : ""}
          </div>
        </div>` : "";

      return `
      <div class="sub-card">
        <div class="sub-header">
          <span class="type-badge" style="color:#c084fc;border-color:#c084fc40">Auto-Renewable</span>
          <button class="remove-btn" onclick="removeSubscription('${g.id}','${s.id}')">✕ Remove</button>
        </div>
        <div class="sub-fields">
          <div class="field-col span2">
            <label class="field-label">Product ID</label>
            <input type="text" placeholder="com.yourapp.monthly" value="${esc(s.productID)}"
              oninput="updateSubscription('${g.id}','${s.id}','productID',this.value)" spellcheck="false" />
          </div>
          <div class="field-col">
            <label class="field-label">Reference Name</label>
            <input type="text" placeholder="Monthly" value="${esc(s.referenceName)}"
              oninput="updateSubscription('${g.id}','${s.id}','referenceName',this.value)" />
          </div>
          <div class="field-col">
            <label class="field-label">Price Tier (USD)</label>
            <select onchange="updateSubscription('${g.id}','${s.id}','price',this.value)">${tierOptions}</select>
          </div>
          <div class="field-col">
            <label class="field-label">Billing Period</label>
            <select onchange="updateSubscription('${g.id}','${s.id}','period',this.value)">${periodOptions}</select>
          </div>
          <div class="field-col">
            <label class="field-label">Display Name <span class="field-hint">(≤30 chars)</span></label>
            <input type="text" placeholder="Monthly Plan" maxlength="30" value="${esc(s.displayName)}"
              oninput="updateSubscription('${g.id}','${s.id}','displayName',this.value)" />
          </div>
          <div class="field-col">
            <label class="field-label">Description <span class="field-hint">(≤45 chars)</span></label>
            <input type="text" placeholder="Full access billed monthly" maxlength="45" value="${esc(s.description)}"
              oninput="updateSubscription('${g.id}','${s.id}','description',this.value)" />
          </div>
          <div class="field-col share-row">
            <label class="toggle-label">
              <input type="checkbox" ${s.familyShareable ? "checked" : ""} onchange="updateSubscription('${g.id}','${s.id}','familyShareable',this.checked)" />
              <span>Family Shareable</span>
            </label>
            <label class="toggle-label" style="margin-left:18px">
              <input type="checkbox" ${s.introEnabled ? "checked" : ""} onchange="updateSubscription('${g.id}','${s.id}','introEnabled',this.checked)" />
              <span>Introductory Offer</span>
            </label>
          </div>
        </div>
        ${introRow}
      </div>`;
    }).join("");

    return `
    <div class="group-card" id="gc_${g.id}">
      <div class="group-header">
        <div style="flex:1">
          <span class="group-label">Subscription Group</span>
          <input class="group-name-input" type="text" placeholder="e.g. Premium Access"
            value="${esc(g.name)}" oninput="updateGroup('${g.id}','name',this.value)" />
        </div>
        <button class="remove-btn danger" onclick="removeGroup('${g.id}')">✕ Remove Group</button>
      </div>
      <div class="subs-body">
        ${subsHtml || `<div class="empty-msg small">No subscriptions in this group yet.</div>`}
      </div>
      <div class="group-footer">
        <button class="add-sub-btn" onclick="addSubscription('${g.id}')">+ Add Subscription</button>
      </div>
    </div>`;
  }).join("");

  updateStats();
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function updateStats() {
  const totalProducts = state.products.length;
  const totalSubs = state.groups.reduce((n, g) => n + g.subscriptions.length, 0);
  const totalGroups = state.groups.length;
  const allIDs = [
    ...state.products.map(p => p.productID),
    ...state.groups.flatMap(g => g.subscriptions.map(s => s.productID)),
  ].filter(Boolean);

  document.getElementById("statProducts").textContent = totalProducts;
  document.getElementById("statGroups").textContent = totalGroups;
  document.getElementById("statSubs").textContent = totalSubs;
  document.getElementById("statTotal").textContent = allIDs.length;
}

// ── Exports ───────────────────────────────────────────────────────────────────

function exportStoreKit() {
  const bid = document.getElementById("bundleId").value.trim() || "com.yourapp";

  const nonSubProducts = state.products
    .filter(p => p.type !== "NonRenewingSubscription")
    .map((p, i) => ({
      displayPrice: p.price,
      familyShareable: p.familyShareable,
      groupNumber: i + 1,
      internalID: p.internalID,
      localizations: [
        { description: p.description || "", displayName: p.displayName || p.referenceName, locale: "en_US" },
      ],
      productID: p.productID || `${bid}.product${i + 1}`,
      referenceName: p.referenceName || `Product ${i + 1}`,
      type: p.type,
    }));

  const nonRenewSubs = state.products
    .filter(p => p.type === "NonRenewingSubscription")
    .map((p, i) => ({
      adHocOffers: [],
      displayPrice: p.price,
      familyShareable: p.familyShareable,
      groupNumber: i + 1,
      internalID: p.internalID,
      localizations: [
        { description: p.description || "", displayName: p.displayName || p.referenceName, locale: "en_US" },
      ],
      productID: p.productID || `${bid}.nonrenewing${i + 1}`,
      referenceName: p.referenceName || `Non-Renewing ${i + 1}`,
      subscriptionPeriod: p.period,
      type: "NonRenewingSubscription",
    }));

  const subscriptionGroups = state.groups.map((g, gi) => ({
    id: g.id,
    localizations: [{ locale: "en_US", name: g.name || `Group ${gi + 1}` }],
    name: g.name || `Group ${gi + 1}`,
    subscriptions: g.subscriptions.map((s, si) => {
      const sub = {
        adHocOffers: [],
        displayPrice: s.price,
        familyShareable: s.familyShareable,
        groupNumber: si + 1,
        internalID: s.internalID,
        introductoryOffer: null,
        localizations: [
          { description: s.description || "", displayName: s.displayName || s.referenceName, locale: "en_US" },
        ],
        productID: s.productID || `${bid}.sub_${gi + 1}_${si + 1}`,
        recurringSubscriptionPeriod: s.period,
        referenceName: s.referenceName || `Subscription ${si + 1}`,
        subscriptionGroupID: g.id,
        type: "RecurringSubscription",
      };
      if (s.introEnabled) {
        sub.introductoryOffer = {
          display: s.introType === "FreeTrial" ? "0.00" : s.introPrice,
          internalID: genUUID(),
          numberOfPeriods: 1,
          offerIdentifier: `intro_${s.id}`,
          paymentMode: s.introType,
          period: s.introPeriod,
          type: "introductory",
        };
      }
      return sub;
    }),
  }));

  const config = {
    identifier: genUUID(),
    nonRenewingSubscriptions: nonRenewSubs,
    products: nonSubProducts,
    settings: { _compatibilityPrefix: bid, _developerTeamID: "", _storefront: "USA" },
    subscriptionGroups,
    version: { major: 2, minor: 0 },
  };

  download(
    JSON.stringify(config, null, 2),
    "Configuration.storekit",
    "application/json"
  );
}

function exportProductIDs() {
  const lines = [];
  state.products.forEach(p => { if (p.productID) lines.push(p.productID); });
  state.groups.forEach(g => g.subscriptions.forEach(s => { if (s.productID) lines.push(s.productID); }));
  if (lines.length === 0) { alert("No product IDs to export — fill in at least one Product ID first."); return; }
  download(lines.join("\n"), "product_ids.txt", "text/plain");
}

function exportCSV() {
  const rows = [["Product ID", "Reference Name", "Type", "Price USD", "Display Name", "Description", "Period", "Family Shareable"]];

  state.products.forEach(p => {
    rows.push([
      p.productID, p.referenceName, p.type, p.price,
      p.displayName, p.description,
      p.type === "NonRenewingSubscription" ? p.period : "",
      p.familyShareable ? "Yes" : "No",
    ]);
  });

  state.groups.forEach(g => {
    g.subscriptions.forEach(s => {
      rows.push([
        s.productID, s.referenceName, "RecurringSubscription", s.price,
        s.displayName, s.description, s.period, s.familyShareable ? "Yes" : "No",
      ]);
    });
  });

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  download(csv, "iap_products.csv", "text/csv");
}

function clearAll() {
  if (!confirm("Clear all products and groups?")) return;
  state = { bundleId: document.getElementById("bundleId").value.trim(), products: [], groups: [] };
  save();
  renderProducts();
  renderGroups();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str || "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function download(content, filename, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  load();
  document.getElementById("bundleId").value = state.bundleId || "";
  document.getElementById("bundleId").addEventListener("input", save);
  renderProducts();
  renderGroups();
});
