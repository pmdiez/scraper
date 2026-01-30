const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    // URL base sin el número de página
    const baseUrl = 'https://www.efectoled.com/es/7-comprar-tubos-led';
    const totalPagesToScan = 50; // Forzamos el escaneo de 50 páginas
    const allProducts = [];

    try {
        // Creamos un array de promesas para todas las páginas del 1 al 20
        const promises = [];
        for (let i = 1; i <= totalPagesToScan; i++) {
            promises.push(fetchPage(`${baseUrl}?page=${i}`));
        }

        // Ejecutamos todas las peticiones en paralelo
        const results = await Promise.all(resultsToData(promises));
        
        results.forEach(products => {
            if (products && products.length > 0) {
                allProducts.push(...products);
            }
        });

        res.status(200).json({
            success: true,
            total: allProducts.length,
            pagesScanned: totalPagesToScan,
            data: allProducts
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// Función para manejar las promesas y evitar que una página rota detenga todo
function resultsToData(promises) {
    return promises.map(p => p.catch(() => [])); 
}

async function fetchPage(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            },
            timeout: 10000 // 10 segundos por página
        });

        const $ = cheerio.load(data);
        const products = [];

        // Estrategia 1: JSON-LD (Datos estructurados)
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
                                enlace: p.url || url
                            });
                        }
                    });
                }
            } catch (e) {}
        });

        // Estrategia 2: Fallback Manual (Si la página no tiene JSON-LD o está vacío)
        if (products.length === 0) {
            $('.product-miniature').each((i, el) => {
                const $el = $(el);
                const nombre = $el.find('.product-title').text().trim();
                if (nombre) {
                    const textoTarjeta = $el.text();
                    const matchRef = textoTarjeta.match(/Ref\s*(\d+)/i);
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
    } catch (error) {
        return []; // Si la página no existe (ej. pág 18 de 17), devolvemos array vacío
    }
}





