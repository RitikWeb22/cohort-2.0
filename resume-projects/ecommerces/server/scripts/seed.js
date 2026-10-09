import bcrypt from 'bcrypt';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/modules/users/user.model.js';
import { Category } from '../src/modules/categories/category.model.js';
import { Product } from '../src/modules/products/product.model.js';
import { Inventory } from '../src/modules/inventory/inventory.model.js';
import { logger } from '../src/config/logger.js';

const seed = async () => {
  try {
    await connectDB();
    logger.info('Starting KORA database seed for Mens, Womens & Collections...');

    // Clear existing records
    await Promise.all([
      Category.deleteMany({}),
      Product.deleteMany({}),
      Inventory.deleteMany({}),
    ]);

    // 1. Seed Categories
    const categories = await Category.create([
      {
        name: 'Mens',
        slug: 'men',
        description: 'Tailored shirts, pure linen trousers, kurtas, and artisanal jackets for men.',
        image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&q=80&w=800',
      },
      {
        name: 'Womens',
        slug: 'women',
        description: 'Flowing dresses, silk sarees, artisanal kurtas, and handcrafted separates for women.',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800',
      },
      {
        name: 'Collections',
        slug: 'collections',
        description: 'Slow-fashion limited capsules, heritage khadi coats, and seasonal handcrafted edits.',
        image: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=800',
      },
    ]);

    const [menCat, womenCat, collectionsCat] = categories;
    logger.info('Categories seeded: Mens, Womens, Collections');

    // 2. Seed Products Data
    const productsData = [
      // ================= MEN'S COLLECTION =================
      {
        name: 'Classic Ochre Linen Shirt',
        slug: 'classic-ochre-linen-shirt',
        description: 'A relaxed-fit casual button-down tailored from European flax linen. Features mother-of-pearl buttons and soft garment-washed texture.',
        story: 'Woven slowly on wooden pit looms by master artisans. Finished with plant-derived earth pigments.',
        category: menCat._id,
        price: 349900, // ₹3,499
        compareAtPrice: 429900,
        fabricComposition: '100% Belgian Raw Flax Linen',
        careInstructions: ['Machine wash cold gentle cycle', 'Line dry in shade', 'Warm iron while damp'],
        images: [
          { url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=1000', alt: 'Classic Ochre Linen Shirt front', isPrimary: true },
          { url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&q=80&w=1000', alt: 'Linen texture detail' },
        ],
        variants: [
          { sku: 'MEN-LSH-S', size: 'S', colour: { name: 'Earthy Ochre', hex: '#C28B38' }, fabric: 'Belgian Linen', price: 349900, compareAtPrice: 429900, images: [{ url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=1000' }], initialStock: 15 },
          { sku: 'MEN-LSH-M', size: 'M', colour: { name: 'Earthy Ochre', hex: '#C28B38' }, fabric: 'Belgian Linen', price: 349900, compareAtPrice: 429900, images: [{ url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=1000' }], initialStock: 25 },
          { sku: 'MEN-LSH-L', size: 'L', colour: { name: 'Earthy Ochre', hex: '#C28B38' }, fabric: 'Belgian Linen', price: 349900, compareAtPrice: 429900, images: [{ url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=1000' }], initialStock: 20 },
          { sku: 'MEN-LSH-XL', size: 'XL', colour: { name: 'Earthy Ochre', hex: '#C28B38' }, fabric: 'Belgian Linen', price: 349900, compareAtPrice: 429900, images: [{ url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=1000' }], initialStock: 10 },
        ],
        tags: ['men', 'shirt', 'linen', 'casual'],
        status: 'ACTIVE',
        isFeatured: true,
      },
      {
        name: 'Heritage Indigo Khadi Kurta',
        slug: 'heritage-indigo-khadi-kurta',
        description: 'Traditional straight-cut long kurta with a mandarin band collar and side seam pockets, handspun and dip-dyed in authentic organic indigo.',
        story: 'Immersed 12 consecutive times in fermented organic indigo vats for an inky, shifting blue that gently patinas with age.',
        category: menCat._id,
        price: 399900, // ₹3,999
        compareAtPrice: 479900,
        fabricComposition: '100% Handspun Deshi Khadi Cotton',
        careInstructions: ['Wash separately in cold water', 'Dry inside out in shade'],
        images: [
          { url: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&q=80&w=1000', alt: 'Heritage Indigo Kurta', isPrimary: true },
        ],
        variants: [
          { sku: 'MEN-KRT-M', size: 'M', colour: { name: 'Deep Indigo', hex: '#1C3144' }, fabric: 'Handspun Khadi', price: 399900, images: [{ url: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&q=80&w=1000' }], initialStock: 20 },
          { sku: 'MEN-KRT-L', size: 'L', colour: { name: 'Deep Indigo', hex: '#1C3144' }, fabric: 'Handspun Khadi', price: 399900, images: [{ url: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&q=80&w=1000' }], initialStock: 18 },
          { sku: 'MEN-KRT-XL', size: 'XL', colour: { name: 'Deep Indigo', hex: '#1C3144' }, fabric: 'Handspun Khadi', price: 399900, images: [{ url: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&q=80&w=1000' }], initialStock: 12 },
        ],
        tags: ['men', 'kurta', 'indigo', 'ethnic'],
        status: 'ACTIVE',
        isFeatured: true,
      },
      {
        name: 'Pleated Linen Tailored Trousers',
        slug: 'pleated-linen-tailored-trousers',
        description: 'High-rise relaxed fit trousers with double front pleats, side adjusters, and a clean tapered hem. Exceptional breathability for warm weather elegance.',
        story: 'Tailored with precision sartorial inner waistbands and French seams for longevity.',
        category: menCat._id,
        price: 429900, // ₹4,299
        compareAtPrice: 519900,
        fabricComposition: '100% Belgian Pure Linen',
        careInstructions: ['Dry clean or delicate gentle cold wash', 'Medium iron'],
        images: [
          { url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=1000', alt: 'Pleated Linen Trousers', isPrimary: true },
        ],
        variants: [
          { sku: 'MEN-TRS-S', size: 'S', colour: { name: 'Sandstone Beige', hex: '#D9C5B2' }, fabric: 'Pure Linen', price: 429900, images: [{ url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=1000' }], initialStock: 12 },
          { sku: 'MEN-TRS-M', size: 'M', colour: { name: 'Sandstone Beige', hex: '#D9C5B2' }, fabric: 'Pure Linen', price: 429900, images: [{ url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=1000' }], initialStock: 22 },
          { sku: 'MEN-TRS-L', size: 'L', colour: { name: 'Sandstone Beige', hex: '#D9C5B2' }, fabric: 'Pure Linen', price: 429900, images: [{ url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=1000' }], initialStock: 16 },
        ],
        tags: ['men', 'trousers', 'pants', 'linen'],
        status: 'ACTIVE',
        isFeatured: false,
      },
      {
        name: 'Structured Khadi Nehru Waistcoat',
        slug: 'structured-khadi-nehru-waistcoat',
        description: 'Sleeveless artisanal bundi vest tailored from heavyweight textured handloom cotton with brass buttons and internal welt pockets.',
        story: 'Handloomed by generational artisans in Varanasi using dense 2-ply handspun cotton.',
        category: menCat._id,
        price: 480000, // ₹4,800
        compareAtPrice: 580000,
        fabricComposition: '100% Textured Deshi Khadi',
        careInstructions: ['Dry clean only'],
        images: [
          { url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1000', alt: 'Khadi Nehru Waistcoat', isPrimary: true },
        ],
        variants: [
          { sku: 'MEN-WST-M', size: 'M', colour: { name: 'Coal Black', hex: '#212529' }, fabric: 'Deshi Khadi', price: 480000, images: [{ url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1000' }], initialStock: 14 },
          { sku: 'MEN-WST-L', size: 'L', colour: { name: 'Coal Black', hex: '#212529' }, fabric: 'Deshi Khadi', price: 480000, images: [{ url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1000' }], initialStock: 18 },
        ],
        tags: ['men', 'waistcoat', 'nehru jacket', 'formal'],
        status: 'ACTIVE',
        isFeatured: false,
      },
      {
        name: 'Organic Supima Minimalist T-Shirt',
        slug: 'organic-supima-minimalist-tshirt',
        description: 'Dense 240 GSM organic Supima cotton jersey crewneck tee. Ultra-soft combed cotton that retains shape and drape wash after wash.',
        story: 'Long-staple Supima cotton knitted sustainably without silicone finishes.',
        category: menCat._id,
        price: 189900, // ₹1,899
        compareAtPrice: 229900,
        fabricComposition: '100% Organic Supima Cotton',
        careInstructions: ['Machine wash warm', 'Tumble dry low'],
        images: [
          { url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=1000', alt: 'Supima Cotton T-Shirt', isPrimary: true },
        ],
        variants: [
          { sku: 'MEN-TEE-S', size: 'S', colour: { name: 'Crisp White', hex: '#FFFFFF' }, fabric: 'Supima Cotton', price: 189900, images: [{ url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=1000' }], initialStock: 30 },
          { sku: 'MEN-TEE-M', size: 'M', colour: { name: 'Crisp White', hex: '#FFFFFF' }, fabric: 'Supima Cotton', price: 189900, images: [{ url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=1000' }], initialStock: 45 },
          { sku: 'MEN-TEE-L', size: 'L', colour: { name: 'Crisp White', hex: '#FFFFFF' }, fabric: 'Supima Cotton', price: 189900, images: [{ url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=1000' }], initialStock: 35 },
        ],
        tags: ['men', 'tshirt', 'cotton', 'basics'],
        status: 'ACTIVE',
        isFeatured: true,
      },
      {
        name: 'Textured Linen Utility Overshirt',
        slug: 'textured-linen-utility-overshirt',
        description: 'Versatile layering overshirt with dual box-pleat chest pockets, dropped shoulders, and a structured spread collar in heavy Belgian flax linen.',
        story: 'Engineered for modern layering across seasons with reinforced horn buttons.',
        category: menCat._id,
        price: 549900, // ₹5,499
        compareAtPrice: 650000,
        fabricComposition: '100% Heavyweight Belgian Linen',
        careInstructions: ['Dry clean recommended or gentle hand wash'],
        images: [
          { url: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&q=80&w=1000', alt: 'Textured Linen Overshirt', isPrimary: true },
        ],
        variants: [
          { sku: 'MEN-OVSH-M', size: 'M', colour: { name: 'Raw Olive', hex: '#4D5344' }, fabric: 'Heavy Linen', price: 549900, images: [{ url: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&q=80&w=1000' }], initialStock: 15 },
          { sku: 'MEN-OVSH-L', size: 'L', colour: { name: 'Raw Olive', hex: '#4D5344' }, fabric: 'Heavy Linen', price: 549900, images: [{ url: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&q=80&w=1000' }], initialStock: 12 },
        ],
        tags: ['men', 'jacket', 'overshirt', 'linen'],
        status: 'ACTIVE',
        isFeatured: false,
      },

      // ================= WOMEN'S COLLECTION =================
      {
        name: 'Sandstone Silk Flared Maxi Dress',
        slug: 'sandstone-silk-flared-maxi-dress',
        description: 'Gracefully flowing tiered maxi dress crafted from organic mulberry silk with a boat neckline and hidden side pockets. Moves effortlessly with every stride.',
        story: 'The silk yarn retains its natural sericin sheath, imparting an organic matte drape and subtle sheen.',
        category: womenCat._id,
        price: 780000, // ₹7,800
        compareAtPrice: 920000,
        fabricComposition: '100% Hand-Reeled Mulberry Matka Silk',
        careInstructions: ['Dry clean only using eco-friendly solvents'],
        images: [
          { url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1000', alt: 'Sandstone Silk Maxi Dress', isPrimary: true },
        ],
        variants: [
          { sku: 'WMN-DRS-XS', size: 'XS', colour: { name: 'Raw Sand', hex: '#D7C7B2' }, fabric: 'Mulberry Silk', price: 780000, images: [{ url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1000' }], initialStock: 10 },
          { sku: 'WMN-DRS-S', size: 'S', colour: { name: 'Raw Sand', hex: '#D7C7B2' }, fabric: 'Mulberry Silk', price: 780000, images: [{ url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1000' }], initialStock: 18 },
          { sku: 'WMN-DRS-M', size: 'M', colour: { name: 'Raw Sand', hex: '#D7C7B2' }, fabric: 'Mulberry Silk', price: 780000, images: [{ url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1000' }], initialStock: 20 },
          { sku: 'WMN-DRS-L', size: 'L', colour: { name: 'Raw Sand', hex: '#D7C7B2' }, fabric: 'Mulberry Silk', price: 780000, images: [{ url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1000' }], initialStock: 12 },
        ],
        tags: ['women', 'dress', 'silk', 'maxi'],
        status: 'ACTIVE',
        isFeatured: true,
      },
      {
        name: 'Handwoven Chanderi Silk Saree',
        slug: 'handwoven-chanderi-silk-saree',
        description: 'Featherweight Chanderi silk saree with hand-spun zari border and delicate bootis woven by master weavers. Comes with an unstitched pure silk blouse piece.',
        story: 'Woven over 3 weeks in Madhya Pradesh using traditional handlooms passed through generations.',
        category: womenCat._id,
        price: 899900, // ₹8,999
        compareAtPrice: 1150000,
        fabricComposition: '70% Chanderi Silk, 30% Fine Cotton with Zari',
        careInstructions: ['Dry clean only', 'Store in muslin cloth'],
        images: [
          { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=1000', alt: 'Chanderi Silk Saree', isPrimary: true },
        ],
        variants: [
          { sku: 'WMN-SAR-ONE', size: 'ONE_SIZE', colour: { name: 'Dusty Blossom', hex: '#C98474' }, fabric: 'Chanderi Silk', price: 899900, images: [{ url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=1000' }], initialStock: 15 },
        ],
        tags: ['women', 'saree', 'silk', 'festive'],
        status: 'ACTIVE',
        isFeatured: true,
      },
      {
        name: 'Ivory Mulmul Embroidered Kurta Set',
        slug: 'ivory-mulmul-embroidered-kurta-set',
        description: 'Fine handspun mulmul A-line kurta featuring delicate tonal embroidery on the yoke and sleeves. Paired with matching relaxed cropped pants.',
        story: 'Handcrafted by women artisan collectives in Lucknow using needlework traditions.',
        category: womenCat._id,
        price: 540000, // ₹5,400
        compareAtPrice: 650000,
        fabricComposition: '100% Pure Handspun Mulmul Cotton',
        careInstructions: ['Hand wash gently in cold water', 'Line dry in shade'],
        images: [
          { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=1000', alt: 'Ivory Mulmul Kurta Set', isPrimary: true },
        ],
        variants: [
          { sku: 'WMN-KRT-S', size: 'S', colour: { name: 'Pure Ivory', hex: '#FAF9F6' }, fabric: 'Mulmul Cotton', price: 540000, images: [{ url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=1000' }], initialStock: 16 },
          { sku: 'WMN-KRT-M', size: 'M', colour: { name: 'Pure Ivory', hex: '#FAF9F6' }, fabric: 'Mulmul Cotton', price: 540000, images: [{ url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=1000' }], initialStock: 22 },
          { sku: 'WMN-KRT-L', size: 'L', colour: { name: 'Pure Ivory', hex: '#FAF9F6' }, fabric: 'Mulmul Cotton', price: 540000, images: [{ url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=1000' }], initialStock: 14 },
        ],
        tags: ['women', 'kurta set', 'ethnic', 'mulmul'],
        status: 'ACTIVE',
        isFeatured: true,
      },
      {
        name: 'Terracotta Linen Wide-Leg Trousers',
        slug: 'terracotta-linen-wide-leg-trousers',
        description: 'High-waisted wide-leg palazzo pants with front pleats, elasticated back waistband, and deep slant pockets crafted from soft stonewashed linen.',
        story: 'Natural mineral dye derived from crushed terracotta clay pigments.',
        category: womenCat._id,
        price: 399900, // ₹3,999
        compareAtPrice: 480000,
        fabricComposition: '100% European Flax Linen',
        careInstructions: ['Machine wash gentle cycle cold', 'Warm iron'],
        images: [
          { url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1000', alt: 'Terracotta Linen Trousers', isPrimary: true },
        ],
        variants: [
          { sku: 'WMN-WLT-S', size: 'S', colour: { name: 'Terracotta Rust', hex: '#B35446' }, fabric: 'Flax Linen', price: 399900, images: [{ url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1000' }], initialStock: 15 },
          { sku: 'WMN-WLT-M', size: 'M', colour: { name: 'Terracotta Rust', hex: '#B35446' }, fabric: 'Flax Linen', price: 399900, images: [{ url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1000' }], initialStock: 20 },
          { sku: 'WMN-WLT-L', size: 'L', colour: { name: 'Terracotta Rust', hex: '#B35446' }, fabric: 'Flax Linen', price: 399900, images: [{ url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=1000' }], initialStock: 12 },
        ],
        tags: ['women', 'trousers', 'linen', 'palazzo'],
        status: 'ACTIVE',
        isFeatured: false,
      },
      {
        name: 'Artisanal Block-Printed Kaftan Dress',
        slug: 'artisanal-block-printed-kaftan-dress',
        description: 'Free-flowing resort kaftan with an adjustable drawstring waist, hand-block printed using natural vegetable dyes by artisans in Bagru.',
        story: 'Printed one motif at a time using hand-carved teak woodblocks and plant-derived extracts.',
        category: womenCat._id,
        price: 449900, // ₹4,499
        compareAtPrice: 540000,
        fabricComposition: '100% Fine Handloom Mulmul Cotton',
        careInstructions: ['Gentle wash separately in cold water', 'Line dry'],
        images: [
          { url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=1000', alt: 'Block-Printed Kaftan Dress', isPrimary: true },
        ],
        variants: [
          { sku: 'WMN-KFT-ONE', size: 'ONE_SIZE', colour: { name: 'Indigo Azure', hex: '#274C77' }, fabric: 'Mulmul Cotton', price: 449900, images: [{ url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=1000' }], initialStock: 25 },
        ],
        tags: ['women', 'kaftan', 'dress', 'block print'],
        status: 'ACTIVE',
        isFeatured: false,
      },
      {
        name: 'Raw Silk Crop Jacket with Shell Buttons',
        slug: 'raw-silk-crop-jacket-shell-buttons',
        description: 'Boxy tailored cropped jacket with 3/4 sleeves crafted from textured Matka raw silk. Pairs effortlessly over sarees, dresses, and high-waist trousers.',
        story: 'Handcrafted in rural Bengal with an organic raw slub finish.',
        category: womenCat._id,
        price: 620000, // ₹6,200
        compareAtPrice: 740000,
        fabricComposition: '100% Raw Matka Silk',
        careInstructions: ['Dry clean only'],
        images: [
          { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1000', alt: 'Raw Silk Crop Jacket', isPrimary: true },
        ],
        variants: [
          { sku: 'WMN-JKT-S', size: 'S', colour: { name: 'Champagne Gold', hex: '#E6D5B8' }, fabric: 'Matka Silk', price: 620000, images: [{ url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1000' }], initialStock: 10 },
          { sku: 'WMN-JKT-M', size: 'M', colour: { name: 'Champagne Gold', hex: '#E6D5B8' }, fabric: 'Matka Silk', price: 620000, images: [{ url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1000' }], initialStock: 14 },
        ],
        tags: ['women', 'jacket', 'silk', 'crop jacket'],
        status: 'ACTIVE',
        isFeatured: false,
      },

      // ================= SIGNATURE COLLECTIONS =================
      {
        name: 'Charcoal Khadi Kimono Wrap Coat',
        slug: 'charcoal-khadi-kimono-wrap-coat',
        description: 'Heavyweight handspun khadi wrap coat with a wide sash belt and generous patch pockets. Spun from indigenous deshi cotton on traditional Ambar Charkhas.',
        story: 'Spun from indigenous deshi cotton on traditional Ambar Charkhas, producing a uniquely tactile textured slub.',
        category: collectionsCat._id,
        price: 850000, // ₹8,500
        compareAtPrice: 990000,
        fabricComposition: '100% High-Density Handspun Khadi',
        careInstructions: ['Dry clean or gentle hand wash', 'Flat dry'],
        images: [
          { url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=1000', alt: 'Charcoal Khadi Kimono Wrap Coat', isPrimary: true },
        ],
        variants: [
          { sku: 'COL-KMN-M', size: 'M', colour: { name: 'Carbon Charcoal', hex: '#2B2B2A' }, fabric: 'Dense Khadi', price: 850000, images: [{ url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=1000' }], initialStock: 10 },
          { sku: 'COL-KMN-L', size: 'L', colour: { name: 'Carbon Charcoal', hex: '#2B2B2A' }, fabric: 'Dense Khadi', price: 850000, images: [{ url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=1000' }], initialStock: 12 },
        ],
        tags: ['collections', 'coat', 'khadi', 'kimono'],
        status: 'ACTIVE',
        isFeatured: true,
      },
      {
        name: 'Botanical Wool & Silk Draped Shawl Cape',
        slug: 'botanical-wool-silk-draped-shawl-cape',
        description: 'Reversible luxury cape woven from fine Himalayan merino wool and wild tussar silk, naturally dyed with marigold and walnut bark.',
        story: 'Handspun by nomadic weavers in the Himalayas during the winter solstice.',
        category: collectionsCat._id,
        price: 680000, // ₹6,800
        compareAtPrice: 820000,
        fabricComposition: '60% Himalayan Merino Wool, 40% Tussar Silk',
        careInstructions: ['Dry clean only'],
        images: [
          { url: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=1000', alt: 'Botanical Wool Cape', isPrimary: true },
        ],
        variants: [
          { sku: 'COL-CPE-ONE', size: 'ONE_SIZE', colour: { name: 'Walnut Amber', hex: '#936639' }, fabric: 'Wool & Tussar Silk', price: 680000, images: [{ url: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=1000' }], initialStock: 14 },
        ],
        tags: ['collections', 'cape', 'shawl', 'wool', 'silk'],
        status: 'ACTIVE',
        isFeatured: false,
      },
    ];

    for (const item of productsData) {
      const product = await Product.create(item);
      for (const variant of product.variants) {
        const initialStock = item.variants.find((v) => v.sku === variant.sku)?.initialStock || 10;
        await Inventory.create({
          sku: variant.sku,
          productId: product._id,
          variantId: variant._id.toString(),
          availableStock: initialStock,
          reservedStock: 0,
          soldStock: 0,
        });
      }
    }

    logger.info(`Successfully seeded ${productsData.length} apparel products across Mens, Womens & Collections!`);
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    logger.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
