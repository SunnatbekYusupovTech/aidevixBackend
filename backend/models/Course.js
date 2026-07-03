const mongoose = require('mongoose');

// ── Slug generation ────────────────────────────────────────────────────────────
// O'zbek/kiril harflarini lotin ekvivalentiga aylantirish
const TRANSLIT = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'j',
  'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
  'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'x','ц':'ts',
  'ч':'ch','ш':'sh','щ':'sh','ъ':'','ы':'i','ь':'','э':'e','ю':'yu',
  'я':'ya',
  // O'zbek kiril maxsus harflari
  'ў':'o','қ':'q','ғ':'g','ҳ':'h',
  // Tinish belgilari → tire
  '\'':'','ʼ':'','ʻ':'',
};

function toSlug(title) {
  if (!title || typeof title !== 'string') return 'kurs';
  const slug = title
    .toLowerCase()
    .split('').map((ch) => (TRANSLIT[ch] !== undefined ? TRANSLIT[ch] : ch)).join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
  return slug || 'kurs';
}

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
  },
  thumbnail: {
    type: String,
    default: null,
  },
  price: {
    type: Number,
    required: [true, 'Course price is required'],
    min: [0, 'Price cannot be negative'],
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  videos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  category: {
    type: String,
    default: 'general',
    enum: ['html', 'css', 'javascript', 'react', 'typescript', 'nodejs', 'general', 'ai', 'telegram', 'security', 'career', 'nocode', 'web3'],
  },
  // Ko'rishlar soni (Numton - Top Courses Ranking uchun)
  viewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  // O'quvchilar soni
  studentsCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  // O'rtacha reyting (1-5)
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  // Reyting berganlar soni
  ratingCount: {
    type: Number,
    default: 0,
  },
  // Kurs daraja: beginner | intermediate | advanced
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },
  // Kurs holati: free | paid
  isFree: {
    type: Boolean,
    default: false,
  },
  // Umumiy darslar davomiyligi (soniyada)
  totalDuration: {
    type: Number,
    default: 0,
  },
  // SEO-007: URL-friendly slug (title'dan avtomatik generatsiya qilinadi)
  slug: {
    type: String,
    default: null,
    lowercase: true,
    trim: true,
  },
}, {
  timestamps: true,
});

// SEO-007: sparse unique index — mavjud slug'lar duplicate bo'lmasin, null ruxsat etiladi
courseSchema.index({ slug: 1 }, { unique: true, sparse: true });
courseSchema.index({ category: 1, isActive: 1 });
courseSchema.index({ viewCount: -1 });
courseSchema.index({ rating: -1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ title: 'text', description: 'text' });
// PB-010: compound indexes for hot filter+sort queries (getTopCourses, getFilterCounts)
courseSchema.index({ isActive: 1, viewCount: -1 });
courseSchema.index({ isActive: 1, rating: -1 });

// SEO-007: yangi kurs yaratilganda yoki title o'zgarganda slug avtomatik generatsiya
courseSchema.pre('save', async function (next) {
  // Slug allaqachon belgilangan bo'lsa — qayta generatsiya shart emas
  if (this.slug) return next();
  // Mavjud hujjatda title o'zgarmagan bo'lsa — o'tkazib yubor
  if (!this.isNew && !this.isModified('title')) return next();

  const base = toSlug(this.title);
  let slug   = base;
  let suffix = 2;

  // Noyoblikni tekshirish — this.constructor === Course (circular dependency yo'q)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await this.constructor.findOne({ slug, _id: { $ne: this._id } }).select('_id').lean();
    if (!exists) break;
    slug = `${base}-${suffix++}`;
  }

  this.slug = slug;
  next();
});

module.exports = mongoose.model('Course', courseSchema);
