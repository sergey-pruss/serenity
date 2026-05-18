/**
 * Рендер слайдов наград из json/services/<slug>/awards.json.
 */
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slideShellOpen(href) {
  if (href) {
    return `<a class="home-awards-slide-shell" data-v-6f8a040c="" href="${esc(href)}" target="_blank" rel="noopener noreferrer">`;
  }
  return `<div class="home-awards-slide-shell" data-v-6f8a040c="">`;
}

function slideShellClose(href) {
  return href ? `</a>` : `</div>`;
}

function renderSlides(awards) {
  if (!Array.isArray(awards) || awards.length === 0) {
    throw new Error("awards: нужен непустой массив");
  }
  return awards
    .map(({ rating, year, description, href }) => {
      const r = rating ?? "";
      const y = year ?? "";
      const d = description ?? "";
      const link = href || null;
      return `
                        <div
                          class="swiper-slide clients-new__slide awards__card-wraper"
                          data-v-6f8a040c=""
                        >${slideShellOpen(link)}
                            <div class="awards__card" data-v-6f8a040c="">
                              <div class="awards__card-info">
                                <span class="awards__card-rating">${esc(r)}</span>
                                <span class="awards__card-year">${esc(y)}</span>
                              </div>
                              <img
                                class="awards__card-img"
                                src="/_sa/img/home/award-wreath-union.svg"
                                alt=""
                                width="148"
                                height="131"
                                loading="lazy"
                                decoding="async"
                              />
                              <img
                                class="awards__card-img"
                                src="/_sa/img/home/award-wreath-union1.svg"
                                alt=""
                                width="148"
                                height="131"
                                loading="lazy"
                                decoding="async"
                              />
                              <p class="awards__card-description">
                                ${esc(d)}
                              </p>
                            </div>
                          ${slideShellClose(link)}
                        </div>`;
    })
    .join("");
}

module.exports = { renderSlides, esc };
