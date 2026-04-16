import asyncio
from httpx import AsyncClient
from app.main import app

async def test():
    async with AsyncClient(app=app, base_url='http://test') as ac:
        response = await ac.post('/api/v1/auth/register', json={
            'email': 'test_register@example.com',
            'full_name': 'Test Register User',
            'password': 'password123'
        })
        print(response.status_code)
        print(response.text)

if __name__ == "__main__":
    asyncio.run(test())
