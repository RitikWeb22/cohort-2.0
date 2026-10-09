import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    size: {
      type: String,
      required: true,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE_SIZE'],
    },
    colour: {
      name: { type: String, required: true },
      hex: { type: String, required: true },
    },
    fabric: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0, // integer paise
    },
    compareAtPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String, default: '' },
      },
    ],
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    story: {
      type: String,
      default: '',
    },
    brand: {
      type: String,
      default: 'KORA',
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0, // base price in paise
    },
    compareAtPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    fabricComposition: {
      type: String,
      required: true,
    },
    careInstructions: [
      {
        type: String,
      },
    ],
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String, default: '' },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    variants: [variantSchema],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for search & catalog listing
productSchema.index({ status: 1, category: 1, createdAt: -1 });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

export const Product = mongoose.model('Product', productSchema);
