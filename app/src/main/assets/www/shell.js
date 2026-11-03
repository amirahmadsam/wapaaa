/* پوسته‌ی اپ دیده‌بان بورس: خانه (داشبورد بازار)، دیده‌بان من + هشدار، جستجو، اسکرینر، ابزارها، تنظیمات
   و تمام‌صفحه کردن پنل افزونه روی صفحه‌ی نماد. داده‌ها از API سایت (از طریق پل اپ) گرفته می‌شود. */
(function () {
  "use strict";
  var PAGE = document.body.getAttribute("data-page") || "home";
  var Q = new URLSearchParams(location.search), CODE = Q.get("i") || "", NAME = Q.get("n") || "";
  var IS_SYM = PAGE === "search" && !!CODE;
  var HDR = 60, TAB = 78, SUB = 0;

  // ------------------------------------------------------------------ ابزارهای کوچک
  function $(s, r) { return (r || document).querySelector(s); }
  function h(tag, a) {
    var e = document.createElement(tag);
    if (a) for (var k in a) {
      if (k === "class") e.className = a[k];
      else if (k === "text") e.textContent = a[k];
      else if (k.slice(0, 2) === "on") e[k] = a[k];
      else e.setAttribute(k, a[k]);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i]; if (c === null || c === undefined || c === false) continue;
      e.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
    }
    return e;
  }
  function toLat(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); })
      .replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }).replace(/[٬,،\s]/g, "").replace(/٫/g, ".");
  }
  function num(s) { var v = parseFloat(toLat(s)); return isFinite(v) ? v : null; }
  function fnum(x) { return x === null || x === undefined || !isFinite(x) ? "—" : Math.round(x).toLocaleString("fa-IR"); }
  function fdec(x, d) { return x === null || x === undefined || !isFinite(x) ? "—" : Number(x).toLocaleString("fa-IR", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function fpct(x) { return x === null || x === undefined || !isFinite(x) ? "—" : (x > 0.005 ? "+" : "") + fdec(x, 2) + "٪"; }
  function big(x) {   // ارزش به تومان با واحد خوانا
    if (x === null || x === undefined || !isFinite(x)) return "—";
    var t = x / 10;
    if (t >= 1e12) return fdec(t / 1e12, 1) + " همت";
    if (t >= 1e9) return fdec(t / 1e9, 1) + " میلیارد ت";
    if (t >= 1e6) return fdec(t / 1e6, 1) + " میلیون ت";
    return fnum(t) + " ت";
  }
  function bigVol(x) {
    if (x === null || x === undefined || !isFinite(x)) return "—";
    if (x >= 1e9) return fdec(x / 1e9, 1) + " میلیارد";
    if (x >= 1e6) return fdec(x / 1e6, 1) + " میلیون";
    if (x >= 1e3) return fdec(x / 1e3, 1) + " هزار";
    return fnum(x);
  }
  function cls(c) { return c > 0.005 ? "up" : c < -0.005 ? "dn" : "nu"; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  var S = {
    get: function (k, cb) { try { chrome.storage.local.get(k, function (o) { cb(o ? o[k] : undefined); }); } catch (e) { cb(undefined); } },
    set: function (k, v, cb) { var o = {}; o[k] = v; try { chrome.storage.local.set(o, cb || function () {}); } catch (e) {} }
  };
  function api(path, cb) {
    try { chrome.runtime.sendMessage({ t: "fetch", url: "https://cdn.tsetmc.com/api/" + path }, function (r) { cb(r || { ok: false }); }); }
    catch (e) { cb({ ok: false, err: String(e) }); }
  }
  function send(msg, cb) { try { chrome.runtime.sendMessage(msg, cb || function () {}); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var toastEl, toastT;
  function toast(msg, kind) {
    if (!toastEl) { toastEl = h("div", { id: "toast" }); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.className = "show " + (kind || "");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.className = ""; }, 3200);
  }

  window.__sh = { h: h, api: api, fnum: fnum, fdec: fdec, fpct: fpct, cls: cls, big: big, bigVol: bigVol, S: S, toast: toast };

  // ------------------------------------------------------------------ ناوبری
  function openSym(ins, name) {
    S.get("app:recent", function (rec) {
      rec = (rec || []).filter(function (x) { return x.i !== ins; });
      rec.unshift({ i: ins, n: name });
      S.set("app:recent", rec.slice(0, 12), function () { location.href = "app.html?i=" + encodeURIComponent(ins) + "&n=" + encodeURIComponent(name || ""); });
    });
  }
  var TABS = [
    { id: "home", href: "home.html", ic: "🏠", t: "خانه" },
    { id: "watch", href: "watch.html", ic: "⭐", t: "دیده‌بان" },
    { id: "search", href: "app.html", ic: "🔍", t: "نماد" },
    { id: "mkt", href: "marketwatch.html", ic: "📡", t: "اسکرینر" },
    { id: "more", href: "more.html", ic: "☰", t: "بیشتر" }
  ];
  function tabBar() {
    var nav = h("nav", { id: "tabs" });
    TABS.forEach(function (t) {
      var on = t.id === PAGE || (PAGE === "tools" && t.id === "more");
      nav.appendChild(h("a", { href: t.href, class: on ? "on" : "" }, h("span", { class: "ti", text: t.ic }), h("span", { class: "tt", text: t.t })));
    });
    document.body.appendChild(nav);
  }
  function marketStatus() {
    try {
      var p = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date()), o = {};
      p.forEach(function (x) { o[x.type] = x.value; });
      var m = (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10), wk = o.weekday;
      var open = /^(Sat|Sun|Mon|Tue|Wed)$/.test(wk);
      if (open && m >= 9 * 60 && m < 12 * 60 + 30) return { t: "بازار باز است", c: "ok" };
      if (open && m >= 8 * 60 + 30 && m < 9 * 60) return { t: "پیش‌گشایش", c: "wait" };
      return { t: "بازار بسته است", c: "off" };
    } catch (e) { return { t: "", c: "off" }; }
  }
  var header = h("header", { id: "hdr" });
  function buildHeader(title, actions) {
    header.textContent = "";
    if (IS_SYM) header.appendChild(h("button", { class: "ib", "aria-label": "برگشت", onclick: function () { if (history.length > 1) history.back(); else location.href = "home.html"; }, text: "➡" }));
    else header.appendChild(h("img", { class: "lg", src: "icon.png", alt: "" }));
    header.appendChild(h("div", { class: "t", id: "title", text: title }));
    (actions || []).forEach(function (a) { header.appendChild(a); });
    if (!header.parentNode) document.body.appendChild(header);
  }
  function ibtn(ic, label, fn, on) { return h("button", { class: "ib" + (on ? " on" : ""), "aria-label": label, onclick: fn, text: ic }); }

  // ------------------------------------------------------------------ دیده‌بان من و هشدارها (ذخیره‌سازی)
  var K_WATCH = "app:watch", K_ALERTS = "app:alerts", K_PX = "app:px";
  function getWatch(cb) { S.get(K_WATCH, function (w) { cb(Array.isArray(w) ? w : []); }); }
  function setWatch(w, cb) { S.set(K_WATCH, w, cb); }
  function toggleWatch(ins, sym, name, cb) {
    getWatch(function (w) {
      var has = w.some(function (x) { return x.i === ins; });
      w = has ? w.filter(function (x) { return x.i !== ins; }) : w.concat([{ i: ins, s: sym || name, n: name }]);
      setWatch(w, function () { toast(has ? "از دیده‌بان حذف شد" : "به دیده‌بان اضافه شد"); cb && cb(!has); });
    });
  }
  function getAlerts(cb) { S.get(K_ALERTS, function (a) { cb(Array.isArray(a) ? a : []); }); }
  function setAlerts(a, cb) { S.set(K_ALERTS, a, cb); }

  // قیمت زنده‌ی یک نماد (همان API ای که افزونه استفاده می‌کند)
  function fetchPrice(ins, cb) {
    api("ClosingPrice/GetClosingPriceInfo/" + ins, function (r) {
      var i = r && r.json && r.json.closingPriceInfo; if (!i) { cb(null); return; }
      var last = Number(i.pDrCotVal) || 0, close = Number(i.pClosing) || 0, py = Number(i.priceYesterday) || 0, S0 = last > 0 ? last : close;
      if (!(S0 > 0)) { cb(null); return; }
      cb({ S: S0, py: py, c: py > 0 ? (S0 - py) / py * 100 : null, hi: Number(i.priceMax) || null, lo: Number(i.priceMin) || null,
        vol: Number(i.qTotTran5J) || null, val: Number(i.qTotCap) || null, at: Date.now() });
    });
  }
  function fetchMany(inss, done) {
    var out = {}, idx = 0, active = 0, finished = 0, n = inss.length;
    if (!n) { done(out); return; }
    function next() {
      while (active < 4 && idx < n) {
        (function (ins) {
          active++;
          fetchPrice(ins, function (p) { if (p) out[ins] = p; active--; finished++; if (finished === n) done(out); else next(); });
        })(inss[idx++]);
      }
    }
    next();
  }
  function mergePx(fresh, cb) {
    S.get(K_PX, function (old) { old = old || {}; for (var k in fresh) old[k] = fresh[k]; S.set(K_PX, old); cb && cb(old); });
  }

  // بررسی هشدارها با قیمت‌های تازه؛ هشدار رسیده خاموش می‌شود و اعلان می‌دهد
  function evalAlerts(px, cb) {
    getAlerts(function (al) {
      var hit = [];
      al.forEach(function (a) {
        if (a.on === false) return;
        var p = px[a.i]; if (!p) return;
        var ok = (a.t === "above" && p.S >= a.v) || (a.t === "below" && p.S <= a.v) ||
          (a.t === "up" && p.c !== null && p.c >= a.v) || (a.t === "down" && p.c !== null && p.c <= -a.v);
        if (ok) { a.on = false; a.fired = Date.now(); a.firedAt = p.S; hit.push({ a: a, p: p }); }
      });
      if (!hit.length) { cb && cb(al, hit); return; }
      setAlerts(al, function () {
        hit.forEach(function (x) {
          var a = x.a, w = a.t === "above" ? "به " + fnum(x.p.S) + " رسید (بالاتر از " + fnum(a.v) + ")" :
            a.t === "below" ? "به " + fnum(x.p.S) + " رسید (پایین‌تر از " + fnum(a.v) + ")" :
            a.t === "up" ? "امروز " + fpct(x.p.c) + " رشد کرد" : "امروز " + fpct(x.p.c) + " افت کرد";
          toast("🔔 " + a.s + " " + w, "warn");
          send({ t: "notify", title: "هشدار " + a.s, text: a.s + " " + w });
        });
        try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
        cb && cb(al, hit);
      });
    });
  }
  // نگهبان هشدار: تا وقتی برنامه باز است هر ۳۰ ثانیه (پس‌زمینه‌ی بسته: کارگر نیتیو هر ~۱۵ دقیقه)
  var alertBusy = false;
  function alertTick(after) {
    if (alertBusy) return; alertBusy = true;
    getAlerts(function (al) {
      var inss = []; al.forEach(function (a) { if (a.on !== false && inss.indexOf(a.i) < 0) inss.push(a.i); });
      if (!inss.length) { alertBusy = false; return; }
      fetchMany(inss.slice(0, 30), function (px) {
        mergePx(px, function () { evalAlerts(px, function () { alertBusy = false; after && after(px); }); });
      });
    });
  }

  // ------------------------------------------------------------------ برگه‌ی پایین (sheet)
  function sheet(title, body) {
    var back = h("div", { class: "sbk" }), box = h("div", { class: "sht" });
    function close() { back.classList.remove("in"); setTimeout(function () { back.remove(); }, 200); }
    box.appendChild(h("div", { class: "grip" }));
    box.appendChild(h("div", { class: "sh-h" }, h("b", { text: title }), h("button", { class: "ib sm", "aria-label": "بستن", onclick: close, text: "✕" })));
    box.appendChild(body); back.appendChild(box);
    back.onclick = function (e) { if (e.target === back) close(); };
    document.body.appendChild(back);
    requestAnimationFrame(function () { back.classList.add("in"); });
    return { close: close };
  }

  var ALERT_TYPES = [
    { t: "above", l: "قیمت بالاتر از", u: "ریال" }, { t: "below", l: "قیمت پایین‌تر از", u: "ریال" },
    { t: "up", l: "رشد روزانه از", u: "٪" }, { t: "down", l: "افت روزانه از", u: "٪" }
  ];
  function alertText(a) {
    var t = ALERT_TYPES.filter(function (x) { return x.t === a.t; })[0];
    return (t ? t.l : a.t) + " " + (a.t === "up" || a.t === "down" ? fdec(a.v, 1) + "٪" : fnum(a.v) + " ریال");
  }
  function openAlertSheet(ins, sym, name) {
    var body = h("div", { class: "sh-b" }), cur = h("div", { class: "sub", text: "در حال گرفتن قیمت…" }), list = h("div", { class: "al-list" });
    var type = "above", chips = h("div", { class: "seg" }), inp = h("input", { type: "text", inputmode: "decimal", placeholder: "مقدار", dir: "ltr", autocomplete: "off" });
    var unit = h("span", { class: "unit", text: "ریال" }), price = null;
    ALERT_TYPES.forEach(function (x) {
      var b = h("button", { class: x.t === type ? "on" : "", text: x.l.replace(" از", "").replace("قیمت ", "") === x.l ? x.l : x.l, onclick: function () {
        type = x.t; unit.textContent = x.u; [].forEach.call(chips.children, function (c) { c.classList.remove("on"); }); b.classList.add("on");
        if (price && (x.t === "above" || x.t === "below") && !inp.value) inp.placeholder = fnum(price.S);
      } });
      chips.appendChild(b);
    });
    function renderList() {
      getAlerts(function (al) {
        list.textContent = "";
        var mine = al.filter(function (a) { return a.i === ins; });
        if (!mine.length) { list.appendChild(h("div", { class: "empty-s", text: "هنوز هشداری برای این نماد نگذاشته‌ای." })); return; }
        mine.forEach(function (a) {
          list.appendChild(h("div", { class: "al-row" + (a.on === false ? " off" : "") },
            h("div", { class: "al-t" }, h("b", { text: alertText(a) }), h("span", { text: a.on === false ? (a.fired ? "رسید ✔" : "خاموش") : "فعال" })),
            h("button", { class: "ib sm", "aria-label": "حذف", onclick: function () { getAlerts(function (all) { setAlerts(all.filter(function (x) { return x.id !== a.id; }), renderList); }); }, text: "🗑" })));
        });
      });
    }
    var add = h("button", { class: "btn pri", text: "افزودن هشدار", onclick: function () {
      var v = num(inp.value); if (v === null || v <= 0) { toast("مقدار را درست وارد کن", "bad"); return; }
      getAlerts(function (al) {
        al.push({ id: uid(), i: ins, s: sym || name, t: type, v: v, on: true, at: Date.now() });
        setAlerts(al, function () { inp.value = ""; renderList(); toast("هشدار ثبت شد"); send({ t: "perm" }); });
      });
    } });
    body.appendChild(cur); body.appendChild(chips);
    body.appendChild(h("div", { class: "row-in" }, inp, unit)); body.appendChild(add);
    body.appendChild(h("div", { class: "sec", text: "هشدارهای این نماد" })); body.appendChild(list);
    body.appendChild(h("div", { class: "hint", text: "هشدار تا وقتی برنامه باز است هر ۳۰ ثانیه و در پس‌زمینه هر حدود ۱۵ دقیقه (فقط ساعت بازار) بررسی می‌شود. مجوز اعلان گوشی باید روشن باشد." }));
    sheet("هشدار " + (sym || name), body); renderList();
    fetchPrice(ins, function (p) {
      price = p;
      cur.textContent = p ? "قیمت فعلی: " + fnum(p.S) + " ریال (" + fpct(p.c) + ")" : "قیمت فعلی خوانده نشد";
      if (p) inp.placeholder = fnum(p.S);
    });
  }

  // ------------------------------------------------------------------ جستجو
  function searchBox(onPick, opts) {
    opts = opts || {};
    var wrap = h("div", { class: "sw" }), box = h("div", { class: "sbox" }), q = h("input", { id: "q", type: "search", placeholder: "نام نماد یا سهم… (فولاد، ضفولاد، خودرو)", autocomplete: "off" });
    var msg = h("div", { id: "msg" }), res = h("div", { id: "res" }), timer = null, seq = 0;
    box.appendChild(q); wrap.appendChild(box); wrap.appendChild(msg); wrap.appendChild(res);
    function norm(s) { return s.replace(/ي/g, "ی").replace(/ك/g, "ک").trim(); }
    function arab(s) { return s.replace(/ی/g, "ي").replace(/ک/g, "ك"); }
    function items(r) { var j = r && r.json, a = j && (j.instrumentSearch || j.instrument || j); return Array.isArray(a) ? a : []; }
    function run(t) {
      var my = ++seq;
      function show(a, r) {
        if (my !== seq) return;
        res.textContent = "";
        if (!a.length) { msg.textContent = r && r.ok ? "چیزی پیدا نشد." : "خطا در دریافت از سایت: " + ((r && (r.err || r.status)) || "بدون پاسخ"); return; }
        msg.textContent = "";
        getWatch(function (w) {
          a.slice(0, 40).forEach(function (x) {
            var ins = String(x.insCode), sym = x.lVal18AFC, full = x.lVal30;
            res.appendChild(symRow(ins, sym, full, w.some(function (y) { return y.i === ins; }), onPick, opts));
          });
        });
      }
      msg.textContent = "در حال جستجو…";
      api("Instrument/GetInstrumentSearch/" + encodeURIComponent(norm(t)), function (r) {
        var a = items(r);
        if (a.length || !(r && r.ok)) return show(a, r);
        api("Instrument/GetInstrumentSearch/" + encodeURIComponent(arab(norm(t))), function (r2) { show(items(r2), r2); });
      });
    }
    q.oninput = function () {
      clearTimeout(timer); var t = q.value.trim();
      if (t.length < 2) { res.textContent = ""; msg.textContent = opts.hint || ""; return; }
      timer = setTimeout(function () { run(t); }, 450);
    };
    msg.textContent = opts.hint || "";
    return { el: wrap, input: q };
  }
  function symRow(ins, sym, full, watched, onPick, opts) {
    var isOpt = /^\s*اختیار/.test(full || ""), label = sym || full || ins;
    var star = h("button", { class: "ib sm star" + (watched ? " on" : ""), "aria-label": "دیده‌بان", text: watched ? "★" : "⭐" });
    star.onclick = function (e) {
      e.stopPropagation();
      toggleWatch(ins, sym, full, function (on) { star.classList.toggle("on", on); star.textContent = on ? "★" : "⭐"; });
    };
    var row = h("div", { class: "it", role: "button", tabindex: "0" },
      h("span", { class: "av", text: isOpt ? "ا" : String(label).trim().charAt(0) }),
      h("span", { class: "tx" }, h("b", { text: label }), h("span", { class: "sub", text: sym && full ? full : "" })),
      isOpt ? h("span", { class: "chip", text: "اختیار" }) : null,
      opts && opts.noStar ? null : star);
    row.onclick = function () { onPick(ins, sym, full); };
    return row;
  }

  // ------------------------------------------------------------------ صفحه‌ها
  var main = h("main", { id: "main" });
  document.body.appendChild(main);

  // ---- خانه: داشبورد بازار
  function summarize(rows) {
    var adv = 0, dec = 0, nu = 0, tv = 0, tq = 0, list = [];
    rows.forEach(function (r) {
      var S0 = r.S || r.close; if (!(S0 > 0)) return;
      var c = r.yest > 0 ? (S0 - r.yest) / r.yest * 100 : null;
      if (c === null) return;
      if (c > 0.005) adv++; else if (c < -0.005) dec++; else nu++;
      tv += r.val || 0; tq += r.vol || 0;
      list.push({ i: r.ins, s: r.sym, n: r.name, S: S0, c: c, val: r.val || 0, vol: r.vol || 0 });
    });
    function top(f, sorter, n) { return list.filter(f).sort(sorter).slice(0, n); }
    return {
      at: Date.now(), n: list.length, adv: adv, dec: dec, nu: nu, tv: tv, tq: tq,
      g: top(function (x) { return x.val >= 1e9; }, function (a, b) { return b.c - a.c; }, 10),
      l: top(function (x) { return x.val >= 1e9; }, function (a, b) { return a.c - b.c; }, 10),
      v: top(function () { return true; }, function (a, b) { return b.val - a.val; }, 10),
      q: top(function () { return true; }, function (a, b) { return b.vol - a.vol; }, 10)
    };
  }
  function pageHome() {
    var d = new Date(), st = marketStatus();
    var date = ""; try { date = d.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran", weekday: "long", day: "numeric", month: "long", year: "numeric" }); } catch (e) {}
    buildHeader("دیده‌بان بورس", [h("span", { class: "mst " + st.c, text: st.t })]);
    var wrap = h("div", { class: "pg" });
    wrap.appendChild(h("div", { class: "hello" }, h("h1", { text: "سلام 👋" }), h("p", { text: date })));
    var go = searchBox(function (ins, sym, full) { openSym(ins, full || sym); }, { noStar: false });
    wrap.appendChild(go.el);

    // کارت وضعیت بازار
    var card = h("section", { class: "card" }), tabs = ["g", "l", "v", "q"], tlabel = { g: "بیشترین رشد", l: "بیشترین افت", v: "پرارزش‌ترین", q: "پرحجم‌ترین" }, cur = "g", sum = null;
    var head = h("div", { class: "card-h" }, h("b", { text: "وضعیت بازار سهام" }), h("span", { class: "sub", id: "mAt", text: "" }));
    var refresh = h("button", { class: "ib sm", "aria-label": "به‌روزرسانی", text: "🔄" });
    head.appendChild(refresh); card.appendChild(head);
    var bar = h("div", { class: "breadth" }), cnt = h("div", { class: "bcnt" }), tot = h("div", { class: "kv2" });
    var chipRow = h("div", { class: "chips" }), listEl = h("div", { class: "mlist" }), prog = h("div", { class: "sub pr", text: "" });
    card.appendChild(bar); card.appendChild(cnt); card.appendChild(tot); card.appendChild(prog);
    tabs.forEach(function (k) { chipRow.appendChild(h("button", { class: "chip2" + (k === cur ? " on" : ""), "data-k": k, text: tlabel[k], onclick: function () { cur = k; [].forEach.call(chipRow.children, function (c) { c.classList.toggle("on", c.getAttribute("data-k") === k); }); drawList(); } })); });
    card.appendChild(chipRow); card.appendChild(listEl);
    wrap.appendChild(card);
    function drawList() {
      listEl.textContent = "";
      if (!sum) return;
      (sum[cur] || []).forEach(function (r, i) {
        listEl.appendChild(h("button", { class: "mrow", onclick: function () { openSym(r.i, r.n || r.s); } },
          h("span", { class: "no", text: fnum(i + 1) }),
          h("span", { class: "tx" }, h("b", { text: r.s }), h("span", { class: "sub", text: cur === "v" ? big(r.val) : cur === "q" ? bigVol(r.vol) + " سهم" : (r.n || "") })),
          h("span", { class: "pc" }, h("b", { text: fnum(r.S) }), h("span", { class: "chg " + cls(r.c), text: fpct(r.c) }))));
      });
    }
    function draw() {
      if (!sum) { cnt.textContent = ""; bar.textContent = ""; tot.textContent = ""; listEl.textContent = ""; prog.textContent = "اطلاعات بازار هنوز گرفته نشده؛ دکمه‌ی 🔄 را بزن."; return; }
      var t = sum.adv + sum.dec + sum.nu || 1;
      bar.textContent = "";
      bar.appendChild(h("i", { class: "u", style: "flex:" + sum.adv })); bar.appendChild(h("i", { class: "n", style: "flex:" + sum.nu })); bar.appendChild(h("i", { class: "d", style: "flex:" + sum.dec }));
      cnt.textContent = "";
      cnt.appendChild(h("span", { class: "up", text: fnum(sum.adv) + " مثبت" })); cnt.appendChild(h("span", { class: "nu", text: fnum(sum.nu) + " بدون تغییر" })); cnt.appendChild(h("span", { class: "dn", text: fnum(sum.dec) + " منفی" }));
      tot.textContent = "";
      tot.appendChild(h("div", {}, h("span", { text: "ارزش معاملات" }), h("b", { text: big(sum.tv) })));
      tot.appendChild(h("div", {}, h("span", { text: "حجم معاملات" }), h("b", { text: bigVol(sum.tq) })));
      tot.appendChild(h("div", {}, h("span", { text: "تعداد نماد" }), h("b", { text: fnum(t) })));
      var ago = Math.round((Date.now() - sum.at) / 60000);
      $("#mAt", card).textContent = ago < 1 ? "همین الان" : ago < 90 ? fnum(ago) + " دقیقه پیش" : fnum(Math.round(ago / 60)) + " ساعت پیش";
      prog.textContent = ""; drawList();
    }
    function load() {
      if (!window.Screener || !window.Screener.loadMarket) { prog.textContent = "ماژول بازار هنوز بارگذاری نشده؛ چند ثانیه بعد دوباره بزن."; return; }
      refresh.classList.add("spin"); prog.textContent = "در حال خواندن بازار… (ممکن است تا یک دقیقه طول بکشد)";
      var log = [], diag = {};
      window.Screener.loadMarket(log, diag, function (p) { if (p && p.msg) prog.textContent = p.msg; }).then(function (rows) {
        refresh.classList.remove("spin");
        if (!rows || rows.length < 50) { prog.textContent = "بازار خوانده نشد. اینترنت را بررسی کن و دوباره بزن."; return; }
        sum = summarize(rows); S.set("app:mkt", sum); draw();
      }, function (e) { refresh.classList.remove("spin"); prog.textContent = "خطا: " + e; });
    }
    refresh.onclick = load;
    S.get("app:mkt", function (c) { sum = c || null; draw(); if (!sum) setTimeout(load, 1200); });

    // کارت دیده‌بان من
    var wc = h("section", { class: "card" }), wl = h("div", { class: "mlist" });
    wc.appendChild(h("div", { class: "card-h" }, h("b", { text: "دیده‌بان من" }), h("a", { class: "lnk", href: "watch.html", text: "همه ←" })));
    wc.appendChild(wl); wrap.appendChild(wc);
    getWatch(function (w) {
      S.get(K_PX, function (px) {
        px = px || {};
        if (!w.length) { wl.appendChild(h("div", { class: "empty-s", text: "با ⭐ کنار هر نماد، آن را به دیده‌بان اضافه کن." })); return; }
        w.slice(0, 5).forEach(function (x) {
          var p = px[x.i];
          wl.appendChild(h("button", { class: "mrow", onclick: function () { openSym(x.i, x.n || x.s); } },
            h("span", { class: "tx" }, h("b", { text: x.s }), h("span", { class: "sub", text: x.n || "" })),
            h("span", { class: "pc" }, h("b", { text: p ? fnum(p.S) : "—" }), h("span", { class: "chg " + cls(p ? p.c : 0), text: p ? fpct(p.c) : "" }))));
        });
      });
    });

    // میانبرها
    var qa = h("div", { class: "qa" });
    [["📡", "اسکرینر بازار", "marketwatch.html"], ["🧮", "ماشین‌حساب ریسک", "tools.html"], ["⭐", "هشدارها", "watch.html#alerts"], ["🛡", "تنظیمات و پشتیبان", "more.html"]].forEach(function (q) {
      qa.appendChild(h("a", { class: "qb", href: q[2] }, h("span", { class: "qi", text: q[0] }), h("span", { text: q[1] })));
    });
    wrap.appendChild(qa);
    wrap.appendChild(h("p", { class: "disc", text: "تحلیل‌ها و عددهای این برنامه آماری‌اند و توصیه‌ی خرید یا فروش نیستند؛ تصمیم و مسئولیت معامله با خود توست." }));
    S.get("app:recent", function (rec) {
      if (!rec || !rec.length) return;
      var rc = h("section", { class: "card" }, h("div", { class: "card-h" }, h("b", { text: "اخیراً دیده‌شده" })));
      var cw = h("div", { class: "chips wrapc" });
      rec.slice(0, 8).forEach(function (x) { cw.appendChild(h("button", { class: "chip2", text: x.n || x.i, onclick: function () { openSym(x.i, x.n); } })); });
      rc.appendChild(cw); wrap.insertBefore(rc, qa);
    });
    main.appendChild(wrap);
  }

  // ---- دیده‌بان من + هشدارها
  function pageWatch() {
    buildHeader("دیده‌بان من", []);
    var wrap = h("div", { class: "pg" }), list = h("div", { class: "mlist big2" }), alertsEl = h("div", { class: "al-list" });
    var sortKey = "man", chips = h("div", { class: "chips" }), info = h("div", { class: "sub pr", text: "" });
    var addBtn = h("button", { class: "btn pri", text: "➕ افزودن نماد", onclick: function () {
      var sb = searchBox(function (ins, sym, full) { getWatch(function (w) { if (!w.some(function (x) { return x.i === ins; })) { w.push({ i: ins, s: sym || full, n: full }); setWatch(w, function () { s.close(); render(); refreshAll(); }); } else { s.close(); } }); }, { noStar: true, hint: "نماد را جستجو کن و رویش بزن." });
      var s = sheet("افزودن به دیده‌بان", sb.el); setTimeout(function () { sb.input.focus(); }, 300);
    } });
    var SORTS = [["man", "دلخواه"], ["chg", "تغییر"], ["val", "ارزش"]];
    SORTS.forEach(function (x) { chips.appendChild(h("button", { class: "chip2" + (x[0] === sortKey ? " on" : ""), "data-k": x[0], text: x[1], onclick: function () { sortKey = x[0]; [].forEach.call(chips.children, function (c) { c.classList.toggle("on", c.getAttribute("data-k") === sortKey); }); render(); } })); });
    wrap.appendChild(h("div", { class: "tr" }, chips, h("button", { class: "ib sm", id: "rf", "aria-label": "به‌روزرسانی", onclick: function () { refreshAll(); }, text: "🔄" })));
    wrap.appendChild(info); wrap.appendChild(list); wrap.appendChild(addBtn);
    wrap.appendChild(h("div", { class: "sec", id: "alerts", text: "هشدارهای من" })); wrap.appendChild(alertsEl);
    main.appendChild(wrap);
    var W = [], PX = {};
    function render() {
      list.textContent = "";
      if (!W.length) { list.appendChild(h("div", { class: "empty-s", text: "دیده‌بانت خالی است. «افزودن نماد» را بزن یا از صفحه‌ی هر نماد ⭐ را بزن." })); return; }
      var rows = W.slice();
      if (sortKey === "chg") rows.sort(function (a, b) { return ((PX[b.i] || {}).c || -999) - ((PX[a.i] || {}).c || -999); });
      if (sortKey === "val") rows.sort(function (a, b) { return ((PX[b.i] || {}).val || 0) - ((PX[a.i] || {}).val || 0); });
      getAlerts(function (al) {
        rows.forEach(function (x) {
          var p = PX[x.i], n = al.filter(function (a) { return a.i === x.i && a.on !== false; }).length;
          var bell = h("button", { class: "ib sm" + (n ? " on" : ""), "aria-label": "هشدار", text: "🔔" });
          bell.onclick = function (e) { e.stopPropagation(); openAlertSheet(x.i, x.s, x.n); };
          var del = h("button", { class: "ib sm", "aria-label": "حذف", text: "🗑" });
          del.onclick = function (e) { e.stopPropagation(); setWatch(W.filter(function (y) { return y.i !== x.i; }), function () { W = W.filter(function (y) { return y.i !== x.i; }); render(); }); };
          var row = h("div", { class: "wrow", role: "button", tabindex: "0" },
            h("span", { class: "tx" }, h("b", { text: x.s }), h("span", { class: "sub", text: p ? "ارزش " + big(p.val) : (x.n || "") })),
            h("span", { class: "pc" }, h("b", { text: p ? fnum(p.S) : "—" }), h("span", { class: "chg " + cls(p ? p.c : 0), text: p ? fpct(p.c) : "" })),
            h("span", { class: "acts" }, bell, del));
          row.onclick = function () { openSym(x.i, x.n || x.s); };
          list.appendChild(row);
        });
      });
    }
    function renderAlerts() {
      getAlerts(function (al) {
        alertsEl.textContent = "";
        if (!al.length) { alertsEl.appendChild(h("div", { class: "empty-s", text: "هشداری نداری. روی 🔔 کنار هر نماد بزن." })); return; }
        al.slice().sort(function (a, b) { return (b.at || 0) - (a.at || 0); }).forEach(function (a) {
          var on = a.on !== false;
          alertsEl.appendChild(h("div", { class: "al-row" + (on ? "" : " off") },
            h("div", { class: "al-t" }, h("b", { text: a.s + " — " + alertText(a) }), h("span", { text: on ? "فعال" : (a.fired ? "رسید در " + fnum(a.firedAt) : "خاموش") })),
            h("button", { class: "ib sm", "aria-label": on ? "خاموش" : "روشن", onclick: function () { a.on = !on; if (a.on) { a.fired = null; } setAlerts(al, renderAlerts); }, text: on ? "🔕" : "🔔" }),
            h("button", { class: "ib sm", "aria-label": "حذف", onclick: function () { setAlerts(al.filter(function (x) { return x.id !== a.id; }), renderAlerts); }, text: "🗑" })));
        });
      });
    }
    function refreshAll() {
      if (!W.length) return;
      $("#rf").classList.add("spin"); info.textContent = "در حال گرفتن قیمت‌ها…";
      fetchMany(W.map(function (x) { return x.i; }).slice(0, 60), function (px) {
        $("#rf").classList.remove("spin");
        mergePx(px, function (all) { PX = all; info.textContent = Object.keys(px).length ? "به‌روز شد " + new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }) : "قیمتی گرفته نشد؛ اینترنت را بررسی کن."; render(); evalAlerts(px, renderAlerts); });
      });
    }
    getWatch(function (w) { W = w; S.get(K_PX, function (px) { PX = px || {}; render(); renderAlerts(); refreshAll(); setInterval(refreshAll, 20000); }); });
    if (location.hash === "#alerts") setTimeout(function () { var e = $("#alerts"); if (e) e.scrollIntoView(); }, 400);
  }

  // ---- جستجو و صفحه‌ی نماد
  function pageSearch() {
    buildHeader("جستجوی نماد", []);
    var wrap = h("div", { class: "pg" });
    wrap.appendChild(h("div", { class: "hello sm" }, h("p", { text: "سهم یا اختیار معامله را جستجو کن؛ اختیار را هم با نامش پیدا می‌کنی (مثل «ضفولاد» یا «طفولاد»)." })));
    var sb = searchBox(function (ins, sym, full) { openSym(ins, full || sym); }, {});
    wrap.appendChild(sb.el);
    wrap.appendChild(h("div", { class: "sec", id: "recT", hidden: "hidden", text: "اخیراً دیده‌شده" }));
    var rec = h("div", { id: "rec" }); wrap.appendChild(rec); main.appendChild(wrap);
    S.get("app:recent", function (r) {
      if (!r || !r.length) return; $("#recT").hidden = false;
      getWatch(function (w) { r.forEach(function (x) { rec.appendChild(symRow(x.i, "", x.n, w.some(function (y) { return y.i === x.i; }), function (ins, s, f) { openSym(ins, f); }, {})); }); });
    });
  }
  function pageSym() {
    var acts = [];
    var starBtn = ibtn("⭐", "دیده‌بان", function () {
      toggleWatch(CODE, "", NAME, function (on) { starBtn.classList.toggle("on", on); starBtn.textContent = on ? "★" : "⭐"; });
    });
    acts = [starBtn, ibtn("🔔", "هشدار قیمت", function () { openAlertSheet(CODE, NAME, NAME); }), ibtn("🏠", "خانه", function () { location.href = "home.html"; })];
    if (!NAME) { buildHeader("…", []); resolveName(); return; }
    buildHeader(NAME, acts);
    document.title = NAME;
    getWatch(function (w) { if (w.some(function (x) { return x.i === CODE; })) { starBtn.classList.add("on"); starBtn.textContent = "★"; } });
    SUB = 48; document.documentElement.style.setProperty("--hdr", (HDR + SUB) + "px");
    var wait = h("div", { id: "wait", text: "در حال خواندن اطلاعات نماد…", hidden: "hidden" }); document.body.appendChild(wait);
    var ov = h("div", { id: "ov" }), mode = "ov", ovi = null;
    var seg = h("nav", { id: "subtabs" });
    function setMode(m) {
      mode = m; document.body.setAttribute("data-mode", m);
      [].forEach.call(seg.children, function (b) { b.classList.toggle("on", b.getAttribute("data-k") === m); });
      ov.hidden = m !== "ov"; if (m === "ov" && ovi) setTimeout(ovi.redraw, 50);
      if (m !== "ov") { var hh = document.getElementById("oc-checklist-host") || document.getElementById("sc-checklist-host"); wait.hidden = !!(hh && hh.style.display !== "none"); } else wait.hidden = true;
      tune();
    }
    [["ov", "📈 نما"], ["an", "🧭 تحلیل و چک‌لیست"]].forEach(function (x) { seg.appendChild(h("button", { "data-k": x[0], text: x[1], onclick: function () { setMode(x[0]); } })); });
    document.body.appendChild(seg); document.body.appendChild(ov);
    if (window.Overview) ovi = window.Overview.mount(ov, CODE); else ov.appendChild(h("div", { class: "empty-s", text: "ماژول نما بارگذاری نشد." }));
    ov.appendChild(h("p", { class: "disc", text: "اعداد از API سایت TSETMC خوانده می‌شود و ممکن است چند ثانیه تأخیر داشته باشد؛ این صفحه توصیه‌ی خرید و فروش نیست." }));
    window.__symMode = function () { return mode; };
    setMode("ov"); setInterval(tune, 400);
  }
  function resolveName() {
    api("Instrument/GetInstrumentInfo/" + CODE, function (r) {
      var ii = r && r.json && r.json.instrumentInfo, n = ii && (ii.lVal30 || ii.lVal18AFC);
      if (n) location.replace("app.html?i=" + encodeURIComponent(CODE) + "&n=" + encodeURIComponent(n));
      else { $("#title").textContent = "نماد " + CODE; main.appendChild(h("div", { class: "empty-s", text: "نام نماد خوانده نشد: " + ((r && (r.err || r.status)) || "") })); }
    });
  }

  // ---- اسکرینر (پنل افزونه)
  function pageMkt() {
    buildHeader("اسکرینر بازار", []);
    document.body.appendChild(h("div", { id: "wait", text: "در حال آماده‌سازی اسکرینر…" }));
    setInterval(tune, 400);
  }

  // ---- ابزارها (ماشین‌حساب‌ها)
  function pageTools() {
    buildHeader("ابزارهای معامله", []);
    var wrap = h("div", { class: "pg" }), fee = { b: 0.0037, s: 0.0088 };
    var seg = h("div", { class: "seg big3" }), out = h("div", { class: "calc-out" }), form = h("div", { class: "calc-form" });
    var modes = [["size", "حجم معامله"], ["pl", "سود و زیان"], ["avg", "میانگین‌گیری"]], mode = "size";
    modes.forEach(function (m) { seg.appendChild(h("button", { class: m[0] === mode ? "on" : "", "data-k": m[0], text: m[1], onclick: function () { mode = m[0]; [].forEach.call(seg.children, function (c) { c.classList.toggle("on", c.getAttribute("data-k") === mode); }); build(); } })); });
    var FIELDS = {
      size: [["cap", "سرمایه‌ی کل (ریال)"], ["risk", "ریسک هر معامله (٪ سرمایه)", "1"], ["entry", "قیمت ورود (ریال)"], ["stop", "حد ضرر (ریال)"], ["tgt", "قیمت هدف (اختیاری)"]],
      pl: [["buy", "قیمت خرید (ریال)"], ["sell", "قیمت فروش (ریال)"], ["qty", "تعداد سهم"]],
      avg: [["q0", "تعداد فعلی"], ["p0", "میانگین قیمت فعلی (ریال)"], ["q1", "تعداد خرید جدید"], ["p1", "قیمت خرید جدید (ریال)"]]
    };
    var vals = {};
    function build() {
      form.textContent = ""; out.textContent = "";
      FIELDS[mode].forEach(function (f) {
        var inp = h("input", { type: "text", inputmode: "decimal", dir: "ltr", placeholder: f[2] ? "پیش‌فرض " + f[2] : "", autocomplete: "off", value: vals[f[0]] || "" });
        inp.oninput = function () { vals[f[0]] = inp.value; calc(); };
        form.appendChild(h("label", { class: "fld2" }, h("span", { text: f[1] }), inp));
      });
      calc();
    }
    function row(k, v, c) { return h("div", { class: "kv3" + (c ? " " + c : "") }, h("span", { text: k }), h("b", { text: v })); }
    function calc() {
      out.textContent = ""; var v = {}, fb = fee.b, fs = fee.s;
      FIELDS[mode].forEach(function (f) { v[f[0]] = num(vals[f[0]]); });
      if (mode === "size") {
        var risk = v.risk === null ? 1 : v.risk;
        if (!(v.cap > 0 && v.entry > 0 && v.stop > 0)) { out.appendChild(h("div", { class: "empty-s", text: "سرمایه، قیمت ورود و حد ضرر را وارد کن." })); return; }
        if (v.stop >= v.entry) { out.appendChild(h("div", { class: "warnb", text: "حد ضرر باید پایین‌تر از قیمت ورود باشد." })); return; }
        var rps = v.entry * (1 + fb) - v.stop * (1 - fs), riskAmt = v.cap * risk / 100, sh = Math.floor(riskAmt / rps), cost = sh * v.entry * (1 + fb), capped = false;
        if (cost > v.cap) { sh = Math.floor(v.cap / (v.entry * (1 + fb))); cost = sh * v.entry * (1 + fb); capped = true; }
        out.appendChild(h("div", { class: "hero2" }, h("span", { text: "حداکثر تعداد سهم" }), h("b", { text: fnum(sh) })));
        out.appendChild(row("مبلغ ورود (با کارمزد)", fnum(cost) + " ریال")); out.appendChild(row("سهم از سرمایه", fdec(cost / v.cap * 100, 1) + "٪"));
        out.appendChild(row("زیان هر سهم در حد ضرر", fnum(rps) + " ریال")); out.appendChild(row("زیان کل در حد ضرر", fnum(sh * rps) + " ریال", "dn"));
        if (capped) out.appendChild(h("div", { class: "warnb", text: "تعداد به سقف سرمایه‌ات محدود شد؛ ریسک واقعی کمتر از مقدار انتخابی است." }));
        if (v.tgt > v.entry) {
          var gps = v.tgt * (1 - fs) - v.entry * (1 + fb), rr = gps / rps;
          out.appendChild(row("سود هر سهم تا هدف (خالص)", fnum(gps) + " ریال")); out.appendChild(row("سود کل تا هدف", fnum(sh * gps) + " ریال", "up"));
          out.appendChild(row("نسبت سود به ریسک", fdec(rr, 2) + " به ۱", rr >= 2 ? "up" : rr < 1 ? "dn" : ""));
          if (rr < 1.5) out.appendChild(h("div", { class: "warnb", text: "نسبت سود به ریسک کمتر از ۱٫۵ است؛ معمولاً ارزش ورود ندارد." }));
        }
      } else if (mode === "pl") {
        if (!(v.buy > 0 && v.sell > 0 && v.qty > 0)) { out.appendChild(h("div", { class: "empty-s", text: "قیمت خرید، فروش و تعداد را وارد کن." })); return; }
        var cost2 = v.qty * v.buy * (1 + fb), rev = v.qty * v.sell * (1 - fs), net = rev - cost2;
        out.appendChild(h("div", { class: "hero2 " + (net >= 0 ? "up" : "dn") }, h("span", { text: net >= 0 ? "سود خالص" : "زیان خالص" }), h("b", { text: fnum(Math.abs(net)) + " ریال" })));
        out.appendChild(row("بازده خالص", fpct(net / cost2 * 100), net >= 0 ? "up" : "dn")); out.appendChild(row("هزینه‌ی خرید (با کارمزد)", fnum(cost2) + " ریال"));
        out.appendChild(row("دریافتی فروش (پس از کارمزد و مالیات)", fnum(rev) + " ریال")); out.appendChild(row("قیمت سر به سر فروش", fnum(v.buy * (1 + fb) / (1 - fs)) + " ریال"));
      } else {
        if (!(v.q0 >= 0 && v.p0 > 0 && v.q1 > 0 && v.p1 > 0)) { out.appendChild(h("div", { class: "empty-s", text: "تعداد و قیمت فعلی و خرید جدید را وارد کن." })); return; }
        var tq = v.q0 + v.q1, avg = (v.q0 * v.p0 + v.q1 * v.p1 * (1 + fb)) / tq;
        out.appendChild(h("div", { class: "hero2" }, h("span", { text: "میانگین جدید (با کارمزد خرید جدید)" }), h("b", { text: fnum(avg) + " ریال" })));
        out.appendChild(row("تعداد کل", fnum(tq))); out.appendChild(row("سرمایه‌ی درگیر", fnum(tq * avg) + " ریال"));
        out.appendChild(row("قیمت سر به سر فروش", fnum(avg * (1 + 0) / (1 - fs)) + " ریال")); out.appendChild(row("تغییر میانگین", fpct((avg - v.p0) / v.p0 * 100)));
      }
    }
    wrap.appendChild(seg); wrap.appendChild(form); wrap.appendChild(out);
    var fc = h("div", { class: "feebox" }, h("span", { text: "کارمزد خرید ٪" }), h("input", { id: "fb", type: "text", inputmode: "decimal", dir: "ltr", value: "0.37" }),
      h("span", { text: "کارمزد+مالیات فروش ٪" }), h("input", { id: "fs", type: "text", inputmode: "decimal", dir: "ltr", value: "0.88" }));
    wrap.appendChild(fc); wrap.appendChild(h("p", { class: "disc", text: "کارمزدها تقریبی‌اند و با کارگزاری تو فرق می‌کنند؛ عددهای دقیق خودت را بگذار." }));
    main.appendChild(wrap);
    function setFees() { var b = num($("#fb").value), s = num($("#fs").value); if (b !== null) fee.b = b / 100; if (s !== null) fee.s = s / 100; calc(); }
    $("#fb").oninput = setFees; $("#fs").oninput = setFees;
    S.get("S.settings", function (st) { if (st && st.fee_buy > 0) { fee.b = st.fee_buy; $("#fb").value = String(+(st.fee_buy * 100).toFixed(4)); } if (st && st.fee_sell > 0) { fee.s = st.fee_sell; $("#fs").value = String(+(st.fee_sell * 100).toFixed(4)); } build(); });
  }

  // ---- بیشتر: پشتیبان، اعلان، درباره
  function pageMore() {
    buildHeader("بیشتر", []);
    var wrap = h("div", { class: "pg" });
    function item(ic, t, sub, fn, href) {
      var a = h(href ? "a" : "button", { class: "li", onclick: fn || null }, h("span", { class: "qi", text: ic }), h("span", { class: "tx" }, h("b", { text: t }), h("span", { class: "sub", text: sub || "" })), h("span", { class: "chev", text: "‹" }));
      if (href) a.setAttribute("href", href); return a;
    }
    var l1 = h("section", { class: "card nopad" });
    l1.appendChild(item("🧮", "ابزارهای معامله", "حجم معامله، سود و زیان با کارمزد، میانگین‌گیری", null, "tools.html"));
    l1.appendChild(item("⭐", "دیده‌بان و هشدارها", "نمادهای من و هشدار قیمت", null, "watch.html"));
    wrap.appendChild(l1);
    var l2 = h("section", { class: "card nopad" });
    l2.appendChild(item("📤", "گرفتن فایل پشتیبان", "همه‌ی نمادها، تنظیمات، دیده‌بان و هشدارها", function () {
      chrome.storage.local.get(null, function (all) {
        var json = JSON.stringify({ app: "bourse-combo", v: 1, at: Date.now(), data: all || {} });
        var b64 = btoa(unescape(encodeURIComponent(json))), d = new Date();
        send({ t: "save", name: "bourse-backup-" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + ".json", mime: "application/json", b64: b64 });
      });
    }));
    var file = h("input", { type: "file", accept: ".json,application/json", style: "display:none" });
    file.onchange = function () {
      var f = file.files && file.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var j = JSON.parse(rd.result);
          if (j.app !== "bourse-combo" || !j.data) { toast("این فایل پشتیبان این برنامه نیست", "bad"); return; }
          chrome.storage.local.set(j.data, function () { toast("بازیابی شد"); });
        } catch (e) { toast("فایل خراب است", "bad"); }
      };
      rd.readAsText(f);
    };
    l2.appendChild(item("📥", "بازیابی از فایل پشتیبان", "فایلی که قبلاً ذخیره کرده‌ای", function () { file.click(); }));
    l2.appendChild(file);
    l2.appendChild(item("🔔", "آزمایش اعلان", "مجوز اعلان را بگیر و یک اعلان آزمایشی ببین", function () { send({ t: "perm" }); setTimeout(function () { send({ t: "notify", title: "دیده‌بان بورس", text: "اعلان‌ها درست کار می‌کنند ✔" }); }, 800); }));
    l2.appendChild(item("🗑", "حذف همه‌ی داده‌ها", "نمادها، تنظیمات، دیده‌بان و هشدارها", function () {
      if (!confirm("همه‌ی داده‌های ذخیره‌شده‌ی برنامه پاک شود؟")) return;
      chrome.storage.local.get(null, function (all) { var ks = Object.keys(all || {}); (function d(i) { if (i >= ks.length) { toast("پاک شد"); return; } chrome.storage.local.remove(ks[i], function () { d(i + 1); }); })(0); });
    }));
    wrap.appendChild(l2);
    var l3 = h("section", { class: "card" }, h("b", { text: "درباره" }),
      h("p", { class: "sub2", text: "دیده‌بان بورس نسخه‌ی ۲٫۱۳ — داده‌ها از API سایت TSETMC و کدال گرفته می‌شود و فقط روی گوشی ذخیره می‌شود." }),
      h("p", { class: "disc", text: "این برنامه ابزار کمک‌تصمیم است و توصیه‌ی سرمایه‌گذاری نیست. مدل‌های آماری خطا دارند و بازار ایران صف، دامنه‌ی نوسان و جهش دارد؛ فروش اختیار ریسک زیان بیش از مدل دارد." }));
    wrap.appendChild(l3); main.appendChild(wrap);
  }

  // ------------------------------------------------------------------ تمام‌صفحه کردن پنل افزونه (صفحه‌ی نماد و اسکرینر)
  function tune() {
    var bot = PAGE === "mkt" ? TAB : 0;
    ["sc-checklist-host", "oc-checklist-host"].forEach(function (id) {
      var hh = document.getElementById(id); if (!hh || !hh.shadowRoot) return;
      if (!hh.__t) { hh.__t = 1; var st = document.createElement("link"); st.rel = "stylesheet"; st.href = "panel-theme.css"; hh.shadowRoot.appendChild(st); }
      if (!hh.__i && window.Icons) {
        hh.__i = 1;
        var ic = document.createElement("link"); ic.rel = "stylesheet"; ic.href = "icons.css"; hh.shadowRoot.appendChild(ic);
        window.Icons.observe(hh.shadowRoot);
      }
      var showPanel = !IS_SYM || (window.__symMode && window.__symMode() === "an");
      hh.style.setProperty("visibility", showPanel ? "visible" : "hidden", "important"); hh.style.setProperty("pointer-events", showPanel ? "auto" : "none", "important");
      hh.style.setProperty("--hdr", (HDR + SUB) + "px"); hh.style.setProperty("--bot", bot + "px");
      var pos = { top: (HDR + SUB) + "px", left: "0", right: "0", bottom: bot + "px" };
      for (var k in pos) hh.style.setProperty(k, pos[k], "important");
      if (hh.style.display !== "none") {
        var w = $("#wait"); if (w) w.hidden = true;
        if (!showPanel) return;
        var ex = hh.shadowRoot.querySelector("#expand");
        if (ex && !hh.__x) { hh.__x = 1; ex.click(); }
      }
    });
  }

  // ------------------------------------------------------------------ راه‌اندازی
  if (window.Icons) window.Icons.observe(document.body);
  if (!window.__dbNative) {
    buildHeader("دیده‌بان بورس", []);
    main.appendChild(h("div", { class: "empty-s", text: "پل برنامه فعال نیست. «Android System WebView» را به‌روز کن و برنامه را دوباره باز کن." }));
    return;
  }
  if (IS_SYM) pageSym();
  else {
    ({ home: pageHome, watch: pageWatch, search: pageSearch, mkt: pageMkt, tools: pageTools, more: pageMore }[PAGE] || pageHome)();
  }
  if (!IS_SYM) tabBar();
  setInterval(function () { alertTick(); }, 30000);
  setTimeout(function () { alertTick(); }, 4000);
})();
