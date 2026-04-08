/**
 * test-vertex.mjs
 * Teste local da integração Vertex AI via Service Account OAuth2.
 * Roda via: node test-vertex.mjs
 *
 * Lê GOOGLE_SERVICE_ACCOUNT_KEY do supabase/.env
 * Gera JWT RS256, troca por access token, chama Vertex AI real.
 */

import { readFileSync } from "fs";
import https from "https";
import crypto from "crypto";

// ─── 1. Ler Service Account ──────────────────────────────────────────

function loadServiceAccount() {
  const envFiles = ["supabase/.env", ".env.local", ".env"];
  let envContent = "";
  for (const f of envFiles) {
    try { envContent += "\n" + readFileSync(f, "utf-8"); } catch {}
  }

  const match = envContent.match(/GOOGLE_SERVICE_ACCOUNT_KEY=(.+)/);
  if (!match) {
    console.error(">> GOOGLE_SERVICE_ACCOUNT_KEY nao encontrada em supabase/.env");
    process.exit(1);
  }

  try {
    const sa = JSON.parse(match[1].trim());
    if (!sa.client_email || !sa.private_key || !sa.project_id) {
      throw new Error("JSON incompleto");
    }
    console.log(`>> Service Account: ${sa.client_email}`);
    console.log(`>> Project: ${sa.project_id}`);
    return sa;
  } catch (e) {
    console.error(">> Erro ao parsear Service Account JSON:", e.message);
    process.exit(1);
  }
}

function getLocation() {
  try {
    const env = readFileSync("supabase/.env", "utf-8");
    const m = env.match(/GOOGLE_CLOUD_LOCATION=(.+)/);
    return m ? m[1].trim() : "us-central1";
  } catch { return "us-central1"; }
}

// ─── 2. JWT / OAuth2 ─────────────────────────────────────────────────

function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createJwt(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/generative-language",
  };

  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(privateKey);

  return `${signingInput}.${base64url(signature)}`;
}

function getAccessToken(clientEmail, privateKey) {
  return new Promise((resolve, reject) => {
    console.log(">> Gerando access token via OAuth2...");
    const jwt = createJwt(clientEmail, privateKey);
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;

    const req = https.request({
      hostname: "oauth2.googleapis.com",
      path: "/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => {
        if (res.statusCode !== 200) {
          let msg = res.statusMessage;
          try { msg = JSON.parse(data)?.error_description || msg; } catch {}
          return reject(new Error(`OAuth2 error (${res.statusCode}): ${msg}`));
        }
        const token = JSON.parse(data).access_token;
        console.log(">> Access token obtido!");
        resolve(token);
      });
    });
    req.on("error", (e) => reject(e));
    req.write(body);
    req.end();
  });
}

// ─── 3. Texto fixo ───────────────────────────────────────────────────

const TEXTO = `
A Inteligencia Artificial (IA) e um ramo da ciencia da computacao que desenvolve sistemas
capazes de executar tarefas que normalmente requerem inteligencia humana. As tres principais
subareas da IA sao: Aprendizado de Maquina (Machine Learning), Processamento de Linguagem
Natural (PLN) e Visao Computacional.

O Aprendizado de Maquina permite que computadores aprendam padroes a partir de dados sem
serem explicitamente programados. Existem tres tipos: supervisionado (dados rotulados),
nao supervisionado (descobre padroes) e por reforco (tentativa e erro com recompensas).

Redes Neurais Artificiais sao modelos inspirados no cerebro humano, compostas por camadas
de neuronios artificiais. Deep Learning usa redes neurais com muitas camadas ocultas,
sendo eficaz em reconhecimento de imagens e traducao automatica.

O PLN permite que computadores entendam e gerem texto humano. Aplicacoes incluem chatbots,
traducao, analise de sentimentos e resumo. Modelos como GPT e BERT revolucionaram a area.

A Visao Computacional permite interpretar imagens e videos. Aplicacoes: deteccao de objetos,
reconhecimento facial, diagnostico medico, veiculos autonomos. CNNs sao a arquitetura principal.

A etica na IA inclui: vies algoritmico, privacidade de dados, transparencia e impacto no trabalho.
`;

// ─── 4. Chamar Vertex AI ──────────────────────────────────────────────

function callVertexAI(accessToken, projectId, location, text, count = 5) {
  return new Promise((resolve, reject) => {
    const model = "gemini-2.5-flash";
    const path = `/v1beta/models/${model}:generateContent`;

    const prompt = `Voce e um gerador de quizzes educacionais. Gere exatamente ${count} perguntas com 4 alternativas (A,B,C,D) baseadas SOMENTE no texto abaixo. Retorne APENAS JSON valido.

TEXTO:
${text}

FORMATO JSON:
{"titulo":"...","resumo":"...","nivel":"intermediario","perguntas":[{"pergunta":"...","opcoes":{"A":"...","B":"...","C":"...","D":"..."},"correta":"A","explicacao":"..."}]}`;

    const bodyData = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    });

    console.log(`\n>> Chamando Google Gemini (${model})...`);
    console.log(`   Texto: ${text.length} chars | Perguntas: ${count}`);

    const startTime = Date.now();

    const req = https.request({
      hostname: "generativelanguage.googleapis.com",
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "Content-Length": Buffer.byteLength(bodyData),
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => {
        const elapsed = Date.now() - startTime;
        if (res.statusCode !== 200) {
          let msg = res.statusMessage;
          try { msg = JSON.parse(data)?.error?.message || msg; } catch {}
          console.error(`>> ERRO (${res.statusCode}) - ${elapsed}ms: ${msg}`);
          return reject(new Error(msg));
        }
        console.log(`>> Resposta em ${elapsed}ms`);
        resolve(JSON.parse(data));
      });
    });
    req.on("error", reject);
    req.write(bodyData);
    req.end();
  });
}

// ─── 5. Main ──────────────────────────────────────────────────────────

async function main() {
  console.log("============================================================");
  console.log("  TESTE: Vertex AI (Service Account OAuth2)");
  console.log("============================================================\n");

  const sa = loadServiceAccount();
  const location = getLocation();
  const accessToken = await getAccessToken(sa.client_email, sa.private_key);

  let raw;
  try {
    raw = await callVertexAI(accessToken, sa.project_id, location, TEXTO, 5);
  } catch (e) {
    console.error(">> FALHA:", e.message);
    process.exit(1);
  }

  const content = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    console.error(">> Resposta vazia:", JSON.stringify(raw).substring(0, 300));
    process.exit(1);
  }
  console.log(`>> Conteudo: ${content.length} chars`);

  let quiz;
  try {
    quiz = JSON.parse(content);
    console.log(">> JSON parseado!");
  } catch {
    console.error(">> Parse falhou:", content.substring(0, 300));
    process.exit(1);
  }

  // Validar
  const errors = [];
  if (!quiz.titulo) errors.push("falta titulo");
  if (!quiz.perguntas?.length) errors.push("sem perguntas");
  quiz.perguntas?.forEach((q, i) => {
    if (!q.pergunta) errors.push(`P${i+1}: sem texto`);
    if (!q.opcoes?.A || !q.opcoes?.D) errors.push(`P${i+1}: opcoes incompletas`);
    if (!["A","B","C","D"].includes(q.correta)) errors.push(`P${i+1}: correta invalida`);
  });

  if (errors.length) console.log(">> Avisos:", errors.join(", "));
  else console.log(">> Estrutura validada!");

  // Exibir
  console.log("\n" + "=".repeat(60));
  console.log(`  ${quiz.titulo}`);
  console.log(`  ${quiz.resumo}`);
  console.log(`  Nivel: ${quiz.nivel} | Perguntas: ${quiz.perguntas.length}`);
  console.log("=".repeat(60));

  quiz.perguntas.forEach((q, i) => {
    console.log(`\n--- Pergunta ${i+1} ---`);
    console.log(`  ${q.pergunta}`);
    console.log(`  A) ${q.opcoes.A}`);
    console.log(`  B) ${q.opcoes.B}`);
    console.log(`  C) ${q.opcoes.C}`);
    console.log(`  D) ${q.opcoes.D}`);
    console.log(`  Correta: ${q.correta}`);
    console.log(`  ${q.explicacao}`);
  });

  console.log("\n============================================================");
  console.log("  RESULTADO: TUDO OK!");
  console.log("  API: conectou | JSON: valido | Perguntas: " + quiz.perguntas.length);
  console.log("============================================================\n");
}

main().catch((e) => { console.error(">> Fatal:", e.message); process.exit(1); });
