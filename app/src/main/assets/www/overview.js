/* تب «نما» در صفحه‌ی نماد: قیمت زنده، نمودار کندل (لمسی)، نمودار درون‌روزی، دفتر سفارش، حقیقی/حقوقی */
(function () {
  "use strict";
  var h, api, fnum, fpct, fdec, cls, big, bigVol;
  function init() { var X = window.__sh; h = X.h; api = X.api; fnum = X.fnum; fpct = X.fpct; fdec = X.fdec; cls = X.cls; big = X.big; bigVol = X.bigVol; }

  function g2j(gy, gm, gd) {
    var gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], jy = gy > 1600 ? 979 : 0;
    gy -= gy > 1600 ? 1600 : 621; var gy2 = gm > 2 ? gy + 1 : gy;
    var days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + gdm[gm - 1];
    jy += 33 * Math.floor(days / 12053); days %= 12053; jy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    var jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30), jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
    return [jy, jm, jd];
  }
  function fd(d, short) {
    var y = Math.floor(d / 10000), m = Math.floor(d / 100) % 100, dd = d % 100;
    if (y > 1700) { var j = g2j(y, m, dd); y = j[0]; m = j[1]; dd = j[2]; }
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return short ? p(m) + "/" + p(dd) : y + "/" + p(m) + "/" + p(dd);
  }
  function N(x) { var v = Number(x); return isFinite(v) ? v : 0; }
  function colors() {
    var dark = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
    return { up: dark ? "#34d399" : "#16a34a", dn: dark ? "#fb7185" : "#e11d48", fg: dark ? "#e8ebf7" : "#1c2236", mut: dark ? "#98a1be" : "#6a7390",
      grid: dark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", acc: dark ? "#8b87ff" : "#4f46e5", ma: "#f59e0b", ma2: "#06b6d4" };
  }
  function sizeCanvas(cv, H) {
    var dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 340; cv.style.height = H + "px"; cv.width = W * dpr; cv.height = H * dpr;
    var c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H); return { c: c, W: W, H: H };
  }
  function sma(a, n) { var o = [], s = 0; for (var i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; o.push(i >= n - 1 ? s / n : null); } return o; }

  function mount(root, ins) {
    init();
    var st = { bars: [], range: 66, type: "c", sel: -1 }, C = colors();
    root.textContent = "";
    var hero = h("section", { class: "card ovh" }), chartCard = h("section", { class: "card" }), idCard = h("section", { class: "card" }), obCard = h("section", { class: "card" }), ctCard = h("section", { class: "card" });
    root.appendChild(hero); root.appendChild(chartCard); root.appendChild(idCard); root.appendChild(obCard); root.appendChild(ctCard);

    // ---------- قیمت زنده
    function drawHero(p) {
      hero.textContent = "";
      if (!p) { hero.appendChild(h("div", { class: "empty-s", text: "قیمت خوانده نشد؛ اینترنت یا بسته‌بودن بازار را بررسی کن." })); return; }
      var d = p.S - p.py, c = p.c;
      hero.appendChild(h("div", { class: "pr-row" }, h("b", { class: "pbig", text: fnum(p.S) }), h("span", { class: "pchg " + cls(c), text: (d > 0 ? "+" : "") + fnum(d) + "  " + fpct(c) })));
      var rng = p.hi && p.lo && p.hi > p.lo ? (p.S - p.lo) / (p.hi - p.lo) : null;
      hero.appendChild(h("div", { class: "kv4" },
        h("div", {}, h("span", { text: "آخرین معامله" }), h("b", { text: fnum(p.S) })), h("div", {}, h("span", { text: "پایانی" }), h("b", { text: fnum(p.close) })),
        h("div", {}, h("span", { text: "دیروز" }), h("b", { text: fnum(p.py) })), h("div", {}, h("span", { text: "حجم" }), h("b", { text: bigVol(p.vol) })),
        h("div", {}, h("span", { text: "ارزش" }), h("b", { text: big(p.val) })), h("div", {}, h("span", { text: "اولین" }), h("b", { text: fnum(p.first) }))));
      if (rng !== null) hero.appendChild(h("div", { class: "rng" }, h("span", { text: fnum(p.lo) }), h("div", { class: "rbar" }, h("i", { style: "right:" + Math.max(0, Math.min(100, rng * 100)) + "%" })), h("span", { text: fnum(p.hi) })), h("div", { class: "sub ctr", text: "بازه‌ی امروز" }));
    }
    var pxData = null;
    function loadPrice() {
      api("ClosingPrice/GetClosingPriceInfo/" + ins, function (r) {
        var i = r && r.json && r.json.closingPriceInfo; if (!i) { if (!pxData) drawHero(null); return; }
        var last = N(i.pDrCotVal), close = N(i.pClosing), py = N(i.priceYesterday), S = last > 0 ? last : close;
        pxData = { S: S, close: close, py: py, c: py > 0 ? (S - py) / py * 100 : null, hi: N(i.priceMax), lo: N(i.priceMin), first: N(i.priceFirst), vol: N(i.qTotTran5J), val: N(i.qTotCap) };
        drawHero(pxData);
      });
    }

    // ---------- نمودار روزانه
    var cvInfo = h("div", { class: "cvinfo", text: "برای دیدن جزئیات، روی نمودار بکش." }), cv = h("canvas", { class: "cv" });
    var rangeChips = h("div", { class: "chips" }), typeChips = h("div", { class: "chips" });
    [[22, "۱ماه"], [66, "۳ماه"], [130, "۶ماه"], [250, "۱سال"]].forEach(function (x) { rangeChips.appendChild(h("button", { class: "chip2" + (x[0] === st.range ? " on" : ""), "data-k": x[0], text: x[1], onclick: function () { st.range = x[0]; mark(rangeChips, x[0]); draw(); } })); });
    [["c", "کندل"], ["l", "خطی"]].forEach(function (x) { typeChips.appendChild(h("button", { class: "chip2" + (x[0] === st.type ? " on" : ""), "data-k": x[0], text: x[1], onclick: function () { st.type = x[0]; mark(typeChips, x[0]); draw(); } })); });
    function mark(box, k) { [].forEach.call(box.children, function (c) { c.classList.toggle("on", c.getAttribute("data-k") == k); }); }
    chartCard.appendChild(h("div", { class: "card-h" }, h("b", { text: "نمودار قیمت روزانه" }), typeChips));
    chartCard.appendChild(rangeChips); chartCard.appendChild(cvInfo); chartCard.appendChild(h("div", { class: "cvwrap" }, cv));
    chartCard.appendChild(h("div", { class: "lgd" }, h("span", { class: "l1", text: "میانگین ۲۰ روزه" }), h("span", { class: "l2", text: "میانگین ۵۰ روزه" }), h("span", { class: "l3", text: "قیمت‌ها تعدیل‌نشده‌اند" })));
    var geo = null;
    function draw() {
      C = colors(); var B = st.bars; if (B.length < 2) return;
      var n = Math.min(st.range, B.length), i0 = B.length - n, v = B.slice(i0), cl = B.map(function (b) { return b.c; });
      var m20 = sma(cl, 20), m50 = sma(cl, 50), H = 300, Hm = 220, s = sizeCanvas(cv, H), c = s.c, W = s.W, padL = 4, padR = 54, slot = (W - padL - padR) / n;
      var hi = -1e18, lo = 1e18, k;
      v.forEach(function (b) { if (st.type === "c") { hi = Math.max(hi, b.h); lo = Math.min(lo, b.l); } else { hi = Math.max(hi, b.c); lo = Math.min(lo, b.c); } });
      var pad = (hi - lo) * .08 || hi * .02; hi += pad; lo -= pad;
      function Xp(i) { return padL + (i + .5) * slot; } function Yp(p) { return 8 + (Hm - 16) * (1 - (p - lo) / (hi - lo)); }
      c.font = "10.5px sans-serif"; c.textBaseline = "middle"; c.textAlign = "left";
      for (k = 0; k <= 4; k++) { var pv = lo + (hi - lo) * k / 4, yy = Yp(pv); c.strokeStyle = C.grid; c.beginPath(); c.moveTo(0, yy); c.lineTo(W - padR + 6, yy); c.stroke(); c.fillStyle = C.mut; c.fillText(fnum(pv), W - padR + 8, yy); }
      if (st.type === "l") {
        var g = c.createLinearGradient(0, 0, 0, Hm); g.addColorStop(0, "rgba(99,102,241,.35)"); g.addColorStop(1, "rgba(99,102,241,0)");
        c.beginPath(); v.forEach(function (b, i) { var x = Xp(i), y = Yp(b.c); i ? c.lineTo(x, y) : c.moveTo(x, y); });
        c.strokeStyle = C.acc; c.lineWidth = 2; c.lineJoin = "round"; c.stroke(); c.lineTo(Xp(n - 1), Hm); c.lineTo(Xp(0), Hm); c.closePath(); c.fillStyle = g; c.fill();
      } else {
        v.forEach(function (b, i) {
          var up = b.c >= b.o, col = up ? C.up : C.dn, x = Xp(i), bw = Math.max(1.5, slot * .62);
          c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(x, Yp(b.h)); c.lineTo(x, Yp(b.l)); c.stroke();
          var y1 = Yp(Math.max(b.o, b.c)), y2 = Yp(Math.min(b.o, b.c)); c.fillRect(x - bw / 2, y1, bw, Math.max(1.2, y2 - y1));
        });
      }
      [[m20, C.ma], [m50, C.ma2]].forEach(function (m) {
        c.beginPath(); var st0 = false; c.lineWidth = 1.4; c.strokeStyle = m[1];
        v.forEach(function (b, i) { var q = m[0][i0 + i]; if (q === null) return; var x = Xp(i), y = Yp(q); st0 ? c.lineTo(x, y) : (c.moveTo(x, y), st0 = true); }); c.stroke();
      });
      // حجم
      var vm = 0; v.forEach(function (b) { vm = Math.max(vm, b.v); });
      v.forEach(function (b, i) { var hh = vm ? (b.v / vm) * 52 : 0; c.fillStyle = (b.c >= b.o ? C.up : C.dn) + "88"; c.fillRect(Xp(i) - Math.max(1, slot * .62) / 2, H - 18 - hh, Math.max(1, slot * .62), hh); });
      c.fillStyle = C.mut; c.textAlign = "center";
      for (k = 0; k < 4; k++) { var ii = Math.round((n - 1) * k / 3); c.fillText(fd(v[ii].d, true), Xp(ii), H - 6); }
      geo = { Xp: Xp, Yp: Yp, slot: slot, n: n, v: v, W: W, Hm: Hm, H: H, padL: padL };
      if (st.sel >= 0 && st.sel < n) cross(st.sel, true);
    }
    function cross(i, noInfo) {
      if (!geo || !geo.v[i]) return; var b = geo.v[i]; st.sel = i; if (!noInfo) draw0();
      var c = cv.getContext("2d"), x = geo.Xp(i); c.save(); c.setLineDash([4, 3]); c.strokeStyle = C.mut; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, geo.H - 16); c.stroke(); c.restore();
      var ch = b.py > 0 ? (b.c - b.py) / b.py * 100 : null;
      cvInfo.textContent = fd(b.d) + "  |  باز " + fnum(b.o) + "  بالا " + fnum(b.h) + "  پایین " + fnum(b.l) + "  بسته " + fnum(b.c) + (ch !== null ? "  (" + fpct(ch) + ")" : "") + "  |  حجم " + bigVol(b.v);
    }
    function draw0() { var s = st.sel; st.sel = -1; draw(); st.sel = s; }
    function touch(e) {
      if (!geo) return; var t = e.touches ? e.touches[0] : e, r = cv.getBoundingClientRect(), x = t.clientX - r.left;
      var i = Math.max(0, Math.min(geo.n - 1, Math.floor((x - geo.padL) / geo.slot))); st.sel = i; var s = st.sel; draw0(); st.sel = s; cross(i, true);
      var b = geo.v[i], ch = b.py > 0 ? (b.c - b.py) / b.py * 100 : null;
      cvInfo.textContent = fd(b.d) + "  |  باز " + fnum(b.o) + "  بالا " + fnum(b.h) + "  پایین " + fnum(b.l) + "  بسته " + fnum(b.c) + (ch !== null ? "  (" + fpct(ch) + ")" : "") + "  |  حجم " + bigVol(b.v);
    }
    cv.addEventListener("touchstart", touch, { passive: true }); cv.addEventListener("touchmove", touch, { passive: true }); cv.addEventListener("click", touch);
    window.addEventListener("resize", function () { if (root.offsetParent) draw(); });
    function loadDaily() {
      api("ClosingPrice/GetClosingPriceDailyList/" + ins + "/260", function (r) {
        var l = r && r.json && (r.json.closingPriceDaily || r.json.closingPriceDailyList);
        if (!l || !l.length) { cvInfo.textContent = "سابقه قیمت خوانده نشد."; return; }
        st.bars = l.filter(function (x) { return N(x.pClosing) > 0; }).sort(function (a, b) { return a.dEven - b.dEven; }).map(function (x) {
          var c0 = N(x.pClosing); return { d: x.dEven, o: N(x.priceFirst) || c0, h: N(x.priceMax) || c0, l: N(x.priceMin) || c0, c: c0, v: N(x.qTotTran5J), py: N(x.priceYesterday) };
        });
        st.sel = -1; cvInfo.textContent = "برای دیدن جزئیات، روی نمودار بکش."; draw();
      });
    }

    // ---------- درون‌روزی
    idCard.appendChild(h("div", { class: "card-h" }, h("b", { text: "معاملات امروز" }), h("span", { class: "sub", id: "idn", text: "" })));
    var icv = h("canvas", { class: "cv" }); idCard.appendChild(icv);
    function loadIntraday() {
      api("Trade/GetTrade/" + ins, function (r) {
        var t = r && r.json && r.json.trade, n0 = $id("idn");
        if (!t || !t.length) { icv.style.display = "none"; n0.textContent = "معامله‌ای نیست"; return; }
        icv.style.display = "block"; C = colors();
        var pts = t.filter(function (x) { return !x.canceled && N(x.pTran) > 0; }).map(function (x) { var hh = String(x.hEven).padStart(6, "0"); return { m: +hh.slice(0, 2) * 60 + +hh.slice(2, 4) + +hh.slice(4, 6) / 60, p: N(x.pTran), q: N(x.qTitTran) }; }).sort(function (a, b) { return a.m - b.m; });
        if (pts.length < 2) { icv.style.display = "none"; n0.textContent = "معامله‌ی کافی نیست"; return; }
        n0.textContent = fnum(pts.length) + " معامله";
        var s = sizeCanvas(icv, 150), c = s.c, W = s.W, H = 150, padR = 54, hi = -1e18, lo = 1e18; pts.forEach(function (p) { hi = Math.max(hi, p.p); lo = Math.min(lo, p.p); });
        var pd = (hi - lo) * .1 || hi * .01; hi += pd; lo -= pd; var t0 = Math.min(pts[0].m, 9 * 60), t1 = Math.max(pts[pts.length - 1].m, 12 * 60 + 30);
        function Xp(m) { return 4 + (m - t0) / (t1 - t0) * (W - padR - 4); } function Yp(p) { return 8 + (H - 30) * (1 - (p - lo) / (hi - lo)); }
        c.font = "10.5px sans-serif"; c.textBaseline = "middle";
        [0, .5, 1].forEach(function (f) { var pv = lo + (hi - lo) * f, y = Yp(pv); c.strokeStyle = C.grid; c.beginPath(); c.moveTo(0, y); c.lineTo(W - padR + 6, y); c.stroke(); c.fillStyle = C.mut; c.textAlign = "left"; c.fillText(fnum(pv), W - padR + 8, y); });
        var up = pts[pts.length - 1].p >= pts[0].p, col = up ? C.up : C.dn, g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col + "55"); g.addColorStop(1, col + "00");
        c.beginPath(); pts.forEach(function (p, i) { var x = Xp(p.m), y = Yp(p.p); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.strokeStyle = col; c.lineWidth = 1.8; c.lineJoin = "round"; c.stroke();
        c.lineTo(Xp(pts[pts.length - 1].m), H - 22); c.lineTo(Xp(pts[0].m), H - 22); c.closePath(); c.fillStyle = g; c.fill();
        c.fillStyle = C.mut; c.textAlign = "center"; [9 * 60, 10 * 60 + 15, 11 * 60 + 30, 12 * 60 + 30].forEach(function (m) { if (m >= t0 && m <= t1) c.fillText(Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0"), Math.max(16, Xp(m)), H - 8); });
      });
    }
    function $id(i) { return root.querySelector("#" + i); }

    // ---------- دفتر سفارش
    obCard.appendChild(h("div", { class: "card-h" }, h("b", { text: "دفتر سفارش (۵ سطر)" })));
    var obBody = h("div", {}); obCard.appendChild(obBody);
    function loadOB() {
      api("BestLimits/" + ins, function (r) {
        var rows = r && r.json && (r.json.bestLimits || r.json.bestLimit); obBody.textContent = "";
        if (!rows || !rows.length) { obBody.appendChild(h("div", { class: "empty-s", text: "دفتر سفارش خالی است (بازار بسته است یا صف دارد)." })); return; }
        rows.sort(function (a, b) { return N(a.number) - N(b.number); });
        var mx = 0; rows.forEach(function (x) { mx = Math.max(mx, N(x.qTitMeDem), N(x.qTitMeOf)); });
        obBody.appendChild(h("div", { class: "obh" }, h("span", { text: "تعداد · حجم · خرید" }), h("span", { text: "فروش · حجم · تعداد" })));
        rows.slice(0, 5).forEach(function (x) {
          var bq = N(x.qTitMeDem), sq = N(x.qTitMeOf);
          obBody.appendChild(h("div", { class: "obr" },
            h("div", { class: "obs b" }, h("i", { style: "width:" + (mx ? bq / mx * 100 : 0) + "%" }), h("span", {}, fnum(x.zOrdMeDem), " · ", bigVol(bq)), h("b", { text: fnum(x.pMeDem) })),
            h("div", { class: "obs s" }, h("i", { style: "width:" + (mx ? sq / mx * 100 : 0) + "%" }), h("b", { text: fnum(x.pMeOf) }), h("span", {}, bigVol(sq), " · ", fnum(x.zOrdMeOf)))));
        });
        var tb = 0, ts = 0; rows.forEach(function (x) { tb += N(x.qTitMeDem); ts += N(x.qTitMeOf); });
        if (tb + ts > 0) obBody.appendChild(h("div", { class: "sub ctr", text: "نسبت حجم خرید به فروش در ۵ سطر: " + fdec(ts ? tb / ts : 99, 2) + " به ۱" }));
      });
    }

    // ---------- حقیقی/حقوقی
    ctCard.appendChild(h("div", { class: "card-h" }, h("b", { text: "حقیقی و حقوقی" })));
    var ctBody = h("div", {}); ctCard.appendChild(ctBody);
    function loadCT() {
      api("ClientType/GetClientType/" + ins + "/1/0", function (r) {
        var c = r && r.json && r.json.clientType; ctBody.textContent = "";
        if (!c) { ctBody.appendChild(h("div", { class: "empty-s", text: "اطلاعات حقیقی/حقوقی خوانده نشد." })); return; }
        var bi = N(c.buy_I_Volume), si = N(c.sell_I_Volume), bn = N(c.buy_N_Volume), sn = N(c.sell_N_Volume);
        function split(t, a, b, la, lb) {
          var s = a + b || 1; return h("div", { class: "split" }, h("div", { class: "sph" }, h("span", { text: t }), h("span", { text: la + " " + fdec(a / s * 100, 0) + "٪ · " + lb + " " + fdec(b / s * 100, 0) + "٪" })),
            h("div", { class: "breadth" }, h("i", { class: "u", style: "flex:" + a }), h("i", { class: "d", style: "flex:" + b })));
        }
        ctBody.appendChild(split("خرید", bi, bn, "حقیقی", "حقوقی")); ctBody.appendChild(split("فروش", si, sn, "حقیقی", "حقوقی"));
        var net = bi - si, pw = N(c.buy_CountI) > 0 && N(c.sell_CountI) > 0 && si > 0 ? (bi / N(c.buy_CountI)) / (si / N(c.sell_CountI)) : null;
        ctBody.appendChild(h("div", { class: "kv2" },
          h("div", {}, h("span", { text: "خالص ورود پول حقیقی" }), h("b", { class: net >= 0 ? "up" : "dn", text: (net >= 0 ? "+" : "−") + bigVol(Math.abs(net)) + " سهم" })),
          h("div", {}, h("span", { text: "قدرت خریدار حقیقی" }), h("b", { class: pw === null ? "" : pw >= 1 ? "up" : "dn", text: pw === null ? "—" : fdec(pw, 2) })),
          h("div", {}, h("span", { text: "کد خریدار/فروشنده حقیقی" }), h("b", { text: fnum(c.buy_CountI) + " / " + fnum(c.sell_CountI) }))));
      });
    }

    function all() { loadPrice(); loadOB(); loadCT(); loadIntraday(); }
    loadDaily(); all();
    var tm = setInterval(function () { if (!root.offsetParent) return; loadPrice(); loadOB(); }, 12000);
    var tm2 = setInterval(function () { if (root.offsetParent) { loadCT(); loadIntraday(); } }, 60000);
    return { refresh: function () { loadDaily(); all(); }, redraw: draw };
  }
  window.Overview = { mount: mount };
})();
