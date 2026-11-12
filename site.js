(function(){
"use strict";
var $ = function(s,r){return (r||document).querySelector(s)};
var $$ = function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var smooth = function(){return matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"};

/* ---------- オカリナ再生 ---------- */
var FREQ = {"A":293.66,"v":349.23,">":440,"<":493.88,"^":587.33};
var ctx = null, timer = null;
function play(btn){
  try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return; }
  if (ctx.state === "suspended") ctx.resume();
  var keys = btn.getAttribute("data-keys").split(""), dur = 0.36, t0 = ctx.currentTime + 0.05;
  keys.forEach(function(k,j){
    var o=ctx.createOscillator(), g=ctx.createGain(), o2=ctx.createOscillator(), g2=ctx.createGain(), t=t0+j*dur;
    o.type="sine"; o.frequency.value=FREQ[k]; o2.type="triangle"; o2.frequency.value=FREQ[k]*2; g2.gain.value=0.08;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.25,t+0.03); g.gain.setValueAtTime(0.25,t+dur*0.7); g.gain.linearRampToValueAtTime(0,t+dur*0.95);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(ctx.destination);
    o.start(t); o2.start(t); o.stop(t+dur); o2.stop(t+dur);
  });
  var els = $$(".k", btn.closest(".song")), j = 0;
  clearInterval(timer); els.forEach(function(e){e.classList.remove("on")});
  timer = setInterval(function(){
    els.forEach(function(e){e.classList.remove("on")});
    if (j >= els.length) { clearInterval(timer); return; }
    els[j++].classList.add("on");
  }, dur*1000);
}
$$(".play[data-keys]").forEach(function(b){ b.addEventListener("click", function(){ play(b); }); });

/* ---------- ダンジョン絞り込み ---------- */
$$("[data-f]").forEach(function(b){
  b.addEventListener("click", function(){
    var f = b.getAttribute("data-f");
    $$("[data-f]").forEach(function(x){ x.setAttribute("aria-pressed", x===b); });
    $$(".dun[data-era]").forEach(function(c){
      var e = c.getAttribute("data-era");
      c.hidden = !(f==="all" || e===f || e==="b");
    });
  });
});

/* ---------- チェックリスト ---------- */
var list = $("#checkList");
if (list) {
  var KEY = "oot-sw2-check", state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch(e){ state = {}; }
  var inputs = $$("input", list);
  var upd = function(){
    var done = inputs.filter(function(x){return x.checked}).length;
    $("#progTxt").textContent = done + " / " + inputs.length;
    $("#barFill").style.width = (done/inputs.length*100) + "%";
  };
  inputs.forEach(function(x){
    x.checked = !!state[x.getAttribute("data-k")];
    x.addEventListener("change", function(){
      state[x.getAttribute("data-k")] = x.checked;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){}
      upd();
    });
  });
  var rb = $("#resetBtn");
  rb.addEventListener("click", function(){
    if (rb.dataset.armed) {
      state = {}; try { localStorage.removeItem(KEY); } catch(e){}
      inputs.forEach(function(x){ x.checked = false; }); upd();
      rb.textContent = "リセット"; delete rb.dataset.armed;
    } else {
      rb.dataset.armed = "1"; rb.textContent = "もう一度押すと全消去";
      setTimeout(function(){ rb.textContent = "リセット"; delete rb.dataset.armed; }, 3000);
    }
  });
  upd();
}

/* ---------- フィールドマップ ---------- */
var svg = $("#fieldMap"), md = $("#mapData");
if (svg && md) {
  var M = JSON.parse(md.textContent), REG = M.REG, EDGES = M.EDGES, KN = M.KN, SLUG = M.SLUG;
  var KC = {town:"var(--town)",field:"var(--forest)",mount:"var(--mount)",water:"var(--water)",sand:"var(--sand)",forest:"var(--forest)"};
  var ERA = {c:"こども", a:"大人", b:"両方"};
  var era = "c", sel = "field";
  var R = function(id){ return REG.filter(function(r){return r.id===id})[0]; };
  var draw = function(){
    var s = '<ellipse cx="380" cy="280" rx="240" ry="170" fill="var(--field)"/>';
    EDGES.forEach(function(e){ var A=R(e[0]), B=R(e[1]);
      s += '<line x1="'+A.x+'" y1="'+A.y+'" x2="'+B.x+'" y2="'+B.y+'" stroke="var(--line)" stroke-width="3" stroke-linecap="round"/>'; });
    REG.forEach(function(r){
      var rad = r.id==="field" ? 10 : 14;
      var hasD = r.dun.some(function(d){ return d[1]===era || d[1]==="b"; });
      s += '<g class="mnode'+(r.id===sel?' sel':'')+'" data-id="'+r.id+'" tabindex="0" role="button" aria-label="'+r.n+'">';
      if (r.warp) s += '<circle cx="'+r.x+'" cy="'+r.y+'" r="'+(rad+6)+'" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-dasharray="4 3"/>';
      s += '<circle class="b" cx="'+r.x+'" cy="'+r.y+'" r="'+rad+'" fill="'+KC[r.k]+'"/>';
      if (hasD) s += '<circle cx="'+r.x+'" cy="'+r.y+'" r="4.5" fill="var(--surface)"/>';
      s += '<text x="'+r.x+'" y="'+(r.y+rad+18)+'" text-anchor="middle">'+r.n+'</text></g>';
    });
    svg.innerHTML = s;
    $$(".mnode", svg).forEach(function(g){
      var pick = function(){ sel = g.getAttribute("data-id"); draw(); info(); };
      g.addEventListener("click", pick);
      g.addEventListener("keydown", function(e){ if (e.key==="Enter"||e.key===" ") { e.preventDefault(); pick(); var n=$('.mnode[data-id="'+sel+'"]', svg); if(n) n.focus(); } });
    });
  };
  var info = function(){
    var r = R(sel), ds = r.dun.filter(function(d){ return d[1]===era || d[1]==="b"; });
    var h = '<div class="kind">'+KN[r.k]+' ・ '+(era==="c"?"こども時代":"大人時代")+'</div><h3>'+r.n+'</h3>';
    if (ds.length) h += '<h4>ダンジョン</h4><div class="dlinks">' + ds.map(function(d){ return '<a class="dlink" href="dungeon-'+SLUG[d[0]]+'.html">'+d[0]+' の攻略</a>'; }).join("") + '</div>';
    if (r.warp) h += '<h4>ワープ</h4><ul><li>'+r.warp+'</li></ul>';
    h += '<h4>ここでできること</h4><ul>' + r[era].map(function(x){return '<li>'+x+'</li>'}).join("") + '</ul>';
    h += '<p style="margin:12px 0 0;font-size:13px"><a href="#r-'+r.id+'">この地域の詳しい情報へ</a></p>';
    $("#mapInfo").innerHTML = h;
  };
  $$("[data-era]").forEach(function(b){
    b.addEventListener("click", function(){
      era = b.getAttribute("data-era");
      $$("[data-era]").forEach(function(x){ x.setAttribute("aria-pressed", x===b); });
      draw(); info();
    });
  });
  draw(); info();
}
})();
