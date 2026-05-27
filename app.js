/* VulnautAI homepage interactions — progressive enhancement only.
   Everything here degrades to the static page if JS is off or motion is reduced. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------------
     1. Attack-surface constellation
     A live call-graph behind the hero: contract nodes drift and connect by
     proximity, the pointer nudges the field, and findings occasionally flare.
  --------------------------------------------------------------------- */
  function initConstellation() {
    var canvas = document.querySelector(".hero-net");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var nodes = [];
    var w = 0;
    var h = 0;
    var pointer = { x: -9999, y: -9999, active: false };

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNodes();
    }

    function buildNodes() {
      var area = w * h;
      var count = Math.max(24, Math.min(64, Math.round(area / 16000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: 1.2 + Math.random() * 1.8,
          flare: 0,            // 0..1 vulnerability flare
          flareNext: 2000 + Math.random() * 9000
        });
      }
    }

    var linkDist = 130;
    var last = performance.now();

    function frame(now) {
      var dt = Math.min(48, now - last);
      last = now;
      ctx.clearRect(0, 0, w, h);

      // edges
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j];
          var dx = a.x - b.x;
          var dy = a.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) {
            var alpha = (1 - dist / linkDist) * 0.5;
            var hot = a.flare > 0.15 || b.flare > 0.15;
            ctx.strokeStyle = hot
              ? "rgba(238,108,93," + alpha + ")"
              : "rgba(61,215,230," + alpha * 0.6 + ")";
            ctx.lineWidth = hot ? 1.1 : 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (var k = 0; k < nodes.length; k++) {
        var n = nodes[k];
        n.x += n.vx * (dt / 16);
        n.y += n.vy * (dt / 16);
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        n.x = Math.max(0, Math.min(w, n.x));
        n.y = Math.max(0, Math.min(h, n.y));

        // pointer attraction
        if (pointer.active) {
          var pdx = pointer.x - n.x;
          var pdy = pointer.y - n.y;
          var pd = Math.sqrt(pdx * pdx + pdy * pdy);
          if (pd < 160 && pd > 0.01) {
            n.x += (pdx / pd) * 0.4;
            n.y += (pdy / pd) * 0.4;
          }
        }

        // schedule + decay flares
        n.flareNext -= dt;
        if (n.flareNext <= 0 && n.flare <= 0) {
          n.flare = 1;
          n.flareNext = 4000 + Math.random() * 11000;
        }
        if (n.flare > 0) n.flare = Math.max(0, n.flare - dt / 1400);

        var glow = n.flare;
        var radius = n.r + glow * 2.6;
        if (glow > 0) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, radius + 6 + glow * 8, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(238,108,93," + glow * 0.16 + ")";
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = glow > 0.1
          ? "rgba(242,142,128," + (0.5 + glow * 0.5) + ")"
          : "rgba(120,210,225,0.55)";
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    var raf;
    resize();
    window.addEventListener("resize", debounce(resize, 200));

    if (reduceMotion) {
      // single static frame, no animation loop
      ctx.clearRect(0, 0, w, h);
      frameStatic();
      return;
    }

    function frameStatic() {
      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var a = nodes[i], b = nodes[j];
          var d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < linkDist) {
            ctx.strokeStyle = "rgba(61,215,230," + (1 - d / linkDist) * 0.3 + ")";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      nodes.forEach(function (n) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(120,210,225,0.5)";
        ctx.fill();
      });
    }

    window.addEventListener("pointermove", function (e) {
      var rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = pointer.x > -100 && pointer.x < w + 100 && pointer.y < h + 100;
    });
    window.addEventListener("pointerleave", function () { pointer.active = false; });

    raf = requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------------
     2. Scroll reveal (staggered)
  --------------------------------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var siblings = el.parentElement
            ? el.parentElement.querySelectorAll(":scope > [data-reveal]")
            : [el];
          var idx = Array.prototype.indexOf.call(siblings, el);
          el.style.transitionDelay = Math.max(0, idx) * 70 + "ms";
          el.classList.add("is-visible");
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------------
     3. Count-up numbers + bar fills, triggered on reveal
  --------------------------------------------------------------------- */
  function animateCount(el) {
    var match = el.textContent.match(/([+-]?)(\d[\d,]*\.?\d*)/);
    if (!match) return;
    var prefix = el.textContent.slice(0, match.index);
    var sign = match[1];
    var raw = match[2].replace(/,/g, "");
    var decimals = (raw.split(".")[1] || "").length;
    var target = parseFloat(raw);
    var suffix = el.textContent.slice(match.index + match[0].length);
    if (reduceMotion) return;
    var dur = 1100;
    var start = performance.now();
    function step(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      var val = (target * eased).toFixed(decimals);
      el.textContent = prefix + sign + val + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initMetrics() {
    var bars = document.querySelectorAll(".mini-bar i, .detection-track i, .score-bar i");
    var counters = document.querySelectorAll(
      ".mini-bar strong, .comparison-summary strong, .score, .detection-row .score"
    );

    // prep bars: remember target, collapse, add transition
    bars.forEach(function (bar) {
      var target = bar.style.getPropertyValue("--value") || "0%";
      bar.dataset.target = target;
      if (!reduceMotion) {
        bar.style.setProperty("--value", "0%");
        bar.style.transition = "width 1.1s cubic-bezier(.22,.61,.36,1), background-size 1.1s cubic-bezier(.22,.61,.36,1)";
      }
    });

    function fire(scope) {
      scope.querySelectorAll(".mini-bar i, .detection-track i, .score-bar i").forEach(function (bar) {
        if (bar.dataset.done) return;
        bar.dataset.done = "1";
        if (!reduceMotion) bar.style.setProperty("--value", bar.dataset.target);
      });
      scope.querySelectorAll(".mini-bar strong, .comparison-summary strong, .score").forEach(function (c) {
        if (c.dataset.done) return;
        c.dataset.done = "1";
        animateCount(c);
      });
    }

    if (reduceMotion || !("IntersectionObserver" in window)) {
      bars.forEach(function (b) { b.dataset.done = "1"; });
      counters.forEach(function (c) { c.dataset.done = "1"; });
      return;
    }

    // observe nearest reveal/section container so a group fires together
    var groups = new Set();
    [].concat(
      Array.prototype.slice.call(bars),
      Array.prototype.slice.call(counters)
    ).forEach(function (el) {
      var g = el.closest("[data-reveal], section, .detection-board") || el.parentElement;
      groups.add(g);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          fire(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    groups.forEach(function (g) { io.observe(g); });
  }

  /* ---------------------------------------------------------------------
     4. Active audit pipeline (signal rail steps through stages)
  --------------------------------------------------------------------- */
  function initPipeline() {
    var rail = document.querySelector(".signal-rail");
    if (!rail || reduceMotion) return;
    var steps = rail.querySelectorAll("span");
    if (!steps.length) return;
    var i = 0;
    function tick() {
      steps.forEach(function (s, idx) { s.classList.toggle("active", idx === i); });
      i = (i + 1) % steps.length;
    }
    tick();
    setInterval(tick, 1500);
  }

  /* ---------------------------------------------------------------------
     5. Pointer tilt / parallax on showcase panels
  --------------------------------------------------------------------- */
  function initTilt() {
    if (reduceMotion) return;
    var panels = document.querySelectorAll("[data-tilt]");
    panels.forEach(function (panel) {
      panel.addEventListener("pointermove", function (e) {
        var rect = panel.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        panel.style.transform =
          "perspective(900px) rotateX(" + (-py * 4).toFixed(2) + "deg) rotateY(" +
          (px * 5).toFixed(2) + "deg) translateY(-2px)";
      });
      panel.addEventListener("pointerleave", function () {
        panel.style.transform = "";
      });
    });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    initConstellation();
    initReveal();
    initMetrics();
    initPipeline();
    initTilt();
  });
})();
