'use strict';

// adminRoutes'ni DB'siz require qilish mumkin: mongoose model ta'riflari
// ulanish ochmaydi. Shuning uchun bu yerda hech qanday mock kerak emas.
const adminRouter = require('../../routes/adminRoutes');
const adminController = require('../../controllers/adminController');

const routeSignatures = () =>
  adminRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods)[0]} ${layer.route.path}`);

describe('admin routes — Bunny olib tashlandi', () => {
  it('bulk-link endpointini endi ochmaydi', () => {
    expect(routeSignatures()).not.toContain('post /videos/bulk-link');
  });

  it('bulkLinkBunny ni eksport qilmaydi', () => {
    expect(adminController.bulkLinkBunny).toBeUndefined();
  });

  // Qo'shni route'lar shu tozalashda tasodifan yo'qolmasligi uchun.
  it("qolgan tools route'larini saqlaydi", () => {
    const signatures = routeSignatures();
    expect(signatures).toContain('post /telegram');
    expect(signatures).toContain('put /videos/reorder');
  });
});
