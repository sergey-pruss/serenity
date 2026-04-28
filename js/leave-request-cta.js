/**
 * «Оставить заявку» — локальная модалка #desktop-order-popup (как на оригинале),
 * без редиректов и window.open на внешний сайт. Промежуточный нижний лист не используется.
 */
(() => {
  const BOTTOM_BAR_MAX_WIDTH = 1024;
  const BODY_FLAG = "leave-cta-open";
  const DESKTOP_MODAL_ID = "desktop-order-popup";
  const DESKTOP_BODY_LOCK = "order-popup-open";
  const LEAD_API_FALLBACK = "https://serenity.sergeyprus.workers.dev/api/lead";
  let thankYouAutoCloseTimer = null;

  const isDesktop = () => window.innerWidth > BOTTOM_BAR_MAX_WIDTH;

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
    /* Как на serenity.agency после submit: #form + form-success (не блок мессенджеров формы). */
    modal.innerHTML = `
      <div class="modal-close order-popup__cross" data-v-2ee28934="" aria-label="Закрыть"></div>
      <div class="order-popup__inner" data-v-2ee28934="">
        <div id="form" class="form-wrap" data-v-a1ad29aa="" data-v-2ee28934="">
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
                <a class="social__link" data-v-a1ad29aa="" target="_blank" rel="noopener noreferrer" href="https://t.me/serenityagency" aria-label="Telegram"><img data-v-a1ad29aa="" src="img/services/production/svg/telegram.svg" alt="Telegram" loading="eager" decoding="async"></a>
                <a class="social__link" data-v-a1ad29aa="" target="_blank" rel="noopener noreferrer" href="https://vk.com/serenity.agency" aria-label="VK"><img data-v-a1ad29aa="" src="img/services/production/svg/vk.svg" alt="VK" loading="eager" decoding="async"></a>
                <a class="social__link" data-v-a1ad29aa="" target="_blank" rel="noopener noreferrer" href="https://www.instagram.com/serenity.agency/" aria-label="Instagram"><img data-v-a1ad29aa="" src="img/services/production/svg/insta.svg" alt="Instagram" loading="eager" decoding="async"></a>
              </div>
            </div>
          </div>
        </div>
      </div>
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
    if (!modal) return;
    modal.classList.remove("is-scrollable");
    requestAnimationFrame(() => {
      const needsScroll = modal.scrollHeight > modal.clientHeight + 1;
      modal.classList.toggle("is-scrollable", needsScroll);
    });
  };

  const setSubmitPending = (submit, pending) => {
    if (!submit) return;
    submit.disabled = pending;
    submit.classList.toggle("is-pending", pending);
    const text = submit.querySelector(".btn__text");
    if (text) text.textContent = pending ? "Отправляем" : "Отправить";
  };

  const getLeadApiEndpoints = () => {
    if (window.location.hostname === "static.serenity.agency") {
      return [LEAD_API_FALLBACK, "/api/lead"];
    }
    return ["/api/lead"];
  };

  const submitLeadForm = async (form) => {
    let lastError = null;
    for (const endpoint of getLeadApiEndpoints()) {
      try {
        const data = new FormData(form);
        data.set("source", window.location.href);
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

  const initDesktopFormBehavior = (modal) => {
    const form = modal.querySelector("form.order-popup__form");
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
        syncDesktopModalScrollable(modal);
      };
      control.addEventListener("focus", () => control.closest(".form__group")?.classList.add("is-focused"));
      control.addEventListener("blur", () => control.closest(".form__group")?.classList.remove("is-focused"));
      control.addEventListener("input", () => {
        sync();
        autosize();
        control.classList.remove("is-invalid");
      });
      sync();
      autosize();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearSubmitError(form);
      const name = form.querySelector('input[name="name"]');
      const phone = form.querySelector('input[name="phone"]');
      const email = form.querySelector('input[name="email"]');
      let invalid = false;
      if (name) {
        const bad = String(name.value || "").trim().length < 2;
        name.classList.toggle("is-invalid", bad);
        if (bad) invalid = true;
      }
      if (phone) {
        const bad = String(phone.value || "").trim().length < 2;
        phone.classList.toggle("is-invalid", bad);
        if (bad) invalid = true;
      }
      if (email) {
        const emailValue = String(email.value || "").trim();
        const bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
        email.classList.toggle("is-invalid", bad);
        if (bad) invalid = true;
      }
      if (invalid) return;
      const modalEl = document.getElementById(DESKTOP_MODAL_ID);
      if (submit) setSubmitPending(submit, true);
      try {
        await submitLeadForm(form);
        showThankYouScreen(modalEl);
      } catch (err) {
        console.error(err);
        showSubmitError(form, "Ошибка отправки. Пожалуйста, свяжитесь с нами напрямую.");
      } finally {
        if (submit) setSubmitPending(submit, false);
      }
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
      <div data-v-2ee28934="" data-v-5c138029="" class="order-popup__inner">
        <div data-v-2ee28934="" data-v-5c138029="" class="order-popup__content">
          <div data-v-2ee28934="" data-v-5c138029="" class="order-popup__meta">
            <h2 data-v-2ee28934="" data-v-5c138029="">Хочу работать с&nbsp;вами</h2>
            <p data-v-2ee28934="" data-v-5c138029="" class="lead">Оставьте заявку, и мы в скором времени с вами свяжемся обсудить ваши задачи.</p>
          </div>
          <div data-v-2ee28934="" data-v-5c138029="" class="contact-form__messenger">
            <div data-v-2ee28934="" data-v-5c138029="" class="contact-form__messenger-title">Общаться в мессенджере</div>
            <div data-v-2ee28934="" data-v-5c138029="" class="contact-form__messenger-links">
              <a data-v-2ee28934="" data-v-5c138029="" target="_blank" rel="noopener noreferrer" href="https://t.me/Serenity_Agency_bot" aria-label="Telegram"><img data-v-2ee28934="" data-v-5c138029="" src="img/services/production/svg/telegram.svg" alt="Telegram" loading="eager" decoding="async"></a>
              <a data-v-2ee28934="" data-v-5c138029="" target="_blank" rel="noopener noreferrer" href="https://vk.me/serenity.agency" aria-label="VK"><img data-v-2ee28934="" data-v-5c138029="" src="img/services/production/svg/vk.svg" alt="VK" loading="eager" decoding="async"></a>
            </div>
          </div>
        </div>
        <div data-v-8ad2fcbc="" data-v-5c138029="" id="form" class="form-wrap" style="height: unset;">
          <form data-v-8ad2fcbc="" action="#" method="post" enctype="multipart/form-data" class="order-popup__form order-form form">
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
              <div data-v-8ad2fcbc="" class="form__grid-item">
                <label data-v-8ad2fcbc="" class="form__group">
                  <input data-v-8ad2fcbc="" type="text" name="site" placeholder="Сайт" class="form__control" />
                  <span data-v-8ad2fcbc="" class="form__label">Сайт</span>
                </label>
                <label data-v-8ad2fcbc="" class="form__group upload-input">
                  <input data-v-8ad2fcbc="" type="file" name="file" class="form__control" />
                  <span data-v-8ad2fcbc="" class="form__label upload-input__label">Прикрепить файл</span>
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
                <input data-v-8ad2fcbc="" type="checkbox" class="privacy-check__control" checked />
                <span data-v-8ad2fcbc="" class="privacy-check__mask"></span>
                <span data-v-8ad2fcbc="" class="privacy-check__text">Я даю согласие <a data-v-8ad2fcbc="" href="https://serenity.agency/privacy.pdf" target="_blank" rel="noopener noreferrer">на обработку персональных данных</a></span>
              </label>
            </div>
            <div data-v-8ad2fcbc="" class="order-popup__form-scroll-spacer" aria-hidden="true"></div>
          </form>
        </div>
      </div>
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
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openOrderModal();
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
    initInModalInpageAction();
    initHeaderFloatingCta();
    initFullscreenMenuButton();
    initBottomBar();
    initEscape();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
