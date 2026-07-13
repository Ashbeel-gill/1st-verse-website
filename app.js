/* ============================================================
   1st-verse — interaction engine
   Perf contract: GSAP animates only transform (x/y/z/scale/
   rotation) and opacity. gsap.matchMedia() gates desktop-only
   effects (3D tilt, aurora drift, parallax, magnetics).
   ============================================================ */

(() => {
  "use strict";

  document.documentElement.classList.add("js");
  gsap.registerPlugin(ScrollTrigger);

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => gsap.utils.toArray(ctx.querySelectorAll(sel));

  /* ---------------------------------------------------------
     Count-up utility ($3,459 / +18% style)
  --------------------------------------------------------- */
  function countUp(el, duration = 1.3) {
    const target = parseFloat(el.dataset.countup);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const proxy = { v: 0 };
    return gsap.to(proxy, {
      v: target,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = prefix + Math.round(proxy.v).toLocaleString("en-US") + suffix;
      },
    });
  }
  function setCountFinal(el) {
    el.textContent =
      (el.dataset.prefix || "") +
      parseFloat(el.dataset.countup).toLocaleString("en-US") +
      (el.dataset.suffix || "");
  }

  /* ---------------------------------------------------------
     Drop the entire page to its finished/visible state.
     Used for reduced-motion AND as a resilience fallback when the
     animation ticker never advances (rAF starved on some mobile /
     background loads) — so choreographed content can never get
     stuck permanently invisible.
  --------------------------------------------------------- */
  function showFinalState() {
    gsap.set("[data-reveal], [data-stagger], .line__inner, [data-show-bubble], [data-show-toast]", {
      opacity: 1,
      y: 0,
    });
    gsap.set("[data-convo-item]", { autoAlpha: 1 });
    gsap.set("[data-convo-typing]", { autoAlpha: 0 });
    $$("[data-countup]").forEach(setCountFinal);
    // feature demos: show complete
    gsap.set("[data-feat-pop]", { autoAlpha: 1, scale: 1, y: 0 });
    gsap.set("[data-cmp-pop]", { autoAlpha: 1, scale: 1, y: 0 });
    gsap.set("[data-feat-curtain]", { scaleX: 0 });
    gsap.set("[data-feat-bar]", { scaleX: 1 });
    $$("[data-feat-ring]").forEach((r) => r.style.setProperty("--score", "97"));
    // showcases: pull the chart curtain back so the graphic is visible
    gsap.set("[data-show-curtain]", { scaleX: 0 });
    // theatre: freeze every vignette at its finished state
    gsap.set("[data-v-pop]", { autoAlpha: 1 });
    gsap.set("[data-v-bar]", { scaleX: 1 });
    gsap.set(".vig__tick-mark", { scale: 1 });
    gsap.set("[data-v-row]", { opacity: 1 });
    gsap.set("[data-wire-h]", { scaleX: 1 });
    gsap.set("[data-wire-v]", { scaleY: 1 });
    const pctEl = $("[data-v-pct]");
    if (pctEl) pctEl.textContent = "100%";
    const costEl = $("[data-v-cost]");
    if (costEl) costEl.textContent = "$2,947";
    const typedEl = $("[data-v-typed]");
    if (typedEl) typedEl.textContent = "Morning — how's launch day?";
  }

  /* ---------------------------------------------------------
     Responsive animation contexts
  --------------------------------------------------------- */
  const mm = gsap.matchMedia();

  mm.add(
    {
      isDesktop: "(min-width: 768px)",
      isMobile: "(max-width: 767px)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      const { isDesktop, reduceMotion } = context.conditions;

      if (reduceMotion) {
        showFinalState();
        return;
      }

      initHeroIntro(isDesktop);
      initConvoLoop();
      initScrollReveals(isDesktop);
      initStaggerBatches(isDesktop);
      initShowScenes(isDesktop);
      initTheatre(isDesktop);
      initFeatureDemos();
      initCompare(isDesktop);

      if (isDesktop) {
        initAurora();
        initSceneTilt(context);
        init3DCards(context);
        initIdleFloat();
        initMagnetic(context);
      }
    }
  );

  /* ---------------------------------------------------------
     Hero entrance
  --------------------------------------------------------- */
  function initHeroIntro(isDesktop) {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.to(".hero .line__inner", {
      y: 0,
      opacity: 1,
      duration: isDesktop ? 1.1 : 0.7,
      stagger: 0.12,
      delay: 0.1,
    });

    tl.fromTo(
      $$(".hero [data-reveal]"),
      { opacity: 0, y: isDesktop ? 22 : 0 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.08 },
      isDesktop ? "-=0.7" : "-=0.4"
    );

    tl.fromTo(
      ".scene-card",
      isDesktop ? { opacity: 0, y: 60, scale: 0.97 } : { opacity: 0 },
      { opacity: 1, y: 0, scale: 1, duration: isDesktop ? 1.1 : 0.6, ease: "power3.out" },
      "-=0.55"
    );

    tl.fromTo(
      $$(".scene .f-chip, .scene .doodle, .scene .orb"),
      isDesktop ? { opacity: 0, y: 22, scale: 0.6 } : { opacity: 0 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.08, ease: "back.out(1.6)" },
      "-=0.5"
    );

    // savings chip ticks up once the chips have landed
    const chipNum = $(".f-chip--save [data-countup]");
    if (chipNum) tl.add(() => countUp(chipNum, 1.6), "-=0.3");
  }

  /* ---------------------------------------------------------
     Hero conversation — plays itself, loops forever.
     All items keep their layout slot (autoAlpha), so the card
     never changes height: zero reflow, pure transform/opacity.
  --------------------------------------------------------- */
  function initConvoLoop() {
    const items = $$("[data-convo-item]"); // cust1, agent, meta, cust2
    const typing = $("[data-convo-typing]");
    if (items.length < 4 || !typing) return;
    const [cust1, agent, meta, cust2] = items;

    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 2.4,
      delay: 1.6,
      defaults: { ease: "back.out(1.7)", duration: 0.5 },
    });

    tl.set(items, { autoAlpha: 0, scale: 0.7, y: 8 });
    tl.set(typing, { autoAlpha: 0, scale: 0.7 });

    tl.to(cust1, { autoAlpha: 1, scale: 1, y: 0 }, 0.4);
    tl.to(typing, { autoAlpha: 1, scale: 1, duration: 0.35 }, 1.3);
    tl.to(typing, { autoAlpha: 0, scale: 0.7, duration: 0.25, ease: "power2.in" }, 2.8);
    tl.to(agent, { autoAlpha: 1, scale: 1, y: 0 }, 2.95);
    tl.to(meta, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out" }, 3.6);
    tl.to(cust2, { autoAlpha: 1, scale: 1, y: 0 }, 4.4);
    // graceful outro before the loop restarts
    tl.to(items, { autoAlpha: 0, scale: 0.9, duration: 0.4, stagger: 0.06, ease: "power2.in" }, 8.4);
  }

  /* ---------------------------------------------------------
     Scroll reveals — singles
  --------------------------------------------------------- */
  function initScrollReveals(isDesktop) {
    const targets = $$("[data-reveal]").filter((el) => !el.closest(".hero"));
    targets.forEach((el) => {
      gsap.fromTo(
        el,
        isDesktop ? { opacity: 0, y: 34 } : { opacity: 0 },
        {
          opacity: 1,
          y: 0,
          duration: isDesktop ? 1 : 0.45,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        }
      );
    });
  }

  /* ---------------------------------------------------------
     Scroll reveals — grid batches (feature cards, steps)
  --------------------------------------------------------- */
  function initStaggerBatches(isDesktop) {
    ScrollTrigger.batch("[data-stagger]", {
      start: "top 88%",
      once: true,
      onEnter: (batch) =>
        gsap.fromTo(
          batch,
          isDesktop ? { opacity: 0, y: 30, scale: 0.97 } : { opacity: 0 },
          { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.09, ease: "power3.out" }
        ),
    });
  }

  /* ---------------------------------------------------------
     Showcase scenes — choreographed on scroll
  --------------------------------------------------------- */
  function initShowScenes(isDesktop) {
    // Shopify: conversation pops, then the rescued-cart toast
    const blue = $('[data-show="blue"]');
    if (blue) {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: blue, start: "top 70%", once: true },
        defaults: { ease: "back.out(1.7)" },
      });
      tl.fromTo(
        $$("[data-show-bubble]", blue),
        { opacity: 0, scale: 0.6, y: 12 },
        { opacity: 1, scale: 1, y: 0, duration: 0.55, stagger: 0.3 }
      );
      tl.fromTo(
        $("[data-show-toast]", blue),
        { opacity: 0, scale: 0.5, y: 16 },
        { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: "back.out(2)" },
        "-=0.1"
      );
    }

    // SaaS: curtain sweeps to draw the chart, NRR counts up, toast lands
    const purple = $('[data-show="purple"]');
    if (purple) {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: purple, start: "top 70%", once: true },
      });
      tl.to($("[data-show-curtain]", purple), {
        scaleX: 0,
        duration: isDesktop ? 1.2 : 0.8,
        ease: "power3.inOut",
      });
      const nrr = $("[data-countup]", purple);
      if (nrr) tl.add(() => countUp(nrr, 1.2), "-=0.9");
      tl.fromTo(
        $("[data-show-toast]", purple),
        { opacity: 0, scale: 0.5, y: 16 },
        { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: "back.out(2)" },
        "-=0.4"
      );
    }
  }

  /* ---------------------------------------------------------
     Feature grid — each card's icon is a living micro-demo that
     plays once when it scrolls in (count-ups, sparkline draw,
     response bar, pop-in chips). Transforms/opacity + textContent.
  --------------------------------------------------------- */
  function initFeatureDemos() {
    $$(".feat").forEach((card) => {
      const play = () => {
        $$("[data-countup]", card).forEach((el) => countUp(el, 1.3));
        const curtain = $("[data-feat-curtain]", card);
        if (curtain) gsap.to(curtain, { scaleX: 0, duration: 1.1, ease: "power3.inOut" });
        const bar = $("[data-feat-bar]", card);
        if (bar) gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "power3.out" });
        const ring = $("[data-feat-ring]", card);
        if (ring) {
          const p = { v: 0 };
          gsap.to(p, { v: 97, duration: 1.3, ease: "power2.out", onUpdate: () => ring.style.setProperty("--score", p.v) });
        }
        const pops = $$("[data-feat-pop]", card);
        if (pops.length)
          gsap.fromTo(
            pops,
            { autoAlpha: 0, scale: 0.6, y: 8 },
            { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.09, ease: "back.out(1.7)" }
          );
      };
      ScrollTrigger.create({ trigger: card, start: "top 85%", once: true, onEnter: play });
    });
  }

  /* ---------------------------------------------------------
     Comparison table — ticks cascade in row by row when the
     table scrolls into view; our column lights first (it's the
     leading cell in every row). Transforms/opacity only.
  --------------------------------------------------------- */
  function initCompare(isDesktop) {
    const cmp = $(".cmp");
    if (!cmp) return;
    const rows = $$("[data-cmp-row]", cmp);
    if (!rows.length) return;

    const tl = gsap.timeline({
      scrollTrigger: { trigger: cmp, start: "top 80%", once: true },
    });
    rows.forEach((row) => {
      const cells = $$("[data-cmp-pop]", row);
      if (!cells.length) return;
      tl.fromTo(
        cells,
        isDesktop ? { autoAlpha: 0, scale: 0.5, y: 6 } : { autoAlpha: 0 },
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.08, ease: "back.out(1.7)" },
        "-=0.28"
      );
    });
  }

  /* ---------------------------------------------------------
     How-it-works theatre — desktop pins the section and scrubs
     a progress rail while vignettes crossfade and play at
     natural speed; mobile stacks the cards and plays each
     vignette once on scroll. Transforms/opacity only; the
     checklist ticks toggle a class so CSS draws the check.
  --------------------------------------------------------- */
  function initTheatre(isDesktop) {
    const theatre = $("[data-theatre]");
    if (!theatre) return;

    const steps = $$("[data-t-step]");
    const vigs = $$("[data-vig]");
    const txts = steps.map((s) => $(".t-step__txt", s));
    const cursor = isDesktop ? $("[data-t-cursor]") : null;
    const ripple = $("[data-t-ripple]");

    // positions in theatre-local space — invariant to the pin transform,
    // since the cursor lives inside the pinned element (the fixed offset
    // cancels in every subtraction below)
    const rectT = () => theatre.getBoundingClientRect();
    const center = (el, dx = 0, dy = 0) => {
      const t = rectT(), e = el.getBoundingClientRect();
      return { x: e.left - t.left + e.width / 2 + dx, y: e.top - t.top + e.height / 2 + dy };
    };
    const dock = (tile, hub) => {
      const t = tile.getBoundingClientRect(), h = hub.getBoundingClientRect();
      return { x: (h.left + h.width / 2) - (t.left + t.width / 2), y: (h.top + h.height / 2) - (t.top + t.height / 2) };
    };
    const moveCursor = (tl, el, dx, dy, at) =>
      cursor && tl.to(cursor, { autoAlpha: 1, x: () => center(el, dx, dy).x, y: () => center(el, dx, dy).y, duration: 0.26, ease: "power2.inOut" }, at);
    const tapCursor = (tl, at) => {
      if (!cursor) return;
      tl.to(cursor, { scale: 0.82, duration: 0.09, yoyo: true, repeat: 1, ease: "power2.inOut" }, at);
      tl.fromTo(ripple, { scale: 0.3, autoAlpha: 0.5 }, { scale: 1.35, autoAlpha: 0, duration: 0.32, ease: "power2.out" }, at);
    };
    const hideCursor = (tl, at) => cursor && tl.to(cursor, { autoAlpha: 0, duration: 0.16 }, at);

    // cached element groups per vignette
    const c1 = { tiles: $$("[data-v-tile]", vigs[0]), hub: $("[data-v-hub]", vigs[0]), chip: $("[data-v-pop]", vigs[0]) };
    const c2 = { rows: $$("[data-v-row]", vigs[1]), marks: $$(".vig__tick-mark", vigs[1]), bar: $("[data-v-bar]", vigs[1]), pct: $("[data-v-pct]", vigs[1]) };
    const c3 = { typed: $("[data-v-typed]", vigs[2]), send: $("[data-v-send]", vigs[2]), msgs: $$("[data-v-pop]", vigs[2]), line: "Morning — how's launch day?" };
    const c4 = { cost: $("[data-v-cost]", vigs[3]), card: $(".vig__card--cost", vigs[3]), stamp: $("[data-v-pop]", vigs[3]) };
    const wiresH = steps.map((s) => $("[data-wire-h]", s));
    const wiresV = steps.map((s) => $("[data-wire-v]", s));

    // reset to frame-zero; re-run on every ScrollTrigger refresh so the
    // scrubbed tweens always record the correct start values
    const resetStates = () => {
      gsap.set(vigs, { autoAlpha: isDesktop ? 0 : 1 });
      if (isDesktop) gsap.set(vigs[0], { autoAlpha: 1 });
      gsap.set(c1.tiles, { x: 0, y: 0, scale: 1, autoAlpha: 1 });
      gsap.set(c1.hub, { scale: 1 });
      gsap.set(c1.chip, { xPercent: -50, autoAlpha: 0, scale: 0.6 });
      gsap.set(c2.rows, { opacity: 0.4 });
      gsap.set(c2.marks, { scale: 0 });
      gsap.set(c2.bar, { scaleX: 0 });
      c2.pct.textContent = "0%";
      gsap.set(c3.msgs, { autoAlpha: 0, y: 10, scale: 0.9 });
      gsap.set(c3.typed, { autoAlpha: 1 });
      c3.typed.textContent = "";
      gsap.set(c4.stamp, { autoAlpha: 0, scale: 1.8, rotation: -8 });
      c4.cost.textContent = "$6,406";
      gsap.set(wiresH, { scaleX: 0 });
      gsap.set(wiresV, { scaleY: 0 });
      if (cursor) gsap.set(cursor, { x: 44, y: 44, scale: 1, autoAlpha: 0 });
    };

    // each builder adds one step's choreography to timeline `tl` at base time `b`
    function addConnect(tl, b) {
      c1.tiles.forEach((tile, i) => {
        const t = b + 0.06 + i * 0.18;
        moveCursor(tl, tile, 4, 6, t);
        tapCursor(tl, t + 0.2);
        tl.to(tile, { x: () => dock(tile, c1.hub).x, y: () => dock(tile, c1.hub).y, scale: 0.25, autoAlpha: 0, duration: 0.3, ease: "power2.inOut" }, t + 0.22);
        tl.to(c1.hub, { scale: 1.12, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.inOut" }, t + 0.3);
      });
      hideCursor(tl, b + 0.86);
      tl.to(c1.chip, { autoAlpha: 1, scale: 1, duration: 0.34, ease: "back.out(1.6)" }, b + 0.74);
    }
    function addTrain(tl, b) {
      c2.rows.forEach((row, i) => {
        const t = b + 0.1 + i * 0.2;
        tl.to(row, { opacity: 1, duration: 0.22, ease: "power2.out" }, t);
        tl.to(c2.marks[i], { scale: 1, duration: 0.26, ease: "back.out(2)" }, t + 0.04);
        tl.to(c2.bar, { scaleX: (i + 1) / c2.rows.length, duration: 0.28, ease: "power2.out" }, t + 0.04);
      });
      const p = { v: 0 };
      tl.to(p, { v: 100, duration: 0.86, ease: "none", onUpdate: () => (c2.pct.textContent = Math.round(p.v) + "%") }, b + 0.1);
    }
    function addLaunch(tl, b) {
      const p = { n: 0 };
      tl.to(p, { n: c3.line.length, duration: 0.5, ease: "none", onUpdate: () => (c3.typed.textContent = c3.line.slice(0, Math.round(p.n))) }, b + 0.08);
      moveCursor(tl, c3.send, 0, 0, b + 0.56);
      tapCursor(tl, b + 0.74);
      tl.to(c3.typed, { autoAlpha: 0, duration: 0.12 }, b + 0.78);
      tl.to(c3.msgs[0], { autoAlpha: 1, y: 0, scale: 1, duration: 0.26, ease: "back.out(1.6)" }, b + 0.76);
      hideCursor(tl, b + 0.8);
      tl.to(c3.msgs[1], { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: "back.out(1.6)" }, b + 0.9);
    }
    function addScale(tl, b) {
      moveCursor(tl, c4.card, 0, 22, b + 0.1);
      tapCursor(tl, b + 0.32);
      hideCursor(tl, b + 0.46);
      const p = { v: 6406 };
      tl.to(p, { v: 2947, duration: 0.8, ease: "power2.out", onUpdate: () => (c4.cost.textContent = "$" + Math.round(p.v).toLocaleString("en-US")) }, b + 0.34);
      tl.to(c4.stamp, { autoAlpha: 1, scale: 1, rotation: -8, duration: 0.32, ease: "back.out(1.9)" }, b + 0.82);
    }

    const adders = [addConnect, addTrain, addLaunch, addScale];
    resetStates();

    // mobile: play each vignette once when it scrolls into view (no cursor)
    if (!isDesktop) {
      vigs.forEach((vig, i) => {
        const tl = gsap.timeline({ paused: true });
        adders[i](tl, 0);
        ScrollTrigger.create({ trigger: vig, start: "top 82%", once: true, onEnter: () => tl.play() });
      });
      return;
    }

    // desktop: pin the section and scrub one master timeline — every pixel of
    // scroll drives the choreography; steps highlight and vignettes crossfade
    // at each 1-unit boundary; the sequence ends exactly as the pin releases
    gsap.set(txts, { opacity: 0.45 });
    gsap.set(txts[0], { opacity: 1 });

    const master = gsap.timeline({ defaults: { ease: "power1.inOut" } });
    // step 1: the branch feeds in from the heading, then its spine segment flows down
    master.to(wiresH[0], { scaleX: 1, duration: 0.4 }, 0.05);
    master.to(wiresV[0], { scaleY: 1, duration: 0.66, ease: "none" }, 0.32);
    adders.forEach((add, i) => {
      add(master, i);
      if (i > 0) {
        // smooth, overlapping stage crossfade (prev fades only after its content settles)
        master.to(vigs[i - 1], { autoAlpha: 0, duration: 0.3 }, i);
        master.to(vigs[i], { autoAlpha: 1, duration: 0.34 }, i - 0.05);
        // headings light cumulatively — a completed step stays lit
        master.to(txts[i], { opacity: 1, duration: 0.32 }, i - 0.05);
        // pipeline keeps flowing: branch in, then spine down — nothing ever drains
        master.to(wiresH[i], { scaleX: 1, duration: 0.4 }, i + 0.02);
        master.to(wiresV[i], { scaleY: 1, duration: 0.66, ease: "none" }, i + 0.3);
      }
    });

    ScrollTrigger.create({
      trigger: theatre,
      start: "top 84",
      end: () => "+=" + steps.length * 936,
      pin: true,
      anticipatePin: 1,
      scrub: 1,
      invalidateOnRefresh: true,
      // This pin inserts a spacer that shifts every trigger below it (the
      // feature demos, the comparison table, pricing…). ScrollTrigger must
      // measure the pin BEFORE those, or their — and occasionally the pin's
      // own — start/end land on stale offsets and the theatre engages early,
      // overlapping the SaaS showcase above it. A positive refreshPriority
      // guarantees the pin is calculated first on every refresh.
      refreshPriority: 1,
      animation: master,
      onRefreshInit: resetStates,
    });
  }

  /* ---------------------------------------------------------
     Desktop: aurora field drifts slowly behind the hero
  --------------------------------------------------------- */
  function initAurora() {
    $$("[data-aurora]").forEach((el, i) => {
      gsap.to(el, {
        xPercent: i % 2 ? 12 : -10,
        yPercent: i % 2 ? -9 : 11,
        duration: 13 + i * 3.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    });
  }

  /* ---------------------------------------------------------
     Desktop: true 3D — the scene tilts with the cursor and
     chips sit at different translateZ depths for real parallax
  --------------------------------------------------------- */
  function initSceneTilt(context) {
    const scene = $("[data-scene]");
    const s3d = $("[data-scene3d]");
    if (!scene || !s3d) return;

    gsap.set(".scene-card", { z: 10 });
    $$("[data-z]", s3d).forEach((el) => gsap.set(el, { z: parseFloat(el.dataset.z) }));

    const rxTo = gsap.quickTo(s3d, "rotationX", { duration: 0.9, ease: "power3.out" });
    const ryTo = gsap.quickTo(s3d, "rotationY", { duration: 0.9, ease: "power3.out" });

    const onMove = (e) => {
      const r = scene.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      ryTo(nx * 7);
      rxTo(ny * -5.5);
    };
    const onLeave = () => {
      rxTo(0);
      ryTo(0);
    };

    scene.addEventListener("mousemove", onMove);
    scene.addEventListener("mouseleave", onLeave);
    context.add(() => () => {
      scene.removeEventListener("mousemove", onMove);
      scene.removeEventListener("mouseleave", onLeave);
      gsap.set(s3d, { clearProps: "transform" });
    });
  }

  /* ---------------------------------------------------------
     Desktop: gentle idle float (yPercent — never fights tilt)
  --------------------------------------------------------- */
  function initIdleFloat() {
    $$(".scene .f-chip, .toast").forEach((el, i) => {
      gsap.to(el, {
        yPercent: i % 2 ? 5 : -5,
        duration: 3 + (i % 3) * 0.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: i * 0.35,
      });
    });
    $$(".doodle, .orb").forEach((el, i) => {
      gsap.to(el, {
        rotation: i % 2 ? 13 : -13,
        yPercent: -9,
        duration: 3.6 + i * 0.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        transformOrigin: "center",
      });
    });
  }

  /* ---------------------------------------------------------
     Desktop: subtle magnetic pull on primary CTAs
  --------------------------------------------------------- */
  function initMagnetic(context) {
    $$("[data-magnetic]").forEach((btn) => {
      const xTo = gsap.quickTo(btn, "x", { duration: 0.45, ease: "power3.out" });
      const yTo = gsap.quickTo(btn, "y", { duration: 0.45, ease: "power3.out" });

      const onMove = (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.22);
      };
      const onLeave = () => {
        xTo(0);
        yTo(0);
      };

      btn.addEventListener("mousemove", onMove);
      btn.addEventListener("mouseleave", onLeave);
      context.add(() => () => {
        btn.removeEventListener("mousemove", onMove);
        btn.removeEventListener("mouseleave", onLeave);
        gsap.set(btn, { clearProps: "transform" });
      });
    });
  }

  /* ---------------------------------------------------------
     Desktop: 3D depth on feature & step cards — the card tilts
     toward the cursor while badge/heading/copy sit at layered
     translateZ depths; a soft glare tracks the pointer.
  --------------------------------------------------------- */
  function init3DCards(context) {
    $$(".feat").forEach((card) => {
      gsap.set(card, { transformPerspective: 800 });

      // glare layer
      const glare = document.createElement("span");
      glare.className = "card-glare";
      glare.setAttribute("aria-hidden", "true");
      const spot = document.createElement("i");
      glare.appendChild(spot);
      card.appendChild(glare);

      const rxTo = gsap.quickTo(card, "rotationX", { duration: 0.55, ease: "power3.out" });
      const ryTo = gsap.quickTo(card, "rotationY", { duration: 0.55, ease: "power3.out" });
      const gxTo = gsap.quickTo(spot, "x", { duration: 0.35, ease: "power3.out" });
      const gyTo = gsap.quickTo(spot, "y", { duration: 0.35, ease: "power3.out" });

      const onEnter = () => {
        gsap.to(card, { y: -7, duration: 0.4, ease: "back.out(2)" });
        gsap.to(glare, { opacity: 1, duration: 0.35 });
      };
      const onMove = (e) => {
        const r = card.getBoundingClientRect();
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        ryTo((px / r.width - 0.5) * 10);
        rxTo((py / r.height - 0.5) * -8);
        gxTo(px);
        gyTo(py);
      };
      const onLeave = () => {
        rxTo(0);
        ryTo(0);
        gsap.to(card, { y: 0, duration: 0.6, ease: "power3.out" });
        gsap.to(glare, { opacity: 0, duration: 0.35 });
      };

      card.addEventListener("mouseenter", onEnter);
      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
      context.add(() => () => {
        card.removeEventListener("mouseenter", onEnter);
        card.removeEventListener("mousemove", onMove);
        card.removeEventListener("mouseleave", onLeave);
        glare.remove();
        gsap.set(card, { clearProps: "transform" });
      });
    });
  }


  /* ---------------------------------------------------------
     Mobile nav
  --------------------------------------------------------- */
  const burger = $(".topbar__burger");
  if (burger) {
    burger.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    $$(".topbar__sheet a, .topbar__sheet button").forEach((el) =>
      el.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
        burger.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ---------------------------------------------------------
     FAQ — buttery grid-rows expansion
  --------------------------------------------------------- */
  $$(".faq__item summary").forEach((summary) => {
    summary.addEventListener("click", (e) => {
      e.preventDefault();
      const item = summary.parentElement;
      if (item.classList.contains("is-open")) {
        item.classList.remove("is-open");
        setTimeout(() => item.removeAttribute("open"), 460);
      } else {
        // close any other open item first — one at a time
        $$(".faq__item.is-open").forEach((open) => {
          if (open !== item) {
            open.classList.remove("is-open");
            setTimeout(() => open.removeAttribute("open"), 460);
          }
        });
        item.setAttribute("open", "");
        // flush layout so the 0fr start state is committed, then transition
        void item.offsetHeight;
        item.classList.add("is-open");
      }
    });
  });

  /* ---------------------------------------------------------
     Cal.com fallback — if the embed can't load, booking
     buttons open cal.com directly instead of dying silently.
  --------------------------------------------------------- */
  let calFailed = false;
  const calScript = document.querySelector('script[src*="embed/embed.js"]');
  if (calScript) calScript.addEventListener("error", () => (calFailed = true));
  setTimeout(() => {
    if (window.Cal && Array.isArray(window.Cal.q) && window.Cal.q.length > 0) calFailed = true;
  }, 4000);
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-cal-link]");
    if (el && calFailed) window.open("https://cal.com/" + el.getAttribute("data-cal-link"), "_blank");
  });

  /* ---------------------------------------------------------
     Pricing calculator — $15/hr all-in vs in-house & agency
  --------------------------------------------------------- */
  const RATE_FV_1 = 15; // one agent, up to 40 hrs/week
  const RATE_FV_TEAM = 12; // 2+ agents, 41–120 hrs/week
  const RATE_FV_247 = 10; // round-the-clock, 120+ hrs/week
  const rateFor = (h) => (h > 120 ? RATE_FV_247 : h > 40 ? RATE_FV_TEAM : RATE_FV_1);
  const RATE_INHOUSE = 22;
  const OVERHEAD = 0.4;
  const RATE_AGENCY = 35;

  const slider = $("#hours");
  if (slider) {
    const hoursOut = $("#hours-out");
    const presets = $$(".calc__presets button");
    const fields = {};
    $$("[data-num]").forEach((el) => {
      fields[el.dataset.num] = { el, val: 0 };
    });

    // Three-bar comparison: agency / in-house / 1st-verse, scaled to the tallest (agency).
    const barKeys = { agency: "agencyTotal", inhouse: "inhouseTotal", fv: "firstverse" };
    const bars = {};
    Object.keys(barKeys).forEach((k) => {
      bars[k] = { fill: $(`[data-bar="${k}"]`), num: $(`[data-bar-num="${k}"]`), val: 0 };
    });

    // Volume tiers: the big rate number + inline rate labels + tier caption reflect the current tier.
    const fvRateEls = $$("[data-fv-rate]");
    const tierLabel = $("[data-tier-label]");

    const model = (h) => {
      const inhouseBase = Math.round((h * 52 * RATE_INHOUSE) / 12);
      const overhead = Math.round(inhouseBase * OVERHEAD);
      const inhouseTotal = inhouseBase + overhead;
      const fvRate = rateFor(h);
      const firstverse = Math.round((h * 52 * fvRate) / 12);
      const agencyTotal = Math.round((h * 52 * RATE_AGENCY) / 12);
      const savingsMo = Math.max(0, inhouseTotal - firstverse);
      return { inhouseBase, overhead, inhouseTotal, firstverse, agencyTotal, fvRate, savingsMo, savingsYr: savingsMo * 12 };
    };

    const render = (animate) => {
      const h = parseInt(slider.value, 10);
      hoursOut.textContent = h;
      slider.style.setProperty("--fill", `${((h - slider.min) / (slider.max - slider.min)) * 100}%`);
      presets.forEach((b) => b.classList.toggle("is-on", parseInt(b.dataset.hours, 10) === h));

      const m = model(h);
      fvRateEls.forEach((el) => (el.textContent = m.fvRate));
      if (tierLabel) tierLabel.textContent = h > 120 ? "24/7 coverage" : h > 40 ? "40+ hrs / week" : "up to 40 hrs / week";
      Object.entries(m).forEach(([key, target]) => {
        const f = fields[key];
        if (!f) return;
        if (!animate) {
          f.val = target;
          f.el.textContent = target.toLocaleString("en-US");
          return;
        }
        gsap.to(f, {
          val: target,
          duration: 0.5,
          ease: "power2.out",
          overwrite: true,
          onUpdate: () => {
            f.el.textContent = Math.round(f.val).toLocaleString("en-US");
          },
        });
      });

      const maxCost = m.agencyTotal || 1;
      Object.entries(barKeys).forEach(([k, key]) => {
        const b = bars[k];
        if (!b || !b.fill) return;
        const target = m[key];
        const pct = Math.max(0.04, target / maxCost);
        if (!animate) {
          gsap.set(b.fill, { scaleX: pct });
          b.val = target;
          if (b.num) b.num.textContent = target.toLocaleString("en-US");
          return;
        }
        gsap.to(b.fill, { scaleX: pct, duration: 0.5, ease: "power2.out", overwrite: true });
        gsap.to(b, {
          val: target,
          duration: 0.5,
          ease: "power2.out",
          overwrite: true,
          onUpdate: () => {
            if (b.num) b.num.textContent = Math.round(b.val).toLocaleString("en-US");
          },
        });
      });
    };

    slider.addEventListener("input", () => render(true));
    presets.forEach((b) =>
      b.addEventListener("click", () => {
        slider.value = b.dataset.hours;
        render(true);
      })
    );
    render(false);
  }

  /* ---------------------------------------------------------
     Resilience net
     Choreographed content below the hero starts hidden and is revealed
     by GSAP. Two real-world failure modes are guarded here:

     1. Mobile ScrollTrigger positions computed before images/fonts
        settle (or shifted by the address bar) can end up unreachable,
        so reveals never fire — recompute them once the page fully
        loads and whenever the viewport orientation changes.

     2. On some mobile / background-tab loads the browser starves the
        rendering update loop, so requestAnimationFrame (and with it the
        GSAP ticker) stalls — no animation ever plays and every reveal
        stays invisible. IntersectionObserver is delivered in that SAME
        rendering step, so it stalls too and can't be used to rescue this
        case; only timer tasks (setTimeout) keep firing. So when the
        ticker isn't advancing, drop the whole page to its finished,
        visible state via a timer.

     Liveness is sampled over a RECENT window (t1→t2 just before the
     deadline), NOT cumulatively from boot. The earlier boot-relative
     check (`ticker.time - tickerAtBoot > 0.1`) had a false-positive: a
     tab that runs a few frames on load and only THEN throttles to a stop
     inflates the boot-relative delta past the threshold, so the fallback
     wrongly stood down and content stayed hidden — the recurring mobile
     bug. A recent-window sample reads that "ran then froze" tab as dead.
  --------------------------------------------------------- */
  const refreshTriggers = () => ScrollTrigger.refresh();
  window.addEventListener("load", refreshTriggers);
  window.addEventListener("orientationchange", refreshTriggers);

  let tickerT1 = gsap.ticker.time;
  window.setTimeout(() => {
    tickerT1 = gsap.ticker.time;
  }, 2700);
  window.setTimeout(() => {
    const advancingNow = gsap.ticker.time - tickerT1 > 0.05;
    if (advancingNow) return; // ticker still running — leave animations alone
    showFinalState();
  }, 3000);
})();
