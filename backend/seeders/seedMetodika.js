'use strict';

/**
 * Maxfiy metodikani DB'ga yuklash.
 *
 * Kontent kodda YO'Q: u git'ga kirmaydigan `<repo>/metodika/` papkasidan o'qiladi:
 *   - Metodika_AI_biznes_egalari_uchun_2oy.html  (PDF'ning manbasi — dars kartalari, ilovalar)
 *   - seed-extras.js                              (3 soatlik reja, "nega", sxemalar, pasport)
 *
 * Ishlatish (backend/ ichidan):
 *   node seeders/seedMetodika.js --dry     # faqat parse qiladi, DB'ga tegmaydi
 *   node seeders/seedMetodika.js           # DB bo'sh bo'lsa yuklaydi
 *   node seeders/seedMetodika.js --reset   # mavjud modul/dars/sahifa/rasmlarni O'CHIRIB qayta yuklaydi
 *
 * Ruxsatlar (MetodikaAccess) va jurnalga hech qachon tegilmaydi.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = process.env.METODIKA_SOURCE_DIR || path.join(__dirname, '..', '..', 'metodika');
const HTML_FILE = path.join(SOURCE_DIR, 'Metodika_AI_biznes_egalari_uchun_2oy.html');
const EXTRAS_FILE = path.join(SOURCE_DIR, 'seed-extras.js');

const decode = (s) => String(s)
  .replace(/&#x27;|&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&');

const stripTags = (s) => decode(String(s).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim();

const listItems = (html) => [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => stripTags(m[1])).filter(Boolean);

const parseLesson = (section) => {
  const number = Number(section.match(/<div class='n'>(\d+)<\/div>/)?.[1]);
  const meta = stripTags(section.match(/<div class='meta'>([\s\S]*?)<\/div>/)?.[1] || '');
  const title = stripTags(section.match(/<h2>([\s\S]*?)<\/h2>/)?.[1] || '');
  const week = Number(meta.match(/(\d+)-hafta/)?.[1]) || 1;

  const fields = {};
  for (const m of section.matchAll(/<div class='f[^']*'><div class='lab'>([\s\S]*?)<\/div>([\s\S]*?)<\/div>/g)) {
    fields[stripTags(m[1])] = m[2];
  }
  const field = (prefix) => {
    const key = Object.keys(fields).find((k) => k.startsWith(prefix));
    return key ? fields[key] : '';
  };

  const homework = listItems(field('Uy vazifasi'));
  const isOptional = (item) => /^Qo'shimcha:/i.test(item);
  const clean = (item) => {
    const body = item.replace(/^(Majburiy|Qo'shimcha):\s*/i, '');
    return body.charAt(0).toUpperCase() + body.slice(1);
  };

  const links = [...field("Qo'shimcha materiallar").matchAll(/<li>([\s\S]*?)<a href='([^']+)'/g)].map((m) => ({
    title: stripTags(m[1]).replace(/\s*[—-]\s*$/, ''),
    url: decode(m[2]),
    note: '',
  }));

  const template = field('Shablon').match(/<pre>([\s\S]*?)<\/pre>/)?.[1];
  const decision = stripTags(section.match(/<div class='f wide dec'>([\s\S]*?)<\/div>/)?.[1] || '')
    .replace(/^Rahbar qarori\.\s*/, '');

  return {
    number,
    title,
    week,
    goal: stripTags(field('Maqsad')),
    outcome: stripTags(field('Natija')),
    relation: stripTags(field('Biznesga')),
    mentorPrep: listItems(field('Mentor tayyorgarligi')),
    keyPoints: listItems(field('Nimani tushuntirish')),
    demo: listItems(field("Ko'rsatish")),
    practice: listItems(field('Amaliyot')),
    template: template ? { title: 'Shablon', body: decode(template).trim() } : undefined,
    mistakes: listItems(field('Tipik xatolar')),
    homeworkRequired: homework.filter((i) => !isOptional(i)).map(clean),
    homeworkOptional: homework.filter(isOptional).map(clean),
    links,
    decision,
  };
};

// "3. Ilovalar" bo'limi: har bir <h3> — alohida sahifa (jadval, ro'yxat yoki eslatma).
const parseAppendices = (section) => {
  const pages = [];
  const parts = section.split(/<h3[^>]*>/).slice(1);
  for (const part of parts) {
    const end = part.indexOf('</h3>');
    const title = stripTags(part.slice(0, end));
    const body = part.slice(end + 5);
    const sections = [];

    const table = body.match(/<table[^>]*>([\s\S]*?)<\/table>/)?.[1];
    if (table) {
      const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((row) =>
        [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => stripTags(c[1]).replace(/\|/g, '/')).join(' | '));
      sections.push({ heading: '', type: 'table', body: ['Band | Mazmuni', ...rows].join('\n') });
    }
    const items = listItems(body);
    if (items.length) sections.push({ heading: '', type: 'list', body: items.join('\n') });

    if (sections.length) pages.push({ title, sections });
  }
  return pages;
};

const build = () => {
  if (!fs.existsSync(HTML_FILE) || !fs.existsSync(EXTRAS_FILE)) {
    throw new Error(`Manba fayllar topilmadi: ${SOURCE_DIR}`);
  }
  const html = fs.readFileSync(HTML_FILE, 'utf8');
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const extras = require(EXTRAS_FILE);

  const sections = html.slice(html.indexOf('<body')).split(/<section class='/).slice(1);
  const parsed = new Map(
    sections.filter((s) => s.includes("class='lesson-head'")).map(parseLesson).map((l) => [l.number, l]),
  );

  const lessons = [...parsed.values()].map((base) => {
    const extra = extras.lessons[base.number] || {};
    return {
      ...base,
      durationMinutes: 180,
      description: extra.description || '',
      why: extra.why || '',
      timeline: extra.timeline || [],
      practice: [...base.practice, ...(extra.practiceExtra || [])],
      diagrams: extra.diagrams || [],
      links: [...base.links, ...(extra.links || [])],
    };
  }).sort((a, b) => a.number - b.number);

  // Ilovalar bir necha <section>ga bo'lingan — birinchisidan oxirigacha hammasi olinadi.
  const appendixStart = sections.findIndex((s) => s.includes('3. Ilovalar'));
  const appendixSection = appendixStart === -1 ? '' : sections.slice(appendixStart).join('');
  const pages = [extras.passport, ...parseAppendices(appendixSection)].map((p, i) => ({ ...p, order: i + 1 }));

  return { modules: extras.modules, lessons, pages };
};

const summarize = ({ modules, lessons, pages }) => {
  console.log(`Modullar: ${modules.length}, darslar: ${lessons.length}, sahifalar: ${pages.length}`);
  for (const l of lessons) {
    console.log(
      `  ${String(l.number).padStart(2, '0')} | ${l.week}-hafta | ${l.title.slice(0, 48).padEnd(48)} | ` +
      `fikr:${l.keyPoints.length} demo:${l.demo.length} amaliyot:${l.practice.length} xato:${l.mistakes.length} ` +
      `uy:${l.homeworkRequired.length}+${l.homeworkOptional.length} link:${l.links.length} reja:${l.timeline.length} ` +
      `sxema:${l.diagrams.length} shablon:${l.template ? 'ha' : '-'} qaror:${l.decision ? 'ha' : 'YO\'Q'}`,
    );
  }
  for (const p of pages) console.log(`  sahifa: ${p.title} (${p.sections.length} bo'lim)`);
};

const validate = ({ modules, lessons }) => {
  const problems = [];
  const assigned = modules.flatMap((m) => m.lessons);
  for (const l of lessons) {
    if (!assigned.includes(l.number)) problems.push(`${l.number}-dars hech bir modulga biriktirilmagan`);
    for (const key of ['title', 'goal', 'outcome', 'relation', 'description', 'why', 'decision']) {
      if (!l[key]) problems.push(`${l.number}-dars: "${key}" bo'sh`);
    }
    for (const key of ['mentorPrep', 'keyPoints', 'demo', 'practice', 'mistakes', 'homeworkRequired', 'timeline', 'diagrams']) {
      if (!l[key].length) problems.push(`${l.number}-dars: "${key}" bo'sh`);
    }
  }
  return problems;
};

const main = async () => {
  const dry = process.argv.includes('--dry');
  const reset = process.argv.includes('--reset');

  const data = build();
  summarize(data);
  const problems = validate(data);
  if (problems.length) {
    console.error('\nMuammolar:\n - ' + problems.join('\n - '));
    process.exit(1);
  }
  if (dry) {
    console.log('\n--dry: DB\'ga yozilmadi.');
    return;
  }

  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const mongoose = require('mongoose');
  require('dns').setServers(['8.8.8.8', '1.1.1.1']);
  const MetodikaModule = require('../models/MetodikaModule');
  const MetodikaLesson = require('../models/MetodikaLesson');
  const MetodikaPage = require('../models/MetodikaPage');
  const MetodikaAsset = require('../models/MetodikaAsset');
  const { sanitizeLesson, sanitizeModule, sanitizePage } = require('../utils/metodika');

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    const existing = await MetodikaLesson.countDocuments();
    if (existing && !reset) {
      console.error(`\nDB'da allaqachon ${existing} ta dars bor. Qayta yuklash uchun --reset (tahrirlaringiz o'chadi!).`);
      process.exitCode = 1;
      return;
    }
    if (reset) {
      await Promise.all([
        MetodikaAsset.deleteMany({}), MetodikaLesson.deleteMany({}),
        MetodikaModule.deleteMany({}), MetodikaPage.deleteMany({}),
      ]);
    }

    // Seed ham API bilan bir xil sanitizer'dan o'tadi — DB'ga faqat API qabul qiladigan shakl tushadi.
    for (const mod of data.modules) {
      const created = await MetodikaModule.create(sanitizeModule(mod));
      const docs = data.lessons
        .filter((l) => mod.lessons.includes(l.number))
        .map((l) => ({ ...sanitizeLesson(l), module: created._id }));
      await MetodikaLesson.insertMany(docs);
    }
    await MetodikaPage.insertMany(data.pages.map(sanitizePage));

    console.log(`\nYuklandi: ${await MetodikaModule.countDocuments()} modul, ${await MetodikaLesson.countDocuments()} dars, ${await MetodikaPage.countDocuments()} sahifa.`);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error('Seed xatosi:', error.message);
  process.exit(1);
});
