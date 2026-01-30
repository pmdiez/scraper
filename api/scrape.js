const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const baseUrl = 'https://www.efectoled.com/es/11-comprar-downlight-led';
    const allProducts = [];
    
    try {
        // 1. PRIMERA PETICIÓN
        const firstPageData = await fetchPage(`${baseUrl}?page=1`);
        allProducts.push(...firstPageData.products);

        const $ = firstPageData.$;
        let totalPages = 1;

        // 2. DETECTOR DE PÁGINAS MEJORADO
        // Buscamos en cualquier enlace dentro de la paginación que tenga "page="
        $('.pagination a, .page-list a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            
            // Intento A: Extraer número del atributo href
            if (href && href.includes('page=')) {
                const match = href.match(/page=(\d+)/);
                if (match) {
                    const p = parseInt(match[1]);
                    if (p > totalPages) totalPages = p;
                }
            }
            
            // Intento B: Extraer número del texto del enlace (por si es el botón "17")
            const numText = parseInt(text);
            if (!isNaN(numText) && numText > totalPages) {
                totalPages = numText;
            }
        });

        // 3. SEGURO POR SI FALLA LA PAGINACIÓN (Cálculo por total de productos)
        // EfectoLED suele decir "Hay X productos"
        if (totalPages === 1) {
            const totalText = $('.total-products, .products-nb-per-page').text();
            const totalMatch = totalText.match(/(\d+)/);
            if (totalMatch) {
                const totalItems = parseInt(totalMatch[1]);
                // PrestaShop suele mostrar 20 o 24 productos por página
                const itemsPerPage = 24; 
                totalPages = Math.ceil(totalItems / itemsPerPage);
            }
        }

        // 4. BUCLE DE PÁGINAS (Con límite de seguridad)
        if (totalPages > 1) {
            const promises = [];
            // Limitamos a 20 para no saturar Vercel (Hobby limit)
            const limit = Math.min(totalPages, 20); 
            
            for (let i = 2; i <= limit; i++) {
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

async function fetchPage(url) {
    // Añadimos un pequeño delay aleatorio para no ser detectados como bot agresivo
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500));

    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9'
        }
    });

    const $ = cheerio.load(data);
    const products = [];

    // Lógica de extracción (JSON-LD)
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
        } catch (e) { }
    });

    // Fallback Manual (Si el JSON-LD viene vacío en páginas profundas)
    if (products.length === 0) {
        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            products.push({
                ref: $el.attr('data-id-product') || "N/A",
                nombre: $el.find('.product-title').text().trim(),
                precio: $el.find('.price').text().trim(),
                imagen: $el.find('img').attr('data-src') || $el.find('img').attr('src'),
                enlace: $el.find('a').attr('href')
            });
        });
    }

    return { products, $ };
}
