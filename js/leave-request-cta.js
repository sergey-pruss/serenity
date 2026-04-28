/**
 * «Оставить заявку» — локальная модалка #desktop-order-popup (как на оригинале),
 * без редиректов и window.open на внешний сайт. Промежуточный нижний лист не используется.
 */
(() => {
  const BOTTOM_BAR_MAX_WIDTH = 1024;
  const BODY_FLAG = "leave-cta-open";
  const DESKTOP_MODAL_ID = "desktop-order-popup";
  const DESKTOP_BODY_LOCK = "order-popup-open";

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
    modal.innerHTML = `
      <div class="modal-close order-popup__cross" data-v-2ee28934="" data-v-5c138029=""></div>
      <div data-v-2ee28934="" data-v-5c138029="" class="order-popup__inner">
        <div data-v-2ee28934="" data-v-5c138029="" class="order-popup__content">
          <div data-v-2ee28934="" data-v-5c138029="" class="order-popup__meta">
            <h2 data-v-2ee28934="" data-v-5c138029="">Спасибо, наш новый друг!</h2>
            <p data-v-2ee28934="" data-v-5c138029="" class="lead">Уже рассматриваем вашу заявку всей командой. И совсем скоро с вами свяжемся. А пока давайте продолжим дружбу в социальных сетях:</p>
          </div>
          <div data-v-2ee28934="" data-v-5c138029="" class="contact-form__messenger">
            <div data-v-2ee28934="" data-v-5c138029="" class="contact-form__messenger-title">Общаться в мессенджере</div>
            <div data-v-2ee28934="" data-v-5c138029="" class="contact-form__messenger-links">
              <a data-v-2ee28934="" data-v-5c138029="" target="_blank" rel="noopener noreferrer" href="https://t.me/Serenity_Agency_bot" aria-label="Telegram"><img data-v-2ee28934="" data-v-5c138029="" src="img/services/production/svg/telegram.svg" alt="Telegram" loading="eager" decoding="async"></a>
              <a data-v-2ee28934="" data-v-5c138029="" target="_blank" rel="noopener noreferrer" href="https://wa.me/15557164521" aria-label="WhatsApp"><img data-v-2ee28934="" data-v-5c138029="" src="img/services/production/svg/whatsapp.svg" alt="WhatsApp" loading="eager" decoding="async"></a>
              <a data-v-2ee28934="" data-v-5c138029="" target="_blank" rel="noopener noreferrer" href="https://vk.me/serenity.agency" aria-label="VK"><img data-v-2ee28934="" data-v-5c138029="" src="img/services/production/svg/vk.svg" alt="VK" loading="eager" decoding="async"></a>
            </div>
          </div>
        </div>
      </div>
    `;
    modal.querySelector(".modal-close")?.addEventListener("click", closeDesktopModal);
    setTimeout(() => closeDesktopModal(), 15000);
  };

  const closeDesktopModal = () => {
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

  const submitLeadForm = async (form) => {
    const data = new FormData(form);
    data.set("source", window.location.href);

    const response = await fetch("/api/lead", {
      method: "POST",
      body: data,
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      const error = new Error("lead_submit_failed");
      error.result = result;
      throw error;
    }

    return result;
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
      const name = form.querySelector('input[name="name"]');
      const phone = form.querySelector('input[name="phone"]');
      let invalid = false;
      [name, phone].forEach((field) => {
        if (!field) return;
        const bad = String(field.value || "").trim().length < 2;
        field.classList.toggle("is-invalid", bad);
        if (bad) invalid = true;
      });
      if (invalid) return;
      const modalEl = document.getElementById(DESKTOP_MODAL_ID);
      showThankYouScreen(modalEl);
      submitLeadForm(form).catch((err) => console.error(err));
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
              <a data-v-2ee28934="" data-v-5c138029="" target="_blank" rel="noopener noreferrer" href="https://wa.me/15557164521" aria-label="WhatsApp"><img data-v-2ee28934="" data-v-5c138029="" src="img/services/production/svg/whatsapp.svg" alt="WhatsApp" loading="eager" decoding="async"></a>
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
                  <span data-v-8ad2fcbc="" class="form__label">Опишите задачу</span>
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
