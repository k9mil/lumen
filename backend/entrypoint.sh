#!/bin/sh
set -e

# Auto-seed if database is empty (no buildings exist)
uv run python -c "
import asyncio
from app.database import init_db, async_session
from app.models.building import Building
from sqlalchemy import select, func

async def check_and_seed():
    await init_db()
    async with async_session() as db:
        result = await db.execute(select(func.count()).select_from(Building))
        count = result.scalar()
        if count == 0:
            print('Database empty — running seed...')
            from seed import seed
            await seed()
        else:
            print(f'Database has {count} buildings — skipping seed.')

asyncio.run(check_and_seed())
"

# Start the server
exec uv run python -m uvicorn app.main:app --host 0.0.0.0 --port 8080
