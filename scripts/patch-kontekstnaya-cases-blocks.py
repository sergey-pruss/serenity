#!/usr/bin/env python3
"""Заменить три legacy cases-block на разметку как на главной (mor-cases-slider), с контентом prod __NUXT__."""
from pathlib import Path
from typing import List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "kontekstnaya_reklama" / "index.html"

MARKER = '<div data-v-bd2e570a="" class="cases-block">'

SUBTITLE = """                      В&nbsp;основе работы нашего маркетингового агентства — подход
                      брендформанса: с&nbsp;помощью синергии брендинга и&nbsp;перформанса
                      добиваемся крутых результатов для&nbsp;наших клиентов.
"""

# (storage file, href, slide text) — тексты subtitle с prod kontekstnaya_reklama __NUXT__
GROUPS = [
    [
        (
            "PyRFrlyYAq8BN6JyIJhlOwIikEfOnsyOYQc2uAJy.webp",
            "/case/darkrain-store",
            "Увеличили конверсию сайта для бренда ювелирных украшений.",
        ),
        (
            "OBIK6EwpuWYXIOTf2Xmh8G0lpcgYbi0geXPRJXdC.webp",
            "/case/orange",
            "Привели трафик на сайт международного  интегратора IT-сервисов",
        ),
    ],
    [
        (
            "lRowaUhHi4llniaqM0sJTh6wOR8768BJ18FrFLY8.webp",
            "/case/internet-magazin-mebeli-skladno",
            "Наладили работу отдела продаж и запустили комплексное продвижения магазина мебели.",
        ),
        (
            "FhX7ymsPjK8OwF0gZcquVp0Ipb6Cp6pEAlFYEgYO.webp",
            "/case/digitale",
            "Собрали рекордное количество участников на конференцию.",
        ),
        (
            "9J6f8UhhwDQHAImvRpmi6tadgdnW4BomwW5UgKYj.webp",
            "/case/mosplitka",
            "За четыре месяца выполнили план продаж для сети магазинов сантехники и плитки.",
        ),
    ],
    [
        (
            "tIebbzcPTKO4SeH29iEJgCXm17X4e5yEEVaayuSk.webp",
            "/case/kompozit",
            "Создали постоянный поток заявок  для клиники пластической хирургии.",
        ),
        (
            "x98VN5hENJAGjzVYlNrzFujMFB06AbmDM2bxJAgO.webp",
            "/case/good-wood",
            "Привлекли участников на бизнес-конференцию.",
        ),
        (
            "nzJ8821fyX7m2gDqHHItwqH0upll1mGXsZoRiZr6.webp",
            "/case/awm-trade",
            "Продвижение для дистрибьютора квадроциклов и мотоциклетной техники.",
        ),
    ],
]


def slide_html(img: str, href: str, text: str) -> str:
    esc = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
    return (
        f'<div data-v-38965faa="" class="swiper-slide mor-cases-slide" '
        f'style="background-image: url(&quot;/_sa/img/storage__{img}&quot;);">'
        f'<a data-v-38965faa="" class="mor-cases-slide__link" href="{href}">'
        f'<p data-v-38965faa="" class="mor-cases-slide__text">{esc}</p></a></div>'
    )


def build_block(slides):
    slides_joined = "".join(slide_html(*s) for s in slides)
    return (
        f'{MARKER}<div data-v-27a87df0="" class="page__container">'
        '<div class="cases-block__header home-ledge" data-v-27a87df0="">'
        '<div class="cases-block__header-title" data-v-27a87df0="">Кейсы</div>'
        '<div class="cases-block__header-subtitle" data-v-27a87df0="">'
        f"{SUBTITLE}"
        "</div></div>"
        '<div data-v-38965faa="" data-v-27a87df0="" class="mor-cases-slider-wrapper more-cases--active">'
        '<div data-v-38965faa="" class="mor-cases-slider swiper-container swiper-container-horizontal swiper-container-free-mode">'
        '<div data-v-38965faa="" class="swiper-wrapper" style="transition-duration: 0ms">'
        f"{slides_joined}"
        "</div>"
        '<div data-v-38965faa="" class="swiper-pagination"></div>'
        "</div></div></div></div>"
    )


def find_cases_block_span(text: str, start_at: int) -> Optional[Tuple[int, int]]:
    idx = text.find(MARKER, start_at)
    if idx == -1:
        return None
    after = text[idx:]
    open_end = after.find(">") + 1
    depth = 1
    i = open_end
    while i < len(after) and depth > 0:
        chunk = after[i : i + 8000]
        mdiv = chunk.find("<div")
        mclose = chunk.find("</div>")
        if mclose == -1:
            raise RuntimeError("unbalanced div in cases-block")
        if mdiv != -1 and mdiv < mclose:
            depth += 1
            i += mdiv + 4
        else:
            depth -= 1
            i += mclose + 6
    return idx, idx + i


def main() -> None:
    text = HTML_PATH.read_text(encoding="utf-8")
    pos = 0
    out_parts: List[str] = []
    for group in GROUPS:
        span = find_cases_block_span(text, pos)
        if span is None:
            raise SystemExit("cases-block not found")
        start, end = span
        out_parts.append(text[pos:start])
        out_parts.append(build_block(group))
        pos = end
    out_parts.append(text[pos:])
    new_text = "".join(out_parts)

    new_text = new_text.replace(
        "background-image:url(xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp);",
        "background-image:url(/_sa/img/storage__xjhFEA49677OGQDTXjw6he9xnUh71ef9GgvspTHz.webp);",
    )

    HTML_PATH.write_text(new_text, encoding="utf-8")
    print("patched:", HTML_PATH)


if __name__ == "__main__":
    main()
