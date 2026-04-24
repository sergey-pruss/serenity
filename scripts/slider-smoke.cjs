const { chromium } = require("playwright");

const URL = process.env.SLIDER_TEST_URL || "http://127.0.0.1:4322/";
const VIEWPORT = { width: 1366, height: 900 };

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function readState(page) {
  return page.evaluate(() => {
    const host = document.querySelector(".services__context-slider");
    const track = document.querySelector(".services__context-wrapper");
    const prev = host?.querySelector(".swiper-button-prev");
    const next = host?.querySelector(".swiper-button-next");
    if (!host || !track) return null;
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    return {
      left: track.scrollLeft,
      max,
      prevHidden: prev?.classList.contains("is-row-hidden") ?? null,
      nextHidden: next?.classList.contains("is-row-hidden") ?? null,
    };
  });
}

async function readGeometry(page) {
  return page.evaluate(() => {
    const host = document.querySelector(".services__context-slider");
    const track = document.querySelector(".services__context-wrapper");
    const first = track?.querySelector(".swiper-slide");
    const second = track?.querySelectorAll(".swiper-slide")?.[1];
    if (!host || !track || !first) return null;
    const hostRect = host.getBoundingClientRect();
    const firstRect = first.getBoundingClientRect();
    return {
      hostLeft: hostRect.left,
      hostRight: hostRect.right,
      firstLeft: firstRect.left,
      step: second ? second.offsetLeft - first.offsetLeft : 0,
    };
  });
}

async function clickArrow(page, dir) {
  const selector = `.services__context-slider .swiper-button-${dir}`;
  await page.click(selector);
  await page.waitForTimeout(700);
}

async function clickBlogArrow(page, dir) {
  const selector = `.blog-block-mainstr .swiper-button-${dir}`;
  await page.click(selector);
  await page.waitForTimeout(700);
}

async function readBlogState(page) {
  return page.evaluate(() => {
    const host = document.querySelector(".blog-block__swiper-container");
    const track = host?.querySelector(".swiper-wrapper");
    const root = document.querySelector(".blog-block-mainstr");
    const prev = root?.querySelector(".swiper-button-prev");
    const next = root?.querySelector(".swiper-button-next");
    if (!host || !track || !prev || !next) return null;
    const slides = track.querySelectorAll(".swiper-slide");
    const a = slides[0];
    const b = slides[1];
    return {
      left: track.scrollLeft,
      max: Math.max(0, track.scrollWidth - track.clientWidth),
      prevHidden: prev.classList.contains("is-row-hidden"),
      nextHidden: next.classList.contains("is-row-hidden"),
      step: a && b ? b.offsetLeft - a.offsetLeft : 0,
    };
  });
}

async function readBlogArrowStyles(page) {
  return page.evaluate(() => {
    const root = document.querySelector(".blog-block__swiper-container");
    const track = root?.querySelector(".swiper-wrapper");
    const prev = root?.querySelector(".swiper-button-prev");
    const next = root?.querySelector(".swiper-button-next");
    if (!prev || !next || !track) return null;
    const ps = getComputedStyle(prev);
    const ns = getComputedStyle(next);
    const rr = root.getBoundingClientRect();
    const cards = track.querySelectorAll("a.case, a.blog-box");
    let minT = Number.POSITIVE_INFINITY;
    let maxB = Number.NEGATIVE_INFINITY;
    cards.forEach((el) => {
      const b = el.getBoundingClientRect();
      if (b.width < 1 || b.height < 1) return;
      minT = Math.min(minT, b.top);
      maxB = Math.max(maxB, b.bottom);
    });
    const tr = track.getBoundingClientRect();
    if (minT === Number.POSITIVE_INFINITY) {
      minT = tr.top;
      maxB = tr.bottom;
    }
    const trackCenterY = (minT + maxB) / 2;
    const pr = prev.getBoundingClientRect();
    const nr = next.getBoundingClientRect();
    return {
      prev: {
        position: ps.position,
        borderRadius: ps.borderRadius,
        backgroundColor: ps.backgroundColor,
        centerY: (pr.top + pr.bottom) / 2,
        left: pr.left,
      },
      next: {
        position: ns.position,
        borderRadius: ns.borderRadius,
        backgroundColor: ns.backgroundColor,
        centerY: (nr.top + nr.bottom) / 2,
        right: nr.right,
      },
      trackCenterY,
      hostCenterY: (rr.top + rr.bottom) / 2,
      hostLeft: rr.left,
      hostRight: rr.right,
    };
  });
}

async function readNativeStyles(page) {
  return page.evaluate(() => {
    const servicesTrack = document.querySelector(".services__context-wrapper");
    const blogTrack = document.querySelector(".blog-block__swiper-container .swiper-wrapper");
    if (!servicesTrack || !blogTrack) return null;
    const ss = getComputedStyle(servicesTrack);
    const bs = getComputedStyle(blogTrack);
    return {
      services: {
        overflowX: ss.overflowX,
        scrollSnapType: ss.scrollSnapType,
      },
      blog: {
        overflowX: bs.overflowX,
        scrollSnapType: bs.scrollSnapType,
      },
    };
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1200);
  await page.locator(".services__context-slider").scrollIntoViewIfNeeded();

  const initial = await readState(page);
  const initialGeo = await readGeometry(page);
  const nativeStyles = await readNativeStyles(page);
  assert(initial, "services slider is not found");
  assert(initialGeo, "services slider geometry is not found");
  assert(nativeStyles, "native row styles are not found");
  assert(initial.max > 0, "services slider has no horizontal overflow");
  assert(nativeStyles.services.overflowX === "hidden", "services row must keep horizontal scroll disabled");
  assert(
    nativeStyles.services.scrollSnapType === "none",
    "services row must not use scroll snap",
  );
  assert(nativeStyles.blog.overflowX === "hidden", "blog row must keep horizontal scroll disabled");
  assert(
    nativeStyles.blog.scrollSnapType === "none",
    "blog row must not use scroll snap",
  );
  assert(initialGeo.hostLeft <= 1, "services host must be full-bleed at viewport left edge");
  assert(initial.prevHidden === true, "prev arrow must be hidden at start");
  assert(initial.nextHidden === false, "next arrow must be visible at start");
  assert(initialGeo.step > 0, "services card step must be positive");
  assert(initialGeo.firstLeft > 20, "first services card must keep left start offset");

  const box = await page.locator(".services__context-slider").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const detectSign = async (rawDeltaX) => {
    await page.evaluate(() => {
      const track = document.querySelector(".services__context-wrapper");
      if (track) track.scrollLeft = 0;
    });
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0);
    await page.mouse.wheel(rawDeltaX, 20);
    await page.waitForTimeout(180);
    const after = await page.evaluate(() => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0);
    return after - before;
  };
  const plusDelta = await detectSign(120);
  const minusDelta = await detectSign(-120);
  const rightSign = plusDelta > 2 ? 1 : minusDelta > 2 ? -1 : 0;
  assert(rightSign !== 0, "cannot detect rightward touchpad sign on first screen");

  // Strict anti-jump check: start swipe must move left edge smoothly, no abrupt leap.
  await page.evaluate(() => {
    const track = document.querySelector(".services__context-wrapper");
    if (track) track.scrollLeft = 0;
  });
  await page.waitForTimeout(100);
  const hostLeftSamples = [];
  hostLeftSamples.push(
    await page.evaluate(() => document.querySelector(".services__context-slider")?.getBoundingClientRect().left ?? 0),
  );
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.wheel(16 * rightSign, 2);
    await page.waitForTimeout(90);
    hostLeftSamples.push(
      await page.evaluate(() => document.querySelector(".services__context-slider")?.getBoundingClientRect().left ?? 0),
    );
  }
  let maxStep = 0;
  for (let i = 1; i < hostLeftSamples.length; i += 1) {
    const step = Math.abs(hostLeftSamples[i] - hostLeftSamples[i - 1]);
    if (step > maxStep) maxStep = step;
    assert(hostLeftSamples[i] <= hostLeftSamples[i - 1] + 1, "left edge must move monotonically to viewport edge");
  }
  assert(maxStep < 55, "left edge transition must be smooth and not jump in one frame");
  assert(hostLeftSamples[hostLeftSamples.length - 1] <= 1, "left edge must reach viewport after initial rightward gestures");

  const urlBeforeTrackpad = page.url();
  const xBeforeFirstTrackpad = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  await page.mouse.wheel(260 * rightSign, 120);
  await page.waitForTimeout(250);
  const xAfterFirstTrackpad = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  const hostLeftAfterFirstTrackpad = await page.evaluate(
    () => document.querySelector(".services__context-slider")?.getBoundingClientRect().left ?? 9999,
  );
  assert(
    xAfterFirstTrackpad > xBeforeFirstTrackpad + 30,
    "horizontal swipe with reverse delta sign must work on first screen without arrow click",
  );
  assert(hostLeftAfterFirstTrackpad <= 1, "after first rightward scroll host must stay flush with viewport");
  assert(page.url() === urlBeforeTrackpad, "horizontal swipe over slider must not trigger browser back/forward");

  await page.evaluate(() => {
    const track = document.querySelector(".services__context-wrapper");
    if (track) track.scrollLeft = 0;
  });
  await page.waitForTimeout(100);
  const xBeforeSmallFirstSwipe = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  await page.mouse.wheel(55 * rightSign, 10);
  await page.waitForTimeout(220);
  const xAfterSmallFirstSwipePlus = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  await page.evaluate(() => {
    const track = document.querySelector(".services__context-wrapper");
    if (track) track.scrollLeft = 0;
  });
  await page.waitForTimeout(100);
  await page.mouse.wheel(-55 * rightSign, 10);
  await page.waitForTimeout(220);
  const xAfterSmallFirstSwipeMinus = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  assert(
    xAfterSmallFirstSwipePlus > xBeforeSmallFirstSwipe + 5 ||
      xAfterSmallFirstSwipeMinus > xBeforeSmallFirstSwipe + 5,
    "small horizontal swipe from first screen must move slider (for current trackpad delta sign)",
  );

  await page.evaluate(() => {
    const track = document.querySelector(".services__context-wrapper");
    if (track) track.scrollLeft = 0;
  });
  await page.waitForTimeout(120);
  const xBeforeFirstTrackpadPositive = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  await page.mouse.wheel(-260 * rightSign, 120);
  await page.waitForTimeout(250);
  const xAfterFirstTrackpadPositive = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  assert(xAfterFirstTrackpadPositive >= xBeforeFirstTrackpadPositive, "direct-sign swipe must not move slider backward");

  await page.hover(".services__context-wrapper .swiper-slide:nth-child(2) .services__card");
  await page.waitForTimeout(220);
  const glow = await page.evaluate(() => {
    const host = document.querySelector(".services__context-slider");
    const wrap = document.querySelector(".services__context-wrapper");
    const card = document.querySelector(".services__context-wrapper .swiper-slide:nth-child(2) .services__card");
    if (!host || !wrap || !card) return null;
    const hr = host.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    const after = getComputedStyle(card, "::after");
    return {
      hostTopClearance: cr.top - hr.top,
      wrapTopClearance: cr.top - wr.top,
      afterOpacity: Number.parseFloat(after.opacity || "0"),
    };
  });
  assert(glow, "cannot read services hover glow geometry");
  assert(glow.hostTopClearance >= 40, "services host must provide top space for hover glow");
  assert(glow.wrapTopClearance >= 40, "services track must provide top space for hover glow");
  assert(glow.afterOpacity > 0.4, "services hover glow must be visible on hover");

  await clickArrow(page, "next");
  const afterNext = await readState(page);
  const afterNextGeo = await readGeometry(page);
  assert(afterNext.left > initial.left + 10, "next arrow must move slider to the right");
  assert(afterNextGeo.hostLeft <= 1, "after right scroll services row must reach viewport left edge");
  const cardsMoved = (afterNext.left - initial.left) / initialGeo.step;
  assert(cardsMoved >= 2.5, "next arrow must move at least ~3 cards");
  assert(cardsMoved <= 4.5, "next arrow must not move more than ~4 cards");

  const yBeforeTrackpad = await page.evaluate(() => window.scrollY);
  const xBeforeTrackpad = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(600, 0);
  await page.waitForTimeout(250);
  const xAfterTrackpad = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  const yAfterTrackpad = await page.evaluate(() => window.scrollY);
  const firstSwipeDelta = xAfterTrackpad - xBeforeTrackpad;
  assert(
    Math.abs(firstSwipeDelta) > 20,
    "horizontal touchpad-like swipe over services must change cards position",
  );
  assert(
    Math.abs(yAfterTrackpad - yBeforeTrackpad) < 5,
    "horizontal touchpad-like swipe must not move page vertically",
  );
  const arrowsAfterRightSwipe = await readState(page);
  assert(arrowsAfterRightSwipe.prevHidden === false, "left arrow must appear after right swipe");

  const xBeforeTrackpadLeft = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  await page.mouse.wheel(-600, 0);
  await page.waitForTimeout(250);
  const xAfterTrackpadLeft = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  const secondSwipeDelta = xAfterTrackpadLeft - xBeforeTrackpadLeft;
  assert(
    firstSwipeDelta * secondSwipeDelta < -50,
    "opposite horizontal swipe must move cards in opposite direction",
  );

  await clickArrow(page, "prev");
  const afterPrev = await readState(page);
  assert(afterPrev.left < afterNext.left - 10, "prev arrow must move slider to the left");

  let safety = 0;
  let endState = afterPrev;
  while (safety < 20) {
    safety += 1;
    await clickArrow(page, "next");
    endState = await readState(page);
    if (endState.nextHidden) break;
  }
  assert(endState.nextHidden === true, "next arrow must be hidden at right edge");
  assert(Math.abs(endState.left - endState.max) < 8, "slider must reach right edge");
  await page.evaluate(() => {
    const track = document.querySelector(".services__context-wrapper");
    if (!track) return;
    track.scrollLeft = Math.max(0, track.scrollWidth - track.clientWidth - 300);
  });
  await page.waitForTimeout(120);
  const probeRightBefore = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  await page.mouse.wheel(160, 0);
  await page.waitForTimeout(120);
  const probeRightPlus = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  await page.evaluate(() => {
    const track = document.querySelector(".services__context-wrapper");
    if (!track) return;
    track.scrollLeft = Math.max(0, track.scrollWidth - track.clientWidth - 300);
  });
  await page.waitForTimeout(120);
  await page.mouse.wheel(-160, 0);
  await page.waitForTimeout(120);
  const probeRightMinus = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  const rightwardRawSign = probeRightPlus > probeRightBefore ? 1 : -1;
  const leftwardRawSign = rightwardRawSign * -1;

  await page.evaluate(() => {
    const track = document.querySelector(".services__context-wrapper");
    if (track) track.scrollLeft = track.scrollWidth - track.clientWidth;
  });
  await page.waitForTimeout(120);
  const endBeforeJitter = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  await page.mouse.wheel(320 * rightwardRawSign, 20);
  await page.waitForTimeout(200);
  const endAfterJitter = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  assert(
    endAfterJitter >= endBeforeJitter - 1,
    "at right edge horizontal swipe must not jerk slider back to the left",
  );

  // Anti-jitter at left edge: determine raw sign that moves slider left, then ensure
  // that swiping further left at boundary does not bounce slider to the right.
  await page.evaluate(() => {
    const track = document.querySelector(".services__context-wrapper");
    if (track) track.scrollLeft = 500;
  });
  await page.waitForTimeout(120);
  const probeBefore = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  await page.mouse.wheel(140, 0);
  await page.waitForTimeout(120);
  const probePlus = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  await page.evaluate(() => {
    const track = document.querySelector(".services__context-wrapper");
    if (track) track.scrollLeft = 500;
  });
  await page.waitForTimeout(120);
  await page.mouse.wheel(-140, 0);
  await page.waitForTimeout(120);
  const probeMinus = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  const inferredLeftwardRawSign = probePlus < probeBefore ? 1 : -1;
  assert(
    inferredLeftwardRawSign === leftwardRawSign,
    "leftward swipe sign inference must stay consistent",
  );

  await page.evaluate(() => {
    const track = document.querySelector(".services__context-wrapper");
    if (track) track.scrollLeft = 0;
  });
  await page.waitForTimeout(120);
  const leftEdgeBefore = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  await page.mouse.wheel(320 * inferredLeftwardRawSign, 20);
  await page.waitForTimeout(200);
  const leftEdgeAfter = await page.evaluate(
    () => document.querySelector(".services__context-wrapper")?.scrollLeft ?? 0,
  );
  assert(
    leftEdgeAfter <= leftEdgeBefore + 1,
    "at left edge swipe further left must not jerk slider to the right",
  );

  await page.locator(".blog-block__swiper-container").scrollIntoViewIfNeeded();
  const blogStart = await readBlogState(page);
  const blogArrowStyles = await readBlogArrowStyles(page);
  assert(blogStart, "blog slider is not found");
  assert(blogArrowStyles, "blog arrows are not found");
  assert(blogArrowStyles.prev.position === "absolute", "blog prev arrow must be absolutely positioned");
  assert(blogArrowStyles.next.position === "absolute", "blog next arrow must be absolutely positioned");
  assert(blogArrowStyles.prev.borderRadius === "50%", "blog prev arrow must be circular");
  assert(blogArrowStyles.next.borderRadius === "50%", "blog next arrow must be circular");
  assert(
    Math.abs(blogArrowStyles.prev.centerY - blogArrowStyles.trackCenterY) < 10,
    "blog prev arrow must align with the row (track) center",
  );
  assert(
    Math.abs(blogArrowStyles.next.centerY - blogArrowStyles.trackCenterY) < 10,
    "blog next arrow must align with the row (track) center",
  );
  assert(blogArrowStyles.prev.left >= blogArrowStyles.hostLeft - 1, "blog prev arrow must not be clipped beyond host left edge");
  assert(blogArrowStyles.next.right <= blogArrowStyles.hostRight + 1, "blog next arrow must not be clipped beyond host right edge");
  assert(blogStart.max > 0, "blog slider has no horizontal overflow");
  assert(blogStart.prevHidden === true, "blog prev arrow must be hidden at start");
  assert(blogStart.nextHidden === false, "blog next arrow must be visible at start");
  assert(blogStart.step > 0, "blog card step must be positive");

  await clickBlogArrow(page, "next");
  const blogAfterNext = await readBlogState(page);
  assert(blogAfterNext.left > blogStart.left + 10, "blog next arrow must move slider");
  const blogCardsMoved = (blogAfterNext.left - blogStart.left) / blogStart.step;
  assert(blogCardsMoved >= 2.5, "blog next arrow must move at least ~3 cards");
  assert(blogCardsMoved <= 4.5, "blog next arrow must not move more than ~4 cards");

  assert(errors.length === 0, `page errors: ${errors.join("; ")}`);
  console.log("slider-smoke: OK");
  await browser.close();
}

run().catch((err) => {
  console.error(`slider-smoke: FAIL\n${err.stack || err.message}`);
  process.exit(1);
});

