/** Слайды полосы «Кейсы» на главной — фоны как на проде (storage). */
export type HomeCaseSlide = {
  id: string;
  href: string;
  external?: boolean;
  text: string;
  textBlack?: boolean;
  image: string;
};

export const homeMoreCaseSlides: HomeCaseSlide[] = [
  {
    id: "1",
    href: "/case/darkrain-store",
    text: "С 2018 развиваем интернет-магазин и реализуем комплексное продвижение бренда украшений Darkrain",
    image: "/media/home/case-darkrain.jpg",
  },
  {
    id: "2",
    href: "/case/all/boca",
    text: "Увеличили продажи с помощью инструментов контекстной и георекламы",
    image: "/media/home/case-boca.webp",
  },
  {
    id: "3",
    href: "/case/all/grandmed",
    text: "Комплексное продвижение медицинского холдинга",
    image: "/media/home/case-grandmed.webp",
  },
  {
    id: "4",
    href: "/case/all/eurostroy",
    text: "На 30% увеличили число конверсий для «Евростроя»",
    image: "/media/home/case-eurostroy.jpg",
  },
  {
    id: "5",
    href: "https://serenity.agency/case/orange",
    external: true,
    text: "Вывели международного интегратора IT-сервисов Orange в digital в России",
    textBlack: true,
    image: "/media/home/case-orange.jpg",
  },
  {
    id: "6",
    href: "/case/all/cromi",
    text: "Новый бренд и сайт для дистрибьютора звукового оборудования Cromi",
    image: "/media/home/case-cromi.jpg",
  },
];
