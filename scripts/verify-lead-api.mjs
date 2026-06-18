import assert from "node:assert/strict";
import { handleLeadRequest } from "../src/lead-api.mjs";
import { finalizeLeadUtm, inferUtmFromReferrer, inferUtmFromSearchParams, normalizeLeadUtm, stripSentinelLeadUtm } from "../src/lead-utm.mjs";

const originalFetch = globalThis.fetch;

const formRequest = (fields) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return new Request("https://serenity.test/api/lead", {
    method: "POST",
    body: data,
  });
};

const json = async (response) => response.json();

const withFetchMock = async (mock, run) => {
  globalThis.fetch = mock;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

{
  const response = await handleLeadRequest(formRequest({ name: "", phone: "", email: "" }), {});
  assert.equal(response.status, 422);
  assert.deepEqual(await json(response), { error: "Заполните обязательные поля: имя, телефон, email" });
}

{
  const response = await handleLeadRequest(formRequest({ name: "Иван", phone: "+7 999 123-45-67", email: "bad-mail" }), {});
  assert.equal(response.status, 422);
  assert.deepEqual(await json(response), { error: "Некорректный email" });
}

{
  const response = await handleLeadRequest(formRequest({ name: "Иван", phone: "+7 999 123-45-67", email: "ivan@example.com" }), {});
  assert.equal(response.status, 500);
  assert.deepEqual(await json(response), { error: "Ошибка отправки. Пожалуйста, свяжитесь с нами напрямую." });
}

await withFetchMock(
  async (url, init) => {
    if (url === "https://api.resend.com/emails") {
      const body = JSON.parse(init.body);
      assert.equal(body.reply_to, "ivan@example.com");
      assert.match(body.html, /Страница отправки заявки/);
      return Response.json({ id: "email_123" });
    }
    throw new Error(`Unexpected URL: ${url}`);
  },
  async () => {
    const response = await handleLeadRequest(
      formRequest({
        name: "Иван",
        phone: "+7 999 123-45-67",
        email: "ivan@example.com",
        comments: "Нужен сайт",
        source: "https://serenity.test/#form",
      }),
      { RESEND_API_KEY: "resend-token" },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await json(response), { success: true });
  },
);

await withFetchMock(
  async (url, init) => {
    if (url === "https://api.resend.com/emails") return Response.json({ id: "email_123" });

    assert.ok(String(url).startsWith("https://serenity.amocrm.ru/api/v4/"));
    const path = String(url).replace("https://serenity.amocrm.ru/api/v4", "");
    const body = JSON.parse(init.body);
    assert.equal(init.headers.Authorization, "Bearer amo-token");

    if (path === "/leads/unsorted/forms") {
      assert.equal(body[0].source_name, "Serenity Статика");
      assert.equal(typeof body[0].source_uid, "string");
      assert.ok(body[0].source_uid);
      assert.equal(body[0].request_id, body[0].source_uid);
      assert.equal(body[0].metadata.form_id, "serenity-static-lead-form");
      assert.equal(body[0].metadata.form_page, "https://serenity.test/landing?utm_source=yandex&utm_medium=cpc#form");
      assert.equal(body[0].metadata.referer, "https://serenity.test/landing?utm_source=yandex&utm_medium=cpc#form");
      assert.equal(body[0]._embedded.leads[0].name, "Заявка с сайта — Иван");
      assert.equal(body[0]._embedded.contacts[0].name, "Иван");
      const contactFields = body[0]._embedded.contacts[0].custom_fields_values || [];
      assert.ok(contactFields.some((cf) => cf.field_code === "PHONE" && cf.values[0].value === "+7 999 123-45-67"));
      assert.ok(contactFields.some((cf) => cf.field_code === "EMAIL" && cf.values[0].value === "ivan@example.com"));
      assert.equal(body[0].responsible_user_id, undefined);
      assert.equal(body[0].status_id, undefined);
      assert.equal(body[0].pipeline_id, undefined);
      assert.equal(body[0]._embedded.leads[0].responsible_user_id, undefined);
      assert.equal(body[0]._embedded.leads[0].status_id, undefined);
      assert.equal(body[0]._embedded.leads[0].pipeline_id, undefined);
      const byField = Object.fromEntries(
        (body[0]._embedded.leads[0].custom_fields_values || []).map((cf) => [cf.field_id, cf.values[0].value]),
      );
      assert.equal(byField[555], "https://serenity.test/landing?utm_source=yandex&utm_medium=cpc#form");
      assert.equal(byField[777], "yandex");
      assert.equal(byField[888], "cpc");
      return Response.json({ _embedded: { unsorted: [{ _embedded: { leads: [{ id: 654 }] } }] } });
    }

    if (path === "/leads/654/notes") {
      assert.match(body[0].params.text, /Задача: Нужен сайт/);
      assert.match(body[0].params.text, /Источник: https:\/\/serenity\.test\/landing\?utm_source=yandex/);
      assert.match(body[0].params.text, /utm_source: yandex/);
      assert.match(body[0].params.text, /utm_medium: cpc/);
      return Response.json({ _embedded: { notes: [{ id: 987 }] } });
    }

    throw new Error(`Unexpected AmoCRM path: ${path}`);
  },
  async () => {
    const response = await handleLeadRequest(
      formRequest({
        name: "Иван",
        phone: "+7 999 123-45-67",
        email: "ivan@example.com",
        comments: "Нужен сайт",
        source: "https://serenity.test/landing?utm_source=yandex&utm_medium=cpc#form",
        utm_source: "yandex",
        utm_medium: "cpc",
      }),
      {
        RESEND_API_KEY: "resend-token",
        AMO_SUBDOMAIN: "serenity",
        AMO_CLIENT_ID: "cid",
        AMO_CLIENT_SECRET: "sec",
        AMO_ACCESS_TOKEN: "amo-token",
        AMO_REFRESH_TOKEN: "amo-refresh",
        AMO_SOURCE_FIELD_ID: "555",
        AMO_UTM_SOURCE_FIELD_ID: "777",
        AMO_UTM_MEDIUM_FIELD_ID: "888",
      },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await json(response), { success: true });
  },
);

await withFetchMock(
  async (url, init) => {
    if (url === "https://api.resend.com/emails") return Response.json({ id: "email_123" });

    const path = String(url).replace("https://serenity.amocrm.ru/api/v4", "");
    const body = JSON.parse(init.body);

    if (path === "/leads/unsorted/forms") {
      const byField = Object.fromEntries(
        (body[0]._embedded.leads[0].custom_fields_values || []).map((cf) => [cf.field_id, cf.values[0].value]),
      );
      const byContactField = Object.fromEntries(
        (body[0]._embedded.contacts[0].custom_fields_values || [])
          .filter((cf) => cf.field_id)
          .map((cf) => [cf.field_id, cf.values[0].value]),
      );
      assert.equal(byField[100], "google");
      assert.equal(byField[101], "banner");
      assert.equal(byContactField[200], "google");
      assert.equal(byContactField[201], "banner");
      return Response.json({ _embedded: { unsorted: [{ _embedded: { leads: [{ id: 2 }] } }] } });
    }
    if (path === "/leads/2/notes") {
      assert.match(body[0].params.text, /utm_source: google/);
      assert.match(body[0].params.text, /utm_medium: banner/);
      return Response.json({ _embedded: { notes: [{ id: 3 }] } });
    }
    throw new Error(`Unexpected AmoCRM path: ${path}`);
  },
  async () => {
    const response = await handleLeadRequest(
      new Request("https://serenity.test/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Пётр",
          phone: "+7",
          email: "p@example.com",
          source: "https://serenity.test/x?utm_source=google&utm_medium=banner",
        }),
      }),
      {
        RESEND_API_KEY: "resend-token",
        AMO_SUBDOMAIN: "serenity",
        AMO_CLIENT_ID: "cid",
        AMO_CLIENT_SECRET: "sec",
        AMO_ACCESS_TOKEN: "amo-token",
        AMO_REFRESH_TOKEN: "amo-refresh",
        AMO_UTM_SOURCE_FIELD_ID: "100",
        AMO_UTM_MEDIUM_FIELD_ID: "101",
        AMO_CONTACT_UTM_SOURCE_FIELD_ID: "200",
        AMO_CONTACT_UTM_MEDIUM_FIELD_ID: "201",
      },
    );
    assert.equal(response.status, 200);
  },
);

await withFetchMock(
  async () => new Response("bad", { status: 500 }),
  async () => {
    const response = await handleLeadRequest(
      formRequest({ name: "Иван", phone: "+7 999 123-45-67", email: "ivan@example.com" }),
      {
        RESEND_API_KEY: "resend-token",
        AMO_SUBDOMAIN: "serenity",
        AMO_ACCESS_TOKEN: "amo-token",
      },
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await json(response), { error: "Ошибка отправки. Пожалуйста, свяжитесь с нами напрямую." });
  },
);

{
  assert.deepEqual(
    normalizeLeadUtm({}, "https://serenity.agency/kontekstnaya_reklama"),
    {
      utm_source: "direct",
      utm_medium: "none",
    },
  );
  assert.deepEqual(
    normalizeLeadUtm(
      {},
      "https://serenity.agency/kontekstnaya_reklama?yclid=123456789",
    ),
    {
      utm_source: "yandex",
      utm_medium: "cpc",
    },
  );
  assert.equal(
    inferUtmFromSearchParams(new URLSearchParams("utm_source=yadirect&utm_medium=cpc")).utm_source,
    "yandex",
  );
  assert.deepEqual(finalizeLeadUtm({ utm_source: "vkontakte" }), {
    utm_source: "vkontakte",
    utm_medium: "none",
  });
  assert.deepEqual(inferUtmFromReferrer("https://www.google.com/search?q=serenity"), {
    utm_source: "google",
    utm_medium: "organic",
  });
  assert.deepEqual(inferUtmFromReferrer("https://yandex.ru/search/?text=serenity"), {
    utm_source: "yandex",
    utm_medium: "organic",
  });
  assert.deepEqual(inferUtmFromReferrer("https://serenity.agency/blog/"), {});
  assert.deepEqual(
    normalizeLeadUtm(
      { referrer: "https://www.google.com/search?q=test", utm_source: "direct", utm_medium: "none" },
      "https://serenity.agency/services",
    ),
    { utm_source: "google", utm_medium: "organic" },
  );
  assert.deepEqual(
    normalizeLeadUtm(
      { utm_source: "direct", utm_medium: "none" },
      "https://serenity.agency/kontekstnaya_reklama?yclid=123456789",
    ),
    { utm_source: "yandex", utm_medium: "cpc" },
  );
  assert.deepEqual(stripSentinelLeadUtm({ utm_source: "direct", utm_medium: "none" }), {});
}

await withFetchMock(
  async (url, init) => {
    if (url === "https://api.resend.com/emails") return Response.json({ id: "email_123" });

    const path = String(url).replace("https://serenity.amocrm.ru/api/v4", "");
    const body = JSON.parse(init.body);

    if (path === "/leads/unsorted/forms") {
      const byField = Object.fromEntries(
        (body[0]._embedded.leads[0].custom_fields_values || []).map((cf) => [cf.field_id, cf.values[0].value]),
      );
      assert.equal(byField[777], "direct");
      assert.equal(byField[888], "none");
      return Response.json({ _embedded: { unsorted: [{ _embedded: { leads: [{ id: 11 }] } }] } });
    }
    if (path === "/leads/11/notes") {
      assert.match(body[0].params.text, /utm_source: direct/);
      assert.match(body[0].params.text, /utm_medium: none/);
      return Response.json({ _embedded: { notes: [{ id: 12 }] } });
    }
    throw new Error(`Unexpected AmoCRM path: ${path}`);
  },
  async () => {
    const response = await handleLeadRequest(
      formRequest({
        name: "Никита",
        phone: "+7 999 000-00-00",
        email: "nikita@example.com",
        source: "https://serenity.agency/kontekstnaya_reklama",
        utm_source: "direct",
        utm_medium: "none",
      }),
      {
        RESEND_API_KEY: "resend-token",
        AMO_SUBDOMAIN: "serenity",
        AMO_CLIENT_ID: "cid",
        AMO_CLIENT_SECRET: "sec",
        AMO_ACCESS_TOKEN: "amo-token",
        AMO_REFRESH_TOKEN: "amo-refresh",
        AMO_UTM_SOURCE_FIELD_ID: "777",
        AMO_UTM_MEDIUM_FIELD_ID: "888",
      },
    );
    assert.equal(response.status, 200);
  },
);

console.log("ok: lead-api");
