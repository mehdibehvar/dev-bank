import request from 'supertest';
import express from 'express';

describe('Shop Service', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    app.get('/api/v1/health', (req, res) => {
      res.json({ status: 'ok', service: 'shop', mode: 'TEST MODE' });
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/v1/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('shop');
      expect(response.body.mode).toBe('TEST MODE');
    });
  });
});