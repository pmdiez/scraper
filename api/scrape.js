const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm';
    
    try {
        // Añadimos un User-Agent para evitar bloqueos básicos
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const products = [];

        // Selector común para los contenedores de productos en PrestaShop (EfectoLED lo usa)
        $('.product-miniature').each((i, el) => {
            const title = $(el).find('.product-title').text().trim();
            const price = $(el).find('.price').text().trim();
            // La referencia suele estar en un atributo data o se puede extraer del link
            const reference = $(el).attr('data-id-product') || "N/A"; 
            const link = $(el).find('.product-title a').attr('href');

            if (title) {
                products.push({
                    ref: reference,
                    nombre: title,
                    precio: price,
                    enlace: link
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