import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';

export interface Product {
  name: string;
  link: string;
  image: string;
  attributes: {
    [key: string]: string | string[];
  };
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private outputDir = path.join(process.cwd(), 'scraped-data');

  constructor() {
    // Initialisation du service
  }

  async scrapeDermaceutic(): Promise<Product[]> {
    let browser;
    const products: Product[] = [];

    try {
      // Créer le répertoire de sortie s'il n'existe pas
      await fs.mkdir(this.outputDir, { recursive: true });

      this.logger.log('Démarrage du scraping de Dermaceutic...');
      
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      
      // Set user agent pour éviter les blocages
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );

      // Naviguer vers le site
      await page.goto('https://www.dermaceutic.com', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      this.logger.log('Page chargée, récupération des produits...');

      // Scraper les produits
      const productsData = await page.evaluate(() => {
        const items: any[] = [];
        const seenLinks = new Set<string>(); // Pour éviter les doublons
        
        // Chercher les éléments produits (adapter les sélecteurs selon la structure HTML)
        const productElements = document.querySelectorAll(
          '[data-test-id*="product"], .product-item, .product-card, [class*="product"]'
        );

        productElements.forEach((element) => {
          const name = 
            element.querySelector('h2, h3, [class*="title"]')?.textContent?.trim() ||
            element.querySelector('a')?.textContent?.trim() ||
            '';
          
          const link = 
            (element.querySelector('a') as HTMLAnchorElement)?.href ||
            (element.closest('a') as HTMLAnchorElement)?.href ||
            '';
          
          const image = 
            (element.querySelector('img') as HTMLImageElement)?.src ||
            (element.querySelector('img') as HTMLImageElement)?.dataset.src ||
            '';

          // Vérifier que le produit est valide et pas déjà ajouté
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

      // Limiter à 3 produits
      const limitedProducts = productsData.slice(0, 3);
      this.logger.log(`Scraping limité à ${limitedProducts.length} produits...`);

      // Pour chaque produit, scraper les attributs détaillés
      for (const productData of limitedProducts) {
        try {
          this.logger.log(`Scraping détails pour: ${productData.name}`);
          
          const productPage = await browser.newPage();
          await productPage.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          );

          await productPage.goto(productData.link, {
            waitUntil: 'networkidle2',
            timeout: 20000,
          });

          const attributes = await productPage.evaluate(() => {
            const attrs: { [key: string]: any } = {};

            // Extraire le contenu textuel de la page
            const bodyText = document.body.innerText;

            // Récupérer le titre principal du produit
            const title = document.querySelector('h1, h2')?.textContent?.trim() || '';
            if (title) {
              attrs['title'] = title;
            }

            // Récupérer le prix avec regex
            const priceMatch = bodyText.match(/€\s*[\d,]+/);
            if (priceMatch) {
              attrs['price'] = priceMatch[0].trim();
            }

            // Récupérer les attributs du produit (contenance, etc.)
            const productInfo: { [key: string]: string } = {};
            
            // Chercher les patterns courants
            const contenanceMatch = bodyText.match(/(\d+)\s*(ml|cl|L)/i);
            if (contenanceMatch) {
              attrs['volume'] = contenanceMatch[0];
            }

            // Chercher "Type de peau"
            const skinTypeMatch = bodyText.match(/Type de peau[:\s]+([^\n]+)/i);
            if (skinTypeMatch) {
              attrs['skinType'] = skinTypeMatch[1].trim();
            }

            // Chercher "Utilisation"
            const usageMatch = bodyText.match(/Utilisation[:\s]+([^\n]+)/i);
            if (usageMatch) {
              attrs['usage'] = usageMatch[1].trim();
            }

            // Chercher "Ingrédients"
            const ingredientsMatch = bodyText.match(/Ingrédients[:\s]+([^\n]+)/i);
            if (ingredientsMatch) {
              attrs['ingredients'] = ingredientsMatch[1].trim();
            }

            // Chercher "Bénéfices" ou "Avantages"
            const benefitsMatch = bodyText.match(/(Bénéfices|Avantages|Propriétés)[:\s]+([^\n]+)/i);
            if (benefitsMatch) {
              attrs['benefits'] = benefitsMatch[2].trim();
            }

            // Récupérer tous les textes clés de la page
            const metaContent = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
            if (metaContent) {
              attrs['metaDescription'] = metaContent;
            }

            // Chercher les sections de contenu avec des labels
            const sections: { [key: string]: string } = {};
            const allText = document.querySelectorAll('p, div, section, article');
            
            allText.forEach((element) => {
              const text = element.textContent?.trim() || '';
              if (text.length > 20 && text.length < 1000) {
                // Déterminer la catégorie basée sur le contenu
                if (text.toLowerCase().includes('composition') || text.toLowerCase().includes('ingrédient')) {
                  sections['composition'] = text;
                } else if (text.toLowerCase().includes('conseil') || text.toLowerCase().includes('utilisation')) {
                  sections['advice'] = text;
                } else if (text.toLowerCase().includes('résultat') || text.toLowerCase().includes('efficacité')) {
                  sections['results'] = text;
                }
              }
            });

            Object.assign(attrs, sections);

            // Récupérer les données structurées (JSON-LD) si présentes
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            jsonLdScripts.forEach((script, index) => {
              try {
                const jsonData = JSON.parse(script.textContent || '{}');
                if (jsonData.name) attrs[`structured_name`] = jsonData.name;
                if (jsonData.description) attrs[`structured_description`] = jsonData.description;
                if (jsonData.offers?.[0]?.price) attrs[`structured_price`] = jsonData.offers[0].price;
              } catch (e) {
                // Ignorer les erreurs de parsing
              }
            });

            // EXTRAIRE LES AVIS/FEEDBACK/COMMENTAIRES
            const reviews: any[] = [];

            // Chercher les avis dans les éléments courants
            const reviewElements = document.querySelectorAll(
              '[class*="review"], [class*="comment"], [class*="feedback"], [class*="rating"], [class*="testimonial"]'
            );

            reviewElements.forEach((element) => {
              const reviewText = element.textContent?.trim();
              const author = element.querySelector('[class*="author"], [class*="reviewer"], [class*="name"]')?.textContent?.trim();
              const rating = element.querySelector('[class*="rating"], [class*="stars"], [class*="score"]')?.textContent?.trim();
              
              if (reviewText && reviewText.length > 10 && reviewText.length < 500) {
                reviews.push({
                  text: reviewText,
                  author: author || 'Anonyme',
                  rating: rating || null
                });
              }
            });

            // Chercher aussi les étoiles/ratings
            const starsElements = document.querySelectorAll('[class*="star"], [class*="rating"]');
            starsElements.forEach((element) => {
              const starText = element.textContent?.trim();
              if (starText && (starText.includes('★') || starText.includes('⭐') || /\d+\/5|\d+\/10/.test(starText))) {
                const parent = element.closest('[class*="review"], [class*="comment"]');
                if (parent && !reviews.some(r => r.text?.includes(parent.textContent || ''))) {
                  reviews.push({
                    rating: starText,
                    text: parent.textContent?.trim() || ''
                  });
                }
              }
            });

            // Chercher les commentaires dans les paragraphes avec des guillemets
            const paragraphs = document.querySelectorAll('p');
            paragraphs.forEach((p) => {
              const text = p.textContent?.trim();
              if (text && (text.startsWith('"') || text.startsWith('«')) && text.length < 300) {
                if (!reviews.some(r => r.text === text)) {
                  reviews.push({
                    text: text,
                    type: 'quote'
                  });
                }
              }
            });

            // Récupérer aussi les avis via Trustpilot ou autres services si présent
            const trustpilotWidget = document.querySelector('[class*="trustpilot"]');
            if (trustpilotWidget) {
              const trustpilotText = trustpilotWidget.textContent?.trim();
              if (trustpilotText) {
                attrs['trustpilot'] = trustpilotText;
              }
            }

            // Limiter à 5 avis maximum
            const limitedReviews = reviews.slice(0, 5);

            // Ajouter les avis au résultat s'il y en a
            if (limitedReviews.length > 0) {
              attrs['reviews'] = limitedReviews;
              attrs['reviewCount'] = limitedReviews.length;
            }

            // Chercher le nombre total d'avis
            const reviewCountMatch = bodyText.match(/(\d+)\s*(avis|commentaires|reviews?|feedback)/i);
            if (reviewCountMatch) {
              attrs['totalReviews'] = reviewCountMatch[1];
            }

            // Chercher la note moyenne
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
        } catch (error) {
          this.logger.error(
            `Erreur lors du scraping de ${productData.name}: ${error.message}`
          );
          // Continuer avec le produit suivant
          products.push({
            name: productData.name,
            link: productData.link,
            image: productData.image,
            attributes: { error: 'Impossible de récupérer les détails' },
          });
        }
      }

      await browser.close();

      // Sauvegarder les données en JSON
      await this.saveToJson(products);

      this.logger.log(`Scraping terminé avec succès. ${products.length} produits scrapés.`);
      return products;
    } catch (error) {
      this.logger.error(`Erreur générale lors du scraping: ${error.message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  private async saveToJson(products: Product[]): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `dermaceutic-products-${timestamp}.json`;
    const filePath = path.join(this.outputDir, fileName);

    const data = {
      timestamp: new Date().toISOString(),
      totalProducts: products.length,
      products,
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    this.logger.log(`Données sauvegardées dans: ${filePath}`);
  }

  async getScrapedData(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.outputDir);
      return files.filter((file) => file.endsWith('.json'));
    } catch (error) {
      this.logger.error(`Erreur lors de la lecture du répertoire: ${error.message}`);
      return [];
    }
  }

  async getScrapedProductsById(fileName: string): Promise<any> {
    try {
      const filePath = path.join(this.outputDir, fileName);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Erreur lors de la lecture du fichier: ${error.message}`);
      throw error;
    }
  }
}
