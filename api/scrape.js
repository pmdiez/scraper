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

        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            
            const nombre = $el.find('.product-title').text().trim();
            const precio = $el.find('.price').last().text().trim() || $el.find('.current-price').text().trim();
            
            let ref = $el.attr('data-id-product') || 
                      $el.find('.product-reference').text().replace('Ref:', '').trim();

            // CAPTURA DE IMAGEN: Buscamos el src de la imagen principal
            let imagen = $el.find('.product-thumbnail img').attr('data-src') || 
                         $el.find('.product-thumbnail img').attr('src');

            let enlace = $el.find('.product-title a').attr('href');

            if (nombre && precio) {
                products.push({
                    ref: ref || `ID-${i+1}`,
                    nombre: nombre,
                    precio: precio,
                    imagen: imagen,
                    enlace: enlace
                });
            }
        });

        res.status(200).json({ success: true, total: products.length, data: products });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}