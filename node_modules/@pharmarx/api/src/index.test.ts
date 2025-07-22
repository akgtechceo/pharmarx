import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from './index'

describe('API Server', () => {
  it('should respond to health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)
    
    expect(response.body).toEqual({
      status: 'OK',
      timestamp: expect.any(String)
    })
  })

  it('should respond to API endpoint', async () => {
    const response = await request(app)
      .get('/api')
      .expect(200)
    
    expect(response.body).toEqual({
      message: 'PharmaRx API is running'
    })
  })

  it('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/unknown-route')
      .expect(404)
    
    expect(response.body).toEqual({
      error: 'Route not found'
    })
  })
}) 