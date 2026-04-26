import assert from "node:assert/strict";
import { handleLeadRequest } from "../src/lead-api.mjs";

const formRequest = (fields) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return new Request("https://serenity.test/api/lead", {
    method: "POST",
    body: data,
  });
};

const json = async (response) => response.json();

{
  const response = await handleLeadRequest(formRequest({ name: "", phone: "" }));
  assert.equal(response.status, 422);
  const body = await json(response);
  assert.equal(body.ok, false);
  assert.equal(body.errors.name, "Укажите имя");
  assert.equal(body.errors.phone, "Укажите телефон");
}

{
  const response = await handleLeadRequest(formRequest({ name: "Иван", phone: "+7 999 123-45-67", email: "bad-mail" }));
  assert.equal(response.status, 422);
  const body = await json(response);
  assert.equal(body.errors.email, "Укажите корректный email");
}

{
  const response = await handleLeadRequest(formRequest({ name: "Spam", phone: "+79991234567", manager: "bot" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await json(response), { ok: true, spam: true });
}

{
  const response = await handleLeadRequest(formRequest({ name: "Иван", phone: "+7 999 123-45-67", email: "ivan@example.com" }));
  assert.equal(response.status, 200);
  const body = await json(response);
  assert.equal(body.ok, true);
  assert.equal(body.amo.skipped, true);
  assert.equal(body.email.skipped, true);
}

{
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    return Response.json([{ id: 123 }]);
  };

  const response = await handleLeadRequest(
    formRequest({ name: "Иван", phone: "+7 999 123-45-67", email: "ivan@example.com", comments: "Нужен сайт" }),
    {
      AMO_DOMAIN: "example.amocrm.ru",
      AMO_ACCESS_TOKEN: "token",
      AMO_PHONE_FIELD_ID: "111",
      AMO_EMAIL_FIELD_ID: "222",
    },
    fakeFetch,
  );

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://example.amocrm.ru/api/v4/leads/complex");
  assert.equal(calls[0].init.headers.authorization, "Bearer token");
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload[0]._embedded.contacts[0].custom_fields_values.length, 2);
}

{
  const response = await handleLeadRequest(
    formRequest({ name: "Иван", phone: "+7 999 123-45-67" }),
    {
      AMO_DOMAIN: "example.amocrm.ru",
      AMO_ACCESS_TOKEN: "token",
    },
    async () => new Response("bad", { status: 500 }),
  );

  assert.equal(response.status, 502);
  assert.equal((await json(response)).error, "lead_delivery_failed");
}

console.log("ok: lead-api");
