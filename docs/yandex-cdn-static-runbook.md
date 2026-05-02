# Yandex Cloud CDN для `static.serenity.agency`

Runbook фиксирует настройку CDN-слоя для тестового домена `static.serenity.agency`.
Origin остаётся текущий preview-vhost на новом Nginx-сервере `168.222.142.141`, каталог `/var/www/static`.

## Что настраиваем

- CDN-провайдер: Yandex Cloud CDN.
- Домен раздачи: `static.serenity.agency`.
- Origin: `168.222.142.141`.
- Origin protocol: HTTPS.
- Origin `Host`: `static.serenity.agency`.
- SNI к origin: `static.serenity.agency`.
- IPv6 для origin не использовать: Yandex Cloud CDN ходит к источникам только по IPv4.
- DNS после создания CDN-ресурса: `static.serenity.agency` должен стать `CNAME` на доменное имя CDN Load Balancer из Yandex Cloud.

## Почему нужен именно такой Host/SNI

На сервере `168.222.142.141` preview-сайт выбран vhost-ом:

```nginx
server_name static.serenity.agency;
ssl_certificate /etc/letsencrypt/live/static.serenity.agency/fullchain.pem;
```

Если CDN пойдёт на origin с другим `Host` или без SNI `static.serenity.agency`, Nginx может выбрать не тот серверный блок или TLS-проверка origin будет некорректной. В настройках CDN нужно явно указать:

- `Host header`: своё значение `static.serenity.agency`;
- `Custom SNI`: `static.serenity.agency`;
- `Origin protocol`: HTTPS.

## Проверка origin до переключения DNS

Проверить, что origin отвечает с нужным `Host`:

```bash
curl --head --insecure --header "Host: static.serenity.agency" https://168.222.142.141/
```

Ожидаемо:

- HTTP 200 или 301/302 на HTTPS-URL того же host;
- есть `X-Robots-Tag: noindex, nofollow`;
- для `/_sa/*` есть `Cache-Control: public, max-age=31536000, immutable`.

Проверка статического ассета:

```bash
curl --head --insecure --header "Host: static.serenity.agency" "https://168.222.142.141/_sa/css/css__home-snapshot__snapshot.bundle.css?v=20260424"
```

Проверка закрытого robots preview:

```bash
curl --silent --insecure --header "Host: static.serenity.agency" https://168.222.142.141/robots.txt
```

В ответе должен быть preview-robots с `Disallow: /`.

## Настройка в Yandex Cloud

1. Создать origin group для текущего Nginx-origin:
   - origin type: custom server;
   - address: `168.222.142.141`;
   - protocol: HTTPS.
2. Создать CDN resource:
   - primary domain / CNAME: `static.serenity.agency`;
   - origin group: группа из шага 1;
   - origin protocol: HTTPS;
   - Host header to origin: custom `static.serenity.agency`;
   - custom SNI: `static.serenity.agency`;
   - compression: включить для текстовых типов, если опция доступна.
3. Кэширование:
   - CDN должен уважать origin headers;
   - query string не игнорировать: версии `?v=` для CSS/JS являются частью cache-busting;
   - cookies можно игнорировать для статики;
   - для HTML не задавать долгий edge/browser TTL поверх origin, потому что `/index.html` отдаётся как `no-cache`;
   - для `/_sa/*` можно использовать долгий edge TTL, совпадающий с origin `immutable`.
4. DNS:
   - заменить текущий `A`/`AAAA` для `static.serenity.agency` на `CNAME`, который выдаст Yandex Cloud CDN;
   - перед переключением снизить TTL до 60-300 секунд;
   - `AAAA` не оставлять на старый origin, иначе часть клиентов обойдёт CDN.

## Проверка после переключения DNS

```bash
dig +short static.serenity.agency
curl -I https://static.serenity.agency/
curl -I "https://static.serenity.agency/_sa/css/css__home-snapshot__snapshot.bundle.css?v=20260424"
npm run test:post-deploy-smoke-static
```

Ожидаемо:

- `static.serenity.agency` резолвится в CDN, а не напрямую в `168.222.142.141`;
- главная открывается;
- `/_sa/*` не даёт 404/5xx;
- `robots.txt` остаётся preview-версией с `Disallow: /`;
- `X-Robots-Tag: noindex, nofollow` не пропал;
- smoke-тест проходит.

## Rollback

Если после переключения есть 5xx, 404 для `/_sa/*`, неверный robots или CDN отдаёт не тот vhost:

1. Вернуть DNS `static.serenity.agency` на `A 168.222.142.141`.
2. Дождаться TTL.
3. Проверить origin напрямую командами из раздела выше.
4. Исправить CDN Host/SNI/origin protocol и повторить переключение.

## Источники Yandex Cloud

- [Yandex Cloud CDN overview](https://yandex.cloud/en/docs/cdn/concepts/)
- [Origins and origin groups](https://yandex.cloud/en/docs/cdn/concepts/origins)
- [Data exchange between CDN servers and origins](https://yandex.cloud/en/docs/cdn/concepts/servers-to-origins)
- [Host header in CDN requests to origins](https://yandex.cloud/en/docs/cdn/concepts/servers-to-origins-host)
- [Configuring caching](https://yandex.cloud/ru/docs/cdn/operations/resources/configure-caching)
