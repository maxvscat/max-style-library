/* MAX 風格庫：純前端，資料來自 styles/*.json */
const CONFIG = { owner: "maxvscat", repo: "max-style-library", branch: "main" };
const GH = `https://github.com/${CONFIG.owner}/${CONFIG.repo}`;

const app = document.getElementById("app");
document.getElementById("repo-link").href = GH;

let STYLES = [];
const FILTER = { q: "" };

/* ---------- 工具 ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lines = s => String(s || "").split("\n").map(t => t.trim()).filter(Boolean);
const list = arr => (arr && arr.length ? `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="loading">（未填寫）</p>`);
function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 1600);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast("已複製"); }
  catch { toast("無法自動複製，請手動選取"); }
}
function lum(hex) {
  const h = (hex || "#000").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/* ---------- 讀取資料 ---------- */
async function loadStyles() {
  let names = [];
  try {
    const r = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/styles?ref=${CONFIG.branch}`);
    if (!r.ok) throw 0;
    names = (await r.json()).map(f => f.name).filter(n => n.endsWith(".json") && n !== "index.json");
  } catch {
    try { names = (await (await fetch("styles/index.json", { cache: "no-store" })).json()).map(id => `${id}.json`); }
    catch { names = []; }
  }
  const out = [];
  await Promise.all(names.map(async n => {
    try {
      const r = await fetch(`styles/${n}`, { cache: "no-store" });
      if (r.ok) { out.push(await r.json()); return; }
      const raw = await fetch(`https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}/styles/${n}`);
      if (raw.ok) out.push(await raw.json());
    } catch (e) { console.warn("讀不到", n, e); }
  }));
  out.sort((a, b) => String(b.added).localeCompare(String(a.added)) || String(a.name).localeCompare(String(b.name)));
  return out;
}

/* ---------- 縮圖：有樣張用樣張，沒有就用配色自動產生 ---------- */
/* 樣張可以是任何比例：直式圖會自動改成置中完整顯示 */
function fitImgs(root) {
  root.querySelectorAll("img[data-fit]").forEach(img => {
    const apply = () => {
      if (img.naturalHeight > img.naturalWidth) {
        img.closest(".thumb")?.classList.add("portrait");
        img.closest(".gallery")?.classList.add("portrait");
      }
    };
    img.complete ? apply() : img.addEventListener("load", apply, { once: true });
  });
}
function thumb(s) {
  if (s.previews && s.previews.length) {
    return `<div class="thumb"><img data-fit loading="lazy" src="${esc(s.previews[0])}" alt="${esc(s.name)} 樣張"></div>`;
  }
  const cols = (s.colors || []).map(c => c.hex).filter(Boolean);
  const bg = cols[0] || "#222", fg = lum(bg) > 0.55 ? "#111" : "#fff";
  const accent = cols[cols.length - 1] || "#ffd400";
  return `<div class="thumb"><div class="swatch-card" style="color:${fg}">
      <div class="bands">${cols.map(c => `<i style="background:${esc(c)}"></i>`).join("")}</div>
      <div class="label" style="background:${esc(bg)};color:${fg};border-left:8px solid ${esc(accent)}">${esc(s.name)}</div>
      <div class="hint" style="color:${fg};background:${esc(bg)};padding:2px 6px;align-self:flex-start">PREVIEW 待補</div>
    </div></div>`;
}

/* ---------- 首頁 ---------- */
function viewHome() {
  app.innerHTML = `
    <section class="hero">
      <div>
        <h1>AI 剪輯<em>風格庫</em></h1>
        <p>每個風格的配色、字體、版面、動態語彙和樣張都在這裡，任何解析度都能套用。點卡片看細節，右上角可以新增風格。</p>
      </div>
      <div class="stats">
        <div class="stat"><b>${STYLES.length}</b><span>STYLES</span></div>
      </div>
    </section>
    <section class="filters">
      <input id="q" type="search" placeholder="搜尋風格、用途、顏色…" value="${esc(FILTER.q)}">
    </section>
    <section class="grid" id="grid"></section>`;
  const q = document.getElementById("q");
  q.addEventListener("input", () => { FILTER.q = q.value; renderGrid(); });
  renderGrid();
}
function renderGrid() {
  const g = document.getElementById("grid");
  const q = FILTER.q.trim().toLowerCase();
  const items = STYLES.filter(s => {
    if (q && !JSON.stringify(s).toLowerCase().includes(q)) return false;
    return true;
  });
  if (!items.length) { g.innerHTML = `<p class="empty">沒有符合條件的風格</p>`; return; }
  g.innerHTML = items.map(s => `
    <a class="card" href="#/s/${encodeURIComponent(s.id)}">
      ${thumb(s)}
      <div class="card-body">
        <h3>${esc(s.name)}<small>${esc(s.subtitle || "")}</small></h3>
        <div class="dots">${(s.colors || []).slice(0, 8).map(c => `<i title="${esc(c.name)} ${esc(c.hex)}" style="background:${esc(c.hex)}"></i>`).join("")}</div>
        <div class="tags">${(s.bestFor || []).slice(0, 4).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      </div>
    </a>`).join("");
  fitImgs(g);
}

/* ---------- 詳細頁 ---------- */
function viewDetail(id) {
  const s = STYLES.find(x => x.id === id);
  if (!s) { app.innerHTML = `<a class="back" href="#/">← 回到全部風格</a><p class="empty">找不到這個風格（${esc(id)}）</p>`; return; }
  const sec = (title, body) => body ? `<section class="sec"><h2>${title}</h2>${body}</section>` : "";
  app.innerHTML = `
    <a class="back" href="#/">← 回到全部風格</a>
    <div class="detail-head">
      <div>
        <h1>${esc(s.name)}<small>${esc(s.subtitle || "")}</small></h1>
        <div class="meta">
          <span class="tag">新增於 ${esc(s.added || "")}</span>
        </div>
      </div>
      <div class="actions">
        <a class="btn" href="#/edit/${encodeURIComponent(s.id)}">用表單修改</a>
        <a class="btn" target="_blank" rel="noopener" href="${GH}/edit/${CONFIG.branch}/styles/${encodeURIComponent(s.id)}.json">在 GitHub 直接編輯 ↗</a>
        <a class="btn" target="_blank" rel="noopener" href="${GH}/upload/${CONFIG.branch}/previews/${encodeURIComponent(s.id)}">上傳樣張圖 ↗</a>
      </div>
    </div>
    <p class="mood">${esc(s.mood || "")}</p>
    ${s.previews && s.previews.length
      ? `<div class="gallery">${s.previews.map(p => `<a href="${esc(p)}" target="_blank" rel="noopener"><img data-fit loading="lazy" src="${esc(p)}" alt=""></a>`).join("")}</div>`
      : `<div class="no-preview">還沒有樣張圖。按「上傳樣張圖」把圖放進 <code>previews/${esc(s.id)}/</code>，再把路徑加進 JSON 的 <code>previews</code> 欄位。</div>`}
    <div class="sections">
      ${sec("PALETTE · 顏色", `<div class="palette">${(s.colors || []).map(c => `
        <div class="sw"><i style="background:${esc(c.hex)}"></i><div><b>${esc(c.name)}</b><code data-copy="${esc(c.hex)}">${esc(c.hex)}</code><small>${esc(c.role || "")}</small></div></div>`).join("")}</div>`)}
      ${sec("TYPE · 字體", `<ul class="fonts">${(s.fonts || []).map(f => `<li><b>${esc(f.role)}</b>${esc(f.family)}</li>`).join("")}</ul>`)}
      ${sec("BEST FOR · 適合", `<div class="tags">${(s.bestFor || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div><p style="margin-top:12px;color:var(--mute);font-size:14px">參考來源：${esc(s.reference || "—")}</p>`)}
      ${sec("LAYOUT · 版面", list(s.layout))}
      ${sec("COMPONENTS · 常用元件", list(s.components))}
      ${sec("MOTION · 動態語彙", list(s.motion))}
      ${sec("TRANSITION · 轉場", s.transition ? `<p>${esc(s.transition)}</p>` : "")}
      ${sec("CAMERA · 運鏡", s.camera ? `<p>${esc(s.camera)}</p>` : "")}
      ${sec("TEXTURE · 質感", s.texture ? `<p>${esc(s.texture)}</p>` : "")}
      ${sec("ENDING · 結尾", s.ending ? `<p>${esc(s.ending)}</p>` : "")}
      ${sec("EXAMPLES · 範例專案", (s.examples || []).length ? `<ul>${s.examples.map(e => `<li class="example"><b>${esc(e.title)}</b><small>${esc(e.date || "")}</small><div>${esc(e.desc || "")}</div></li>`).join("")}</ul>` : "")}
      ${sec("NOTES · 注意事項", s.notes && s.notes.length ? list(s.notes) : "")}
    </div>
    <p class="scale-note">文中的像素值以參考畫面為基準（橫式 1920 寬、直式 1080 寬），套用到其他解析度或比例時等比例換算、重新排版即可。</p>`;
  fitImgs(app);
  app.querySelectorAll("[data-copy]").forEach(el => el.addEventListener("click", () => copy(el.dataset.copy)));
}

/* ---------- 新增／修改表單 ---------- */
const FIELDS = [
  ["name", "風格名稱", "input", "例如：霓虹夜市風"],
  ["subtitle", "副標", "input", "一句話分類，例如：街頭夜景"],
  ["id", "英文代號", "input", "檔名用，只能英文小寫和連字號，例如 neon-night-market"],
  ["mood", "氣質", "textarea", "整體感覺，一兩句話"],
  ["bestFor", "適合用途", "input", "用逗號分隔，例如：美食開箱, 夜生活, 活動宣傳"],
  ["reference", "參考來源", "input", "參考片或「原創風格，沒有參考片」"],
  ["colors", "顏色", "textarea", "一行一個：名稱|#色碼|用途"],
  ["fonts", "字體", "textarea", "一行一個：用途|字體"],
  ["layout", "版面", "textarea", "一行一點"],
  ["components", "常用元件", "textarea", "一行一點"],
  ["motion", "動態語彙", "textarea", "一行一點"],
  ["transition", "轉場", "input", ""],
  ["camera", "運鏡", "input", ""],
  ["texture", "質感", "input", ""],
  ["ending", "結尾", "input", ""],
  ["examples", "範例專案", "textarea", "一行一個：標題|日期|說明"],
  ["previews", "樣張圖片路徑", "textarea", "一行一個，例如 previews/neon-night-market/01.jpg"],
  ["notes", "注意事項", "textarea", "一行一點"]
];
function toForm(s) {
  const j = a => (a || []).join("\n");
  return {
    name: s.name || "", subtitle: s.subtitle || "", id: s.id || "", mood: s.mood || "",
    bestFor: (s.bestFor || []).join(", "), reference: s.reference || "",
    colors: (s.colors || []).map(c => [c.name, c.hex, c.role].join("|")).join("\n"),
    fonts: (s.fonts || []).map(f => [f.role, f.family].join("|")).join("\n"),
    layout: j(s.layout), components: j(s.components), motion: j(s.motion),
    transition: s.transition || "", camera: s.camera || "", texture: s.texture || "", ending: s.ending || "",
    examples: (s.examples || []).map(e => [e.title, e.date, e.desc].join("|")).join("\n"),
    previews: j(s.previews), notes: j(s.notes)
  };
}
function fromForm(f, extra) {
  const split = (s, keys) => lines(s).map(l => { const p = l.split("|"); const o = {}; keys.forEach((k, i) => o[k] = (p[i] || "").trim()); return o; });
  return {
    id: (f.id || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""),
    name: f.name.trim(), subtitle: f.subtitle.trim(),
    added: extra.added,
    bestFor: f.bestFor.split(/[,，、]/).map(t => t.trim()).filter(Boolean),
    reference: f.reference.trim(), mood: f.mood.trim(),
    colors: split(f.colors, ["name", "hex", "role"]), fonts: split(f.fonts, ["role", "family"]),
    layout: lines(f.layout), components: lines(f.components),
    texture: f.texture.trim(), camera: f.camera.trim(), transition: f.transition.trim(),
    motion: lines(f.motion), ending: f.ending.trim(),
    examples: split(f.examples, ["title", "date", "desc"]), previews: lines(f.previews), notes: lines(f.notes)
  };
}
function viewForm(id) {
  const editing = id ? STYLES.find(x => x.id === id) : null;
  if (id && !editing) { viewDetail(id); return; }
  const base = editing || { added: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) };
  const f = toForm(base);
  app.innerHTML = `
    <a class="back" href="${editing ? `#/s/${encodeURIComponent(id)}` : "#/"}">← 返回</a>
    <div class="detail-head"><div><h1>${editing ? `修改：${esc(editing.name)}` : "新增風格"}<small>填完右側會產生 JSON，按按鈕存到 GitHub</small></h1></div></div>
    <div class="help"><ol>
      <li>填寫左邊欄位（沒有的可以留空），右邊會即時產生這個風格的 JSON。</li>
      <li>${editing ? "按「複製 JSON」，再按「開啟 GitHub 編輯頁」，把舊內容全選後貼上，最後按 Commit changes。" : "按「在 GitHub 建立檔案」，GitHub 會開好檔名和內容，直接按 Commit changes。"}</li>
      <li>存檔後約 1 分鐘，網站會自動更新。樣張圖用「上傳樣張圖」放進 <code>previews/代號/</code>。</li>
    </ol></div>
    <div class="form-wrap">
      <form class="form" id="f" onsubmit="return false">
        <div class="field"><label>新增日期</label><input id="added" type="date" value="${esc(base.added)}"></div>
        ${FIELDS.map(([k, label, type, ph]) => `<div class="field"><label for="${k}">${label}${ph ? `<small>${esc(ph)}</small>` : ""}</label>${
          type === "textarea" ? `<textarea id="${k}">${esc(f[k])}</textarea>` : `<input id="${k}" value="${esc(f[k])}" ${k === "id" && editing ? "readonly" : ""}>`
        }</div>`).join("")}
      </form>
      <aside class="out">
        <h3>產生的 JSON</h3>
        <pre id="json"></pre>
        <p id="warn"></p>
        <button class="btn" id="copy">複製 JSON</button>
        ${editing
          ? `<a class="btn primary" target="_blank" rel="noopener" href="${GH}/edit/${CONFIG.branch}/styles/${encodeURIComponent(id)}.json">開啟 GitHub 編輯頁 ↗</a>`
          : `<a class="btn primary" id="create" target="_blank" rel="noopener">在 GitHub 建立檔案 ↗</a>`}
      </aside>
    </div>`;
  const update = () => {
    const vals = {}; FIELDS.forEach(([k]) => vals[k] = document.getElementById(k).value);
    const obj = fromForm(vals, {
      added: document.getElementById("added").value
    });
    const json = JSON.stringify(obj, null, 2) + "\n";
    document.getElementById("json").textContent = json;
    const warn = [];
    if (!obj.name) warn.push("請填風格名稱");
    if (!obj.id) warn.push("請填英文代號");
    if (!editing && obj.id && STYLES.some(s => s.id === obj.id)) warn.push("這個代號已經有人用了");
    document.getElementById("warn").textContent = warn.join("；");
    const c = document.getElementById("create");
    if (c) {
      c.href = `${GH}/new/${CONFIG.branch}?filename=${encodeURIComponent(`styles/${obj.id || "new-style"}.json`)}&value=${encodeURIComponent(json)}`;
      c.style.opacity = warn.length ? .5 : 1;
    }
    return json;
  };
  app.querySelectorAll("input,textarea,select").forEach(el => el.addEventListener("input", update));
  document.getElementById("copy").addEventListener("click", () => copy(update()));
  update();
}

/* ---------- 路由 ---------- */
function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const [page, arg] = h.split("/").map(decodeURIComponent);
  document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("active",
    (a.dataset.nav === "home" && (!page || page === "s")) || (a.dataset.nav === "new" && page === "new")));
  window.scrollTo(0, 0);
  if (page === "s" && arg) viewDetail(arg);
  else if (page === "new") viewForm(null);
  else if (page === "edit" && arg) viewForm(arg);
  else viewHome();
}
window.addEventListener("hashchange", route);
loadStyles().then(s => { STYLES = s; route(); });
