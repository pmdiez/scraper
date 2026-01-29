const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm';
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const products = [];

        // BUSQUEDA TÉCNICA 1: JSON-LD (Mantenemos tu lógica pero añadimos Imagen)
        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const json = JSON.parse($(el).html());
                if (json.itemListElement) {
                    json.itemListElement.forEach(item => {
                        const p = item.item || item;
                        if (p.name) {
                            products.push({
                                // Si sku no existe, buscamos el ID en la URL
                                ref: p.sku || p.mpn || (p.url ? p.url.split('/').pop().split('-')[0] : "N/A"),
                                nombre: p.name,
                                precio: p.offers ? `${p.offers.price} ${p.offers.priceCurrency}` : "Ver web",
                                imagen: p.image || "", // Añadimos la imagen del JSON
                                enlace: p.url || url
                            });
                        }
                    });
                }
            } catch (e) { }
        });

        // BUSQUEDA TÉCNICA 2: Si el JSON-LD falla, usamos selectores clásicos
        if (products.length === 0) {
            $('.product-miniature').each((i, el) => {
                const $el = $(el);
                
                // Intentamos cazar el número de referencia en el texto
                const textoTarjeta = $el.text();
                const matchRef = textoTarjeta.match(/Ref\s*(\d+)/i);
                const ref = matchRef ? matchRef[1] : ($el.attr('data-id-product') || "N/A");

                products.push({
                    ref: ref,
                    nombre: $el.find('.product-title').text().trim(),
                    precio: $el.find('.price').text().trim(),
                    // Buscamos data-src (lazy load) o src normal
                    imagen: $el.find('img').attr('data-src') || $el.find('img').attr('src') || "",
                    enlace: $el.find('a').attr('href')
                });
            });
        }

        res.status(200).json({
            success: true,
            total: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}