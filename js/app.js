/* ============================================================
   LUXORIQ AI — Prototype Engine
   Hash router · SVG chart library · mock data · interactions
============================================================ */
(function () {
  "use strict";

  /* ---------- tiny helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const round = (n, p = 0) => +n.toFixed(p);

  const $app = {
    dark: true,
    user: "Ava Sterling",
    credits: 1240,
    toasts: [],
  };

  /* ============================================================
     THEME
  ============================================================ */
  const rootEl = document.documentElement;
  function initTheme() {
    const saved = localStorage.getItem("luxoriq-theme");
    if (saved) {
      $app.dark = saved === "dark";
      rootEl.setAttribute("data-theme", saved);
    }
  }
  function toggleTheme() {
    $app.dark = !$app.dark;
    rootEl.setAttribute("data-theme", $app.dark ? "dark" : "light");
    localStorage.setItem("luxoriq-theme", $app.dark ? "dark" : "light");
    reflowCharts();
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("#themeToggle")) toggleTheme();
  });

  /* ============================================================
     SVG CHART LIBRARY
  ============================================================ */
  const NS = "http://www.w3.org/2000/svg";
  const cssV = (name) => getComputedStyle(rootEl).getPropertyValue(name).trim();

  function svgEl(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function gradientDef(id, stops) {
    const defs = svgEl("defs", {});
    const grad = svgEl("linearGradient", { id, x1: "0", y1: "0", x2: "0", y2: "1" });
    stops.forEach(([offset, color, opacity]) => {
      const s = svgEl("stop", { offset: offset + "%", "stop-color": color, "stop-opacity": opacity });
      grad.appendChild(s);
    });
    defs.appendChild(grad);
    return defs;
  }

  function sparkline(container, values, color) {
    if (!container) return;
    const w = 220, h = 44, pad = 2;
    const max = Math.max(...values), min = Math.min(...values);
    const range = max - min || 1;
    const pts = values.map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [round(x, 1), round(y, 1)];
    });
    const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0] + " " + p[1]).join(" ");
    const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: "none", class: "svg-chart" });
    const stroke = color || (cssV("--accent") || "#E8C56C");
    svg.appendChild(svgEl("path", { d: d + ` L ${pts[pts.length - 1][0]} ${h} L ${pts[0][0]} ${h} Z`, fill: stroke, opacity: "0.14" }));
    svg.appendChild(svgEl("path", { d, fill: "none", stroke, "stroke-width": "2", "stroke-linecap": "round" }));
    container.innerHTML = "";
    container.appendChild(svg);
  }

  function lineChart(container, series, labels, opts = {}) {
    if (!container) return;
    const W = 700, H = 240, PL = 42, PR = 14, PT = 16, PB = 30;
    const innerW = W - PL - PR, innerH = H - PT - PB;
    const allVals = series.flatMap((s) => s.data);
    let max = Math.max(...allVals) * 1.12;
    max = Math.ceil(max / 1000) * 1000 || max;
    const x = (i) => PL + (i / (labels.length - 1)) * innerW;
    const y = (v) => PT + innerH - (v / max) * innerH;

    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", class: "svg-chart" });
    svg.appendChild(gradientDef("gradGold", [[0, cssV("--accent") || "#E8C56C", 0.28], [100, cssV("--accent") || "#E8C56C", 0]]));

    // grid + y labels
    const ticks = 4;
    for (let t = 0; t <= ticks; t++) {
      const v = (max / ticks) * t;
      const yy = y(v);
      svg.appendChild(svgEl("line", { x1: PL, y1: yy, x2: W - PR, y2: yy, class: "grid-line" }));
      const lab = svgEl("text", { x: PL - 8, y: yy + 3, "text-anchor": "end", class: "axis-text" });
      lab.textContent = v >= 1000 ? (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + "k" : v;
      svg.appendChild(lab);
    }
    // x labels (skip for density)
    const step = Math.max(1, Math.ceil(labels.length / 9));
    labels.forEach((l, i) => {
      if (i % step !== 0 && i !== labels.length - 1) return;
      const lab = svgEl("text", { x: x(i), y: H - 8, "text-anchor": "middle", class: "axis-text" });
      lab.textContent = l;
      svg.appendChild(lab);
    });

    series.forEach((s, si) => {
      const d = s.data.map((v, i) => (i === 0 ? "M" : "L") + round(x(i), 1) + " " + round(y(v), 1)).join(" ");
      if (si === 0) {
        svg.appendChild(svgEl("path", { d: d + ` L ${x(s.data.length - 1)} ${PT + innerH} L ${x(0)} ${PT + innerH} Z`, class: "area-fill" }));
      }
      const stroke = si === 0 ? (cssV("--accent") || "#E8C56C") : (cssV("--accent-2") || "#7C6CFF");
      svg.appendChild(svgEl("path", { d, class: si === 0 ? "line-stroke" : "line-stroke-2" }));
      if (opts.dots) {
        s.data.forEach((v, i) => svg.appendChild(svgEl("circle", { cx: x(i), cy: y(v), r: "3.4", class: "dot-point" })));
      }
    });
    container.innerHTML = "";
    container.appendChild(svg);
  }

  function barChart(container, data, labels) {
    if (!container) return;
    const W = 700, H = 190, PL = 34, PR = 10, PT = 12, PB = 26;
    const innerW = W - PL - PR, innerH = H - PT - PB;
    const max = Math.max(...data) * 1.15;
    const bw = innerW / data.length;
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", class: "svg-chart" });
    svg.appendChild(gradientDef("gradBars", [[0, cssV("--accent") || "#E8C56C", 1], [100, cssV("--accent-2") || "#7C6CFF", 0.85]]));
    for (let t = 0; t <= 3; t++) {
      const yy = PT + innerH - (innerH / 3) * t;
      svg.appendChild(svgEl("line", { x1: PL, y1: yy, x2: W - PR, y2: yy, class: "grid-line" }));
    }
    data.forEach((v, i) => {
      const h = (v / max) * innerH;
      const x = PL + i * bw + bw * 0.18;
      svg.appendChild(svgEl("rect", { x, y: PT + innerH - h, width: bw * 0.64, height: h, rx: 5, class: "bar" }));
      const lab = svgEl("text", { x: x + bw * 0.32, y: H - 8, "text-anchor": "middle", class: "axis-text" });
      lab.textContent = labels[i];
      svg.appendChild(lab);
    });
    container.innerHTML = "";
    container.appendChild(svg);
  }

  function donutChart(container, segments) {
    if (!container) return;
    const size = 190, r = 76, c = 2 * Math.PI * r;
    const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, class: "svg-chart" });
    const total = segments.reduce((s, x) => s + x.value, 0);
    let offset = 0;
    const palette = ["#E8C56C", "#7C6CFF", "#4FD1C5", "#F28C8C", "#9B98A5"];
    segments.forEach((seg, i) => {
      const frac = seg.value / total;
      const circle = svgEl("circle", {
        cx: size / 2, cy: size / 2, r, fill: "none",
        stroke: seg.color || palette[i % palette.length],
        "stroke-width": "24", "stroke-dasharray": `${frac * c} ${c}`,
        "stroke-dashoffset": -offset * c, "stroke-linecap": "butt",
        transform: `rotate(-90 ${size / 2} ${size / 2})`, class: "donut-seg",
      });
      svg.appendChild(circle);
      offset += frac;
    });
    container.innerHTML = "";
    container.appendChild(svg);
  }

  /* Chart registry — re-rendered on theme change */
  const chartDefs = {
    spark1: () => sparkline($('[data-chart="spark1"]'), [12, 18, 15, 22, 19, 26, 24, 30, 28, 34]),
    spark2: () => sparkline($('[data-chart="spark2"]'), [8, 11, 9, 14, 12, 17, 15, 19, 22, 20]),
    spark3: () => sparkline($('[data-chart="spark3"]'), [20, 18, 21, 19, 24, 22, 27, 25, 29, 31]),
    heroLine: () => lineChart($('[data-chart="heroLine"]'), [{ data: [18, 24, 21, 30, 28, 36, 33, 42, 40, 48, 46, 55, 52, 60] }], ["", "", "", "", "", "", "", "", "", "", "", "", "", ""]),
    sparkRev: () => sparkline($('[data-chart="sparkRev"]'), [9, 12, 11, 15, 14, 18, 17, 21, 20, 24]),
    sparkLeads: () => sparkline($('[data-chart="sparkLeads"]'), [18, 16, 20, 19, 23, 21, 26, 24, 29, 27]),
    sparkConv: () => sparkline($('[data-chart="sparkConv"]'), [3.1, 3.4, 3.3, 3.8, 3.7, 4.1, 4.0, 4.4, 4.6, 4.8]),
    sparkDeals: () => sparkline($('[data-chart="sparkDeals"]'), [30, 29, 28, 27, 28, 27, 26, 27, 26, 25]),
    revLine: () => lineChart($('[data-chart="revLine"]'), [{ data: revData(30) }], revLabels(30)),
    trafficLine: () => lineChart($('[data-chart="trafficLine"]'), [{ data: tData }, { data: tConv }], tLabels, { dots: false }),
    leadsBars: () => barChart($('[data-chart="leadsBars"]'), [12, 19, 14, 24, 17, 28, 22, 31, 26, 18, 24, 21], ["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F"]),
    sourcesDonut: () => donutChart($('[data-chart="sourcesDonut"]'), [{ value: 38, color: "#E8C56C" }, { value: 27, color: "#7C6CFF" }, { value: 19, color: "#4FD1C5" }, { value: 9, color: "#F28C8C" }, { value: 7, color: "#9B98A5" }]),
    sparkVis: () => sparkline($('[data-chart="sparkVis"]'), [20, 26, 24, 31, 29, 38, 35, 42, 40, 48]),
    sparkPv: () => sparkline($('[data-chart="sparkPv"]'), [30, 34, 40, 38, 46, 44, 52, 58, 55, 62]),
    sparkSess: () => sparkline($('[data-chart="sparkSess"]'), [2.4, 2.6, 2.5, 2.9, 2.8, 3.1, 3.0, 3.4, 3.3, 3.7]),
    sparkGoal: () => sparkline($('[data-chart="sparkGoal"]'), [9, 11, 10, 13, 12, 15, 14, 17, 16, 19]),
    mrrLine: () => lineChart($('[data-chart="mrrLine"]'), [{ data: [88, 95, 104, 112, 121, 130, 138, 146, 155, 163, 175, 186] }], ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]),
    planDonut: () => donutChart($('[data-chart="planDonut"]'), [{ value: 52, color: "#E8C56C" }, { value: 31, color: "#7C6CFF" }, { value: 17, color: "#4FD1C5" }]),
    aiLine: () => lineChart($('[data-chart="aiLine"]'), [{ data: [22, 28, 25, 34, 38, 36, 44, 48, 45, 52, 58, 61, 57, 66] }], ["", "", "", "", "", "", "", "", "", "", "", "", "", ""]),
    sparkUsers: () => sparkline($('[data-chart="sparkUsers"]'), [2.8, 3.1, 3.0, 3.4, 3.6, 3.5, 3.9, 4.0, 4.1, 4.2]),
    sparkMrr: () => sparkline($('[data-chart="sparkMrr"]'), [120, 128, 134, 141, 149, 156, 162, 170, 178, 186]),
    sparkSites: () => sparkline($('[data-chart="sparkSites"]'), [4.2, 4.5, 4.8, 5.1, 5.4, 5.7, 6.0, 6.3, 6.5, 6.7]),
    sparkAi: () => sparkline($('[data-chart="sparkAi"]'), [0.6, 0.7, 0.8, 0.9, 1.0, 1.05, 1.1, 1.15, 1.2, 1.2]),
  };

  /* demo data for traffic chart */
  const tData = [31, 38, 35, 44, 41, 52, 48, 58, 55, 63, 60, 70, 66, 74, 71, 80, 76, 84, 81, 88, 84, 93, 89, 97, 92, 99, 96, 103, 99, 107];
  const tConv = [2, 2.6, 2.3, 3.1, 2.8, 3.6, 3.3, 4.0, 3.7, 4.5, 4.2, 5.0, 4.6, 5.4, 5.0, 5.8, 5.4, 6.1, 5.7, 6.5, 6.1, 6.9, 6.5, 7.2, 6.8, 7.5, 7.1, 7.8, 7.4, 8.1];
  const tLabels = (() => { const a = []; for (let i = 0; i < 30; i++) a.push(i === 0 ? "Aug 1" : i === 15 ? "Aug 16" : i === 29 ? "Aug 30" : ""); return a; })();

  function revData(n) {
    let base = 18;
    const out = [];
    for (let i = 0; i < n; i++) { base += rand(0.6, 1.6); out.push(round(base + Math.sin(i / 3) * 1.5, 1)); }
    return out;
  }
  function revLabels(n) {
    const a = []; const today = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      a.push((i === 0 || i === 14 || i === n - 1) ? d.getDate() + "/" + (d.getMonth() + 1) : "");
    }
    return a;
  }

  function renderCharts() { Object.values(chartDefs).forEach((f) => f()); }
  function reflowCharts() {
    // re-render only charts that are on the visible page (cheap enough to redo all)
    renderCharts();
  }

  /* ============================================================
     ROUTER
  ============================================================ */
  const views = ["home", "auth", "app", "admin"];
  const appPages = ["overview", "builder", "crm", "analytics", "marketing", "branding", "billing", "support", "settings"];
  const adminPages = ["overview", "users", "subscriptions", "usage", "tickets", "settings"];
  const titleMap = {
    overview: "Overview", builder: "AI Website Builder", crm: "CRM", analytics: "Analytics",
    marketing: "Marketing", branding: "Branding Studio", billing: "Billing", support: "Support", settings: "Settings",
  };
  const adminTitleMap = { overview: "Overview", users: "Users", subscriptions: "Subscriptions", usage: "AI Usage", tickets: "Support tickets", settings: "Platform settings" };

  let current = { view: "home", page: null };

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "") || "home";
    const parts = raw.split("/").filter(Boolean);
    const base = parts[0] || "home";
    if (base === "home") return { view: "home", page: null, anchor: parts[1] && parts[1].startsWith("#") ? parts[1].slice(1) : null };
    if (base === "login" || base === "register" || base === "forgot") return { view: "auth", page: base, anchor: null };
    if (base === "app") return { view: "app", page: appPages.includes(parts[1]) ? parts[1] : "overview", anchor: null };
    if (base === "admin") return { view: "admin", page: adminPages.includes(parts[1]) ? parts[1] : "overview", anchor: null };
    return { view: "home", page: null, anchor: null };
  }

  function route() {
    const target = parseHash();
    const prev = current;
    current = target;

    views.forEach((v) => {
      const el = $("#view-" + v);
      if (el) el.classList.toggle("active", v === target.view);
    });

    // scroll to top on view change (but allow anchor scroll on home)
    if (prev.view !== target.view || prev.page !== target.page) {
      if (target.view === "home" && target.anchor) {
        setTimeout(() => {
          const el = document.getElementById(target.anchor);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 80);
      } else {
        window.scrollTo({ top: 0 });
      }
    }

    // sidebar highlight
    const navSelector = target.view === "app"
      ? `.nav-item[href="#/app/${target.page}"]`
      : target.view === "admin"
        ? `.nav-item[href="#/admin${target.page === "overview" ? "" : "/" + target.page}"]`
        : null;
    $$(".nav-item").forEach((n) => n.classList.remove("active"));
    if (navSelector) { const el = $(navSelector); if (el) el.classList.add("active"); }

    // crumbs + title
    if (target.view === "app") {
      $("#crumbPage").textContent = titleMap[target.page] || "Overview";
      document.title = titleMap[target.page] + " · LUXORIQ AI";
    } else if (target.view === "admin") {
      $("#crumbPage").textContent = "Admin";
      document.title = "Admin · LUXORIQ AI";
    } else if (target.view === "auth") {
      document.title = (target.page === "login" ? "Sign in" : "Create account") + " · LUXORIQ AI";
    } else {
      document.title = "LUXORIQ AI — The AI Operating System for Growing Businesses";
    }

    // auth form switching (handles direct hash loads / reloads)
    if (target.view === "auth") showAuthPage(target.page === "register" ? "register" : "login");

    // render charts when app/admin page becomes visible
    if (target.view === "app" || target.view === "admin" || target.view === "home") {
      requestAnimationFrame(() => renderCharts());
    }
    // close mobile sidebar
    $$(".app-sidebar").forEach((s) => s.classList.remove("open"));
  }

  window.addEventListener("hashchange", route);

  /* ============================================================
     LANDING INTERACTIONS
  ============================================================ */
  // mobile nav
  $("#menuBtn").addEventListener("click", () => {
    const links = $("#navLinks");
    links.classList.toggle("nav-open");
    if (links.classList.contains("nav-open")) {
      links.style.display = "flex";
      links.style.position = "absolute";
      links.style.top = "100%";
      links.style.left = "0";
      links.style.right = "0";
      links.style.flexDirection = "column";
      links.style.background = "var(--bg-soft)";
      links.style.padding = "16px 24px";
      links.style.borderBottom = "1px solid var(--border)";
    } else {
      links.style.display = "";
      links.style.position = "";
      links.style.flexDirection = "";
      links.style.background = "";
      links.style.padding = "";
      links.style.borderBottom = "";
    }
  });

  // pricing toggle
  $$(".bill-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".bill-opt").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const mode = btn.dataset.bill;
      $$(".price-amount").forEach((el) => {
        const val = el.dataset[mode];
        if (val !== undefined) {
          el.style.opacity = 0;
          setTimeout(() => { el.textContent = val; el.style.opacity = 1; el.style.transition = "opacity .3s"; }, 120);
        }
      });
    });
  });

  // demo button -> toast
  $("#demoBtn").addEventListener("click", () => {
    toast("info", "Demo video coming soon — explore the live prototype instead!");
  });

  /* ============================================================
     AUTH
  ============================================================ */
  function showAuthPage(page) {
    $("#authLogin").classList.toggle("hidden", page !== "login");
    $("#authRegister").classList.toggle("hidden", page !== "register");
  }
  function fakeLogin() {
    toast("success", "Welcome back, Ava! Signed in successfully.");
    setTimeout(() => { location.hash = "#/app/overview"; }, 450);
  }
  $("#loginForm").addEventListener("submit", (e) => { e.preventDefault(); fakeLogin(); });
  $("#registerForm").addEventListener("submit", (e) => { e.preventDefault(); fakeLogin(); });
  document.addEventListener("click", (e) => {
    const authLink = e.target.closest('[href="#/login"], [href="#/register"]');
    if (authLink) setTimeout(() => showAuthPage(authLink.getAttribute("href").replace("#/", "")), 30);
  });

  /* ============================================================
     APP SHELL
  ============================================================ */
  // sidebar mobile open/close
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open-sidebar]");
    if (openBtn) { $("#" + openBtn.dataset.openSidebar).classList.add("open"); return; }
    const closeBtn = e.target.closest("[data-close-sidebar]");
    if (closeBtn) { $("#" + closeBtn.dataset.closeSidebar).classList.remove("open"); return; }
    const menuBtn = e.target.closest("#appMenuBtn");
    if (menuBtn) { $("#appSidebar").classList.add("open"); }
  });

  // toast system
  function toast(type, msg) {
    const stack = $("#toastStack");
    const el = document.createElement("div");
    el.className = "toast " + type;
    const icons = { success: "✓", info: "✦", warn: "!" };
    el.innerHTML = `<span class="toast-icon">${icons[type] || "✓"}</span><span>${msg}</span>`;
    stack.appendChild(el);
    setTimeout(() => { el.classList.add("leaving"); setTimeout(() => el.remove(), 320); }, 3400);
  }
  window.__luxoriqToast = toast;

  // topbar actions
  $("#reportBtn").addEventListener("click", () => toast("success", "Weekly report generated — check your inbox."));
  $("#newSiteBtn").addEventListener("click", () => {
    toast("info", "New website wizard started.");
    setTimeout(() => { location.hash = "#/app/builder"; }, 600);
  });
  $("#notifBtn").addEventListener("click", () => toast("info", "3 new notifications: 1 deal update, 2 insights."));
  $("#aiAssistBtn").addEventListener("click", () => {
    toast("warn", "AI Assistant: I've reviewed your week — 3 follow-ups due, 1 campaign ready to publish.");
  });
  $("#globalSearch").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      toast("info", `Searching for "${e.target.value.trim()}"…`);
    }
  });
  // ⌘K / Ctrl+K focus search
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const s = $("#globalSearch"); if (s) s.focus();
    }
    if (e.key === "Escape") $("#modalBackdrop").classList.add("hidden");
  });

  // insight quick-actions
  document.addEventListener("click", (e) => {
    const action = e.target.closest(".insight-action");
    if (action && action.dataset.route) location.hash = action.dataset.route;
  });

  /* ---------- Revenue tabs ---------- */
  const revTabs = $("#revTabs");
  if (revTabs) {
    revTabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab");
      if (!btn) return;
      $$(".tab", revTabs).forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      const n = btn.dataset.range === "7d" ? 7 : btn.dataset.range === "30d" ? 30 : 90;
      chartDefs.revLine = () => lineChart($('[data-chart="revLine"]'), [{ data: revData(n) }], revLabels(n));
      renderCharts();
      toast("info", `Showing revenue for the last ${btn.dataset.range}.`);
    });
  }

  /* ============================================================
     AI WEBSITE BUILDER
  ============================================================ */
  const builderLog = [
    "Business profile loaded — “Maison Aurora, boutique home & lifestyle”",
    "Brand tokens applied — gold / ivory / charcoal",
    "Scanning top 5 competitor sites for positioning…",
    "Drafting 3 hero headline variants…",
    "Writing section copy: hero, about, services, testimonials, CTA…",
    "Generating SEO metadata & Open Graph tags…",
    "Optimizing mobile layout & accessibility…",
    "Ready for review — 4 sections updated.",
  ];
  let builderRunning = false;
  function runBuilder() {
    if (builderRunning) return;
    builderRunning = true;
    const log = $("#genLog");
    const typing = $("#typingLine");
    let i = 0;
    typing.querySelector("span").innerHTML = `<span class="typing-dots"><i></i><i></i><i></i></span>`;
    typing.classList.add("active");
    typing.querySelector("span").textContent = " ";
    typing.querySelector("span").innerHTML = `<span class="typing-dots"><i></i><i></i><i></i></span> ${builderLog[0]}`;
    const timer = setInterval(() => {
      i++;
      if (i >= builderLog.length) {
        clearInterval(timer);
        typing.classList.remove("active");
        const done = document.createElement("div");
        done.className = "log-line done";
        done.innerHTML = "<span>✓</span> Site updated — 4 sections refreshed. Click “Publish changes” to deploy.";
        log.appendChild(done);
        builderRunning = false;
        // update preview to show testimonials
        const cards = $(".site-cards-mini");
        if (cards) cards.innerHTML = `<span style="height:auto;padding:12px;text-align:center;font-size:.62rem;color:#5E5B68"><strong style="display:block;font-family:var(--font-serif);font-size:.95rem">"Stunning quality"</strong>— Maya, Fern &amp; Field</span><span style="height:auto;padding:12px;text-align:center;font-size:.62rem;color:#5E5B68"><strong style="display:block;font-family:var(--font-serif);font-size:.95rem">"Bought in seconds"</strong>— James, CloudPeak</span><span style="height:auto;padding:12px;text-align:center;font-size:.62rem;color:#5E5B68"><strong style="display:block;font-family:var(--font-serif);font-size:.95rem">"Gorgeous pieces"</strong>— Sofia, Solis</span>`;
        toast("success", "Site updated with new sections!");
      } else {
        typing.querySelector("span").innerHTML = `<span class="typing-dots"><i></i><i></i><i></i></span> ${builderLog[i]}`;
        typing.classList.add("active");
        typing.style.animation = "none"; typing.offsetHeight; typing.style.animation = "";
        log.appendChild(typing);
        log.scrollTop = log.scrollHeight;
      }
    }, 1400);
  }
  $("#generateBtn").addEventListener("click", runBuilder);
  $("#builderPrompt").addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runBuilder(); });

  // publish
  $("#publishBtn").addEventListener("click", () => {
    toast("success", "Published! Site deployed to maisonaurora.luxoriq.ai");
    $("#siteStatus").innerHTML = '<span class="status-dot"></span>Site live · just now';
  });

  // preview tabs
  const previewTabs = $("#previewTabs");
  if (previewTabs) {
    previewTabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".pv-tab");
      if (!btn) return;
      $$(".pv-tab", previewTabs).forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      const page = btn.dataset.page;
      const hero = $(".site-hero-mini h2");
      const sub = $(".site-hero-mini p");
      const maps = {
        home: ["Beautiful homes begin with thoughtful detail.", "Curated furniture, artisan decor and interiors designed around how you live."],
        about: ["A decade of craft, a house full of stories.", "Maison Aurora began in a tiny workshop — today we dress homes across three cities."],
        services: ["Interiors, curated for the way you live.", "Full-service styling, made-to-order furniture and white-glove delivery."],
        contact: ["Let's make your space extraordinary.", "Book a free consultation — we'll bring the moodboard, you bring the coffee."],
      };
      const [h, p] = maps[page];
      hero.textContent = h;
      sub.textContent = p;
      $(".site-preview").classList.add("editing");
      setTimeout(() => $(".site-preview").classList.remove("editing"), 900);
    });
  }

  // inline editing of preview hero
  $(".site-hero-mini h2") && $(".site-hero-mini h2").addEventListener("click", () => {
    const el = $(".site-hero-mini h2");
    el.contentEditable = "true";
    el.focus();
    el.addEventListener("blur", () => { el.contentEditable = "false"; toast("success", "Headline updated — don't forget to publish."); }, { once: true });
  });

  /* ============================================================
     CRM
  ============================================================ */
  // tabs
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".crm-tabs .tab");
    if (!tab) return;
    $$(".crm-tabs .tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const key = tab.dataset.crm;
    ["deals", "leads", "contacts", "tasks"].forEach((k) => {
      $("#crm-" + k).classList.toggle("hidden", k !== key);
    });
  });

  // kanban drag & drop
  const kanban = $("#kanban");
  if (kanban) {
    let dragEl = null;
    document.addEventListener("dragstart", (e) => {
      const card = e.target.closest(".deal-card");
      if (!card) return;
      dragEl = card;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", card.dataset.deal);
    });
    document.addEventListener("dragend", () => {
      if (dragEl) { dragEl.classList.remove("dragging"); dragEl = null; }
      $$(".kanban-body").forEach((b) => b.classList.remove("drag-over"));
    });
    $$(".kanban-body").forEach((body) => {
      body.addEventListener("dragover", (e) => { e.preventDefault(); body.classList.add("drag-over"); });
      body.addEventListener("dragleave", () => body.classList.remove("drag-over"));
      body.addEventListener("drop", (e) => {
        e.preventDefault();
        body.classList.remove("drag-over");
        if (!dragEl) return;
        const stage = body.closest(".kanban-col").dataset.stage;
        // update count chips
        const fromCol = dragEl.closest(".kanban-col");
        const fromCount = $(".count-chip", fromCol);
        fromCount.textContent = Math.max(0, +fromCount.textContent - 1);
        const toCount = $(".count-chip", body.closest(".kanban-col"));
        toCount.textContent = +toCount.textContent + 1;
        const badge = $(".badge", dragEl);
        const stageBadges = { new: ["New", "neutral"], qualified: ["Qualified", "info"], proposal: ["Proposal", "warn"], won: ["Won", "success"] };
        const [label, tone] = stageBadges[stage] || ["New", "neutral"];
        badge.className = "badge " + tone;
        badge.textContent = label;
        body.appendChild(dragEl);
        toast("success", `"${dragEl.dataset.deal}" moved to ${stage[0].toUpperCase() + stage.slice(1)}`);
      });
    });
  }

  // lead search filter
  const leadSearch = $("#leadSearch");
  if (leadSearch) {
    leadSearch.addEventListener("input", () => {
      const q = leadSearch.value.toLowerCase();
      $$("#leadsBody tr").forEach((row) => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
      });
    });
  }

  $("#importBtn").addEventListener("click", () => toast("info", "CSV import — 96 contacts synced from your file."));
  $("#addLeadBtn").addEventListener("click", () => toast("success", "Lead created! AI drafted the first follow-up email."));

  /* ============================================================
     MARKETING
  ============================================================ */
  const copyTemplates = [
    "Subject: The collection your home has been waiting for\n\nHi {first_name},\n\nThis season we've curated a limited run of artisan pieces — each one made to be lived in, not just looked at.\n\n✨ Hand-finished oak & linen\n✨ Free white-glove delivery\n✨ 30-day home trial\n\nOur favourite? The Aurora sideboard. Reserve yours before the first 50 are gone.\n\nWarmly,\nThe Maison Aurora team",
    "Subject: A little something for the weekend\n\nHi {first_name},\n\nWe're opening the studio doors this Saturday for a private preview of the new autumn collection — champagne, candles, and a 15% first-visit credit.\n\nSpace is limited to 20 guests. RSVP below and we'll keep a seat for you.\n\nSee you there,\nMaison Aurora",
    "Subject: You asked, we delivered\n\nHi {first_name},\n\nLast month you asked for more statement lighting. Done.\n\nOur new brass & glass pendant range is now live — and for 72 hours, it ships free to your door.\n\nBrowse the glow →\n\nMaison Aurora",
  ];
  let copyIdx = 0;
  $("#copyBtn").addEventListener("click", () => {
    const input = $("#copyInput");
    if (!input.value.trim()) { toast("warn", "Tell me what you'd like written first."); return; }
    const out = $("#copyOutput");
    out.classList.remove("hidden");
    $("#copyText").textContent = copyTemplates[copyIdx % copyTemplates.length];
    copyIdx++;
    $("#copyText").style.opacity = 0;
    $("#copyText").style.transition = "opacity .4s";
    setTimeout(() => { $("#copyText").style.opacity = 1; }, 40);
    toast("success", "Copy generated in your brand voice.");
  });
  $("#copyAgain").addEventListener("click", () => {
    $("#copyText").textContent = copyTemplates[copyIdx % copyTemplates.length];
    copyIdx++;
  });
  $("#newCampaignBtn").addEventListener("click", () => toast("info", "Campaign wizard started — AI will draft the first email."));

  /* ============================================================
     BILLING
  ============================================================ */
  $("#switchAnnualBtn").addEventListener("click", () => {
    toast("success", "Switched to annual billing — saving $120/year. See you on the invoice!");
  });

  /* ============================================================
     SUPPORT CHAT
  ============================================================ */
  const botReplies = [
    "Great question! You can find that under Settings → Billing. Anything else I can help with?",
    "I've checked — your plan includes that feature. Would you like me to walk you through it?",
    "No problem! I've opened a support ticket for you (#4826) and our team will follow up within 4 hours.",
    "You're all set! Is there anything else I can help you with today?",
  ];
  let replyIdx = 0;
  function sendChat() {
    const input = $("#chatInput");
    const msg = input.value.trim();
    if (!msg) return;
    const win = $("#chatWindow");
    const userBubble = document.createElement("div");
    userBubble.className = "chat-bubble user";
    userBubble.textContent = msg;
    win.appendChild(userBubble);
    input.value = "";
    win.scrollTop = win.scrollHeight;
    setTimeout(() => {
      const botBubble = document.createElement("div");
      botBubble.className = "chat-bubble bot";
      botBubble.textContent = botReplies[replyIdx % botReplies.length];
      replyIdx++;
      win.appendChild(botBubble);
      win.scrollTop = win.scrollHeight;
    }, 900);
  }
  $("#chatSend").addEventListener("click", sendChat);
  $("#chatInput").addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });
  $("#newTicketBtn").addEventListener("click", () => toast("success", "Ticket created — we'll reply within 4 hours."));

  /* ============================================================
     MODAL
  ============================================================ */
  const modal = $("#modalBox"), backdrop = $("#modalBackdrop");
  function openModal(html) { $("#modalContent").innerHTML = html; backdrop.classList.remove("hidden"); }
  $("#modalClose").addEventListener("click", () => backdrop.classList.add("hidden"));
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.classList.add("hidden"); });

  // share modal on weekly report
  $("#reportBtn") && $("#reportBtn").addEventListener("click", () => {
    openModal(`
      <h2>Weekly report</h2>
      <p>Your growth snapshot for <strong>Jul 27 – Aug 2</strong> is ready.</p>
      <ul style="color:var(--text-muted);font-size:.9rem;margin-bottom:18px;padding-left:20px;display:flex;flex-direction:column;gap:7px">
        <li>✓ Revenue up <strong style="color:var(--green)">12.4%</strong> — $24,860</li>
        <li>✓ 312 new leads, 8.1% growth</li>
        <li>✦ 1 high-intent lead needs follow-up</li>
        <li>✦ Checkout bounce at 42% — A/B test suggested</li>
      </ul>
      <button class="btn btn-gold btn-block" onclick="document.getElementById('modalBackdrop').classList.add('hidden');document.getElementById('toastStack').innerHTML=''">Send to my inbox</button>
    `);
    setTimeout(() => toast("success", "Report sent to ava@maisonaurora.com"), 1200);
  });

  /* ============================================================
     INIT
  ============================================================ */
  function init() {
    initTheme();
    renderCharts();
    route();
  }
  document.addEventListener("DOMContentLoaded", init);
  if (document.readyState === "complete" || document.readyState === "interactive") init();
})();
