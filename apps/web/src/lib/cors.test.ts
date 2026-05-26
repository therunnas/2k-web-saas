import { test } from "node:test";
import assert from "node:assert/strict";
import { corsHeadersFor, getAllowedOrigins, isOriginAllowed } from "./cors.ts";

// Garante ambiente de produção para validar a allowlist restrita.
process.env.NODE_ENV = "production";
process.env.APP_ORIGIN = "https://2kstudios.com";
process.env.ALLOWED_ORIGINS = "https://app.2kstudios.com, https://painel.com/";

test("allowlist de produção inclui vercel + APP_ORIGIN + ALLOWED_ORIGINS", () => {
  const origins = getAllowedOrigins();
  assert.ok(origins.includes("https://2k-web-saas.vercel.app"));
  assert.ok(origins.includes("https://2kstudios.com"));
  assert.ok(origins.includes("https://app.2kstudios.com"));
  // Barra final é normalizada.
  assert.ok(origins.includes("https://painel.com"));
});

test("origem permitida passa; origem desconhecida é negada", () => {
  assert.equal(isOriginAllowed("https://2kstudios.com"), true);
  assert.equal(isOriginAllowed("https://painel.com"), true); // com ou sem barra
  assert.equal(isOriginAllowed("https://evil.com"), false);
  assert.equal(isOriginAllowed("http://2kstudios.com"), false); // http != https
});

test("sem Origin (same-origin) é liberado", () => {
  assert.equal(isOriginAllowed(null), true);
});

test("nunca usa '*' e habilita credenciais com origem específica", () => {
  const headers = corsHeadersFor("https://2kstudios.com");
  assert.equal(headers["Access-Control-Allow-Origin"], "https://2kstudios.com");
  assert.notEqual(headers["Access-Control-Allow-Origin"], "*");
  assert.equal(headers["Access-Control-Allow-Credentials"], "true");
  assert.equal(headers["Vary"], "Origin");
});

test("same-origin (sem Origin) não emite headers CORS", () => {
  assert.deepEqual(corsHeadersFor(null), {});
});
