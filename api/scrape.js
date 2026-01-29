const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm';
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.8',
                'Cache-Control': 'no-cache'
            },
            timeout: 8000 // 8 segundos de espera máximo
        });

        const $ = cheerio.load(data);
        const products = [];

        // Buscamos en los contenedores de artículos comunes en PrestaShop
        $('article.product-miniature, .product-miniature').each((i, el) => {
            // Intentamos varios selectores para el nombre
            const title = $(el).find('.product-title, h2, h3').first().text().trim();
            
            // Intentamos varios selectores para el precio
            const price = $(el).find('.price, .product-price, .current-price').first().text().trim();
            
            // Extraer la Referencia (ID de producto)
            const reference = $(el).attr('data-id-product') || "Ref-" + i;
            
            // Enlace del producto
            const link = $(el).find('a').first().attr('href');

            if (title && price) {
                products.push({
                    ref: reference,
                    nombre: title,
                    precio: price,
                    enlace: link
                });
            }
        });

        // Respuesta con cabecera para evitar caché
        res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');
        res.status(200).json({
            success: true,
            total: products.length,
            data: products
        });

    } catch (error) {
        console.error("Error scraping:", error.message);
        res.status(500).json({ 
            success: false, 
            error: "No se pudo obtener datos de la web externa.",
            details: error.message 
        });
    }
}