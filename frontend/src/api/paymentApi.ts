import api from './axiosInstance'

export type PaymentProvider = 'payme' | 'click'

export interface InitiatePaymentBody {
  courseId: string
  provider?: PaymentProvider
  /** Optional promo code — server applies the discount atomically. */
  promoCode?: string
}

export const paymentApi = {
  /** POST /payments/initiate — to'lovni boshlash (promoCode ixtiyoriy, discount serverda hisoblanadi) */
  initiate: (body: InitiatePaymentBody) => api.post('payments/initiate', body),

  /** GET /promos/validate/:code?courseId= — promo preview (consume QILMAYDI) */
  validatePromo: (code: string, courseId: string) =>
    api.get(`promos/validate/${encodeURIComponent(code)}`, { params: { courseId } }),

  /** GET /payments/:id/status — to'lov holatini tekshirish */
  getStatus: (id: string) => api.get(`payments/${id}/status`),

  /** GET /payments/my — foydalanuvchi to'lov tarixi */
  myPayments: (params: Record<string, unknown> = {}) => api.get('payments/my', { params }),
}

export default paymentApi
