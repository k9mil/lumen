from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    async with engine.begin() as conn:
        # Load sqlite-vec extension
        try:
            import sqlite_vec

            def _load_vec(sync_conn):
                sync_conn.enable_load_extension(True)
                sqlite_vec.load(sync_conn)
                sync_conn.enable_load_extension(False)

            await conn.run_sync(lambda conn: _load_vec(conn.connection.dbapi_connection))
        except Exception:
            pass  # sqlite-vec not available, skip

        await conn.run_sync(Base.metadata.create_all)
