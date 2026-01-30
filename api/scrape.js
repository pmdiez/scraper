const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    // URL de la categoría de GreenIce
    const baseUrl = 'https://greenice.com/collections/tiras-led-770';
    const totalPagesToScan = 10; // GreenIce suele tener menos páginas pero más productos por pág.
    const allProducts = [];

    try {
        const promises = [];
        for (let i = 1; i <= totalPagesToScan; i++) {
            promises.push(fetchGreenIcePage(`${baseUrl}?page=${i}`));
        }

        const results = await Promise.all(promises.map(p => p.catch(() => [])));
        
        results.forEach(products => {
            if (products && products.length > 0) {
                allProducts.push(...products);
            }
        });

        // FILTRO DE LIMPIEZA: Eliminamos duplicados y productos sin datos
        const uniqueRefs = new Set();
        const cleanData = allProducts.filter(p => {
            const hasData = p.ref !== "N/A" && p.precio !== "N/A";
            if (hasData && !uniqueRefs.has(p.ref)) {
                uniqueRefs.add(p.ref);
                return true;
            }
            return false;
        });

        res.status(200).json({
            success: true,
            total: cleanData.length,
            pages: totalPagesToScan,
            data: cleanData
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function fetchGreenIcePage(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            },
            timeout: 15000
        });

        const $ = cheerio.load(data);
        const products = [];

        // GreenIce usa una estructura de cuadrícula de Shopify
        // Buscamos el contenedor de cada producto (ajustado a su tema actual)
        $('.product-grid-item, .grid-product, .product-item').each((i, el) => {
            const $el = $(el);
            
            const nombre = $el.find('.product-item__title, .grid-product__title, h3').first().text().trim();
            
            // En GreenIce el precio suele estar en clases como .product-item__price o .price
            let precio = $el.find('.product-item__price, .grid-product__price, .price').first().text().trim();
            // Limpieza rápida de precio para quitar textos extra
            precio = precio.split('\n')[0].trim(); 

            // REFERENCIA: GreenIce la pone a veces en un span pequeño o en el atributo data-sku
            let ref = $el.find('.product-item__vendor, .sku').text().trim() || $el.attr('data-sku');
            
            // Si no la encontramos, buscamos el patrón numérico en el texto
            if (!ref) {
                const text = $el.text();
                const match = text.match(/[A-Z0-9]{5,15}/); // Las de GreenIce suelen ser alfanuméricas
                ref = match ? match[0] : "N/A";
            }

            const enlace = $el.find('a').attr('href');
            const fullEnlace = enlace ? (enlace.startsWith('http') ? enlace : `https://greenice.com${enlace}`) : '';
            
            const imagen = $el.find('img').attr('data-src') || $el.find('img').attr('src');

            if (nombre && precio !== "") {
                products.push({
                    ref: ref,
                    nombre: nombre,
                    precio: precio,
                    imagen: imagen ? (imagen.startsWith('//') ? `https:${imagen}` : imagen) : '',
                    enlace: fullEnlace
                });
            }
        });

        return products;
    } catch (error) {
        return [];
    }
}
