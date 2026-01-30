const axios = require('axios');
const cheerio = require('cheerio');

const CATALOG = {
    efectoled: {
        // --- ILUMINACIÓN INTERIOR Y TÉCNICA ---
        downlights: 'https://www.efectoled.com/es/11-comprar-downlight-led', 
        paneles: 'https://www.efectoled.com/es/8-comprar-paneles-led', 
        tubos_led: 'https://www.efectoled.com/es/7-comprar-tubos-led', 
        plafones: 'https://www.efectoled.com/es/73-comprar-plafones-led', 
        focos_carril: 'https://www.efectoled.com/es/128-comprar-focos-led-carril', 
        pantallas_led: 'https://www.efectoled.com/es/122-comprar-pantallas-led', 
        campanas_industriales: 'https://www.efectoled.com/es/81-comprar-campanas-industriales-led', 
        emergencias: 'https://www.efectoled.com/es/83-comprar-luces-de-emergencia-led', 
        iluminacion_comercial: 'https://www.efectoled.com/es/93-comprar-iluminacion-led-comercial-para-tiendas', 

        // --- LÁMPARAS POR ESTILO Y ESTANCIA ---
        lamparas: 'https://www.efectoled.com/es/18947-comprar-lamparas', 
        lamparas_techo: 'https://www.efectoled.com/es/1272-comprar-lamparas-de-techo', 
        lamparas_mesa: 'https://www.efectoled.com/es/845-comprar-lamparas-de-mesa', 
        lamparas_pie: 'https://www.efectoled.com/es/846-comprar-lamparas-de-pie', 
        lamparas_pared: 'https://www.efectoled.com/es/11307-comprar-lamparas-de-pared', 
        lamparas_nordicas: 'https://www.efectoled.com/es/11164-comprar-lamparas-estilo-nordico', 
        lamparas_vintage: 'https://www.efectoled.com/es/936-comprar-lamparas-vintage', 
        lamparas_modernas: 'https://www.efectoled.com/es/11176-comprar-lamparas-modernas', 
        lamparas_naturales: 'https://www.efectoled.com/es/11677-comprar-lamparas-de-estilo-natural', 
        lamparas_dormitorio: 'https://www.efectoled.com/es/841-comprar-lamparas-de-dormitorio', 
        lamparas_cocina: 'https://www.efectoled.com/es/833-comprar-lamparas-de-cocinas', 
        lamparas_bano: 'https://www.efectoled.com/es/834-comprar-lamparas-de-bano', 

        // --- EXTERIOR Y SOLAR ---
        exterior: 'https://www.efectoled.com/es/11474-comprar-lamparas-de-exterior', 
        proyectores_led: 'https://www.efectoled.com/es/9-comprar-proyectores-led-exterior', 
        iluminacion_solar: 'https://www.efectoled.com/es/802-comprar-iluminacion-solar-led', 
        jardin_piscinas: 'https://www.efectoled.com/es/13-comprar-piscinas-jardines-y-solar-led', 
        balizas_exterior: 'https://www.efectoled.com/es/85-comprar-balizas-led-exterior', 
        alumbrado_publico: 'https://www.efectoled.com/es/47-comprar-alumbrado-publico-led', 

        // --- TIRAS LED Y SMART HOME ---
        tiras_led: 'https://www.efectoled.com/es/10-comprar-tiras-led', 
        tiras_led_12v: 'https://www.efectoled.com/es/63-comprar-tiras-led-12v-dc', 
        tiras_led_220v: 'https://www.efectoled.com/es/56-comprar-tiras-led-220v-240v-ac', 
        tiras_rgb: 'https://www.efectoled.com/es/25-comprar-tiras-led-rgb-rgbw', 
        domotica: 'https://www.efectoled.com/es/703-comprar-domotica-y-smarthome', 
        control_wifi: 'https://www.efectoled.com/es/1024-comprar-control-wifi', 

        // --- BOMBILLAS ---
        bombillas_led: 'https://www.efectoled.com/es/6-comprar-bombillas-led', 
        bombillas_e27: 'https://www.efectoled.com/es/16-comprar-bombillas-led-e27', 
        bombillas_gu10: 'https://www.efectoled.com/es/17-comprar-bombillas-led-gu10', 
        bombillas_e14: 'https://www.efectoled.com/es/41-comprar-bombillas-led-e14', 
        bombillas_smart: 'https://www.efectoled.com/es/7126-comprar-bombillas-led-smart', 

        // --- MATERIAL ELÉCTRICO ---
        mecanismos: 'https://www.efectoled.com/es/5298-comprar-mecanismos-electricos-empotrables', 
        cables: 'https://www.efectoled.com/es/3283-comprar-cables-electricos', 
        cuadros_electricos: 'https://www.efectoled.com/es/96-comprar-cuadros-electricos', 
        componentes: 'https://www.efectoled.com/es/87-comprar-componentes-electricos', 
        solar_fotovoltaica: 'https://www.efectoled.com/es/1030-comprar-equipos-y-sistemas-de-energia-solar-fotovoltaica', 

        // --- OTROS Y CLIMATIZACIÓN ---
        ventiladores: 'https://www.efectoled.com/es/888-comprar-ventiladores-de-techo', 
        herramientas: 'https://www.efectoled.com/es/1356-comprar-herramientas-profesionales-para-electricistas', 
        outlet: 'https://www.efectoled.com/es/6793-comprar-outled', 
        navidad: 'https://www.efectoled.com/es/164-comprar-luces-de-navidad' 
    },
    greenice: {
        tiras: 'https://greenice.com/collections/tiras-led-770',
        paneles: 'https://greenice.com/collections/paneles-led-420',
        focos: 'https://greenice.com/collections/focos-proyectores-led-para-exterior-663',
        profesional: 'https://greenice.com/collections/iluminacion-led-profesional-362'
    }
};

export default async function handler(req, res) {
    const site = req.query.site || 'efectoled';
    const cat = req.query.cat || (site === 'efectoled' ? 'downlights' : 'tiras');

    // Validación de categoría
    if (!CATALOG[site] || !CATALOG[site][cat]) {
        return res.status(400).json({ success: false, error: 'Categoría no válida' });
    }

    const targetUrl = CATALOG[site][cat];

    try {
        if (site === 'greenice') {
            return await handleGreenIce(res, targetUrl);
        } else {
            return await handleEfectoLED(res, targetUrl);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function handleEfectoLED(res, baseUrl) {
    const totalPagesToScan = 15;
    const allProducts = [];

    const promises = [];
    for (let i = 1; i <= totalPagesToScan; i++) {
        promises.push(fetchEfectoPage(`${baseUrl}?page=${i}`));
    }

    const results = await Promise.all(promises.map(p => p.catch(() => [])));
    
    results.forEach(products => {
        if (products && products.length > 0) {
            allProducts.push(...products);
        }
    });

    const unique = Array.from(new Map(allProducts.filter(p => p.ref !== "N/A").map(p => [p.ref, p])).values());

    res.status(200).json({
        success: true,
        total: unique.length,
        pagesScanned: totalPagesToScan,
        data: unique
    });
}

async function fetchEfectoPage(url) {
    const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' },
        timeout: 10000
    });
    const $ = cheerio.load(data);
    const products = [];

    $('script[type="application/ld+json"]').each((i, el) => {
        try {
            const json = JSON.parse($(el).html());
            const items = json.itemListElement || (json['@type'] === 'ItemList' ? json.itemListElement : null);
            if (items) {
                items.forEach(item => {
                    const p = item.item || item;
                    if (p.name) {
                        products.push({
                            ref: p.sku || p.mpn || (p.url ? p.url.split('/').pop().split('-')[0] : "N/A"),
                            nombre: p.name,
                            precio: p.offers ? `${p.offers.price || p.offers.offers[0].price} €` : "Ver web",
                            imagen: p.image || "",
                            enlace: p.url
                        });
                    }
                });
            }
        } catch (e) {}
    });

    if (products.length === 0) {
        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            const nombre = $el.find('.product-title').text().trim();
            if (nombre) {
                const matchRef = $el.text().match(/Ref\s*(\d+)/i);
                products.push({
                    ref: matchRef ? matchRef[1] : ($el.attr('data-id-product') || "N/A"),
                    nombre: nombre,
                    precio: $el.find('.price').text().trim(),
                    imagen: $el.find('img').attr('data-src') || $el.find('img').attr('src'),
                    enlace: $el.find('a').attr('href')
                });
            }
        });
    }
    return products;
}

async function handleGreenIce(res, baseUrl) {
    const jsonUrl = `${baseUrl}/products.json?limit=250`;
    const { data } = await axios.get(jsonUrl);
    const products = data.products.map(p => ({
        ref: p.variants[0].sku || "S/R",
        nombre: p.title,
        precio: `${p.variants[0].price} €`,
        imagen: p.images[0]?.src || "",
        enlace: `https://greenice.com/products/${p.handle}`
    }));
    res.status(200).json({ success: true, total: products.length, data: products });
}
