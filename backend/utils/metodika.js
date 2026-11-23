'use strict';

const jwt = require('jsonwebtoken');
const validator = require('validator');
const { ACCESS_TOKEN_SECRET } = require('../config/jwt');
const { serializeCookie } = require('./authSecurity');
const MetodikaAuditLog = require('../models/MetodikaAuditLog');
const MetodikaLesson = require('../models/MetodikaLesson');
const MetodikaPage = require('../models/MetodikaPage');

const METODIKA_COOKIE_NAME = 'aidevix_metodika';
const METODIKA_SESSION_TTL_SECONDS = 2 * 60 * 60;

// Access tokeni bilan bir xil secret, lekin alohida audience — access token metodika
// sessiyasi sifatida (yoki aksincha) qabul qilinmaydi.
const JWT_OPTS = { algorithm: 'HS256', issuer: 'aidevix', audience: 'aidevix-metodika' };
const JWT_VERIFY = { algorithms: ['HS256'], issuer: 'aidevix', audience: 'aidevix-metodika' };

const signMetodikaSession = (payload) =>
  jwt.sign(payload, ACCESS_TOKEN_SECRET, { ...JWT_OPTS, expiresIn: METODIKA_SESSION_TTL_SECONDS });

const verifyMetodikaSession = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET, JWT_VERIFY);
  } catch {
    return null;
  }
};

const appendCookie = (res, cookie) => {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) return res.setHeader('Set-Cookie', cookie);
  return res.setHeader('Set-Cookie', Array.isArray(existing) ? [...existing, cookie] : [existing, cookie]);
};

const setMetodikaCookie = (res, token) =>
  appendCookie(res, serializeCookie(METODIKA_COOKIE_NAME, token, { maxAge: METODIKA_SESSION_TTL_SECONDS }));

const clearMetodikaCookie = (res) =>
  appendCookie(res, serializeCookie(METODIKA_COOKIE_NAME, '', { maxAge: 0, expires: new Date(0) }));

// Metodikani tahrirlash va ruxsat berish huquqi. METODIKA_OWNER_IDS (vergul bilan
// ajratilgan User _id'lar) berilsa — faqat o'sha adminlar. Berilmasa — har qanday admin.
const ownerIds = () =>
  String(process.env.METODIKA_OWNER_IDS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-f\d]{24}$/.test(s));

const isMetodikaOwner = (user) => {
  if (!user || user.role !== 'admin') return false;
  const ids = ownerIds();
  return ids.length === 0 || ids.includes(String(user._id).toLowerCase());
};

const audit = (req, action, target = '') => {
  // Jurnal yozuvi asosiy so'rovni hech qachon yiqitmasligi kerak.
  MetodikaAuditLog.create({
    user: req.user?._id,
    action,
    target: String(target).slice(0, 200),
    ip: req.ip || null,
    ua: String(req.headers?.['user-agent'] || '').slice(0, 200) || null,
  }).catch(() => {});
};

// ─── Kiritilgan ma'lumotni tozalash (mass-assignment va tur chalkashligiga qarshi) ───

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : undefined);

const text = (value, max) => (typeof value === 'string' ? value.replace(/\r\n/g, '\n').slice(0, max) : undefined);

const num = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, Math.round(n)));
};

const bool = (value) => (typeof value === 'boolean' ? value : undefined);

const strList = (value, maxItems, maxLen) => {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((v) => typeof v === 'string')
    .map((v) => v.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
};

const isSafeUrl = (url) =>
  typeof url === 'string' &&
  validator.isURL(url, { protocols: ['http', 'https'], require_protocol: true });

const objList = (value, maxItems, mapper) => {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((v) => v && typeof v === 'object' && !Array.isArray(v))
    .map(mapper)
    .filter(Boolean)
    .slice(0, maxItems);
};

const compact = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

const sanitizeModule = (body = {}) => compact({
  title: str(body.title, 200),
  subtitle: str(body.subtitle, 300),
  summary: str(body.summary, 2000),
  outcome: str(body.outcome, 1000),
  weeks: str(body.weeks, 60),
  order: num(body.order, 0, 1000),
  isPublished: bool(body.isPublished),
});

// images bu yerda YO'Q: rasm faqat upload/delete endpointlari orqali o'zgaradi;
// mavjud rasmning izohi alohida `imageCaptions` orqali yangilanadi.
const sanitizeLesson = (body = {}) => compact({
  number: num(body.number, 1, 999),
  title: str(body.title, 200),
  week: num(body.week, 0, 99),
  durationMinutes: num(body.durationMinutes, 10, 600),
  goal: str(body.goal, 1500),
  outcome: str(body.outcome, 2000),
  description: str(body.description, 6000),
  why: str(body.why, 3000),
  relation: str(body.relation, 2000),
  mentorPrep: strList(body.mentorPrep, 30, 1000),
  timeline: objList(body.timeline, 30, (t) => {
    const title = str(t.title, 300);
    if (!title) return null;
    return { time: str(t.time, 40) || '', title, details: str(t.details, 1000) || '' };
  }),
  keyPoints: strList(body.keyPoints, 40, 1500),
  demo: strList(body.demo, 30, 1000),
  practice: strList(body.practice, 40, 1000),
  template: body.template && typeof body.template === 'object'
    ? { title: str(body.template.title, 200) || '', body: text(body.template.body, 5000) || '' }
    : undefined,
  mistakes: strList(body.mistakes, 30, 1000),
  homeworkRequired: strList(body.homeworkRequired, 20, 1000),
  homeworkOptional: strList(body.homeworkOptional, 20, 1000),
  decision: str(body.decision, 1500),
  links: objList(body.links, 30, (l) => {
    const url = str(l.url, 600);
    if (!isSafeUrl(url)) return null;
    return { title: str(l.title, 200) || url, url, note: str(l.note, 300) || '' };
  }),
  diagrams: objList(body.diagrams, 8, (d) => {
    const items = objList(d.items, 12, (i) => {
      const label = str(i.label, 200);
      if (!label) return null;
      return { label, text: str(i.text, 600) || '' };
    }) || [];
    if (!items.length) return null;
    return {
      type: MetodikaLesson.DIAGRAM_TYPES.includes(d.type) ? d.type : 'flow',
      title: str(d.title, 200) || '',
      caption: str(d.caption, 600) || '',
      leftTitle: str(d.leftTitle, 120) || '',
      rightTitle: str(d.rightTitle, 120) || '',
      items,
    };
  }),
  isPublished: bool(body.isPublished),
});

const sanitizePage = (body = {}) => compact({
  title: str(body.title, 200),
  order: num(body.order, 0, 1000),
  sections: objList(body.sections, 40, (s) => {
    const sectionBody = text(s.body, 12000) || '';
    const heading = str(s.heading, 200) || '';
    if (!sectionBody.trim() && !heading) return null;
    return {
      heading,
      type: MetodikaPage.SECTION_TYPES.includes(s.type) ? s.type : 'text',
      body: sectionBody,
    };
  }),
  isPublished: bool(body.isPublished),
});

module.exports = {
  METODIKA_COOKIE_NAME,
  METODIKA_SESSION_TTL_SECONDS,
  signMetodikaSession,
  verifyMetodikaSession,
  setMetodikaCookie,
  clearMetodikaCookie,
  isMetodikaOwner,
  audit,
  isSafeUrl,
  sanitizeModule,
  sanitizeLesson,
  sanitizePage,
  str,
};
