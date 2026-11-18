const $ = (s) => document.querySelector(s);
const escapeHtml = (v) =>
  String(v ?? "—").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (v) =>
  new Intl.NumberFormat("kk-KZ", { maximumFractionDigits: 0 }).format(
    Number(v) || 0,
  ) + " ₸";
const integer = (v) => new Intl.NumberFormat("kk-KZ").format(Number(v) || 0);
const dateStr = () => new Date().toISOString().slice(0, 7);
const notify = (message, error = false) => {
  const t = $("#toast");
  t.textContent = message;
  t.className = "toast show" + (error ? " error" : "");
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => (t.className = "toast"), 4500);
};
async function api(url, opts = {}) {
  const res = await fetch("/api" + url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts.headers },
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Серверден жауап жоқ. Node.js іске қосылғанын тексеріңіз.");
  }
  if (!res.ok) throw new Error(data.error || "Қате орын алды");
  return data;
}
const send = (url, body, method = "POST") =>
  api(url, { method, body: JSON.stringify(body) });
const heading = (title, desc, tag = "БАСҚАРУ ПАНЕЛІ") =>
  `<div class="heading"><div><div class="eyebrow">${tag}</div><h1>${title}</h1><p>${desc}</p></div><button class="btn ghost" onclick="loadPage()">↻ Жаңарту</button></div>`;
const field = (name, title, type = "text", value = "", full = false) =>
  `<div class="field${full ? " full" : ""}"><label for="${name}">${title}</label><input id="${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${type === "number" ? 'min="0"' : ""} required></div>`;
const dropdown = (name, title, items, key, label) =>
  `<div class="field"><label for="${name}">${title}</label><select id="${name}" name="${name}" required><option value="">Таңдаңыз...</option>${items.map((it) => `<option value="${escapeHtml(it[key])}">${escapeHtml(label(it))}</option>`).join("")}</select></div>`;
const table = (rows, cols) =>
  !rows?.length
    ? '<div class="empty">Әзірге деректер жоқ</div>'
    : `<div class="table-wrap"><table><thead><tr>${cols.map((c) => `<th>${escapeHtml(c[1])}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${cols.map(([key, , render]) => `<td>${render ? render(row[key], row) : escapeHtml(row[key])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const statusPill = (v) =>
  `<span class="pill ${["blocked", "inactive", "unpaid", "open"].includes(v) ? "bad" : ["partial", "in_progress"].includes(v) ? "warn" : ""}">${escapeHtml({ active: "Белсенді", inactive: "Белсенді емес", blocked: "Бұғатталған", available: "Бос", paid: "Төленді", unpaid: "Төленбеді", partial: "Ішінара", open: "Ашық", in_progress: "Өңделуде", resolved: "Шешілді" }[v] || v)}</span>`;
function bars(rows, labelKey, valKey) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valKey]) || 0));
  return rows.length
    ? rows
        .map(
          (r) =>
            `<div class="chart-row"><span>${escapeHtml(r[labelKey])}</span><div class="bar-track"><div class="bar-fill" style="width:${(100 * (Number(r[valKey]) || 0)) / max}%"></div></div><b>${integer(r[valKey])}</b></div>`,
        )
        .join("")
    : '<div class="empty">Диаграмма үшін деректер жоқ</div>';
}
let page = "dashboard";
let currentTable = "subscribers";
let currentOptions = {};
async function dashboard() {
  const d = await api("/dashboard");
  const s = d.stats;
  return (
    heading(
      "Басқару панелі",
      "Телеком жүйесінің жалпы көрсеткіштері мен белсенділігі",
      "ЖҮЙЕГЕ ҚОШ КЕЛДІҢІЗ",
    ) +
    `<div class="stats"><div class="stat"><div class="label">Барлық абоненттер</div><div class="number">${integer(s.subscribers)}</div><div class="sub">${integer(s.active_subscribers)} белсенді</div></div><div class="stat"><div class="label">Белсенді SIM</div><div class="number">${integer(s.active_sims)}</div><div class="sub">SIM карталар</div></div><div class="stat"><div class="label">Жиналған төлем</div><div class="number">${money(s.revenue)}</div><div class="sub">Барлық уақыттағы төлемдер</div></div><div class="stat"><div class="label">Белсенді тарифтер</div><div class="number">${integer(s.tariffs)}</div><div class="sub">${integer(s.complaints)} ашық шағым</div></div></div><div class="panels"><section class="panel"><h2>Танымал тарифтер</h2><div class="panel-sub">Белсенді жазылымдар саны</div>${bars(d.top, "name", "total")}</section><section class="panel"><h2>Қолдану статистикасы</h2><div class="stats" style="grid-template-columns:1fr 1fr;margin:0"><div class="stat"><div class="label">Интернет</div><div class="number">${Number(s.gb).toFixed(1)}</div><div class="sub">ГБ жұмсалды</div></div><div class="stat"><div class="label">Қоңыраулар</div><div class="number">${integer(s.calls)}</div><div class="sub">Барлық қоңыраулар</div></div></div><div class="hint">SQL деректері PostgreSQL базасынан нақты уақытта оқылады.</div></section></div>`
  );
}
async function subscribers() {
  const rows = await api("/subscribers");
  return (
    heading(
      "Абоненттер",
      "Жаңа абонент тіркеу және ағымдағы абоненттерді қарау",
      "АБОНЕНТТЕР БАЗАСЫ",
    ) +
    `<div class="cols"><section class="panel"><h2>Абонент тіркеу</h2><form id="add-subscriber"><div class="form-grid">${field("full_name", "Толық аты-жөні")}${field("phone", "Телефон нөмірі", "tel")}${field("iin", "ЖСН (12 сан)")}${field("email", "Электрондық пошта", "email")}</div><button class="btn" type="submit">+ Абонент қосу</button></form><div class="hint">Оқу жобасында нақты адамдардың ЖСН немесе жеке деректерін емес, тек тест деректерін қолданыңыз.</div></section><section class="panel"><h2>Қысқаша ақпарат</h2><p class="muted">Тіркелген абоненттер: <span class="highlight">${rows.length}</span></p><p class="muted">Белсенді: <span class="highlight">${rows.filter((x) => x.status === "active").length}</span></p><p class="muted">Жүйе абонентті PostgreSQL ішіндегі <code>subscribers</code> кестесіне жазады.</p></section></div><section class="panel"><h2>Абоненттер тізімі</h2>${table(
      rows,
      [
        ["subscriber_id", "ID"],
        ["full_name", "Аты-жөні"],
        ["phone", "Телефон"],
        ["email", "Email"],
        ["status", "Статус", statusPill],
        [
          "subscriber_id",
          "Әрекет",
          (_, r) =>
            `<select class="small" onchange="updateSubscriber(${Number(r.subscriber_id)},this.value)"><option value="">Статус өзгерту</option><option value="active">Белсенді</option><option value="blocked">Бұғаттау</option><option value="inactive">Белсенді емес</option></select>`,
        ],
      ],
    )}</section>`
  );
}
async function tariffs() {
  const [ts, sims, subs] = await Promise.all([
    api("/tariffs"),
    api("/sims"),
    api("/subscribers"),
  ]);
  currentOptions = { ts, sims, subs };
  return (
    heading(
      "Тарифтер және SIM",
      "SIM тіркеу, жаңа тариф қосу және тарифті өзгерту",
      "ҚЫЗМЕТТЕР",
    ) +
    `<div class="stats">${ts
      .slice(0, 4)
      .map(
        (t) =>
          `<div class="stat"><div class="label">${escapeHtml(t.name)}</div><div class="number">${money(t.monthly_fee)}</div><div class="sub">${escapeHtml(t.included_gb)} ГБ • ${escapeHtml(t.included_minutes)} минут</div></div>`,
      )
      .join(
        "",
      )}</div><div class="cols"><section class="panel"><h2>SIM-картаны тіркеу</h2><form id="register-sim"><div class="form-grid">${dropdown("subscriber_id", "Абонент", subs, "subscriber_id", (s) => `${s.full_name} / ${s.phone}`)}${dropdown(
      "sim_id",
      "Бос SIM",
      sims.filter((s) => s.status === "available"),
      "sim_id",
      (s) => s.msisdn,
    )}</div><button class="btn">SIM тіркеу</button></form><div class="hint">SIM тіркелгеннен кейін оған тариф қосыңыз.</div></section><section class="panel"><h2>Алғашқы тарифті қосу</h2><form id="add-subscription"><div class="form-grid">${dropdown(
      "sim_id",
      "Тіркелген SIM",
      sims.filter((s) => s.status === "active"),
      "sim_id",
      (s) => s.msisdn,
    )}${dropdown(
      "tariff_id",
      "Тариф",
      ts.filter((t) => t.is_active),
      "tariff_id",
      (t) => t.name,
    )}</div><button class="btn">Тариф қосу</button></form></section><section class="panel"><h2>Тарифті ауыстыру</h2><form id="change-tariff"><div class="form-grid">${dropdown(
      "sim_id",
      "SIM-карта",
      sims.filter((s) => s.status === "active"),
      "sim_id",
      (s) => s.msisdn,
    )}${dropdown(
      "tariff_id",
      "Жаңа тариф",
      ts.filter((t) => t.is_active),
      "tariff_id",
      (t) => t.name,
    )}</div><button class="btn">Тарифті ауыстыру</button></form></section><section class="panel"><h2>SIM-карталар</h2>${table(
      sims.slice(0, 10),
      [
        ["msisdn", "Нөмір"],
        ["subscriber_id", "Абонент ID"],
        ["status", "Статус", statusPill],
      ],
    )}</section></div>`
  );
}
async function billing() {
  const [bills, subs] = await Promise.all([
    api("/invoices"),
    api("/subscribers"),
  ]);
  const pending = bills.filter((i) => i.status !== "paid");
  return (
    heading(
      "Шоттар мен төлемдер",
      "Ай сайынғы шот жасау және төлемді тіркеу",
      "БИЛЛИНГ",
    ) +
    `<div class="cols"><section class="panel"><h2>Шот қалыптастыру</h2><form id="generate-invoice"><div class="form-grid">${dropdown("subscriber_id", "Абонент", subs, "subscriber_id", (s) => s.full_name)}${field("month", "Есептік ай", "month", dateStr())}</div><button class="btn">Шот шығару</button></form><div class="hint">Оқу жобасындағы есептеу: тариф абоненттік төлемі + лимиттен асқан минуттар мен гигабайттар.</div></section><section class="panel"><h2>Төлем қабылдау</h2><form id="pay-invoice"><div class="form-grid">${dropdown("invoice_id", "Төленбеген шот", pending, "invoice_id", (i) => `#${i.invoice_id} / ${i.full_name} / ${money(i.total_amount)}`)}${field("amount", "Төлем сомасы (₸)", "number")}<div class="field full"><label>Төлем әдісі</label><select name="method"><option value="card">Карта</option><option value="cash">Қолма-қол</option><option value="bank_transfer">Банк аударымы</option></select></div></div><button class="btn">Төлем жасау</button></form></section></div><section class="panel"><h2>Шоттар тізімі</h2>${table(
      bills,
      [
        ["invoice_id", "Шот №"],
        ["full_name", "Абонент"],
        ["billing_month", "Ай", (v) => escapeHtml(String(v).slice(0, 7))],
        ["tariff_fee", "Тариф", money],
        ["extra_charges", "Қосымша", money],
        ["total_amount", "Жалпы", money],
        ["status", "Статус", statusPill],
      ],
    )}</section>`
  );
}
async function analytics() {
  const d = await api("/analytics");
  return (
    heading(
      "Аналитика",
      "Тарифтер рейтингі, ARPU және интернетті пайдалану",
      "БИЗНЕС ЕСЕПТЕРІ",
    ) +
    `<div class="cols"><section class="panel"><h2>Ең танымал тарифтер</h2>${bars(d.tariffs, "name", "subscribers")}</section><section class="panel"><h2>Интернетті көп қолданатындар</h2>${table(
      d.heavy,
      [
        ["full_name", "Абонент"],
        ["gb", "ГБ", (v) => Number(v).toFixed(2)],
      ],
    )}</section><section class="panel"><h2>ARPU — бір абонентке орташа табыс</h2>${table(
      d.arpu,
      [
        ["month", "Ай"],
        ["arpu", "ARPU", money],
      ],
    )}<div class="hint">ARPU = айлық төлемдер сомасы / барлық тіркелген абоненттер саны. Оқу жобасындағы жеңілдетілген көрсеткіш.</div></section><section class="panel"><h2>SQL есептері</h2><p class="muted">Бұл диаграммалар SQL агрегаттық сұраныстары арқылы есептеледі: <code>SUM</code>, <code>COUNT</code>, <code>GROUP BY</code>, <code>JOIN</code>.</p><button class="btn ghost" onclick="go('tables')">Барлық 15 кестені қарау →</button></section></div>`
  );
}
const titles = {
  subscribers: "Абоненттер",
  sim_cards: "SIM-карталар",
  tariffs: "Тарифтер",
  subscriptions: "Жазылымдар",
  tariff_history: "Тариф тарихы",
  calls: "Қоңыраулар",
  sms_usage: "SMS",
  internet_usage: "Интернет",
  service_packages: "Қызмет пакеттері",
  subscriber_packages: "Алынған пакеттер",
  payments: "Төлемдер",
  invoices: "Шоттар",
  complaints: "Шағымдар",
  branches: "Филиалдар",
  employees: "Қызметкерлер",
};
async function tablesView() {
  const names = await api("/tables");
  return (
    heading(
      "15 SQL кесте",
      "PostgreSQL дерекқорындағы барлық кестелердің деректерін көру",
      "ДЕРЕКҚОР",
    ) +
    `<section class="panel"><h2>Кестені таңдаңыз</h2><div class="table-buttons">${names.map((n) => `<button class="${n === currentTable ? "selected" : ""}" onclick="selectTable('${n}')">${titles[n]}</button>`).join("")}</div></section><section class="panel"><h2 id="table-title">${titles[currentTable]}</h2><div id="table-data" class="skeleton">Жүктелуде...</div></section>`
  );
}
async function renderTable() {
  try {
    const d = await api("/table/" + currentTable);
    $("#table-data").innerHTML = table(
      d.rows,
      d.columns.map((c) => [c, c]),
    );
    $("#table-title").textContent =
      `${titles[currentTable]} — ${d.rows.length} жазба (ең көбі 100)`;
  } catch (e) {
    $("#table-data").textContent = e.message;
  }
}
window.selectTable = async (name) => {
  currentTable = name;
  await loadPage();
};
const pages = {
  dashboard,
  subscribers,
  tariffs,
  billing,
  analytics,
  tables: tablesView,
};
async function loadPage() {
  const c = $("#content");
  c.innerHTML = '<div class="skeleton">Деректер жүктелуде...</div>';
  $("#breadcrumb").textContent = page.toUpperCase();
  document
    .querySelectorAll("#nav button")
    .forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  try {
    c.innerHTML = await pages[page]();
    if (page === "tables") await renderTable();
    bindForms();
  } catch (e) {
    c.innerHTML = `<div class="panel"><h2>Дерекқорға қосылу мүмкін болмады</h2><p class="muted">${escapeHtml(e.message)}</p><div class="hint">Node.js серверін іске қосып, .env ішіндегі DATABASE_URL және PostgreSQL кестелерін тексеріңіз.</div><button class="btn" onclick="loadPage()">Қайта қосылу</button></div>`;
    notify(e.message, true);
  }
}
window.go = (p) => {
  page = p;
  loadPage();
};
window.loadPage = loadPage;
window.updateSubscriber = async (id, status) => {
  if (!status) return;
  try {
    await send("/subscribers/" + id, { status }, "PATCH");
    notify("Абонент статусы өзгертілді");
    loadPage();
  } catch (e) {
    notify(e.message, true);
  }
};
function bindForm(id, fn) {
  const f = document.getElementById(id);
  if (!f) return;
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = f.querySelector('button[type="submit"],button.btn');
    const data = Object.fromEntries(new FormData(f));
    if (button) button.disabled = true;
    try {
      await fn(data);
      notify("Операция сәтті орындалды!");
      await loadPage();
    } catch (err) {
      notify(err.message, true);
      if (button) button.disabled = false;
    }
  });
}
function bindForms() {
  bindForm("add-subscriber", (d) => send("/subscribers", d));
  bindForm("register-sim", (d) => send("/sims/register", d));
  bindForm("add-subscription", (d) => send("/subscriptions", d));
  bindForm("change-tariff", (d) => send("/tariffs/change", d));
  bindForm("generate-invoice", (d) => send("/invoices/generate", d));
  bindForm("pay-invoice", (d) => send("/payments", d));
}
document
  .querySelectorAll("#nav button")
  .forEach((b) => b.addEventListener("click", () => go(b.dataset.page)));
$("#today").textContent = new Intl.DateTimeFormat("kk-KZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());
api("/health")
  .then(() => {
    $("#db-dot").classList.add("ok");
    $("#db-status").textContent = "PostgreSQL қосылған";
  })
  .catch(() => {
    $("#db-dot").classList.remove("ok");
    $("#db-status").textContent = "PostgreSQL қосылмаған";
  });
loadPage();
