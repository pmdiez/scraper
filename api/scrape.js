const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm';
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Referer': 'https://www.google.com/'
            }
        });

        const $ = cheerio.load(data);
        const products = [];

        // Buscamos de forma más agresiva en cualquier artículo o div que huela a producto
        $('article, .product-miniature, .js-product-miniature').each((i, el) => {
            const container = $(el);
            
            // 1. Intentar obtener el nombre
            const nombre = container.find('h1, h2, h3, .product-title').first().text().trim();
            
            // 2. Intentar obtener el precio (buscando el símbolo €)
            let precio = container.find('.price, .current-price, span:contains("€")').first().text().trim();
            
            // 3. Intentar obtener la referencia (A veces está en un data-id o dentro del texto)
            let ref = container.attr('data-id-product') || 
                      container.find('.product-reference, [itemprop="sku"]').text().trim();
            
            // 4. Limpieza de precio (si trae "Antes X€ 8€", queremos el último)
            if (precio.includes('\n')) {
                const precios = precio.split('\n').map(p => p.trim()).filter(p => p.includes('€'));
                precio = precios[precios.length - 1];
            }

            // Si al menos tenemos nombre y precio, lo damos por válido
            if (nombre && precio && precio !== "") {
                products.push({
                    ref: ref || `ID-${i+1}`, // Si no hay ref, ponemos un ID temporal
                    nombre: nombre,
                    precio: precio,
                    enlace: container.find('a').attr('href') || url
                });
            }
        });

        res.status(200).json({
            success: true,
            total: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}