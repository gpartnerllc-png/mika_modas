// ============================================================
//  MIKA MODAS — Worker Cloudflare (loja de atacado de lingerie)
//  - Serve a vitrine estática (assets)
//  - /api/produtos    -> catálogo automático da fábrica (Use Intuição)
//  - /api/lead        -> alerta de lead no Telegram
//  - /api/checkout    -> cria link de pagamento InfinitePay (PIX/Cartão)
//  - /webhook/infinitepay -> confirmação de pagamento -> Telegram
//  Segredos (wrangler secret put):
//    INFINITEPAY_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// ============================================================

const MARGEM_LUCRO = 1.5;
const MIN_ORDER = 800;
const PIX_KEY = "pago@droppfy.com";
const PIX_NOME = "MIQUELY MODAS";
const PIX_CIDADE = "BRASILIA";

const CATALOGO_BASE = "https://novidadesnaloja.moda/mikaelenascimento/72F3A57/catalogovirtual";
const CATALOGO_API = "https://novidadesnaloja.moda/php/";
const INFINITEPAY_API = "https://api.checkout.infinitepay.io/links";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Catálogo de emergência (mantém a loja viva se a fábrica estiver fora do ar)
const FALLBACK = [
  ["Calcinha Fio de Renda", 25.9, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/8/1002_preto_(1).jpg"],
  ["Sutiã Tomara qCaia", 65.77, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/18/uploadapi_1716828210.jpeg"],
  ["Conjunto Short Doll", 77.67, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/9/20230313152013whatsapp_image_2023-03-13_at_15.17.49_e.jpg"],
  ["Body Manga Longa", 94.4, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/30/20250820162500_intuicao3_32_e.jpg"],
  ["Jasmin Cropped Sem Bojo", 58.7, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/22/2022101311531022506_(6)_e.jpg"],
  ["Bore Suite Laranja", 73.4, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/24/20231206113500_img_7362_e1.jpg"],
  ["Bralette Radiante", 50.4, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/24/20231206114055_img_7370_e.jpg"],
  ["Bore Bojo Removível Renda", 52.4, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/11/20210629160317ref._4004_(1)_e.jpg"],
  ["Sutiã Basic Reforçado", 47.2, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20230330090806whatsapp_image_2023-03-30_at_08.49.20_e1.jpeg"],
  ["Conjunto Bojo Renda", 62.9, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/11/20251202095430_intuicao_30_e.jpg"],
  ["Conjunto Cropped Fetish", 57.65, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/15/20250522113207_img_7152_e.jpg"],
  ["Conj Alto Fetish", 57.9, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/15/4111_(2)_ec.jpg"],
  ["Bore Renda e Tule", 62.9, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20230519102154_whatsappimage20230519at10183828129_e.jpeg"],
  ["Conjunto B.Tomara qCaia", 78.65, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/9/20231117163638_whatsappimage20231117at150951_e.jpeg"],
  ["Conjunto Renda Encanto", 64.4, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/1/20251006155146_intuicao_31_e.jpg"],
  ["Conjunto Cirre Elastico", 63.69, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/22/20231120104222_whatsappimage20231117at104556_e.jpeg"],
  ["Trad C Encaixe", 49.46, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20250821134227_whatsappimage20250821at120153_e.jpg"],
  ["Robe Platitude", 124.99, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/11/20251202101449_intuicao_1728129_e.jpg"],
  ["Conjunto Top Renda", 49.8, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20250821090129_intuicao3_5_e.jpg"],
  ["Camisola Longa de Seda", 115.47, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/23/20250820174928_intuicao3_57_e.jpg"],
  ["Conjunto Perola Encanto", 60.86, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/1/20251218144817_intuicaodez25_31_e.jpg"],
  ["Blusa M.Longa Tule", 41.96, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/24/20231206122501_img_7426_e.jpg"],
  ["Conjunto Cropped Giovanna", 64.33, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20250725112922_whatsappimage20250723at170229_e.jpg"],
  ["Conjunto B Stella", 74.94, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/26/20250820175544_intuicao3_48_e.jpg"],
  ["Conjunto Cropped On Fire", 89.28, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/25/20250522105424_img_7142_e.jpg"],
  ["Renda Ilusion", 68.28, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/7/20250820173918_intuicao3_24_e.jpg"],
  ["Glamour On Fire", 94.4, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/25/20251218112643_intuicaodez25_7_e.jpg"],
  ["Conj S/Bojo C/Aro Amor", 62.98, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/21/20251006162203_intuicao_17_e.jpg"],
  ["Conj Cropped Ilusion", 69.49, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/2/20250821095001_intuicao3_8_e.jpg"],
  ["Camisola Livinia", 84.97, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/17/20250801100605_img_8262_e.jpg"],
  ["Robe Tule Renda", 94.98, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/7/20251007082926_intuicao_14_e.jpg"],
  ["Conjunto Bralette Radiante", 54.64, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/24/20231206114319_img_7343_e.jpg"],
  ["Conjunto Cropped Babado", 74.54, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/11/20250801093940_096a9085_e.jpg"],
  ["Camisola Sensual", 94.4, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/28/20250715111609_img_8266_e.jpg"],
  ["Bore Asa Delta", 72.4, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/11/20250909153843_intuicaoset25_e.jpg"],
  ["Bore Renda Decote", 62.69, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20250909141405_intuicaoset25_23_e.jpg"],
  ["Conj S/Bojo E C/Aro Nite", 69.0, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/2/20250909143127_intuicaoset25_49_e.jpg"],
  ["Conjunto Soft Secret", 69.48, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/28/20250909144502_intuicaoset25_43_e.jpg"],
  ["Conjunto Luxe Secret", 74.54, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/28/20251007082031_intuicao_3_e.jpg"],
  ["Conjunto Balcone", 63.88, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/28/20250522101047_img_716828129_e.jpg"],
  ["Bore S/Manga", 89.49, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/30/20250820164925_intuicao3_42_e.jpg"],
  ["Bore Margarida Renda Tule", 74.44, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/22/20250821084610_intuicao3_27_e.jpg"],
  ["Bore Manga Longa", 94.4, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/30/20250820162500_intuicao3_32_e.jpg"],
  ["Sutiã Amamentação S/Costura", 47.4, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/6/20220307160240whatsapp_image_2022-03-07_at_14.56.51_e.jpg"],
  ["Sutiã Amamentação Bojo S/Costura", 49.64, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/18/uploadapi_1717558113.jpeg"],
  ["Sutiã Amamentação C/Renda S/Costura", 54.98, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/18/uploadapi_1716580958.jpeg"],
  ["Sutiã Adesivo", 52.45, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/18/uploadapi_1716578271.jpeg"],
  ["Sutiã Power Laser", 64.48, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/18/uploadapi_1726157437.jpeg"],
  ["Sutiã Up Bolha", 69.49, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/18/uploadapi_1716834000.jpeg"],
  ["Calcinha M Tanga Lisa", 16.49, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20240517104309_whatsappimage20240517at10183128129_e.jpeg"],
  ["Calcinha Fio Micro Lisa", 19.99, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20231002174846_whatsappimage20231002at174112_e.jpeg"],
  ["Calcinha MicroFibra Dupla", 19.56, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20240517102516_whatsappimage20240517at101916_e.jpeg"],
  ["Calcinha Fio MicroFibra Dupla", 19.54, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20230911095939_whatsappimage20230904at105708_e.jpeg"],
  ["Calcinha Renda MicroFibra", 19.67, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20230818142755_whatsappimage20230818at141504_e.jpeg"],
  ["Calcinha String Fio Renda", 16.76, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20230623165155_whatsappimage20230623at14352228229_e.jpg"],
  ["Calcinha Cos Largo Fio", 19.77, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20230815143028_whatsappimage20230815at142018_e.jpeg"],
  ["Calcinha Fio D Delicotton", 19.78, "https://imagens.viashopmoda.com.br/upload/Goiania_Intuicao/colecoes/19/20230818144857_whatsappimage20230818at140055_e.jpeg"],
];

function atacadoPrice(base) {
  return Math.round(base * MARGEM_LUCRO * 100) / 100;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

// ------------------------------------------------------------
//  Catálogo automático (com cookie de sessão + cache de 10 min)
// ------------------------------------------------------------
async function fetchCatalogo(env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request("https://mika-modas.internal/produtos");
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    const jar = {};
    const s1 = await fetch(CATALOGO_BASE, { headers: { "User-Agent": UA } });
    const setCookies = (s1.headers.getSetCookie && s1.headers.getSetCookie()) || [];
    for (const c of setCookies) {
      const m = /^([^=;]+)=([^;]*)/.exec(c);
      if (m) jar[m[1].trim()] = m[2];
    }
    const cookieHeader = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");

    const all = [];
    for (let page = 0; page < 5; page++) {
      const res = await fetch(
        `${CATALOGO_API}?conteudo=produtos&tipo=exibe&pagina=${page}`,
        {
          headers: {
            "User-Agent": UA,
            "X-Requested-With": "XMLHttpRequest",
            Cookie: cookieHeader,
          },
        }
      );
      const texto = (await res.text()).trim();
      try {
        const obj = JSON.parse(texto);
        if (Array.isArray(obj.produtos)) all.push(...obj.produtos);
      } catch {
        break;
      }
    }

    const filtros = await extrairFiltros(jar, cookieHeader);

    const produtos = all.map((p) => ({
      id: p.Prod_ID,
      ref: p.Prod_CodRef,
      nome: (p.Prod_Desc || "").toUpperCase(),
      colecao: p.Prod_CodColecao,
      categoria: p.Prod_CodCategoria,
      foto: p.fotoPrincipal || "",
      varejo: parseFloat(p.Prod_PrecoVarejo || "0"),
      base: parseFloat(p.verif?.Prod_Preco || "0"),
      atacado: atacadoPrice(parseFloat(p.verif?.Prod_Preco || "0")),
      cores: normalizarCores(p.estoque),
    })).filter((p) => p.atacado > 0 && p.foto);

    const resposta = json({
      loja: "Miquely Modas",
      origem: "Use Intuição (Goiânia)",
      total: produtos.length,
      margem: MARGEM_LUCRO,
      pedidoMinimo: MIN_ORDER,
      filtros: filtros || {},
      produtos,
      atualizadoEm: new Date().toISOString(),
    });
    resposta.headers.set("Cache-Control", "public, max-age=600, s-maxage=600");
    ctx.waitUntil(cache.put(cacheKey, resposta.clone()));
    return resposta;
  } catch (e) {
    // Fonte fora do ar -> catálogo de emergência
    return json({
      loja: "Miquely Modas",
      origem: "Catálogo reserva",
      total: FALLBACK.length,
      margem: MARGEM_LUCRO,
      pedidoMinimo: MIN_ORDER,
      filtros: {},
      produtos: FALLBACK.map((f, i) => ({
        id: `fb-${i}`,
        ref: `FB${800 + i}`,
        nome: f[0].toUpperCase(),
        colecao: "",
        categoria: "",
        foto: f[2],
        varejo: 0,
        base: f[1],
        atacado: atacadoPrice(f[1]),
        cores: [
          { nome: "Preto", style: "background-color:#000000", tamanhos: ["P", "M", "G", "GG"] },
          { nome: "Branco", style: "background-color:#ffffff", tamanhos: ["P", "M", "G", "GG"] },
          { nome: "Rosa", style: "background-color:#f9a8d4", tamanhos: ["P", "M", "G", "GG"] },
        ],
      })),
      atualizadoEm: new Date().toISOString(),
    });
  }
}

async function extrairFiltros(jar, cookieHeader) {
  try {
    const res = await fetch(`${CATALOGO_API}?conteudo=produtos&tipo=exibe&pagina=0`, {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookieHeader,
      },
    });
    const obj = JSON.parse((await res.text()).trim());
    const f = obj.filtros || {};
    const map = (arr) => {
      const o = {};
      (arr || []).forEach((v) => (o[v.id] = v.nome));
      return o;
    };
    return { categorias: map(f.categorias?.values), colecoes: map(f.colecoes?.values) };
  } catch {
    return null;
  }
}

function normalizarCores(estoque) {
  const cores = [];
  if (estoque && typeof estoque === "object") {
    for (const [id, info] of Object.entries(estoque)) {
      cores.push({
        id,
        nome: (info.descricao || "Cor").toLowerCase(),
        style: info.style || "background-color:#000000",
        tamanhos: Array.isArray(info.grades) ? info.grades : ["P", "M", "G", "GG"],
      });
    }
  }
  if (cores.length === 0) {
    cores.push(
      { nome: "preto", style: "background-color:#000000", tamanhos: ["P", "M", "G", "GG"] },
      { nome: "branco", style: "background-color:#ffffff;border:1px solid #ddd", tamanhos: ["P", "M", "G", "GG"] },
      { nome: "rosa", style: "background-color:#f9a8d4", tamanhos: ["P", "M", "G", "GG"] }
    );
  }
  return cores;
}

// ------------------------------------------------------------
//  Banners dinâmicos (lê os banners ativos no site da fábrica)
// ------------------------------------------------------------
async function fetchBanners(env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request("https://mika-modas.internal/banners");
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const validas = [];
  try {
    const home = await fetch("https://www.useintuicao.com.br/", { headers: { "User-Agent": UA } });
    const html = await home.text();
    const urls = [
      ...new Set(
        [...html.matchAll(/https:\/\/imagens\.viashopmoda\.com\.br\/upload\/[^"'\s)]*Principal\/[^"'\s)]*banner[^"'\s)]*\.(?:jpg|jpeg|png)/gi)
        ].map((m) => m[0])
      ),
    ];
    for (const u of urls) {
      if (validas.length >= 4) break;
      try {
        const r = await fetch(u, { headers: { "User-Agent": UA } });
        if (r.ok && (r.headers.get("content-type") || "").startsWith("image/")) validas.push(u);
      } catch {
        /* pula banner quebrado */
      }
    }
  } catch {
    /* site da fábrica fora do ar -> banners vazios, vitrine usa fundo elegante */
  }

  const resposta = json({ banners: validas });
  resposta.headers.set("Cache-Control", "public, max-age=600, s-maxage=600");
  ctx.waitUntil(cache.put(cacheKey, resposta.clone()));
  return resposta;
}

// ------------------------------------------------------------
//  Telegram (bot token e chat id ficam em segredos do Worker)
// ------------------------------------------------------------
async function sendTelegram(env, msg) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chat = env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: msg, parse_mode: "Markdown" }),
    });
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------
//  Lead -> Telegram
// ------------------------------------------------------------
async function handleLead(request, env) {
  let dados;
  try {
    dados = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }
  const nome = String(dados.nome || "").slice(0, 80);
  const email = String(dados.email || "").slice(0, 120);
  const fone = String(dados.telefone || "").slice(0, 40);
  const cep = String(dados.cep || "").slice(0, 20);
  if (!email.includes("@")) return json({ ok: false }, 400);

  const msg =
    `👣 *LEAD CAPTURADO — Miquely Modas*\n\n` +
    `*Nome:* ${nome || "—"}\n` +
    `*Email:* ${email}\n` +
    `*WhatsApp:* ${fone || "—"}\n` +
    `*CEP:* ${cep || "—"}\n` +
    `_Origem: vitrine atacado_`;
  await sendTelegram(env, msg);
  return json({ ok: true });
}

// ------------------------------------------------------------
//  PIX direto — QR Code estático com a chave pago@droppfy.com
//  (EMV BR Code "copia e cola" + CRC16-CCITT, padrão Banco Central)
// ------------------------------------------------------------
function crc16Pix(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function emv(tag, valor) {
  if (valor === undefined || valor === null || valor === "") return "";
  return `${tag}${String(valor.length).padStart(2, "0")}${valor}`;
}

function buildPixCopiaECola({ chave, valor, txid }) {
  const gui = emv("00", "br.gov.bcb.pix") + emv("01", chave);
  let payload =
    emv("00", "01") +
    emv("26", gui) +
    emv("52", "0000") +
    emv("53", "986") +
    emv("54", valor.toFixed(2)) +
    emv("58", "BR") +
    emv("59", PIX_NOME) +
    emv("60", PIX_CIDADE);
  if (txid) payload += emv("62", emv("05", txid));
  return payload + "6304" + crc16Pix(payload + "6304");
}

// ------------------------------------------------------------
//  Checkout: PIX direto (QR Code na loja) ou InfinitePay (cartão)
// ------------------------------------------------------------
async function handleCheckout(request, env, ctx) {
  let dados;
  try {
    dados = await request.json();
  } catch {
    return json({ ok: false, erro: "Requisição inválida." }, 400);
  }

  const cliente = dados.customer || {};
  const itens = Array.isArray(dados.items) ? dados.items.slice(0, 80) : [];
  const metodo = dados.method === "credit_card" ? "credit_card" : "pix";
  if (itens.length === 0) return json({ ok: false, erro: "Sacola vazia." }, 400);
  if (!String(cliente.email || "").includes("@")) return json({ ok: false, erro: "E-mail obrigatório." }, 400);
  if (!String(cliente.name || "").trim()) return json({ ok: false, erro: "Nome obrigatório." }, 400);

  // Preço confiável: busca no catálogo da fábrica (evita adulteração de preço no navegador)
  let tabela = null;
  try {
    const r = await fetchCatalogo(env, ctx);
    const obj = await r.json();
    tabela = new Map((obj.produtos || []).map((p) => [String(p.id), p]));
  } catch {
    tabela = new Map();
  }

  const itensPay = [];
  let total = 0;
  const linhas = [];

  for (const item of itens) {
    const qty = Math.max(1, Math.min(50, parseInt(item.qty) || 1));
    const cat = tabela.get(String(item.id));
    const preco = cat ? cat.atacado : Math.min(100000, Math.max(0.5, parseFloat(item.preco) || 0));
    const desc = `${String(item.nome || "Produto").toUpperCase()} ${String(item.cor || "").toUpperCase()} ${String(item.tam || "").toUpperCase()}`.trim();
    const cents = Math.round(preco * 100);
    total += cents * qty;
    itensPay.push({ quantity: qty, price: cents, description: desc });
    linhas.push(`• ${desc} — ${qty}x R$ ${preco.toFixed(2).replace(".", ",")}`);
  }

  const totalReais = total / 100;
  if (totalReais < MIN_ORDER) {
    return json({ ok: false, erro: `Pedido mínimo de R$ ${MIN_ORDER.toFixed(2)} ainda não atingido.` }, 400);
  }

  const origin = String(dados.origin || "https://moda.droppfy.com").replace(/[^a-zA-Z0-9:/.\-_]/g, "");
  const nsu = `MM${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

  // ---- PIX DIRETO: QR Code com a chave pago@droppfy.com (sem gateway) ----
  if (metodo === "pix") {
    const valorFinal = Math.round(total * 0.95) / 100;
    const copiaECola = buildPixCopiaECola({
      chave: PIX_KEY,
      valor: valorFinal,
      txid: nsu,
    });

    const msg =
      `🛒 *PEDIDO PIX GERADO — Miquely Modas*\n\n` +
      `👤 *CLIENTE:* ${cliente.name}\n` +
      `🆔 *CPF:* ${cliente.cpf || "—"}\n` +
      `📧 *EMAIL:* ${cliente.email}\n` +
      `📱 *WHATS:* ${cliente.phone || "—"}\n` +
      `📍 *CEP:* ${cliente.cep || "—"}\n\n` +
      `🛒 *PRODUTOS:*\n${linhas.join("\n")}\n\n` +
      `💵 *TOTAL:* R$ ${totalReais.toFixed(2).replace(".", ",")}\n` +
      `🏷️ *PIX (5% OFF):* R$ ${valorFinal.toFixed(2).replace(".", ",")}\n` +
      `🔑 *CHAVE:* ${PIX_KEY}\n` +
      `🧾 *NSU:* ${nsu}\n` +
      `⏳ _Aguardando comprovante_`;
    ctx.waitUntil(sendTelegram(env, msg));

    return json({
      ok: true,
      modo: "pix",
      nsu,
      pix: {
        chave: PIX_KEY,
        valor: totalReais,
        desconto: 5,
        valorFinal,
        copiaECola,
      },
    });
  }

  // ---- CARTÃO: gateway InfinitePay ----
  const key = env.INFINITEPAY_API_KEY;
  if (!key) return json({ ok: false, erro: "Gateway de pagamento não configurado." }, 503);

  const payload = {
    handle: "partner12",
    order_nsu: nsu,
    redirect_url: `${origin}/#pedido-enviado`,
    items: itensPay,
    customer: {
      name: String(cliente.name).slice(0, 120),
      email: String(cliente.email).slice(0, 120),
    },
    options: {
      assured_installments: 3,
      require_delivery_address: true,
      single_payment: true,
      valid_until: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      payment_methods_enabled: ["credit_card"],
      discounts: { credit_card: 0.5 },
    },
    webhook: {
      url: `${new URL(request.url).origin}/webhook/infinitepay`,
      events: ["paid", "canceled"],
    },
    webhook_url: `${new URL(request.url).origin}/webhook/infinitepay`,
    metadata: {
      order_nsu: nsu,
      customer_cpf: String(cliente.cpf || "").slice(0, 20),
      customer_phone: String(cliente.phone || "").slice(0, 30),
      pix_key: "pago@droppfy.com",
    },
  };

  const resp = await fetch(INFINITEPAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": key,
    },
    body: JSON.stringify(payload),
  });

  const texto = await resp.text();
  let resultado = null;
  try {
    resultado = JSON.parse(texto);
  } catch {
    resultado = null;
  }

  const url =
    (resultado && (resultado.url || resultado.link || resultado.payment_url ||
      resultado.checkout_url || resultado.payment_link ||
      (resultado.data && (resultado.data.url || resultado.data.link || resultado.data.payment_url)))) || null;

  if (resp.ok && url) {
    // Aviso no Telegram (igual ao atual, mas SEM dados de cartão — PCI seguro)
    const msg =
      `💰 *NOVO PEDIDO — Miquely Modas*\n\n` +
      `👤 *CLIENTE:* ${cliente.name}\n` +
      `🆔 *CPF:* ${cliente.cpf || "—"}\n` +
      `📧 *EMAIL:* ${cliente.email}\n` +
      `📱 *WHATS:* ${cliente.phone || "—"}\n\n` +
      `🛒 *PRODUTOS:*\n${linhas.join("\n")}\n\n` +
      `💵 *TOTAL:* R$ ${totalReais.toFixed(2).replace(".", ",")}\n` +
      `🔐 *PAGAMENTO:* CARTÃO DE CRÉDITO (0,5% OFF)\n` +
      `🧾 *NSU:* ${nsu}`;
    ctx.waitUntil(sendTelegram(env, msg));

    return json({ ok: true, url, nsu });
  }

  // Tenta extrair mensagem de erro do gateway
  const erro =
    (resultado && (resultado.message || resultado.error ||
      (resultado.data && resultado.data.message))) || "Falha ao criar o pagamento.";
  return json({ ok: false, erro: String(erro).slice(0, 300) }, 502);
}

// ------------------------------------------------------------
//  Webhook InfinitePay -> Telegram (pagamento confirmado)
// ------------------------------------------------------------
async function handleWebhook(request, env) {
  let dados = {};
  try {
    dados = await request.json();
  } catch {
    dados = {};
  }
  const evento = String(dados.event || dados.status || dados.type || "evento").toLowerCase();
  const nsu = dados.order_nsu || dados.metadata?.order_nsu || dados.reference || "";

  let icone = "🔔";
  let texto = "ATUALIZAÇÃO DE PAGAMENTO";
  if (evento.includes("paid") || evento.includes("confirmed") || evento.includes("approved") || evento === "pago") {
    icone = "✅";
    texto = "PAGAMENTO APROVADO";
  } else if (evento.includes("cancel") || evento.includes("fail") || evento.includes("expire") || evento.includes("refund")) {
    icone = "⚠️";
    texto = "PAGAMENTO CANCELADO/EXPIRADO";
  }

  const msg = `${icone} *${texto} — Miquely Modas*\n\n*Evento:* ${evento}${nsu ? `\n*NSU:* ${nsu}` : ""}`;
  await sendTelegram(env, msg);
  return json({ ok: true });
}

// ------------------------------------------------------------
//  Rate limit simples (por IP, janela de 1 min)
// ------------------------------------------------------------
const hits = new Map();
function rateLimit(ip, max = 20) {
  const now = Date.now();
  const entry = hits.get(ip) || { n: 0, t: now };
  if (now - entry.t > 60000) {
    entry.n = 0;
    entry.t = now;
  }
  entry.n++;
  hits.set(ip, entry);
  return entry.n > max;
}

// ------------------------------------------------------------
//  Router
// ------------------------------------------------------------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "local";

    if (path === "/api/produtos") {
      if (rateLimit(ip, 30)) return json({ ok: false, erro: "Muitas requisições." }, 429);
      return fetchCatalogo(env, ctx);
    }

    if (path === "/api/banners") {
      if (rateLimit(ip, 30)) return json({ ok: false, erro: "Muitas requisições." }, 429);
      return fetchBanners(env, ctx);
    }

    if (path === "/api/lead" && request.method === "POST") {
      if (rateLimit(ip, 30)) return json({ ok: false }, 429);
      return handleLead(request, env);
    }

    if (path === "/api/checkout" && request.method === "POST") {
      if (rateLimit(ip, 10)) return json({ ok: false, erro: "Aguarde um instante antes de tentar novamente." }, 429);
      return handleCheckout(request, env, ctx);
    }

    if (path === "/webhook/infinitepay" && request.method === "POST") {
      return handleWebhook(request, env);
    }

    if (path === "/api/saude") {
      return json({ ok: true, loja: "Miquely Modas", hora: new Date().toISOString() });
    }

    // Tudo o mais -> vitrine estática (assets)
    return env.ASSETS.fetch(request);
  },
};
