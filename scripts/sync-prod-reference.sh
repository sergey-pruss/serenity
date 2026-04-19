#!/usr/bin/env bash
# Выгружает HTML главной и все link[rel=stylesheet] с https://serenity.agency/
# в reference/prod/. Запускать локально (нужны curl + python3).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="$ROOT/reference/prod"
mkdir -p "$REF/css"
HTML_OUT="$REF/index.html"
echo "Fetching https://serenity.agency/ -> $HTML_OUT"
curl -fsSL "https://serenity.agency/" -o "$HTML_OUT"

python3 - "$HTML_OUT" "$REF" "$ROOT" <<'PY'
import os, re, sys, urllib.parse, subprocess

html_path, ref, root = sys.argv[1:4]
base = "https://serenity.agency/"
html = open(html_path, encoding="utf-8", errors="replace").read()

def abs_url(href: str) -> str:
    return urllib.parse.urljoin(base, href.strip())

css_urls = []
seen = set()
for m in re.finditer(r"<link\s+[^>]*>", html, flags=re.I):
    tag = m.group(0)
    if not re.search(r'\brel\s*=\s*["\']stylesheet["\']', tag, re.I):
        continue
    hm = re.search(r'\bhref\s*=\s*["\']([^"\']+)["\']', tag, re.I)
    if not hm:
        continue
    u = abs_url(hm.group(1))
    if u not in seen:
        seen.add(u)
        css_urls.append(u)

urls_path = os.path.join(ref, "stylesheet-urls.txt")
with open(urls_path, "w", encoding="utf-8") as f:
    f.write("\n".join(css_urls) + ("\n" if css_urls else ""))

os.makedirs(os.path.join(ref, "css"), exist_ok=True)
lines_abs = []
lines_rel = []
for i, url in enumerate(css_urls):
    path = urllib.parse.urlparse(url).path
    base_name = os.path.basename(path) or "bundle.css"
    if "?" in base_name:
        base_name = base_name.split("?")[0]
    if not base_name.endswith(".css"):
        base_name = f"chunk-{i}.css"
    dest = os.path.join(ref, "css", f"{i:02d}-{base_name}")
    try:
        subprocess.run(["curl", "-fsSL", url, "-o", dest], check=True)
    except subprocess.CalledProcessError as e:
        print(f"warn: failed to download {url}: {e}", file=sys.stderr)
        continue
    rel_href = os.path.relpath(dest, root).replace(os.sep, "/")
    lines_rel.append(f'<link rel="stylesheet" crossorigin href="{rel_href}">')
    lines_abs.append(f'<link rel="stylesheet" crossorigin href="{url}">')

open(os.path.join(ref, "link-tags-relative.html"), "w", encoding="utf-8").write(
    "\n".join(lines_rel) + ("\n" if lines_rel else "")
)
open(os.path.join(ref, "link-tags-absolute.html"), "w", encoding="utf-8").write(
    "\n".join(lines_abs) + ("\n" if lines_abs else "")
)
print(f"Stylesheets found: {len(css_urls)}")
print(f"Wrote {urls_path}, link-tags-*.html, css/")
PY

echo "OK. Next:"
echo "  1) Diff reference/prod/index.html DOM/classes vs index.html"
echo "  2) Paste reference/prod/link-tags-absolute.html into <head> when classes match prod (or hotlink while prototyping)."
echo "  3) Remove hand-written rules that duplicate prod CSS."
