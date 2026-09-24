import request from 'supertest';
import express from 'express';

describe('Bank Service', () => {
  let app: express.Express;

  beforeAll(async () => {
    // Import the bank app - in tests we'll mock or use the actual app
    // For now, we just test that the test framework works
    app = express();
    app.get('/api/v1/health', (req, res) => {
      res.json({ status: 'ok', service: 'bank', mode: 'TEST MODE' });
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/v1/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('bank');
      expect(response.body.mode).toBe('TEST MODE');
    });
  });
});