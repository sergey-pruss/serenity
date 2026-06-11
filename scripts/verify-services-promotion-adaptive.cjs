#!/usr/bin/env node
/**
 * Адаптивная проверка блока «Продвижение» и карточки «Фото и видео» на /services.
 * ORIGIN по умолчанию: http://127.0.0.1:8895
 */
const { chromium } = require('playwright');

const ORIGIN = (process.env.ORIGIN || 'http://127.0.0.1:8895').replace(/\/$/, '');
const URL = `${ORIGIN}/services`;

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'tablet-wide', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
];

const PROMO_IMG_HREFS = [
  '/kompleksnoye-prodvizheniye',
  '/smm_marketing',
  '/kontekstnaya_reklama',
  '/targeting',
  '/seo',
];

const PROMO_TEXT_HREFS = [
  '/prodvizhenie-yandex-karty-2gis',
  '/prodvizhenie-statey-v-dzene-i-promostranitsah',
  '/end-to-end-analytics',
  '/business-analytics',
];

async function auditPromotion(page) {
  return page.evaluate(
    ({ promoImgHrefs, promoTextHrefs }) => {
      const section = document.getElementById('services-promotion')?.closest('section');
      if (!section) return { error: 'section #services-promotion not found' };

      const slides = [...section.querySelectorAll('.services__slide')];
      const hrefOrder = slides.flatMap((slide) =>
        [...slide.querySelectorAll('a.services__card-container')].map((a) => {
          try {
            return new URL(a.getAttribute('href'), location.origin).pathname;
          } catch {
            return a.getAttribute('href');
          }
        }),
      );

      const cards = [...section.querySelectorAll('a.services__card-container')].map((a) => {
        const href = a.getAttribute('href');
        const isImg = a.classList.contains('services__card-container-img');
        const isText = a.classList.contains('services__card-container-text');
        const title = a.querySelector('h3')?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const visibleImg = [...a.querySelectorAll('img.services__card-img')].find((img) => {
          const r = img.getBoundingClientRect();
          const s = getComputedStyle(img);
          return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
        });
        return {
          href,
          title,
          isImg,
          isText,
          visibleImg: visibleImg
            ? {
                src: visibleImg.currentSrc || visibleImg.src,
                ok: visibleImg.complete && visibleImg.naturalWidth > 0,
                variant: [...visibleImg.classList].find((c) => /_(desc|tablet|mobile)$/.test(c)) || null,
              }
            : null,
        };
      });

      const imgCards = cards.filter((c) => promoImgHrefs.includes(c.href));
      const textCards = cards.filter((c) => promoTextHrefs.includes(c.href));

      const problems = [];

      const expectedOrder = [...promoImgHrefs, ...promoTextHrefs];
      if (hrefOrder.join('|') !== expectedOrder.join('|')) {
        problems.push(`order: expected ${expectedOrder.join(' → ')}, got ${hrefOrder.join(' → ')}`);
      }

      for (const href of promoImgHrefs) {
        const card = cards.find((c) => c.href === href);
        if (!card) problems.push(`missing IMG card ${href}`);
        else if (!card.isImg) problems.push(`${href}: expected IMG, got TEXT`);
        else if (!card.visibleImg) problems.push(`${href}: no visible image at this viewport`);
        else if (!card.visibleImg.ok) problems.push(`${href}: broken visible image ${card.visibleImg.src}`);
      }

      for (const href of promoTextHrefs) {
        const card = cards.find((c) => c.href === href);
        if (!card) problems.push(`missing TEXT card ${href}`);
        else if (!card.isText) problems.push(`${href}: expected TEXT half-card, got IMG`);
        else if (card.visibleImg) problems.push(`${href}: TEXT card must not show image`);
      }

      return { hrefOrder, cards, problems };
    },
    { promoImgHrefs: PROMO_IMG_HREFS, promoTextHrefs: PROMO_TEXT_HREFS },
  );
}

async function auditVideoCard(page) {
  return page.evaluate(() => {
    const section = document.getElementById('services-branding')?.closest('section');
    const link = section?.querySelector('a[href="/services/video"]');
    if (!link) return { error: 'video card not found' };
    const isImg = link.classList.contains('services__card-container-img');
    const visibleImg = [...link.querySelectorAll('img.services__card-img')].find((img) => {
      const r = img.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const problems = [];
    if (!isImg) problems.push('video: expected IMG card');
    if (!visibleImg) problems.push('video: no visible image at this viewport');
    else if (!visibleImg.complete || visibleImg.naturalWidth === 0) {
      problems.push(`video: broken image ${visibleImg.currentSrc || visibleImg.src}`);
    }
    return {
      ok: problems.length === 0,
      problems,
      variant: visibleImg ? [...visibleImg.classList].find((c) => /_(desc|tablet|mobile)$/.test(c)) : null,
      src: visibleImg ? (visibleImg.currentSrc || visibleImg.src).split('/').pop() : null,
    };
  });
}

async function scrollSectionIntoView(page, id) {
  await page.evaluate((sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ block: 'start' });
  }, id);
  await page.waitForTimeout(250);
}

async function main() {
  let browser;
  const failures = [];

  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    console.error('verify-services-promotion-adaptive: Playwright browser missing — run: npx playwright install chromium');
    process.exit(1);
  }

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.width <= 390 ? 2 : 1,
      isMobile: vp.width <= 768,
    });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });

    await scrollSectionIntoView(page, 'services-promotion');
    const promo = await auditPromotion(page);

    await scrollSectionIntoView(page, 'services-branding');
    // Пролистать слайдер брендинга к «Фото и видео»
    await page.evaluate(() => {
      const section = document.getElementById('services-branding')?.closest('section');
      const next = section?.querySelector('.swiper-button-next');
      for (let i = 0; i < 4; i += 1) next?.click();
      section?.querySelector('a[href="/services/video"]')?.scrollIntoView({ block: 'center', inline: 'center' });
    });
    await page.waitForTimeout(300);
    const video = await auditVideoCard(page);

    const shotDir = 'tmp/verify-services-adaptive';
    const fs = require('fs');
    fs.mkdirSync(shotDir, { recursive: true });
    await page.screenshot({ path: `${shotDir}/${vp.name}-promotion.png`, fullPage: false });

    const vpProblems = [...(promo.problems || []), ...(video.problems || [])];
    if (promo.error) vpProblems.push(promo.error);
    if (video.error) vpProblems.push(video.error);

    if (vpProblems.length) {
      failures.push({ viewport: vp.name, size: `${vp.width}×${vp.height}`, problems: vpProblems });
      console.error(`FAIL ${vp.name} (${vp.width}×${vp.height}):`);
      for (const p of vpProblems) console.error(`  - ${p}`);
    } else {
      const variants = promo.cards
        ?.filter((c) => c.visibleImg)
        .map((c) => `${c.title.split(' ')[0]}→${c.visibleImg.variant?.replace('services__card-img_', '')}`)
        .join(', ');
      console.log(
        `OK ${vp.name} (${vp.width}×${vp.height}): promo ${promo.hrefOrder?.length} cards, img variants: ${variants || 'n/a'}, video→${video.variant?.replace('services__card-img_', '')}`,
      );
    }

    await context.close();
  }

  await browser.close();

  if (failures.length) {
    console.error(`\nverify-services-promotion-adaptive: ${failures.length} viewport(s) failed`);
    process.exit(1);
  }

  console.log('\nverify-services-promotion-adaptive: OK (all viewports)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
