/**
 * «Оставить заявку» — локальная модалка #desktop-order-popup (как на оригинале),
 * без редиректов и window.open на внешний сайт. Промежуточный нижний лист не используется.
 *
 * Инлайн на страницах услуг: #sa-inline-lead-root — та же разметка и отправка, что у модалки;
 * заголовок и подзаголовок — из `<template id="sa-inline-lead-meta">` (см. partials services).
 */
(() => {
  const BOTTOM_BAR_MAX_WIDTH = 1024;
  const BODY_FLAG = "leave-cta-open";
  const DESKTOP_MODAL_ID = "desktop-order-popup";
  const DESKTOP_BODY_LOCK = "order-popup-open";
  const INLINE_LEAD_ROOT_ID = "sa-inline-lead-root";
  const INLINE_LEAD_META_ID = "sa-inline-lead-meta";
  const INLINE_FORM_WRAP_ID = "sa-inline-lead-form-wrap";
  const LEAD_API_FALLBACK = "https://serenity.sergeyprus.workers.dev/api/lead";
  const METRIKA_COUNTER_ID = 30205029;
  const METRIKA_FORM_GOAL = "FeedbackFormSend";
  const METRIKA_MESSENGERS_GOAL = "link_tg";
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  /** Публичный канал: экран «Спасибо» (текст про соцсети). Не подменять ссылкой на бота. */
  const TELEGRAM_PUBLIC_CHANNEL_HREF = "https://t.me/serenityagency";
  /** Бот только в блоке «Общаться в мессенджере» у формы заявки. */
  const TELEGRAM_MESSENGER_BOT_HREF = "https://t.me/Serenity_Agency_bot";
  /** Публичная страница VK: футер, бургер, экран «Спасибо». Не путать с vk.me (личные сообщения). */
  const VK_PUBLIC_PAGE_HREF = "https://vk.com/serenity.agency";
  /** vk.me — только иконка VK в блоке «Общаться в мессенджере» у формы заявки. */
  const VK_MESSENGER_HREF = "https://vk.me/serenity.agency";
  /** Иконки мессенджеров inline: без отдельных запросов к img/ui/social/*.svg (медленный канал). */
  const SVG_ICON = {
    telegram:
      '<svg width="46" height="46" viewBox="0 0 46 47" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M30.0678 0.666016H15.9562C3.06661 0.666016 0 3.73263 0 16.5983V30.7098C0 43.5993 3.04276 46.666 15.9322 46.666H30.0438C42.9334 46.666 46 43.6232 46 30.7336V16.6223C46 3.73263 42.9572 0.666016 30.0678 0.666016ZM8.45882 22.1266L34.5992 12.0464C35.792 11.5068 36.9449 12.3339 36.4893 14.1606L32.0382 35.1378C31.7271 36.6298 30.8293 36.9837 29.579 36.2952L22.7984 31.2868L19.5386 34.4566C19.5265 34.4684 19.5144 34.4801 19.5024 34.4917C19.1387 34.8433 18.8372 35.1348 18.1807 35.1348L18.6437 28.2171L18.6407 28.2157H18.6437L31.2244 16.8616C31.7758 16.3722 31.105 16.1318 30.3707 16.5786L14.8428 26.3757L8.13151 24.2821C6.68516 23.8383 6.67484 22.8431 8.45882 22.1266Z" fill="white"/></svg>',
    whatsapp:
      '<svg width="46" height="46" viewBox="0 0 47 46" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><path d="M30.6486 30.0199C31.1228 29.6831 31.5218 29.2495 31.8197 28.747V28.678C32.0228 28.1034 32.0776 27.486 31.979 26.884C31.8869 26.735 31.7052 26.6463 31.422 26.508C31.3555 26.4756 31.2834 26.4404 31.2055 26.401C30.796 26.194 28.7712 25.205 28.4072 25.067C28.0432 24.929 27.7702 24.86 27.4972 25.274C27.2242 25.688 26.428 26.7 26.2005 26.884C25.973 27.068 25.7227 27.091 25.3132 26.884C24.1141 26.3949 23.0062 25.7026 22.0372 24.837C21.1474 24.0017 20.3812 23.0411 19.7622 21.985C19.5347 21.571 19.7622 21.341 19.9442 21.157C20.0841 21.0156 20.2508 20.8063 20.4134 20.6021C20.4624 20.5406 20.5111 20.4796 20.5585 20.421C20.7293 20.2137 20.8674 19.9809 20.968 19.731C21.0239 19.6207 21.053 19.4985 21.053 19.3745C21.053 19.2505 21.0239 19.1283 20.968 19.018C20.9105 18.9134 20.6672 18.3157 20.3995 17.6579C20.1373 17.0137 19.8516 16.3118 19.694 15.959C19.3755 15.246 19.0342 15.246 18.784 15.246H18.147C17.9401 15.2484 17.736 15.2947 17.5479 15.3818C17.3598 15.469 17.1919 15.5951 17.055 15.752C16.5903 16.1934 16.2226 16.7287 15.9757 17.323C15.7288 17.9173 15.6082 18.5575 15.6217 19.202C15.7541 20.7535 16.3313 22.2322 17.2825 23.457C19.033 26.1006 21.4315 28.2402 24.244 29.667C24.9843 30.0042 25.744 30.296 26.519 30.541C27.3427 30.8037 28.2174 30.859 29.067 30.702C29.6356 30.589 30.1744 30.3566 30.6486 30.0199Z" fill="white"/><path fill-rule="evenodd" clip-rule="evenodd" d="M46.084 16.2062C46.084 3.31661 43.0743 0.25 30.3249 0.25H16.3668C3.61727 0.25 0.583984 3.31661 0.583984 16.1822V30.2938C0.583984 43.1832 3.59367 46.25 16.343 46.25H30.3012C43.0507 46.25 46.084 43.2072 46.084 30.3176V16.2062ZM16.054 37.28C18.4408 38.6243 21.1251 39.3364 23.8572 39.35C27.081 39.3273 30.2261 38.3406 32.8963 36.5143C35.5665 34.688 37.6424 32.1038 38.8627 29.087C40.0829 26.0702 40.3928 22.7558 39.7534 19.5612C39.1141 16.3667 37.554 13.4349 35.2696 11.135C32.9853 8.83512 30.0788 7.27007 26.9164 6.63696C23.7539 6.00384 20.4769 6.33097 17.498 7.57715C14.5191 8.82332 11.9715 10.9328 10.1762 13.6399C8.38087 16.347 7.41804 19.5307 7.40898 22.79C7.4317 25.6901 8.21687 28.5318 9.68398 31.024L7.40898 39.58L16.054 37.28Z" fill="white"/></svg>',
    vk: '<svg width="46" height="46" viewBox="0 0 46 47" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><path d="M29.7429 0.667969H15.7848C3.03523 0.667969 0.00195312 3.73458 0.00195312 16.6002V30.7117C0.00195312 43.6012 3.01164 46.668 15.761 46.668H29.7191C42.4687 46.668 45.502 43.6252 45.502 30.7356V16.6242C45.502 3.73458 42.4923 0.667969 29.7429 0.667969ZM36.7337 33.4908H33.416C32.1601 33.4908 31.7809 32.4606 29.5296 30.1846C27.5626 28.268 26.7332 28.0283 26.2355 28.0283C25.5484 28.0283 25.3587 28.22 25.3587 29.1783V32.1971C25.3587 33.0117 25.098 33.4908 22.989 33.4908C20.9424 33.3518 18.9577 32.7232 17.1984 31.6569C15.4391 30.5906 13.9556 29.117 12.8699 27.3575C10.2926 24.1143 8.49932 20.3078 7.63274 16.2408C7.63274 15.7377 7.82227 15.2825 8.77024 15.2825H12.0879C12.941 15.2825 13.2491 15.6658 13.5809 16.5523C15.1923 21.344 17.9413 25.5127 19.0551 25.5127C19.4816 25.5127 19.6712 25.3211 19.6712 24.243V19.3075C19.529 17.0555 18.3441 16.8637 18.3441 16.0492C18.3597 15.8343 18.4576 15.634 18.6169 15.4909C18.7761 15.3477 18.9843 15.273 19.1973 15.2825H24.4109C25.1218 15.2825 25.3587 15.6418 25.3587 16.5043V23.1648C25.3587 23.8836 25.6668 24.1231 25.8801 24.1231C26.3066 24.1231 26.6384 23.8836 27.4204 23.093C29.1009 21.0211 30.474 18.7128 31.4965 16.2408C31.6008 15.9434 31.7987 15.6887 32.0597 15.5156C32.3208 15.3425 32.6307 15.2607 32.9421 15.2825H36.2598C37.2551 15.2825 37.4684 15.7856 37.2551 16.5043C36.0479 19.2375 34.5543 21.8318 32.7999 24.243C32.4445 24.794 32.3023 25.0815 32.7999 25.7283C33.1316 26.2315 34.2929 27.2137 35.0749 28.1481C36.2124 29.2952 37.1569 30.6224 37.8712 32.0773C38.1555 33.0117 37.6816 33.4908 36.7337 33.4908V33.4908Z" fill="white"/></svg>',
  };
  /** First-touch UTM в сессии: ?utm_* / yclid и органика по referrer до отправки формы. */
  const UTM_SESSION_KEY = "serenity_sa_utm_v1";
  const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const OWN_SITE_HOSTS = new Set(["serenity.agency", "static.serenity.agency"]);
  let thankYouAutoCloseTimer = null;
  let inlineLeadRemountTimer = null;

  const appendSiteCalcToComments = (form) => {
    const payload = window.SerenityCalcPayload;
    if (!payload) return;
    const buildMask = window.SerenitySiteCalc?.buildCommentMask;
    if (typeof buildMask !== "function") return;
    const commentField = form.querySelector('textarea[name="comments"]');
    if (!commentField) return;
    const marker = window.SerenitySiteCalc?.COMMENT_MARKER || "Детализация калькулятора:";
    const current = (commentField.value || "").trim();
    const pureUserText = current.includes(marker) ? current.split(marker)[0].trim() : current;
    const calcMask = buildMask(payload);
    if (!calcMask) return;
    commentField.value = pureUserText ? `${pureUserText}\n\n${calcMask}` : calcMask;
  };

  const escapeHtml = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const readStoredUtm = () => {
    try {
      const raw = sessionStorage.getItem(UTM_SESSION_KEY);
      if (!raw) return {};
      const o = JSON.parse(raw);
      return o && typeof o === "object" && !Array.isArray(o) ? o : {};
    } catch {
      return {};
    }
  };

  const writeStoredUtm = (obj) => {
    try {
      sessionStorage.setItem(UTM_SESSION_KEY, JSON.stringify(obj));
    } catch {
      /* private mode / quota */
    }
  };

  const pickUtmScalar = (value) => {
    if (value == null) return "";
    const s = String(value).trim();
    if (!s || s === "(not set)" || s === "(none)") return "";
    return s;
  };

  const normalizeReferrerHost = (hostname) => String(hostname || "").replace(/^www\./, "").toLowerCase();

  const isOwnSiteHost = (hostname) => {
    const h = normalizeReferrerHost(hostname);
    return OWN_SITE_HOSTS.has(h) || h.endsWith(".serenity.agency");
  };

  const inferUtmFromReferrer = (referrerUrl) => {
    if (!referrerUrl) return {};
    try {
      const url = new URL(referrerUrl);
      const host = normalizeReferrerHost(url.hostname);
      if (!host || isOwnSiteHost(host)) return {};
      if (host === "ya.ru" || host.includes("yandex.")) return { utm_source: "yandex", utm_medium: "organic" };
      if (host.includes("google.")) return { utm_source: "google", utm_medium: "organic" };
      if (host === "bing.com" || host.endsWith(".bing.com")) return { utm_source: "bing", utm_medium: "organic" };
      if (host === "duckduckgo.com") return { utm_source: "duckduckgo", utm_medium: "organic" };
      if (host === "go.mail.ru") return { utm_source: "mail", utm_medium: "organic" };
      if (host.includes("rambler.")) return { utm_source: "rambler", utm_medium: "organic" };
      if (host.includes("yahoo.")) return { utm_source: "yahoo", utm_medium: "organic" };
    } catch {
      return {};
    }
    return {};
  };

  const mergeUtmParts = (...parts) => {
    const merged = {};
    for (const part of parts) {
      if (!part || typeof part !== "object") continue;
      for (const k of UTM_KEYS) {
        const v = pickUtmScalar(part[k]);
        if (v) merged[k] = v;
      }
    }
    return merged;
  };

  const inferUtmFromSearchParams = (sp) => {
    const out = {};
    if (!sp) return out;
    for (const k of UTM_KEYS) {
      const v = pickUtmScalar(sp.get(k));
      if (v) out[k] = v;
    }
    if (pickUtmScalar(sp.get("yclid"))) {
      if (!out.utm_source) out.utm_source = "yandex";
      if (!out.utm_medium) out.utm_medium = "cpc";
    }
    if (pickUtmScalar(sp.get("gclid"))) {
      if (!out.utm_source) out.utm_source = "google";
      if (!out.utm_medium) out.utm_medium = "cpc";
    }
    if (pickUtmScalar(sp.get("fbclid"))) {
      if (!out.utm_source) out.utm_source = "facebook";
      if (!out.utm_medium) out.utm_medium = "cpc";
    }
    if (out.utm_source === "yadirect") out.utm_source = "yandex";
    return out;
  };

  const utmFromSearch = (search) => {
    try {
      const sp = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
      return inferUtmFromSearchParams(sp);
    } catch {
      return {};
    }
  };

  /** Как в src/lead-utm.mjs: без меток — direct / none (согласовано с Amo и Метрикой). */
  const finalizeLeadUtm = (utm) => {
    const out = { ...utm };
    if (!out.utm_source) out.utm_source = "direct";
    if (!out.utm_medium) out.utm_medium = "none";
    return out;
  };

  const mergeFirstTouchUtmIntoSession = () => {
    const fromUrl = utmFromSearch(window.location.search || "");
    const fromReferrer = Object.keys(fromUrl).length ? {} : inferUtmFromReferrer(document.referrer || "");
    const incoming = mergeUtmParts(fromReferrer, fromUrl);
    if (!Object.keys(incoming).length) return;
    const stored = readStoredUtm();
    const next = { ...stored };
    for (const k of UTM_KEYS) {
      if (incoming[k] && !next[k]) next[k] = incoming[k];
    }
    writeStoredUtm(next);
  };

  mergeFirstTouchUtmIntoSession();

  const buildOrderPopupInnerShell = ({ formWrapId, titleInnerHtml, leadInnerHtml, serviceLeadVisibilityMarker }) => `
      <div data-v-2ee28934="" data-v-5c138029="" class="order-popup__inner"${
        serviceLeadVisibilityMarker ? ' data-sa-service-lead="1"' : ""
      }>
        <div data-v-2ee28934="" data-v-5c138029="" class="order-popup__content">
          <div data-v-2ee28934="" data-v-5c138029="" class="order-popup__meta">
            <h2 data-v-2ee28934="" data-v-5c138029="">${titleInnerHtml}</h2>
            <p data-v-2ee28934="" data-v-5c138029="" class="lead">${leadInnerHtml}</p>
          </div>
          <div data-v-2ee28934="" data-v-5c138029="" class="contact-form__messenger">
            <div data-v-2ee28934="" data-v-5c138029="" class="contact-form__messenger-title">Общаться в мессенджере</div>
            <div data-v-2ee28934="" data-v-5c138029="" class="contact-form__messenger-links">
              <a data-v-2ee28934="" data-v-5c138029="" target="_blank" rel="noopener noreferrer" href="${TELEGRAM_MESSENGER_BOT_HREF}" aria-label="Telegram">${SVG_ICON.telegram}</a>
              <a data-v-2ee28934="" data-v-5c138029="" target="_blank" rel="noopener noreferrer" href="https://wa.me/15557164521" aria-label="WhatsApp">${SVG_ICON.whatsapp}</a>
              <a data-v-2ee28934="" data-v-5c138029="" target="_blank" rel="noopener noreferrer" href="${VK_MESSENGER_HREF}" aria-label="VK">${SVG_ICON.vk}</a>
            </div>
          </div>
        </div>
        <div data-v-8ad2fcbc="" data-v-5c138029="" id="${formWrapId}" class="form-wrap" style="height: unset;">
          <div data-v-2ee28934="" data-v-5c138029="" class="contact-form__messenger-title contact-form__form-title">Отправить форму заявки</div>
          <form data-v-8ad2fcbc="" action="#" method="post" class="order-popup__form order-form form" novalidate>
            <div data-v-8ad2fcbc="" class="form__grid">
              <div data-v-8ad2fcbc="" class="form__grid-item">
                <label data-v-8ad2fcbc="" class="form__group">
                  <input data-v-8ad2fcbc="" type="text" name="name" placeholder="Имя" class="form__control js-requied" />
                  <span data-v-8ad2fcbc="" class="form__label">Имя *</span>
                </label>
                <label data-v-8ad2fcbc="" class="form__group">
                  <input data-v-8ad2fcbc="" type="text" name="phone" placeholder="Телефон" class="form__control js-requied" />
                  <span data-v-8ad2fcbc="" class="form__label">Телефон *</span>
                </label>
                <label data-v-8ad2fcbc="" class="form__group">
                  <input data-v-8ad2fcbc="" type="email" name="email" placeholder="email" class="form__control" />
                  <span data-v-8ad2fcbc="" class="form__label">Email *</span>
                </label>
                <label data-v-8ad2fcbc="" class="form__group form__comments">
                  <textarea data-v-8ad2fcbc="" name="comments" rows="1" placeholder="Комментарий" autocomplete="off" class="form__control"></textarea>
                  <span data-v-8ad2fcbc="" class="form__label">Комментарий</span>
                </label>
                <label data-v-8ad2fcbc="" class="form__group form__manager" style="display:none">
                  <input data-v-8ad2fcbc="" type="text" name="manager" class="form__control" />
                </label>
              </div>

            </div>
            <div data-v-8ad2fcbc="" class="form__group form__group--sub">
              <button data-v-111f0665="" data-v-8ad2fcbc="" class="btn form__submit" type="submit">
                <span data-v-111f0665="" class="btn__overlay"></span>
                <span data-v-111f0665="" class="btn__text">Отправить</span>
                <svg data-v-111f0665="" class="btn__arrow" width="15" height="13" viewBox="0 0 15 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path data-v-111f0665="" d="M0 5.5H14M14 5.5L8.4 0M14 5.5L8.4 11" transform="translate(0 1)" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </button>
              <label data-v-8ad2fcbc="" class="privacy-check">
                <input data-v-8ad2fcbc="" type="checkbox" name="consent" value="1" required class="privacy-check__control" checked />
                <span data-v-8ad2fcbc="" class="privacy-check__mask"></span>
                <span data-v-8ad2fcbc="" class="privacy-check__text">Я даю согласие <a data-v-8ad2fcbc="" href="https://serenity.agency/privacy.pdf" target="_blank" rel="noopener noreferrer">на обработку персональных данных</a></span>
              </label>
            </div>
            <div data-v-8ad2fcbc="" class="order-popup__form-scroll-spacer" aria-hidden="true"></div>
          </form>
        </div>
      </div>
    `;

  const buildThankYouInnerHtml = (formWrapId, { serviceLeadVisibilityMarker } = {}) => `
      <div class="order-popup__inner" data-v-2ee28934=""${
        serviceLeadVisibilityMarker ? ' data-sa-service-lead="1"' : ""
      }>
        <div id="${formWrapId}" class="form-wrap" data-v-a1ad29aa="" data-v-2ee28934="">
          <div id="form-success" class="form-success__inner" data-v-a1ad29aa="">
            <div class="form-success__inner-wrap" data-v-a1ad29aa="">
              <div class="form-success__message" data-v-a1ad29aa="">
                <h2 class="form-success__title title" data-v-a1ad29aa="">Спасибо, наш новый друг!</h2>
                <p data-v-a1ad29aa="">Уже рассматриваем вашу заявку всей командой.<br data-v-a1ad29aa="">
                И&nbsp;совсем скоро с&nbsp;вами свяжемся.<br data-v-a1ad29aa="">
                А&nbsp;пока давайте продолжим дружбу
                в&nbsp;социальных сетях:</p>
              </div>
              <div class="social form-success__socials" data-v-a1ad29aa="">
                <a class="social__link" data-v-a1ad29aa="" target="_blank" rel="noopener noreferrer" href="${TELEGRAM_PUBLIC_CHANNEL_HREF}" aria-label="Telegram">${SVG_ICON.telegram}</a>
                <a class="social__link" data-v-a1ad29aa="" target="_blank" rel="noopener noreferrer" href="${VK_PUBLIC_PAGE_HREF}" aria-label="VK">${SVG_ICON.vk}</a>
                <a class="social__link" data-v-a1ad29aa="" target="_blank" rel="noopener noreferrer" href="https://www.instagram.com/serenity.agency/" aria-label="Instagram">
                  <svg width="46" height="47" viewBox="0 0 46 47" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Instagram">
                    <rect x="0.5" y="1" width="45" height="45" rx="10" fill="white"></rect>
                    <rect x="11.5" y="12" width="23" height="23" rx="7.5" stroke="#151516" stroke-width="2.4"></rect>
                    <circle cx="23" cy="23.5" r="5.5" stroke="#151516" stroke-width="2.4"></circle>
                    <circle cx="30.2" cy="15.8" r="1.8" fill="#151516"></circle>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

  const getUtmForLeadSubmit = () => {
    const stored = readStoredUtm();
    const current = utmFromSearch(window.location.search || "");
    const merged = {};
    for (const k of UTM_KEYS) {
      const v = stored[k] || current[k];
      if (v) merged[k] = v;
    }
    return finalizeLeadUtm(merged);
  };

  const isDesktop = () => window.innerWidth > BOTTOM_BAR_MAX_WIDTH;

  const isCareerGoalsSuppressedPage = () => {
    const path = String(window.location.pathname || "").replace(/\/+$/, "").toLowerCase();
    return path === "/career" || path.startsWith("/career/");
  };

  const reachMetrikaGoal = (goalName) => {
    if (isCareerGoalsSuppressedPage()) return;
    if (typeof window.ym !== "function") return;
    try {
      window.ym(METRIKA_COUNTER_ID, "reachGoal", goalName);
    } catch (err) {
      console.error(err);
    }
  };

  const isMessengerGoalHref = (href) => {
    if (!href) return false;
    let url = null;
    try {
      url = new URL(href, window.location.href);
    } catch (err) {
      return false;
    }
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const path = url.pathname.replace(/\/+$/, "").toLowerCase();
    if (host === "vk.me" && path === "/serenity.agency") return true;
    if (host === "wa.me" && path === "/15557164521") return true;
    if (host === "api.whatsapp.com" && path === "/send" && url.searchParams.get("phone") === "15557164521") return true;
    if ((host === "t.me" || host === "telegram.me") && path === "/serenity_agency_bot") return true;
    return false;
  };

  const isMessengerGoalLink = (link) => {
    if (!link || !isMessengerGoalHref(link.getAttribute("href") || link.href)) return false;
    if (link.closest(".contact-form__messenger-links")) return true;
    return !!link.closest("header .navigation-new__buttons");
  };

  const initMessengerGoalTracking = () => {
    document.addEventListener(
      "click",
      (e) => {
        const link = e.target?.closest?.("a[href]");
        if (!isMessengerGoalLink(link)) return;
        reachMetrikaGoal(METRIKA_MESSENGERS_GOAL);
      },
      true,
    );
  };

  const getBottomBar = () => {
    const wrap = document.querySelector(".btns.white");
    if (!wrap) return null;
    const modal = wrap.nextElementSibling;
    if (!modal || !modal.classList.contains("btns__modal")) return null;
    const trigger = wrap.querySelector(".btns__item_open");
    const blur = wrap.querySelector(".btns__blur");
    if (!trigger) return null;
    return { wrap, modal, trigger, blur };
  };

  const setBottomSheetOpen = (open) => {
    const b = getBottomBar();
    if (!b) return;
    document.body.classList.toggle(BODY_FLAG, open);
    b.wrap.classList.toggle("active", open);
    b.modal.classList.toggle("active", open);
  };

  const closeBottomSheetIfOpen = () => {
    const b = getBottomBar();
    if (!b || !b.wrap.classList.contains("active")) return false;
    setBottomSheetOpen(false);
    return true;
  };

  const showThankYouScreen = (modal) => {
    if (!modal) return;
    modal.classList.add("is-thank-you");
    modal.innerHTML = `
      <div class="modal-close order-popup__cross" data-v-2ee28934="" aria-label="Закрыть"></div>
      ${buildThankYouInnerHtml("form", { serviceLeadVisibilityMarker: false })}
    `;
    modal.querySelector(".modal-close")?.addEventListener("click", closeDesktopModal);
    modal.scrollTop = 0;
    const formWrap = modal.querySelector("#form");
    if (formWrap) {
      const pad = 200;
      formWrap.style.height = `${Math.max(Math.round(modal.clientHeight - pad), 320)}px`;
    }
    requestAnimationFrame(() => syncDesktopModalScrollable(modal));
    if (thankYouAutoCloseTimer) clearTimeout(thankYouAutoCloseTimer);
    thankYouAutoCloseTimer = setTimeout(() => {
      thankYouAutoCloseTimer = null;
      closeDesktopModal();
    }, 15000);
  };

  const showThankYouInline = (root) => {
    if (!root) return;
    if (inlineLeadRemountTimer) {
      clearTimeout(inlineLeadRemountTimer);
      inlineLeadRemountTimer = null;
    }
    root.classList.add("is-thank-you");
    root.innerHTML = buildThankYouInnerHtml(INLINE_FORM_WRAP_ID, { serviceLeadVisibilityMarker: true });
    root.scrollTop = 0;
    const formWrap = root.querySelector(`#${INLINE_FORM_WRAP_ID}`);
    if (formWrap) {
      const rootStyle = getComputedStyle(root);
      const padY =
        (parseFloat(rootStyle.paddingTop) || 0) + (parseFloat(rootStyle.paddingBottom) || 0);
      const innerH = Math.max(Math.round(root.clientHeight - padY), 280);
      formWrap.style.height = `${innerH}px`;
      formWrap.style.minHeight = `${innerH}px`;
    }
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("sa-service-lead-dom-update"));
    });
    inlineLeadRemountTimer = setTimeout(() => {
      inlineLeadRemountTimer = null;
      root.classList.remove("is-thank-you");
      mountInlineLeadForm({ remount: true });
    }, 15000);
  };

  const closeDesktopModal = () => {
    if (thankYouAutoCloseTimer) {
      clearTimeout(thankYouAutoCloseTimer);
      thankYouAutoCloseTimer = null;
    }
    document.documentElement.classList.remove(DESKTOP_BODY_LOCK);
    document.body.classList.remove(DESKTOP_BODY_LOCK);
    const modal = document.getElementById(DESKTOP_MODAL_ID);
    if (modal) modal.remove();
  };

  const syncDesktopModalScrollable = (modal) => {
    if (!modal || modal.id !== DESKTOP_MODAL_ID) return;
    modal.classList.remove("is-scrollable");
    requestAnimationFrame(() => {
      const needsScroll = modal.scrollHeight > modal.clientHeight + 1;
      modal.classList.toggle("is-scrollable", needsScroll);
    });
  };

  const validateControl = (control) => {
    if (!control) return true;
    const name = control.getAttribute("name");
    const value = String(control.value || "").trim();
    if (name === "name" || name === "phone") return value.length >= 2;
    if (name === "email") return EMAIL_RE.test(value);
    return true;
  };

  const setControlInvalidState = (control, invalid) => {
    if (!control) return;
    const group = control.closest(".form__group");
    control.classList.toggle("is-invalid", invalid);
    if (group) group.classList.toggle("error", invalid);
  };

  const isConsentAccepted = (form) => {
    const consent = form?.querySelector(".privacy-check__control");
    return !consent || consent.checked;
  };

  const setConsentInvalidState = (form, invalid) => {
    const consent = form?.querySelector(".privacy-check__control");
    if (!consent) return;
    const label = consent.closest(".privacy-check");
    consent.classList.toggle("is-invalid", invalid);
    if (label) label.classList.toggle("is-invalid", invalid);
  };

  const syncSubmitAvailability = (form, submit) => {
    if (!form || !submit) return false;
    const requiredControls = [
      form.querySelector('input[name="name"]'),
      form.querySelector('input[name="phone"]'),
      form.querySelector('input[name="email"]'),
    ].filter(Boolean);
    const valid = requiredControls.every((control) => validateControl(control)) && isConsentAccepted(form);
    submit.classList.toggle("is-disabled", !valid);
    submit.setAttribute("aria-disabled", valid ? "false" : "true");
    return valid;
  };

  const getLeadApiEndpoints = () => ["/api/lead", LEAD_API_FALLBACK];

  const buildLeadFormData = (form) => {
    const data = new FormData(form);
    data.set("source", window.location.href);
    data.set("referrer", document.referrer || "");
    const utm = getUtmForLeadSubmit();
    for (const k of UTM_KEYS) {
      data.set(k, utm[k] || "");
    }
    return data;
  };

  /** POST заявки; принимает уже собранный FormData (форма может быть удалена из DOM раньше ответа). */
  const submitLeadFormPayload = async (data) => {
    let lastError = null;
    for (const endpoint of getLeadApiEndpoints()) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: data,
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.success) return result;
        const error = new Error("lead_submit_failed");
        error.result = result;
        error.status = response.status;
        lastError = error;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("lead_submit_failed");
  };

  const ensureSubmitErrorNode = (form) => {
    let node = form.querySelector(".form__submit-error");
    if (!node) {
      node = document.createElement("div");
      node.className = "form__submit-error";
      node.setAttribute("aria-live", "polite");
      form.querySelector(".form__group--sub")?.appendChild(node);
    }
    return node;
  };

  const showSubmitError = (form, message) => {
    const node = ensureSubmitErrorNode(form);
    if (node) node.textContent = message;
  };

  const clearSubmitError = (form) => {
    const node = form.querySelector(".form__submit-error");
    if (node) node.textContent = "";
  };

  const mountInlineLeadForm = (opts = {}) => {
    const root = document.getElementById(INLINE_LEAD_ROOT_ID);
    if (!root) return;
    if (!opts.remount && root.querySelector("form.order-popup__form")) return;
    if (inlineLeadRemountTimer) {
      clearTimeout(inlineLeadRemountTimer);
      inlineLeadRemountTimer = null;
    }
    const tmpl = document.getElementById(INLINE_LEAD_META_ID);
    let titleInnerHtml = "Хочу работать с&nbsp;вами";
    let leadInnerHtml = "Оставьте заявку, и мы в скором времени с вами свяжемся обсудить ваши задачи.";
    if (tmpl && tmpl.tagName === "TEMPLATE") {
      const titleSrc = tmpl.content.querySelector('[data-role="title"]');
      const leadSrc = tmpl.content.querySelector('[data-role="lead"]');
      if (titleSrc?.innerHTML?.trim()) {
        titleInnerHtml = titleSrc.innerHTML.trim();
      } else if (titleSrc?.textContent?.trim()) {
        titleInnerHtml = escapeHtml(titleSrc.textContent.trim());
      }
      if (leadSrc?.innerHTML?.trim()) leadInnerHtml = leadSrc.innerHTML.trim();
    }
    root.classList.remove("is-thank-you");
    root.innerHTML = buildOrderPopupInnerShell({
      formWrapId: INLINE_FORM_WRAP_ID,
      titleInnerHtml,
      leadInnerHtml,
      serviceLeadVisibilityMarker: true,
    });
    /* Как у #desktop-order-popup: селекторы snapshot.bundle (.newModal .order-popup__content и т.д.) */
    root.classList.add("darktheme", "newModal");
    initDesktopFormBehavior(root);
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("sa-service-lead-dom-update"));
    });
  };

  const initDesktopFormBehavior = (formHost) => {
    const form = formHost.querySelector("form.order-popup__form");
    if (!form) return;
    const submit = form.querySelector(".form__submit");

    const controls = [...form.querySelectorAll(".form__control")];
    controls.forEach((control) => {
      const sync = () => {
        const group = control.closest(".form__group");
        if (!group) return;
        group.classList.toggle("is-filled", String(control.value || "").trim().length > 0);
      };
      const autosize = () => {
        if (control.tagName !== "TEXTAREA") return;
        const minHeight = parseFloat(getComputedStyle(control).minHeight) || 54;
        control.style.height = "auto";
        control.style.height = `${Math.max(control.scrollHeight, minHeight)}px`;
        syncDesktopModalScrollable(formHost);
      };
      control.addEventListener("focus", () => control.closest(".form__group")?.classList.add("is-focused"));
      control.addEventListener("blur", () => control.closest(".form__group")?.classList.remove("is-focused"));
      control.addEventListener("input", () => {
        sync();
        autosize();
        if (form.classList.contains("is-submitted")) {
          setControlInvalidState(control, !validateControl(control));
        } else {
          setControlInvalidState(control, false);
        }
        syncSubmitAvailability(form, submit);
      });
      sync();
      autosize();
    });

    const consent = form.querySelector(".privacy-check__control");
    if (consent) {
      consent.addEventListener("change", () => {
        if (form.classList.contains("is-submitted")) {
          setConsentInvalidState(form, !isConsentAccepted(form));
        } else {
          setConsentInvalidState(form, false);
        }
        syncSubmitAvailability(form, submit);
      });
    }

    syncSubmitAvailability(form, submit);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearSubmitError(form);
      form.classList.add("is-submitted");
      const requiredControls = [
        form.querySelector('input[name="name"]'),
        form.querySelector('input[name="phone"]'),
        form.querySelector('input[name="email"]'),
      ].filter(Boolean);
      let invalid = false;
      for (const control of requiredControls) {
        const bad = !validateControl(control);
        setControlInvalidState(control, bad);
        if (bad) invalid = true;
      }
      const invalidConsent = !isConsentAccepted(form);
      setConsentInvalidState(form, invalidConsent);
      const canSubmit = syncSubmitAvailability(form, submit);
      if (invalid || invalidConsent || !canSubmit) {
        if (invalidConsent) {
          showSubmitError(form, "Нужно согласие на обработку персональных данных.");
        }
        return;
      }
      const desktopModal = form.closest(`#${DESKTOP_MODAL_ID}`);
      const inlineRoot = form.closest(`#${INLINE_LEAD_ROOT_ID}`);
      appendSiteCalcToComments(form);
      const payload = buildLeadFormData(form);
      reachMetrikaGoal(METRIKA_FORM_GOAL);
      if (desktopModal) showThankYouScreen(desktopModal);
      else if (inlineRoot) showThankYouInline(inlineRoot);
      void submitLeadFormPayload(payload).catch((err) => {
        console.error(err);
      });
    });

    if (submit && isDesktop()) {
      submit.style.setProperty("width", "250px", "important");
      submit.style.setProperty("min-width", "200px", "important");
      submit.style.setProperty("height", "46px", "important");
      submit.style.setProperty("padding", "0 24px", "important");
      const overlay = submit.querySelector(".btn__overlay");
      const syncOverlayPosition = (e) => {
        if (!overlay) return;
        const rect = submit.getBoundingClientRect();
        overlay.style.left = `${e.clientX - rect.left}px`;
        overlay.style.top = `${e.clientY - rect.top}px`;
      };
      submit.addEventListener("pointerenter", syncOverlayPosition);
      submit.addEventListener("pointermove", syncOverlayPosition);
    }
  };

  const openOrderModal = () => {
    if (document.getElementById(DESKTOP_MODAL_ID)) return;

    const modal = document.createElement("section");
    modal.id = DESKTOP_MODAL_ID;
    modal.className = "modal order-popup darktheme newModal";
    modal.setAttribute("data-v-2ee28934", "");
    modal.setAttribute("data-v-5c138029", "");
    modal.innerHTML = `
      <div data-v-2ee28934="" data-v-5c138029="" class="modal-close order-popup__cross" aria-label="Закрыть"></div>
      ${buildOrderPopupInnerShell({
        formWrapId: "form",
        titleInnerHtml: "Хочу работать с&nbsp;вами",
        leadInnerHtml: "Оставьте заявку, и мы в скором времени с вами свяжемся обсудить ваши задачи.",
        serviceLeadVisibilityMarker: false,
      })}
    `;

    modal.querySelector(".modal-close")?.addEventListener("click", closeDesktopModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeDesktopModal();
    });
    initDesktopFormBehavior(modal);
    document.body.appendChild(modal);
    document.documentElement.classList.add(DESKTOP_BODY_LOCK);
    document.body.classList.add(DESKTOP_BODY_LOCK);
    syncDesktopModalScrollable(modal);
  };

  const initHeaderFloatingCta = () => {
    const el = document.querySelector("#body.body-application .footer__link.application");
    if (!el) return;
    let openedByTouch = false;
    const openFromCta = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openOrderModal();
    };
    el.addEventListener(
      "touchend",
      (e) => {
        openedByTouch = true;
        openFromCta(e);
      },
      { passive: false },
    );
    el.addEventListener("click", (e) => {
      if (openedByTouch) {
        openedByTouch = false;
        return;
      }
      openFromCta(e);
    });
  };

  const initFullscreenMenuButton = () => {
    const btn = document.querySelector("header button.navigation-new__button");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      // closeMenu в app.js тоже сработает — модалку откроем на следующем кадре
      requestAnimationFrame(() => {
        openOrderModal();
      });
    });
  };

  const initInModalInpageAction = () => {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a.btns__inpage-action");
      if (!a) return;
      e.preventDefault();
      openOrderModal();
    });
  };

  const initBottomBar = () => {
    const b = getBottomBar();
    if (!b) return;

    b.trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openOrderModal();
    });

    if (b.blur) {
      b.blur.addEventListener("click", () => setBottomSheetOpen(false));
    }

    let lastW = window.innerWidth;
    window.addEventListener("resize", () => {
      const w = window.innerWidth;
      if (lastW <= BOTTOM_BAR_MAX_WIDTH && w > BOTTOM_BAR_MAX_WIDTH) {
        setBottomSheetOpen(false);
      } else if (lastW > BOTTOM_BAR_MAX_WIDTH && w <= BOTTOM_BAR_MAX_WIDTH) {
        closeDesktopModal();
      }
      lastW = w;
    });
  };

  const initServiceLeadFloatingCtaHide = () => {
    /* Маркер — на .order-popup__inner внутри #sa-inline-lead-root (см. buildOrderPopupInnerShell): не на #sa-inline-lead-root,
     * иначе min-height + flex оболочки дают «хвост» в viewport после скролла мимо формы и CTA остаётся скрыт. */
    const getNodes = () => [...document.querySelectorAll("[data-sa-service-lead]")];
    if (!document.getElementById(INLINE_LEAD_ROOT_ID)) return;

    const MIN_OVERLAP_FRAC = 0.018;
    const MIN_OVERLAP_PX = 40;
    /**
     * Скрываем CTA только пока в viewport видно «существенную» долю .order-popup__inner по высоте.
     * Чем выше порог — тем раньше по скроллу снимается sa-service-lead-in-view (кнопка появляется при большей части формы ещё в кадре).
     */
    const minMeaningfulVisibleHeight = (r) => Math.max(120, Math.min(240, r.height * 0.42));

    let scheduled = false;
    const syncBody = () => {
      scheduled = false;
      const nodes = getNodes();
      if (!nodes.length) {
        document.body.classList.remove("sa-service-lead-in-view");
        return;
      }
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      const vw = window.innerWidth || document.documentElement.clientWidth || 0;
      let any = false;
      for (const el of nodes) {
        if (!el.isConnected) continue;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        const ih = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        const iw = Math.min(r.right, vw) - Math.max(r.left, 0);
        if (ih <= 0 || iw <= 0) continue;
        if (ih < minMeaningfulVisibleHeight(r)) continue;
        if (iw < 72) continue;
        const intersectArea = ih * iw;
        const boxArea = Math.max(1, r.width * r.height);
        const frac = intersectArea / boxArea;
        if (frac < MIN_OVERLAP_FRAC && Math.min(ih, iw) < MIN_OVERLAP_PX) continue;
        any = true;
        break;
      }
      document.body.classList.toggle("sa-service-lead-in-view", any);
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(syncBody);
    };

    const isScrollableBox = (node) => {
      if (!node || node === document) return false;
      try {
        const st = getComputedStyle(node);
        const oy = st.overflowY;
        const ox = st.overflowX;
        const y =
          (oy === "auto" || oy === "scroll" || oy === "overlay") && node.scrollHeight > node.clientHeight + 1;
        const x =
          (ox === "auto" || ox === "scroll" || ox === "overlay") && node.scrollWidth > node.clientWidth + 1;
        return y || x;
      } catch {
        return false;
      }
    };

    const collectScrollRoots = () => {
      const set = new Set();
      set.add(document.documentElement);
      set.add(document.body);
      const nuxt = document.getElementById("__nuxt");
      if (nuxt) set.add(nuxt);
      const pc = document.querySelector(".page-constructor");
      if (pc) {
        for (let p = pc; p; p = p.parentElement) {
          if (isScrollableBox(p)) set.add(p);
        }
      }
      for (const el of getNodes()) {
        if (!el?.isConnected) continue;
        for (let p = el; p; p = p.parentElement) {
          if (isScrollableBox(p)) set.add(p);
        }
      }
      return [...set];
    };

    let scrollRoots = [];
    const onScrollRoot = () => schedule();
    const rebindScrollRoots = () => {
      for (const n of scrollRoots) {
        try {
          n.removeEventListener("scroll", onScrollRoot);
        } catch {
          /* ignore */
        }
      }
      scrollRoots = collectScrollRoots();
      for (const n of scrollRoots) {
        try {
          n.addEventListener("scroll", onScrollRoot, { passive: true });
        } catch {
          /* ignore */
        }
      }
    };

    let io = null;
    const rebuildIo = () => {
      if (typeof IntersectionObserver !== "function") return;
      if (io) io.disconnect();
      io = new IntersectionObserver(schedule, { root: null, threshold: 0 });
      for (const el of getNodes()) {
        if (el?.isConnected) io.observe(el);
      }
    };

    let ro = null;
    const rebuildRo = () => {
      if (typeof ResizeObserver !== "function") return;
      if (ro) ro.disconnect();
      try {
        ro = new ResizeObserver(schedule);
        for (const el of getNodes()) {
          if (el?.isConnected) ro.observe(el);
        }
      } catch {
        ro = null;
      }
    };

    const onDomUpdate = () => {
      rebindScrollRoots();
      rebuildIo();
      rebuildRo();
      schedule();
    };

    window.addEventListener("sa-service-lead-dom-update", onDomUpdate);

    /* Скролл: window + documentElement + document/capture + #__nuxt + предки с overflow (Chrome: скролл не на window). */
    document.addEventListener("scroll", schedule, { passive: true, capture: true });
    document.addEventListener("wheel", schedule, { passive: true, capture: true });
    window.addEventListener("scroll", schedule, { passive: true });
    document.documentElement.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const nuxtRoot = document.getElementById("__nuxt");
    if (nuxtRoot) nuxtRoot.addEventListener("scroll", schedule, { passive: true });

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("scroll", schedule, { passive: true });
      vv.addEventListener("resize", schedule);
    }

    if ("onscrollend" in window) {
      window.addEventListener("scrollend", schedule, { passive: true });
      document.addEventListener("scrollend", schedule, { passive: true, capture: true });
    }

    window.addEventListener(
      "pageshow",
      (e) => {
        if (e.persisted) schedule();
      },
      { passive: true },
    );

    rebindScrollRoots();
    rebuildIo();
    rebuildRo();

    schedule();
    requestAnimationFrame(() => requestAnimationFrame(syncBody));
  };

  const initEscape = () => {
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Escape") return;
        if (closeBottomSheetIfOpen()) {
          e.preventDefault();
          return;
        }
        if (document.getElementById(DESKTOP_MODAL_ID)) {
          closeDesktopModal();
          e.preventDefault();
        }
      },
      true,
    );
  };

  const run = () => {
    initMessengerGoalTracking();
    initInModalInpageAction();
    initServiceLeadFloatingCtaHide();
    mountInlineLeadForm();
    initHeaderFloatingCta();
    initFullscreenMenuButton();
    initBottomBar();
    initEscape();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
