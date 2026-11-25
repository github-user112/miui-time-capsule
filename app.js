/* MIUI 时间胶囊 · 交互逻辑（纯前端，本地存储，不联网） */
(function () {
  "use strict";

  var DATA = window.CAPSULE_DATA;
  var ERAS = DATA.eras;
  var QUIZ = DATA.quiz;
  var PREFIX = "miui-capsule:v1:";

  var state = {
    screen: "intro",
    eraIndex: 0,
    answers: {}
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$ (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function storeGet(key, fallback) {
    try {
      var raw = window.localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function storeSet(key, value) {
    try { window.localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) {}
  }
  function storeDel(key) {
    try { window.localStorage.removeItem(PREFIX + key); } catch (e) {}
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { el.classList.remove("show"); }, 2400);
  }

  function showScreen(name) {
    $$(".screen").forEach(function (s) { s.classList.remove("is-active"); });
    var target = $("#screen-" + name);
    if (target) target.classList.add("is-active");
    state.screen = name;
    window.scrollTo(0, 0);
    if (name === "timeline") window.requestAnimationFrame(updateTrackProgress);
    if (name === "result") drawResult();
  }

  /* ---------------- 时间轴 ---------------- */
  var track = $("#eraTrack");
  var rail = $("#yearRail");

  function buildEraCard(era, index) {
    var card = document.createElement("article");
    card.className = "era-card";
    card.dataset.index = String(index);
    card.style.setProperty("--accent", era.accent);
    card.style.setProperty("--accent-2", era.accent2);

    var facts = era.facts.map(function (f) { return "<li>" + f + "</li>"; }).join("");
    var html =
      '<div class="era-top"><span class="era-year">' + era.year + '</span>' +
      '<span class="era-version">' + era.version + '</span></div>' +
      '<div class="era-glyph" aria-hidden="true">' + era.glyph + '</div>' +
      '<h3 class="era-title">' + era.title + '</h3>' +
      '<p class="era-tagline">' + era.tagline + '</p>' +
      '<ul class="era-facts">' + facts + '</ul>' +
      '<div class="era-widget"><div class="widget-head"><span class="widget-name">' + era.widget.label + '</span>' +
      '<span class="widget-hint" style="text-align:right;margin:0">' + String(index + 1).padStart(2, "0") + ' / ' + ERAS.length + '</span></div>' +
      '<p class="widget-hint">' + era.widget.hint + '</p><div class="widget-stage"></div></div>' +
      '<div class="era-foot"><span class="era-index">' + era.year + ' · ' + era.version + '</span>' +
      '<span>' + (index === ERAS.length - 1 ? '终点：生成身份证 →' : '继续右滑 →') + '</span></div>';
    card.innerHTML = html;
    mountWidget($(".widget-stage", card), era, card);
    return card;
  }

  function buildTimeline() {
    ERAS.forEach(function (era, i) { track.appendChild(buildEraCard(era, i)); });
    ERAS.forEach(function (era, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = era.year;
      b.dataset.index = String(i);
      b.setAttribute("aria-label", "跳转到 " + era.year + " " + era.version);
      b.addEventListener("click", function () { scrollToEra(i); });
      rail.appendChild(b);
    });
    var saved = storeGet("era", 0);
    if (typeof saved !== "number" || saved < 0 || saved >= ERAS.length) saved = 0;
    state.eraIndex = saved;
    if (saved > 0) {
      var cont = $("#btn-continue");
      cont.hidden = false;
      cont.textContent = "继续上次的进度（" + ERAS[saved].year + "）";
    }
    window.requestAnimationFrame(function () {
      scrollToEra(state.eraIndex, true);
      updateTrackProgress();
    });
  }

  function scrollToEra(index, immediate) {
    var card = track.children[index];
    if (!card) return;
    var left = card.offsetLeft - track.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
    track.scrollTo({ left: left, behavior: immediate ? "auto" : "smooth" });
    var btn = rail.children[index];
    if (btn) rail.scrollTo({
      left: btn.offsetLeft - rail.offsetLeft - (rail.clientWidth - btn.clientWidth) / 2,
      behavior: immediate ? "auto" : "smooth"
    });
    state.eraIndex = index;
    setCurrent(index);
    storeSet("era", index);
  }

  function setCurrent(index) {
    $$(".era-card", track).forEach(function (c, i) { c.classList.toggle("is-current", i === index); });
    $$("button", rail).forEach(function (b, i) { b.classList.toggle("on", i === index); });
    state.eraIndex = index;
  }

  function updateTrackProgress() {
    var max = track.scrollWidth - track.clientWidth;
    var ratio = max > 0 ? track.scrollLeft / max : 0;
    $("#trackProgress").style.width = Math.max(8, Math.min(100, ratio * 100)) + "%";
    var cards = $$(".era-card", track);
    var center = track.scrollLeft + track.clientWidth / 2;
    var best = 0, bestDist = Infinity;
    cards.forEach(function (c, i) {
      var d = Math.abs(c.offsetLeft + c.clientWidth / 2 - center);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    if (best !== state.eraIndex) { state.eraIndex = best; storeSet("era", best); }
    setCurrent(best);
  }

  var drag = { active: false, x: 0, left: 0, moved: false };
  track.addEventListener("pointerdown", function (e) {
    if (e.target.closest("button, input, textarea, select")) return;
    drag.active = true; drag.moved = false;
    drag.x = e.clientX; drag.left = track.scrollLeft;
    track.classList.add("is-dragging");
  });
  window.addEventListener("pointermove", function (e) {
    if (!drag.active) return;
    var dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) drag.moved = true;
    track.scrollLeft = drag.left - dx;
  });
  window.addEventListener("pointerup", function () {
    if (!drag.active) return;
    drag.active = false;
    track.classList.remove("is-dragging");
  });
  track.addEventListener("scroll", function () {
    window.requestAnimationFrame(updateTrackProgress);
  }, { passive: true });
  track.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); scrollToEra(Math.min(ERAS.length - 1, state.eraIndex + 1)); }
    if (e.key === "ArrowLeft") { e.preventDefault(); scrollToEra(Math.max(0, state.eraIndex - 1)); }
  });

  /* ---------------- 小场景 ---------------- */
  function mountWidget(stage, era, card) {
    var w = era.widget;
    if (w.type === "dial") return widgetDial(stage, card);
    if (w.type === "cloud") return widgetCloud(stage, card);
    if (w.type === "icons") return widgetIcons(stage, card);
    if (w.type === "split") return widgetSplit(stage, card);
    if (w.type === "assistant") return widgetAssistant(stage, w, card);
    if (w.type === "wallpaper") return widgetWallpaper(stage, w, card);
    if (w.type === "privacy") return widgetPrivacy(stage, card);
    if (w.type === "connected") return widgetConnected(stage, card);
    if (w.type === "unlock") return widgetUnlock(stage, card);
    if (w.type === "future") return widgetFuture(stage, card);
  }

  function widgetDial(stage, card) {
    var keys = "";
    for (var i = 1; i <= 9; i++) keys += '<button class="dial-key" type="button" data-k="' + i + '">' + i + '</button>';
    keys += '<button class="dial-key" type="button" data-k="*">*</button><button class="dial-key" type="button" data-k="0">0</button><button class="dial-key" type="button" data-k="#">#</button>';
    stage.innerHTML = '<div class="w-dial"><div class="dial-screen"><span id="dialNum">—</span><small>2010 · 拨号</small></div>' +
      '<div class="dial-pad">' + keys + '</div><button class="dial-call" type="button">呼叫</button><div class="dial-msg"></div></div>';
    var num = "";
    var out = $(".dial-screen span", stage);
    $$(".dial-key", stage).forEach(function (b) {
      b.addEventListener("click", function () {
        if (num.length >= 11) return;
        num += b.dataset.k;
        out.textContent = num;
      });
    });
    $(".dial-call", stage).addEventListener("click", function () {
      var btn = this, msg = $(".dial-msg", stage);
      if (!num) { msg.textContent = "先按几个数字吧"; return; }
      btn.classList.add("is-ringing");
      msg.textContent = "嘟…嘟… 正在呼叫 " + num;
      window.setTimeout(function () { btn.classList.remove("is-ringing"); msg.textContent = "对方暂时没接，试试 2012 年的云同步 →"; }, 1600);
    });
  }

  function widgetCloud(stage, card) {
    stage.innerHTML = '<div class="w-cloud"><div class="cloud-orbit"><div class="cloud-core">☁</div>' +
      '<i class="cloud-dot" style="left:30%"></i><i class="cloud-dot" style="left:45%"></i><i class="cloud-dot" style="left:60%"></i><i class="cloud-dot" style="left:72%"></i></div>' +
      '<div class="cloud-bar"><i></i></div><button class="cloud-btn" type="button">开始同步</button><div class="cloud-msg">照片会"飞"到哪里去？</div></div>';
    var orbit = $(".cloud-orbit", stage), bar = $(".cloud-bar i", stage), msg = $(".cloud-msg", stage), btn = $(".cloud-btn", stage);
    btn.addEventListener("click", function () {
      if (orbit.classList.contains("is-running")) return;
      orbit.classList.add("is-running");
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / 1100);
        bar.style.width = (p * 100) + "%";
        if (p < 1) window.requestAnimationFrame(step);
        else {
          orbit.classList.remove("is-running");
          msg.textContent = "已同步 128 张照片（演示）";
          btn.textContent = "再同步一次";
          window.setTimeout(function () { bar.style.width = "0"; }, 900);
        }
      }
      window.requestAnimationFrame(step);
    });
  }

  function widgetIcons(stage, card) {
    stage.innerHTML = '<div class="w-icons"><div class="icon-grid">' +
      '<div class="demo-ico">☎</div><div class="demo-ico">✉</div><div class="demo-ico">◎</div><div class="demo-ico">⚙</div></div>' +
      '<div class="icon-toggle"><button type="button" class="on" data-mode="real">拟物</button><button type="button" data-mode="flat">扁平</button></div></div>';
    var grid = $(".icon-grid", stage);
    $$(".icon-toggle button", stage).forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".icon-toggle button", stage).forEach(function (x) { x.classList.toggle("on", x === b); });
        grid.classList.toggle("is-flat", b.dataset.mode === "flat");
      });
    });
  }

  function widgetSplit(stage, card) {
    stage.innerHTML = '<div class="w-split"><div class="split-view"><div class="split-side a">工作桌面</div>' +
      '<div class="split-side b">私人桌面</div><span class="split-tag l">主系统</span><span class="split-tag r">分身</span></div>' +
      '<input class="split-range" type="range" min="0" max="100" value="50" aria-label="分身滑块" />' +
      '<div class="split-note">滑动看看另一层桌面</div></div>';
    var side = $(".split-side.b", stage), range = $(".split-range", stage);
    range.addEventListener("input", function () {
      side.style.clipPath = "inset(0 0 0 " + range.value + "%)";
      $(".split-note", stage).textContent = "分身可见区域 " + range.value + "%";
    });
  }

  function widgetAssistant(stage, w, card) {
    stage.innerHTML = '<div class="w-assistant"><button class="mic" type="button" aria-label="模拟语音助手">🎤</button>' +
      '<div class="assistant-reply">点一下，说句话试试</div></div>';
    var mic = $(".mic", stage), reply = $(".assistant-reply", stage), i = 0;
    mic.addEventListener("click", function () {
      mic.classList.add("is-listening");
      reply.textContent = "我在听…";
      window.setTimeout(function () {
        mic.classList.remove("is-listening");
        reply.textContent = w.replies[i % w.replies.length];
        i += 1;
      }, 650);
    });
  }

  function widgetWallpaper(stage, w, card) {
    var btns = w.themes.map(function (t, i) { return '<button type="button" data-i="' + i + '"' + (i === 0 ? ' class="on"' : '') + '>' + t.name + '</button>'; }).join("");
    stage.innerHTML = '<div class="w-wallpaper"><div class="wallpaper-view" style="--wa:' + w.themes[0].a + ';--wb:' + w.themes[0].b + '"><span class="wp-label">' + w.themes[0].name + '</span></div>' +
      '<div class="wp-btns">' + btns + '</div></div>';
    var view = $(".wallpaper-view", stage), label = $(".wp-label", stage);
    $$(".wp-btns button", stage).forEach(function (b) {
      b.addEventListener("click", function () {
        var t = w.themes[Number(b.dataset.i)];
        view.style.setProperty("--wa", t.a);
        view.style.setProperty("--wb", t.b);
        label.textContent = t.name;
        $$(".wp-btns button", stage).forEach(function (x) { x.classList.toggle("on", x === b); });
      });
    });
  }

  function widgetPrivacy(stage, card) {
    var rows = [["位置信息", "仅使用时允许"], ["通讯录", "每次询问"], ["相册", "仅选中的照片"]];
    stage.innerHTML = '<div class="w-privacy">' + rows.map(function (r) {
      return '<div class="privacy-row"><span>' + r[0] + '<br><small style="color:#727986;font-size:9px">' + r[1] + '</small></span><button class="switch on" type="button" aria-label="' + r[0] + '开关"></button></div>';
    }).join("") + '<div class="privacy-count">已开启 3 项守护（演示）</div></div>';
    function update() {
      var n = $$(".switch.on", stage).length;
      $(".privacy-count", stage).textContent = "已开启 " + n + " 项守护（演示）";
    }
    $$(".switch", stage).forEach(function (b) {
      b.addEventListener("click", function () { b.classList.toggle("on"); update(); });
    });
  }

  function widgetConnected(stage, card) {
    stage.innerHTML = '<div class="w-connected"><div class="connect-ring">' +
      '<svg class="connect-lines" viewBox="0 0 132 92" aria-hidden="true">' +
      '<line x1="18" y1="46" x2="66" y2="18"></line><line x1="66" y1="18" x2="114" y2="46"></line><line x1="18" y1="46" x2="114" y2="46"></line>' +
      '</svg><button class="connect-node n1" type="button" data-n="0" aria-label="手机">📱</button>' +
      '<button class="connect-node n2" type="button" data-n="1" aria-label="汽车">🚗</button>' +
      '<button class="connect-node n3" type="button" data-n="2" aria-label="家居">🏠</button></div>' +
      '<div class="connect-msg">点亮节点，连起你的设备</div></div>';
    var lines = $$(".connect-lines line", stage);
    function update() {
      var on = $$(".connect-node.on", stage).map(function (n) { return Number(n.dataset.n); });
      lines[0].classList.toggle("on", on.indexOf(0) >= 0 && on.indexOf(1) >= 0);
      lines[1].classList.toggle("on", on.indexOf(1) >= 0 && on.indexOf(2) >= 0);
      lines[2].classList.toggle("on", on.indexOf(0) >= 0 && on.indexOf(2) >= 0);
      $(".connect-msg", stage).textContent = on.length === 3 ? "人 · 车 · 家，已连接（演示）" : "已点亮 " + on.length + " / 3 个节点";
    }
    $$(".connect-node", stage).forEach(function (b) {
      b.addEventListener("click", function () { b.classList.toggle("on"); update(); });
    });
  }

  function widgetUnlock(stage, card) {
    stage.innerHTML = '<div class="w-unlock"><div class="fp-ring" style="--p:0deg"><span>✦</span></div>' +
      '<button class="unlock-btn" type="button">按住解锁</button><div class="unlock-msg">早上好，今天也要顺顺利利</div></div>';
    var ring = $(".fp-ring", stage), btn = $(".unlock-btn", stage), msg = $(".unlock-msg", stage);
    var raf = null, start = null, done = false;
    function loop(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / 900);
      ring.style.setProperty("--p", (p * 360) + "deg");
      if (p < 1) raf = window.requestAnimationFrame(loop);
      else { done = true; msg.textContent = "已解锁 · 新的一天开始了（演示）"; }
    }
    function begin(e) {
      e.preventDefault();
      if (done) return;
      if (btn.setPointerCapture) { try { btn.setPointerCapture(e.pointerId); } catch (x) {} }
      start = null;
      raf = window.requestAnimationFrame(loop);
    }
    function end() {
      if (raf) window.cancelAnimationFrame(raf);
      raf = null;
      if (!done) { ring.style.setProperty("--p", "0deg"); msg.textContent = "按住别松手，再试一次"; }
    }
    btn.addEventListener("pointerdown", begin);
    btn.addEventListener("pointerup", end);
    btn.addEventListener("pointercancel", end);
    btn.addEventListener("pointerleave", end);
  }

  function widgetFuture(stage, card) {
    var saved = storeGet("note", "");
    stage.innerHTML = '<div class="w-future"><textarea class="future-input" maxlength="120" placeholder="写给几年后的自己…（只存在本机）">' +
      escapeHtml(saved) + '</textarea><div class="future-actions"><button type="button" class="f-save">封存到本机</button>' +
      '<button type="button" class="f-del">删除</button></div><div class="future-msg">' + (saved ? "已封存，只有这台设备能看到" : "未封存 · 内容不会上传") + '</div></div>';
    var input = $(".future-input", stage), msg = $(".future-msg", stage);
    $(".f-save", stage).addEventListener("click", function () {
      var v = input.value.trim();
      if (!v) { msg.textContent = "先写一句话吧"; return; }
      storeSet("note", v);
      msg.textContent = "已封存到本机（不会上传）";
      toast("胶囊已封存到本机");
    });
    $(".f-del", stage).addEventListener("click", function () {
      storeDel("note"); input.value = "";
      msg.textContent = "已删除本机胶囊";
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  /* ---------------- 问卷 ---------------- */
  function buildQuiz() {
    var saved = storeGet("answers", null);
    if (saved && typeof saved === "object") state.answers = saved;
    var body = $("#quizBody");
    QUIZ.forEach(function (q, qi) {
      var box = document.createElement("div");
      box.className = "quiz-q";
      var opts = q.options.map(function (o, oi) {
        var on = state.answers[q.id] === o.value;
        return '<button class="quiz-opt' + (on ? ' on' : '') + '" type="button" data-q="' + qi + '" data-o="' + oi + '">' +
          '<strong>' + o.label + '</strong>' + (o.sub ? '<small>' + o.sub + '</small>' : '') + '</button>';
      }).join("");
      box.innerHTML = '<div class="quiz-q__num">QUESTION 0' + (qi + 1) + '</div><h3 class="quiz-q__title">' + q.question + '</h3>' +
        '<div class="quiz-options">' + opts + '</div>';
      body.appendChild(box);
    });
    body.addEventListener("click", function (e) {
      var b = e.target.closest(".quiz-opt");
      if (!b) return;
      var q = QUIZ[Number(b.dataset.q)], o = q.options[Number(b.dataset.o)];
      state.answers[q.id] = o.value;
      $$('.quiz-opt[data-q="' + b.dataset.q + '"]', body).forEach(function (x) { x.classList.toggle("on", x === b); });
      storeSet("answers", state.answers);
      updateQuizSubmit();
    });
    updateQuizSubmit();
  }

  function updateQuizSubmit() {
    $("#btn-quiz-submit").disabled = !QUIZ.every(function (q) {
      return Object.prototype.hasOwnProperty.call(state.answers, q.id);
    });
  }

  /* ---------------- 结果卡 ---------------- */
  function drawResult() {
    var year = Number(state.answers.year) || 2026;
    var rank = DATA.rankFor(year);
    var phone = state.answers.phone || "—";
    var feature = state.answers.feature || "—";
    var years = Math.max(0, rank.years);

    $("#resultBadge").textContent = rank.level + " · " + rank.name;
    $("#resultLine").textContent = rank.desc + " 从 " + year + " 年开始，你已经走了 " + years + " 年。";
    $("#resultTags").innerHTML = "<span>起点 " + year + "</span><span>第一台 " + phone + "</span><span>最怀念 " + feature + "</span>";

    var canvas = $("#resultCanvas"), ctx = canvas && canvas.getContext && canvas.getContext("2d");
    if (!ctx) { $("#cardFallback").hidden = false; return; }
    var W = canvas.width, H = canvas.height;

    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#191d27"); bg.addColorStop(.55, "#0d1017"); bg.addColorStop(1, "#241207");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    var glow = ctx.createRadialGradient(W * .82, H * .18, 10, W * .82, H * .18, 460);
    glow.addColorStop(0, "rgba(255,130,50,.34)"); glow.addColorStop(1, "rgba(255,130,50,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.045)"; ctx.lineWidth = 1;
    for (var x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (var y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = "rgba(255,150,80,.45)"; ctx.lineWidth = 3;
    ctx.strokeRect(26, 26, W - 52, H - 52);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffb15c"; ctx.font = "600 22px sans-serif";
    ctx.fillText("MIUI · TIME CAPSULE", 62, 88);
    ctx.fillStyle = "#7e8593"; ctx.font = "18px sans-serif";
    ctx.fillText("粉丝自制怀旧互动 · 非小米官方发布", 62, 120);

    ctx.fillStyle = "#ffffff"; ctx.font = "800 96px sans-serif";
    ctx.fillText(String(year), 60, 236);
    ctx.fillStyle = "#ff8a3d"; ctx.font = "700 30px sans-serif";
    ctx.fillText(rank.level + " · " + rank.name, 62, 284);

    // 手机轮廓
    var px = 62, py = 330, pw = 170, ph = 300;
    ctx.strokeStyle = "rgba(255,255,255,.32)"; ctx.lineWidth = 4;
    roundRect(ctx, px, py, pw, ph, 28); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.04)"; roundRect(ctx, px + 6, py + 6, pw - 12, ph - 12, 24); ctx.fill();
    var grad = ctx.createLinearGradient(px, py, px + pw, py + ph);
    grad.addColorStop(0, "rgba(255,140,60,.5)"); grad.addColorStop(1, "rgba(255,140,60,0)");
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(px + pw / 2, py + ph / 2, 62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "800 54px sans-serif";
    ctx.fillText(String(years), px + pw / 2, py + ph / 2 + 14);
    ctx.font = "18px sans-serif"; ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.fillText("YEARS", px + pw / 2, py + ph / 2 + 42);
    ctx.textAlign = "left";

    ctx.fillStyle = "#f3f4f7"; ctx.font = "700 30px sans-serif";
    wrapText(ctx, rank.desc, 272, py + 48, W - 330, 44, 5);

    var tags = ["起点 " + year, "第一台 " + phone, "最怀念 " + feature];
    var ty = py + 226;
    ctx.font = "18px sans-serif";
    tags.forEach(function (t) {
      var tw = ctx.measureText(t).width + 32;
      ctx.fillStyle = "rgba(255,255,255,.07)";
      roundRect(ctx, 272, ty, tw, 40, 20); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.13)"; ctx.lineWidth = 1;
      roundRect(ctx, 272, ty, tw, 40, 20); ctx.stroke();
      ctx.fillStyle = "#d7dbe4"; ctx.fillText(t, 288, ty + 26);
      ty += 50;
    });

    ctx.fillStyle = "#ffb15c"; ctx.font = "600 18px sans-serif";
    ctx.fillText("No. MIUI-" + year + "-" + String((year + years) % 1000).padStart(3, "0"), 62, 720);
    ctx.fillStyle = "#9aa1ad"; ctx.font = "18px sans-serif";
    wrapText(ctx, "从 MIUI 1 到 HyperOS，每一代都是我们的青春。", 62, 780, W - 124, 30, 2);
    ctx.fillStyle = "#6c7381"; ctx.font = "16px sans-serif";
    ctx.fillText("结果仅供娱乐 · 非小米官方发布 · 分享请移步活动页", 62, 890);
    ctx.fillStyle = "#ff8a3d"; ctx.font = "700 24px sans-serif";
    ctx.fillText("测测你是几代米粉 →", 62, 950);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    var line = "", lines = 0;
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y + lines * lineHeight);
        lines++; line = text[i];
        if (lines >= maxLines - 1) break;
      } else line = test;
    }
    if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
  }

  function shareText() {
    var year = Number(state.answers.year) || 2026;
    var rank = DATA.rankFor(year);
    return "我是" + rank.level + "（从 " + year + " 年开始，米粉 " + Math.max(0, rank.years) + " 年）！" +
      "在「MIUI 时间胶囊」测测你是几代米粉。";
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast("文案已复制，去分享吧"); }, function () { fallbackCopy(text); });
    } else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    toast(ok ? "文案已复制，去分享吧" : "复制失败，请手动选择文案");
  }

  function saveCard() {
    var canvas = $("#resultCanvas");
    try {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (!blob) { toast("导出失败，请长按卡片保存"); return; }
          download(URL.createObjectURL(blob), "MIUI-time-capsule.png");
        }, "image/png");
      } else download(canvas.toDataURL("image/png"), "MIUI-time-capsule.png");
      toast("卡片已生成，正在保存");
    } catch (e) {
      toast("当前环境不支持直接保存，请长按卡片图片");
      $("#cardFallback").hidden = false;
    }
  }
  function download(url, name) {
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    if (url.indexOf("blob:") === 0) window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* ---------------- 绑定 ---------------- */
  function init() {
    buildTimeline();
    buildQuiz();

    $("#btn-start").addEventListener("click", function () { showScreen("timeline"); });
    $("#btn-continue").addEventListener("click", function () { showScreen("timeline"); });
    $("#btn-quiz-skip").addEventListener("click", function () { showScreen("quiz"); });
    $("#btn-quiz-back").addEventListener("click", function () { showScreen("timeline"); });
    $("#btn-quiz-submit").addEventListener("click", function () {
      if ($("#btn-quiz-submit").disabled) return;
      showScreen("result");
    });
    $("#btn-save").addEventListener("click", saveCard);
    $("#btn-copy").addEventListener("click", function () { copyText(shareText()); });
    $("#btn-restart").addEventListener("click", function () {
      state.answers = {};
      storeDel("answers"); storeDel("era");
      showScreen("intro");
      toast("已重置，重新开始吧");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
