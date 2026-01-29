const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm';
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept-Language': 'es-ES,es;q=0.9'
            },
            timeout: 10000
        });

        const $ = cheerio.load(data);
        const products = [];

        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            
            // 1. Extraer Nombre
            const nombre = $el.find('.product-title').text().trim();
            
            // 2. Extraer Precio (El más actual)
            let precio = $el.find('.price').last().text().trim() || $el.find('.current-price').text().trim();
            
            // 3. EXTRAER REFERENCIA (Búsqueda por texto "Ref")
            // Buscamos cualquier elemento que contenga la palabra 'Ref' dentro de la tarjeta
            let refText = $el.find('div, span, p').filter(function() {
                return $(this).text().includes('Ref');
            }).first().text();

            // Limpiamos el texto para quedarnos solo con el número (ej: "Ref 106784" -> "106784")
            let ref = refText ? refText.replace(/[^\d]/g, '') : $el.attr('data-id-product');

            // 4. Extraer Imagen y Enlace
            const imagen = $el.find('img').attr('data-src') || $el.find('img').attr('src');
            const enlace = $el.find('.product-title a').attr('href');

            if (nombre && precio) {
                products.push({
                    ref: ref || "S/R",
                    nombre: nombre,
                    precio: precio,
                    imagen: imagen,
                    enlace: enlace
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