# Pre-cutover validation report

Date: 2026-04-29

Scope:
- technical host readiness before production DNS cutover
- baseline checks for current ready routes (`/`, `/case/all/`)

## Results

### 1) Technical host responds
- `https://static.serenity.agency/` responds with homepage content.
- `https://static.serenity.agency/case/all/` responds with case list page shell.

### 2) Production reference responds
- `https://serenity.agency/case/all/` responds with legacy case list content.

### 3) Delta found and action required before cutover
- Current static `/case/all/` output on `static.serenity.agency` shows `Нет кейсов в этой категории.`
- Legacy production `/case/all/` currently contains populated cards.

Decision gate:
- Do not perform DNS cutover for `/case/all/` until card data parity is confirmed.

## Required manual checks (not automatable from repo only)

- Nginx access/error logs during smoke run (`5xx`, upstream timeouts)
- form submission from production host (after DNS cutover rehearsal)
- multi-network DNS propagation verification during cutover window
