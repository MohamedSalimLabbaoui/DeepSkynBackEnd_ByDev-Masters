"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ScraperService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path = require("path");
const puppeteer_1 = require("puppeteer");
let ScraperService = ScraperService_1 = class ScraperService {
    constructor() {
        this.logger = new common_1.Logger(ScraperService_1.name);
        this.outputDir = path.join(process.cwd(), 'scraped-data');
    }
    async scrapeDermaceutic() {
        let browser;
        const products = [];
        try {
            await fs_1.promises.mkdir(this.outputDir, { recursive: true });
            this.logger.log('Démarrage du scraping de Dermaceutic...');
            browser = await puppeteer_1.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            await page.goto('https://www.dermaceutic.com', {
                waitUntil: 'networkidle2',
                timeout: 30000,
            });
            this.logger.log('Page chargée, récupération des produits...');
            const productsData = await page.evaluate(() => {
                const items = [];
                const seenLinks = new Set();
                const productElements = document.querySelectorAll('[data-test-id*="product"], .product-item, .product-card, [class*="product"]');
                productElements.forEach((element) => {
                    const name = element
                        .querySelector('h2, h3, [class*="title"]')
                        ?.textContent?.trim() ||
                        element.querySelector('a')?.textContent?.trim() ||
                        '';
                    const link = element.querySelector('a')?.href ||
                        element.closest('a')?.href ||
                        '';
                    const image = element.querySelector('img')?.src ||
                        element.querySelector('img')?.dataset.src ||
                        '';
                    if (name && link && !seenLinks.has(link)) {
                        seenLinks.add(link);
                        items.push({
                            name,
                            link: new URL(link, window.location.origin).href,
                            image: image ? new URL(image, window.location.origin).href : '',
                        });
                    }
                });
                return items;
            });
            this.logger.log(`${productsData.length} produits uniques trouvés`);
            const limitedProducts = productsData.slice(0, 3);
            this.logger.log(`Scraping limité à ${limitedProducts.length} produits...`);
            for (const productData of limitedProducts) {
                try {
                    this.logger.log(`Scraping détails pour: ${productData.name}`);
                    const productPage = await browser.newPage();
                    await productPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
                    await productPage.goto(productData.link, {
                        waitUntil: 'networkidle2',
                        timeout: 20000,
                    });
                    const attributes = await productPage.evaluate(() => {
                        const attrs = {};
                        const bodyText = document.body.innerText;
                        const title = document.querySelector('h1, h2')?.textContent?.trim() || '';
                        if (title) {
                            attrs['title'] = title;
                        }
                        const priceMatch = bodyText.match(/€\s*[\d,]+/);
                        if (priceMatch) {
                            attrs['price'] = priceMatch[0].trim();
                        }
                        const productInfo = {};
                        const contenanceMatch = bodyText.match(/(\d+)\s*(ml|cl|L)/i);
                        if (contenanceMatch) {
                            attrs['volume'] = contenanceMatch[0];
                        }
                        const skinTypeMatch = bodyText.match(/Type de peau[:\s]+([^\n]+)/i);
                        if (skinTypeMatch) {
                            attrs['skinType'] = skinTypeMatch[1].trim();
                        }
                        const usageMatch = bodyText.match(/Utilisation[:\s]+([^\n]+)/i);
                        if (usageMatch) {
                            attrs['usage'] = usageMatch[1].trim();
                        }
                        const ingredientsMatch = bodyText.match(/Ingrédients[:\s]+([^\n]+)/i);
                        if (ingredientsMatch) {
                            attrs['ingredients'] = ingredientsMatch[1].trim();
                        }
                        const benefitsMatch = bodyText.match(/(Bénéfices|Avantages|Propriétés)[:\s]+([^\n]+)/i);
                        if (benefitsMatch) {
                            attrs['benefits'] = benefitsMatch[2].trim();
                        }
                        const metaContent = document
                            .querySelector('meta[name="description"]')
                            ?.getAttribute('content') || '';
                        if (metaContent) {
                            attrs['metaDescription'] = metaContent;
                        }
                        const sections = {};
                        const allText = document.querySelectorAll('p, div, section, article');
                        allText.forEach((element) => {
                            const text = element.textContent?.trim() || '';
                            if (text.length > 20 && text.length < 1000) {
                                if (text.toLowerCase().includes('composition') ||
                                    text.toLowerCase().includes('ingrédient')) {
                                    sections['composition'] = text;
                                }
                                else if (text.toLowerCase().includes('conseil') ||
                                    text.toLowerCase().includes('utilisation')) {
                                    sections['advice'] = text;
                                }
                                else if (text.toLowerCase().includes('résultat') ||
                                    text.toLowerCase().includes('efficacité')) {
                                    sections['results'] = text;
                                }
                            }
                        });
                        Object.assign(attrs, sections);
                        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
                        jsonLdScripts.forEach((script) => {
                            try {
                                const jsonData = JSON.parse(script.textContent || '{}');
                                if (jsonData.name)
                                    attrs[`structured_name`] = jsonData.name;
                                if (jsonData.description)
                                    attrs[`structured_description`] = jsonData.description;
                                if (jsonData.offers?.[0]?.price)
                                    attrs[`structured_price`] = jsonData.offers[0].price;
                            }
                            catch {
                            }
                        });
                        const reviews = [];
                        const reviewElements = document.querySelectorAll('[class*="review"], [class*="comment"], [class*="feedback"], [class*="rating"], [class*="testimonial"]');
                        reviewElements.forEach((element) => {
                            const reviewText = element.textContent?.trim();
                            const author = element
                                .querySelector('[class*="author"], [class*="reviewer"], [class*="name"]')
                                ?.textContent?.trim();
                            const rating = element
                                .querySelector('[class*="rating"], [class*="stars"], [class*="score"]')
                                ?.textContent?.trim();
                            if (reviewText &&
                                reviewText.length > 10 &&
                                reviewText.length < 500) {
                                reviews.push({
                                    text: reviewText,
                                    author: author || 'Anonyme',
                                    rating: rating || null,
                                });
                            }
                        });
                        const starsElements = document.querySelectorAll('[class*="star"], [class*="rating"]');
                        starsElements.forEach((element) => {
                            const starText = element.textContent?.trim();
                            if (starText &&
                                (starText.includes('★') ||
                                    starText.includes('⭐') ||
                                    /\d+\/5|\d+\/10/.test(starText))) {
                                const parent = element.closest('[class*="review"], [class*="comment"]');
                                if (parent &&
                                    !reviews.some((r) => r.text?.includes(parent.textContent || ''))) {
                                    reviews.push({
                                        rating: starText,
                                        text: parent.textContent?.trim() || '',
                                    });
                                }
                            }
                        });
                        const paragraphs = document.querySelectorAll('p');
                        paragraphs.forEach((p) => {
                            const text = p.textContent?.trim();
                            if (text &&
                                (text.startsWith('"') || text.startsWith('«')) &&
                                text.length < 300) {
                                if (!reviews.some((r) => r.text === text)) {
                                    reviews.push({
                                        text: text,
                                        type: 'quote',
                                    });
                                }
                            }
                        });
                        const trustpilotWidget = document.querySelector('[class*="trustpilot"]');
                        if (trustpilotWidget) {
                            const trustpilotText = trustpilotWidget.textContent?.trim();
                            if (trustpilotText) {
                                attrs['trustpilot'] = trustpilotText;
                            }
                        }
                        const limitedReviews = reviews.slice(0, 5);
                        if (limitedReviews.length > 0) {
                            attrs['reviews'] = limitedReviews;
                            attrs['reviewCount'] = limitedReviews.length;
                        }
                        const reviewCountMatch = bodyText.match(/(\d+)\s*(avis|commentaires|reviews?|feedback)/i);
                        if (reviewCountMatch) {
                            attrs['totalReviews'] = reviewCountMatch[1];
                        }
                        const ratingMatch = bodyText.match(/(\d+[.,]\d+)\s*\/\s*5|Note\s*:\s*(\d+[.,]\d+)/i);
                        if (ratingMatch) {
                            attrs['averageRating'] = (ratingMatch[1] || ratingMatch[2]).replace(',', '.');
                        }
                        return attrs;
                    });
                    products.push({
                        name: productData.name,
                        link: productData.link,
                        image: productData.image,
                        attributes,
                    });
                    await productPage.close();
                }
                catch (error) {
                    this.logger.error(`Erreur lors du scraping de ${productData.name}: ${error.message}`);
                    products.push({
                        name: productData.name,
                        link: productData.link,
                        image: productData.image,
                        attributes: { error: 'Impossible de récupérer les détails' },
                    });
                }
            }
            await browser.close();
            await this.saveToJson(products);
            this.logger.log(`Scraping terminé avec succès. ${products.length} produits scrapés.`);
            return products;
        }
        catch (error) {
            this.logger.error(`Erreur générale lors du scraping: ${error.message}`);
            throw error;
        }
        finally {
            if (browser) {
                await browser.close().catch(() => { });
            }
        }
    }
    async saveToJson(products) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `dermaceutic-products-${timestamp}.json`;
        const filePath = path.join(this.outputDir, fileName);
        const data = {
            timestamp: new Date().toISOString(),
            totalProducts: products.length,
            products,
        };
        await fs_1.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        this.logger.log(`Données sauvegardées dans: ${filePath}`);
    }
    async getScrapedData() {
        try {
            const files = await fs_1.promises.readdir(this.outputDir);
            return files.filter((file) => file.endsWith('.json'));
        }
        catch (error) {
            this.logger.error(`Erreur lors de la lecture du répertoire: ${error.message}`);
            return [];
        }
    }
    async getScrapedProductsById(fileName) {
        try {
            const filePath = path.join(this.outputDir, fileName);
            const data = await fs_1.promises.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            this.logger.error(`Erreur lors de la lecture du fichier: ${error.message}`);
            throw error;
        }
    }
};
exports.ScraperService = ScraperService;
exports.ScraperService = ScraperService = ScraperService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ScraperService);
//# sourceMappingURL=scraper.service.js.map