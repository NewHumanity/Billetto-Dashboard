import { http, HttpResponse } from 'msw';

const BASE_URL = 'https://billetto.dk/api/v3/organiser';

export const handlers = [
  http.get(`${BASE_URL}/events`, () => {
    return HttpResponse.json({
      object: 'list',
      data: [
        {
          id: 'evt_mock_1',
          object: 'event',
          name: 'Mocked Summer Festival',
          state: 'published',
          currency: 'DKK',
          starts_at: new Date(Date.now() + 86400000).toISOString(),
          public_url: 'https://billetto.dk/e/mock-1',
          kind: 'regular',
          availability: { available: 500, status: 'high' }
        },
        {
          id: 'evt_mock_2',
          object: 'event',
          name: 'Past Winter Gala',
          state: 'completed',
          currency: 'DKK',
          starts_at: new Date(Date.now() - 86400000 * 10).toISOString(),
          public_url: 'https://billetto.dk/e/mock-2',
          kind: 'regular',
          availability: { available: 0, status: 'sold_out' }
        }
      ],
      total: 2,
      has_more: false,
      url: '/events'
    });
  }),

  http.get(`${BASE_URL}/orders`, () => {
    return HttpResponse.json({
      object: 'list',
      data: [
        {
          id: 'ord_mock_1',
          object: 'order',
          created_at: new Date().toISOString(),
          buyer_name: 'Alice Mock',
          email: 'alice@example.com',
          state: 'successful',
          payout: 10000,
          currency: 'DKK',
          subtotal: 10000,
          payment_fees: 0,
          billetto_fees: 0,
          order_lines: { object: 'list', data: [], has_more: false, total: 0, url: '' },
          order_transactions: { object: 'list', data: [], has_more: false, total: 0, url: '' }
        }
      ],
      total: 1,
      has_more: false,
      url: '/orders'
    });
  }),
  
  // Default handler for other lists to avoid 404s
  http.get(`${BASE_URL}/*`, () => {
      return HttpResponse.json({
          object: 'list',
          data: [],
          total: 0,
          has_more: false,
          url: '/unknown'
      });
  })
];