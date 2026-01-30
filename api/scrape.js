const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const baseUrl = 'https://www.efectoled.com/es/11-comprar-downlight-led';
    const allProducts = [];
    
    try {
        // 1. PRIMERA PETICIÓN: Para obtener la primera página y saber cuántas hay en total
        const firstPageData = await fetchPage(baseUrl + '?page=1');
        allProducts.push(...firstPageData.products);

        // 2. DETECTAR TOTAL DE PÁGINAS
        // Buscamos el último número en la lista de paginación
        const $ = firstPageData.$;
        const paginationLinks = $('.page-list li a.js-search-link');
        let totalPages = 1;

        paginationLinks.each((i, el) => {
            const pageNum = parseInt($(el).text().trim());
            if (!isNaN(pageNum) && pageNum > totalPages) {
                totalPages = pageNum;
            }
        });

        // 3. BUCLE PARA EL RESTO DE PÁGINAS (si hay más de una)
        if (totalPages > 1) {
            // Creamos un array de promesas para ir más rápido (peticiones en paralelo)
            const promises = [];
            for (let i = 2; i <= totalPages; i++) {
                promises.push(fetchPage(`${baseUrl}?page=${i}`));
            }

            const results = await Promise.all(promises);
            results.forEach(result => {
                allProducts.push(...result.products);
            });
        }

        res.status(200).json({
            success: true,
            total: allProducts.length,
            pages: totalPages,
            data: allProducts
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// FUNCIÓN AUXILIAR PARA SCRAPEAR UNA PÁGINA INDIVIDUAL
async function fetchPage(url) {
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    const $ = cheerio.load(data);
    const products = [];

    // Usamos la lógica que ya sabemos que funciona (JSON-LD + Fallback)
    $('script[type="application/ld+json"]').each((i, el) => {
        try {
            const json = JSON.parse($(el).html());
            if (json.itemListElement) {
                json.itemListElement.forEach(item => {
                    const p = item.item || item;
                    if (p.name) {
                        products.push({
                            ref: p.sku || p.mpn || (p.url ? p.url.split('/').pop().split('-')[0] : "N/A"),
                            nombre: p.name,
                            precio: p.offers ? `${p.offers.price} ${p.offers.priceCurrency}` : "Ver web",
                            imagen: p.image || "",
                            enlace: p.url || url
                        });
                    }
                });
            }
        } catch (e) { }
    });

    // Fallback si el JSON falla en alguna página
    if (products.length === 0) {
        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            const textoTarjeta = $el.text();
            const matchRef = textoTarjeta.match(/Ref\s*(\d+)/i);
            products.push({
                ref: matchRef ? matchRef[1] : ($el.attr('data-id-product') || "N/A"),
                nombre: $el.find('.product-title').text().trim(),
                precio: $el.find('.price').text().trim(),
                imagen: $el.find('img').attr('data-src') || $el.find('img').attr('src') || "",
                enlace: $el.find('a').attr('href')
            });
        });
    }

    return { products, $ };
}

