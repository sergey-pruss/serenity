# Включается в serenity-router.live.conf дважды (HTTPS и HTTP).
# HTTP не делает 301 на https://serenity.agency — иначе Yandex CDN при origin по HTTP получает «cdn loop detected».

    root /var/www/static;
    index index.html;

    # Текстовые ответы: gzip по запросу клиента (Accept-Encoding). Файлы на диске не меняются.
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_comp_level 5;
    gzip_http_version 1.1;
    gzip_proxied any;
    # MIME главной страницы в списке не дублируем — иначе nginx предупреждает о повторе типа (дефолт от gzip в http{}).
    gzip_types
        text/plain
        text/css
        text/xml
        application/javascript
        application/json
        application/xml
        application/rss+xml
        image/svg+xml;

    location = /robots.txt {
        alias /var/www/static/robots.production.txt;
        default_type text/plain;
        access_log off;
    }

    location = /sitemap.xml {
        alias /var/www/static/sitemap.xml;
        default_type application/xml;
        charset utf-8;
        access_log off;
    }

    location ^~ /_sa/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location ^~ /api/ {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_server_name on;
        proxy_ssl_name serenity.agency;
        proxy_ssl_verify off;
        proxy_pass https://serenity_legacy_origin;
    }

    location ^~ /docs/ {
        expires -1;
        add_header Cache-Control "no-cache, max-age=0, must-revalidate";
        add_header X-Robots-Tag "noindex, nofollow" always;
        try_files $uri $uri/ =404;
    }

    error_page 419 = @legacy_proxy;

    location / {
        if ($is_new_page = 0) {
            return 419;
        }
        expires -1;
        add_header Cache-Control "no-cache, max-age=0, must-revalidate";
        try_files $uri $uri/ =404;
    }

    location @legacy_proxy {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Accept-Encoding "";
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
        proxy_ssl_server_name on;
        proxy_ssl_name serenity.agency;
        proxy_ssl_verify off;
        sub_filter_once off;
        sub_filter '<a href="/case/all"' '<a href="/case/all/"';
        sub_filter '</body>' '<script>(function(){function normalize(href){if(href==="/case/all"||href==="https://serenity.agency/case/all"||href==="http://serenity.agency/case/all")return"/case/all/";if(href==="/"||href==="https://serenity.agency/"||href==="http://serenity.agency/"||href==="https://serenity.agency"||href==="http://serenity.agency")return"/";return"";}document.addEventListener("click",function(e){var t=e.target;var a=t&&t.closest?t.closest("a[href]"):null;if(!a)return;var target=normalize(a.getAttribute("href"));if(!target)return;e.preventDefault();window.location.assign(target);},true);})();</script></body>';
        proxy_pass https://serenity_legacy_origin;
    }
