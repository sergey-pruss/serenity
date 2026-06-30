/**
 * Перелинковки: главная, /services, /services/marketing.
 * Класс ссылок: sa-invisible-text-link (hover #9cc9ff, без underline).
 */
const LINK = "sa-invisible-text-link";

function a(href, text) {
  return `<a href="${href}" class="${LINK}">${text}</a>`;
}

function replaceOnce(html, from, to) {
  if (html.includes(to)) return html;
  if (!html.includes(from)) return html;
  return html.replace(from, to);
}

/** Главная: partials section-services, section-home-cases */
function patchHomeInterlinks(html) {
  let s = html;
  s = replaceOnce(
    s,
    "Помогаем создавать комплексный маркетинг, ориентированный",
    `Помогаем создавать ${a("/services/marketing", "комплексный маркетинг")}, ориентированный`,
  );
  s = replaceOnce(
    s,
    "так и на долгосрочные результаты.",
    `так и на ${a("/strategy", "долгосрочные результаты")}.`,
  );
  s = s.replace(
    /<a href="\/services\/marketing" class="sa-invisible-text-link">синергии брендинга и(?:&nbsp;|\s)перформанса<\/a>/g,
    "синергии брендинга и перформанса",
  );
  s = s.replace(
    /агентства — (?:<a href="\/services\/marketing" class="sa-invisible-text-link">подход брендформанса<\/a>|подход(?:&nbsp;|\s+)брендформанса):/g,
    `агентства — ${a("/services/marketing", "подход брендформанса")}:`,
  );
  return s;
}

/** /services: services/index.html */
function patchServicesIndexInterlinks(html) {
  let s = html;
  s = replaceOnce(
    s,
    "Усиливаем performance цепляющим брендингом.",
    `${a("/blog/article/brending-i-performance-marketing-pochemu-odno-bez-drugogo-sliv-byudzheta/", "Усиливаем performance")} цепляющим брендингом.`,
  );
  s = replaceOnce(
    s,
    "Создаем дизайн для сайта, соцсетей и баннеров, контент-маркетинг в блог и сторонние площадки.",
    `Создаем ${a("/korporativnyj_sajt", "дизайн для сайта")}, соцсетей и баннеров, ${a("/prodvizhenie-statey-v-dzene-i-promostranitsah", "контент-маркетинг в блог")} и сторонние площадки.`,
  );
  s = replaceOnce(
    s,
    "Увеличиваем конверсию за счёт продуманной структуры и дизайна",
    `${a("/uvelichenie-konversii-saita", "Увеличиваем конверсию")} за счёт продуманной структуры и дизайна`,
  );
  s = replaceOnce(
    s,
    "Обеспечиваем поддержку и развитие проектов, чтобы сайт оставался",
    `Обеспечиваем ${a("/tehnicheskaya-podderzhka-saita", "поддержку и развитие проектов")}, чтобы сайт оставался`,
  );
  return s;
}

/** /services/marketing: partials + index */
function patchMarketingInterlinks(html) {
  let s = html;
  s = replaceOnce(
    s,
    "Определяет наиболее эффективные каналы продвижения.",
    `Определяет наиболее эффективные ${a("/kompleksnoye-prodvizheniye", "каналы продвижения")}.`,
  );
  s = replaceOnce(
    s,
    "Маркетинговая стратегия выявляет ваши конкурентные преимущества.",
    `${a("/strategy", "Маркетинговая стратегия")} выявляет ваши конкурентные преимущества.`,
  );
  s = replaceOnce(
    s,
    "Определяем темы для&nbsp;статей и&nbsp;постов.",
    `Определяем ${a("/blog/article/prodvizhenie-sajta-statyami-ekspertnyj-kontent-kotoryj-rabotaet/", "темы для&nbsp;статей")} и&nbsp;постов.`,
  );
  s = replaceOnce(
    s,
    "Выбираем соцсети и&nbsp;СМИ, где сидит ваша аудитория.",
    `Выбираем ${a("/smm_marketing", "соцсети")} и&nbsp;СМИ, где сидит ваша аудитория.`,
  );
  s = replaceOnce(
    s,
    "Увеличиваем конверсию в&nbsp;заявку.",
    `${a("/uvelichenie-konversii-saita", "Увеличиваем конверсию в&nbsp;заявку")}.`,
  );
  s = replaceOnce(
    s,
    "О&nbsp;вас узнают в&nbsp;поисковых системах и&nbsp;социальных сетях.",
    `О&nbsp;вас узнают в&nbsp;${a("/seo", "поисковых системах")} и&nbsp;${a("/targeting", "социальных сетях")}.`,
  );
  s = replaceOnce(
    s,
    "Проводим технический аудит.",
    `Проводим ${a("/blog/article/kompleksnyj-seo-audit-sajta-zachem-kogda-i-iz-chego-sostoit/", "технический аудит")}.`,
  );
  s = replaceOnce(
    s,
    "Улучшаем юзабилити.",
    `${a("/uvelichenie-konversii-saita", "Улучшаем юзабилити")}.`,
  );
  s = replaceOnce(
    s,
    "Соединяем комплексный маркетинг с&nbsp;продажами.",
    `Соединяем ${a("/kompleksnoye-prodvizheniye", "комплексный маркетинг с&nbsp;продажами")}.`,
  );
  return s;
}

module.exports = {
  patchHomeInterlinks,
  patchServicesIndexInterlinks,
  patchMarketingInterlinks,
};
