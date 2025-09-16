// Seismic Contract Marketplace — purely client-side demo
// Data persists in localStorage under STORAGE_KEY. Import/Export to move between machines.

const STORAGE_KEY = "scm_contracts_v1";

// --- Seed data ---
const SEED = [
  {
    id: uid(),
    name: "Walnut Vault",
    description: "Encrypted key-value storage utility and access control helpers.",
    category: "Tools",
    author: "Walnut Labs",
    website: "https://example.org/walnut",
    tags: ["storage","utils","privacy"],
    license: "MIT",
    fee: { type: "free", amount: 0 },
    address: "0x0000...walnut",
    verified: true,
    createdAt: Date.now() - 1000*60*60*24*14, // 2 weeks ago
    versions: [
      { version: "1.0.0", url: "https://example.org/walnut/v1.0.0", checksum: "sha256-abc" },
      { version: "1.1.0", url: "https://example.org/walnut/v1.1.0", checksum: "sha256-def" }
    ],
    rating: { avg: 4.5, count: 18 }
  },
  {
    id: uid(),
    name: "ShieldedSwap",
    description: "AMM for Seismic with private balances and orders.",
    category: "DeFi",
    author: "Anon Collective",
    website: "https://example.org/shieldedswap",
    tags: ["dex","amm","defi"],
    license: "Apache-2.0",
    fee: { type: "rev_share", amount: 0.15 },
    address: "0x0000...swap",
    verified: false,
    createdAt: Date.now() - 1000*60*60*24*6, // 6 days ago
    versions: [
      { version: "0.9.0", url: "https://example.org/shieldedswap/0.9.0", checksum: "sha256-xyz" },
      { version: "1.0.0", url: "https://example.org/shieldedswap/1.0.0", checksum: "sha256-qrs" }
    ],
    rating: { avg: 4.1, count: 42 }
  },
  {
    id: uid(),
    name: "Oblivion Oracle",
    description: "Confidential price feeds with TEE attestations.",
    category: "Oracles",
    author: "Seis Oracles",
    website: "",
    tags: ["oracle","feeds"],
    license: "GPL-3.0",
    fee: { type: "subscription", amount: 99 },
    address: "0x0000...oracle",
    verified: true,
    createdAt: Date.now() - 1000*60*60*24*2, // 2 days ago
    versions: [
      { version: "1.0.0", url: "https://example.org/oracle/1.0.0", checksum: "" },
      { version: "1.1.1", url: "https://example.org/oracle/1.1.1", checksum: "" },
      { version: "1.2.0", url: "https://example.org/oracle/1.2.0", checksum: "" }
    ],
    rating: { avg: 4.8, count: 12 }
  }
];

// --- State ---
let CONTRACTS = load();

// --- DOM refs ---
const elCards = document.getElementById("cards");
const elEmpty = document.getElementById("emptyState");

const elSearch = document.getElementById("search");
const elFilterLicense = document.getElementById("filterLicense");
const elFilterFee = document.getElementById("filterFee");
const elSort = document.getElementById("sortSelect");

const btnPublish = document.getElementById("btnPublish");
const btnExport = document.getElementById("btnExport");
const btnReset = document.getElementById("btnReset");
const fileImport = document.getElementById("fileImport");

const publishDialog = document.getElementById("publishDialog");
const closePublish = document.getElementById("closePublish");
const publishForm = document.getElementById("publishForm");
const submitPublish = document.getElementById("submitPublish");

const detailsDialog = document.getElementById("detailsDialog");
const detailsContent = document.getElementById("detailsContent");
const closeDetails = document.getElementById("closeDetails");

// --- Init ---
render();

// Bind filters
for (const el of [elSearch, elFilterLicense, elFilterFee, elSort]) {
  el.addEventListener("input", render);
}

// Publish modal
btnPublish.addEventListener("click", () => publishDialog.showModal());
closePublish.addEventListener("click", () => publishDialog.close());
publishForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(publishForm);
  const name = fd.get("name").trim();
  const author = fd.get("author").trim();
  const website = (fd.get("website")||"").trim();
  const category = (fd.get("category")||"").trim();
  const tags = (fd.get("tags")||"").split(",").map(t => t.trim()).filter(Boolean);
  const license = fd.get("license");
  const feeType = fd.get("feeType");
  const feeAmount = Number(fd.get("feeAmount")||0);
  const address = (fd.get("address")||"").trim();
  const version = (fd.get("version")||"").trim();
  const url = (fd.get("url")||"").trim();
  const verified = !!fd.get("verified");
  const description = (fd.get("description")||"").trim();

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    alert("Version must be semver (e.g., 1.0.0)"); return;
  }
  if (!name || !author || !license || !url) {
    alert("Please fill in the required fields."); return;
  }

  const item = {
    id: uid(), name, description, category, author, website, tags, license,
    fee: { type: feeType, amount: feeAmount },
    address, verified, createdAt: Date.now(),
    versions: [{ version, url, checksum: "" }],
    rating: { avg: 0, count: 0 }
  };
  CONTRACTS.unshift(item);
  save(CONTRACTS);
  publishForm.reset();
  publishDialog.close();
  render();
});

// Export/Import/Reset
btnExport.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(CONTRACTS, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "seismic-marketplace-data.json" });
  a.click();
  URL.revokeObjectURL(url);
});

fileImport.addEventListener("change", async () => {
  const file = fileImport.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("JSON must be an array");
    CONTRACTS = data;
    save(CONTRACTS);
    render();
  } catch (err) {
    alert("Import failed: " + err.message);
  } finally {
    fileImport.value = "";
  }
});

btnReset.addEventListener("click", () => {
  if (confirm("Clear local data and reload seed?")) {
    localStorage.removeItem(STORAGE_KEY);
    CONTRACTS = load(); // reload seed
    render();
  }
});

closeDetails.addEventListener("click", () => detailsDialog.close());

// --- Render ---
function render(){
  const q = (elSearch.value||"").toLowerCase();
  const license = elFilterLicense.value;
  const fee = elFilterFee.value;
  const sortBy = elSort.value;

  let list = CONTRACTS.filter(c => {
    const hay = [c.name, c.description, c.category, c.author, (c.tags||[]).join(" ")].join(" ").toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (license && c.license !== license) return false;
    if (fee && c.fee?.type !== fee) return false;
    return true;
  });

  // sort
  if (sortBy === "rating") {
    list.sort((a,b) => (b.rating?.avg||0) - (a.rating?.avg||0));
  } else if (sortBy === "newest") {
    list.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
  } else if (sortBy === "name") {
    list.sort((a,b) => a.name.localeCompare(b.name));
  } else { // trending
    list.sort((a,b) => trendingScore(b) - trendingScore(a));
  }

  elCards.innerHTML = "";
  if (!list.length) {
    elEmpty.hidden = false;
    return;
  }
  elEmpty.hidden = true;

  for (const c of list) {
    const latest = latestVersion(c.versions||[]);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <header>
        <h3 title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</h3>
        <div class="badges">
          ${c.verified ? `<span class="badge verified">Verified</span>` : ""}
          ${c.license ? `<span class="badge license">${escapeHtml(c.license)}</span>` : ""}
          ${c.fee ? `<span class="badge fee">${fmtFee(c.fee)}</span>` : ""}
        </div>
      </header>
      <div class="desc">${escapeHtml(c.description||"")}</div>
      <div class="tags">${(c.tags||[]).map(t => `<span class="tagpill">${escapeHtml(t)}</span>`).join("")}</div>
      <div class="meta">
        <div>${latest ? `Latest: <strong>${latest.version}</strong>` : ""}</div>
        <div>${starsHtml(c)}</div>
      </div>
      <div class="actions">
        ${c.website ? `<a class="button" href="${c.website}" target="_blank" rel="noopener">Website</a>`:""}
        <button class="button primary" data-id="${c.id}">View</button>
      </div>
    `;
    card.querySelector(".button.primary").addEventListener("click", () => openDetails(c));
    card.querySelector(".meta .stars")?.addEventListener("click", (e) => {
      const star = e.target.closest(".star");
      if (!star) return;
      const value = Number(star.dataset.value);
      rate(c.id, value);
    });
    elCards.appendChild(card);
  }
}

function openDetails(c){
  const latest = latestVersion(c.versions||[]);
  detailsContent.innerHTML = `
    <header style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
      <div>
        <h3 style="margin:0">${escapeHtml(c.name)}</h3>
        <div style="color:#9fb1cf">${escapeHtml(c.author||"Unknown author")} ${c.website?`· <a href="${c.website}" target="_blank" rel="noopener">website</a>`:""}</div>
      </div>
      <div class="badges">
        ${c.verified ? `<span class="badge verified">Verified</span>` : ""}
        ${c.license ? `<span class="badge license">${escapeHtml(c.license)}</span>` : ""}
        ${c.fee ? `<span class="badge fee">${fmtFee(c.fee)}</span>` : ""}
      </div>
    </header>
    <p style="margin-top:8px">${escapeHtml(c.description||"")}</p>
    ${c.address ? `<p><strong>Contract:</strong> <code>${escapeHtml(c.address)}</code></p>`:""}
    <h4>Versions</h4>
    <ul>
      ${(c.versions||[]).sort((a,b)=>semverDesc(a.version,b.version)).map(v => `
        <li>
          <code>${v.version}</code>
          ${v.url?`— <a href="${v.url}" target="_blank" rel="noopener">link</a>`:""}
          ${v.checksum?` · <small>${v.checksum}</small>`:""}
          ${latest && latest.version===v.version ? " <span class='badge'>Latest</span>" : ""}
        </li>
      `).join("")}
    </ul>
    <div style="display:flex; align-items:center; gap:8px; margin-top:8px">
      <div class="stars" aria-label="Rate this">
        ${[1,2,3,4,5].map(i=>`<span class="star ${i<=Math.round(c.rating?.avg||0)?'on':''}" data-value="${i}">★</span>`).join("")}
      </div>
      <span class="count">${fmtRating(c.rating)}</span>
    </div>
    ${(c.tags&&c.tags.length)? `<div class="tags" style="margin-top:8px">${c.tags.map(t=>`<span class="tagpill">${escapeHtml(t)}</span>`).join("")}</div>`:""}
  `;
  // attach rating listener
  detailsContent.querySelector(".stars")?.addEventListener("click", (e) => {
    const star = e.target.closest(".star");
    if (!star) return;
    const value = Number(star.dataset.value);
    rate(c.id, value);
    // refresh both views
    openDetails(getById(c.id));
    render();
  });

  detailsDialog.showModal();
}

function rate(id, value){
  const i = CONTRACTS.findIndex(x=>x.id===id);
  if (i<0) return;
  const r = CONTRACTS[i].rating || { avg:0, count:0 };
  const total = r.avg * r.count + value;
  const count = r.count + 1;
  CONTRACTS[i].rating = { avg: total / count, count };
  save(CONTRACTS);
  render();
}

function starsHtml(c){
  const r = c.rating || { avg: 0, count: 0 };
  return `<span class="stars" title="${r.avg.toFixed(2)} from ${r.count} ratings">
    ${[1,2,3,4,5].map(i=>`<span class="star ${i<=Math.round(r.avg)?'on':''}" data-value="${i}">★</span>`).join("")}
  </span><span class="count">${fmtRating(r)}</span>`;
}

function fmtRating(r){
  const avg = r?.avg || 0;
  const count = r?.count || 0;
  return `${avg.toFixed(2)} · ${count}`;
}

function fmtFee(f){
  if (!f) return "";
  if (f.type === "free") return "Free";
  if (f.type === "one_time") return `One-time ${fmtCurrency(f.amount)}`;
  if (f.type === "subscription") return `Sub ${fmtCurrency(f.amount)}/mo`;
  if (f.type === "rev_share") return `Rev-share ${(f.amount*100).toFixed(0)}%`;
  return "Custom";
}

function trendingScore(c){
  // Simple Wilson-ish score: avg * log(1+count) + recency
  const rating = (c.rating?.avg || 0) * Math.log(1 + (c.rating?.count || 0));
  const days = (Date.now() - (c.createdAt||0)) / (1000*60*60*24);
  const recency = Math.max(0, 10 - days) * 0.1; // small boost for newer
  return rating + recency;
}

function latestVersion(versions){
  if (!versions || !versions.length) return null;
  return versions.slice().sort((a,b)=>semverDesc(a.version,b.version))[0];
}

function semverDesc(a,b){
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i=0;i<3;i++){
    if ((pb[i]||0)!==(pa[i]||0)) return (pb[i]||0)-(pa[i]||0);
  }
  return 0;
}

function load(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // default seed
  const seed = SEED;
  save(seed);
  return seed;
}

function save(arr){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

function getById(id){ return CONTRACTS.find(c => c.id === id); }
function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36).slice(2); }
function escapeHtml(s=""){ return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch])); }
function fmtCurrency(n){ return new Intl.NumberFormat(undefined,{style:'currency', currency:'USD'}).format(Number(n||0)); }
