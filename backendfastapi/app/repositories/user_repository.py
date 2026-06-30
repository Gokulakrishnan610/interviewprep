from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User, UserProfile


class UserRepository:
    """
    All database queries for User and UserProfile.
    No business logic here — only reads and writes.
    """

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ── Lookups ───────────────────────────────────────────────────────────────

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self._db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self._db.execute(
            select(User)
            .options(selectinload(User.profile))
            .where(User.email == email.lower())
        )
        return result.scalar_one_or_none()

    async def email_exists(self, email: str) -> bool:
        result = await self._db.execute(
            select(User.id).where(User.email == email.lower())
        )
        return result.scalar_one_or_none() is not None

    # ── Writes ────────────────────────────────────────────────────────────────

    async def create(
        self,
        *,
        email: str,
        first_name: str,
        last_name: str,
        hashed_password: str,
        avatar_id: str,
    ) -> User:
        user = User(
            email=email.lower(),
            username=email.lower(),
            first_name=first_name,
            last_name=last_name,
            hashed_password=hashed_password,
            avatar_id=avatar_id,
            is_active=False,          # inactive until email verified
            is_email_verified=False,
        )
        self._db.add(user)
        await self._db.flush()  # get user.id without committing

        # Always create a default profile
        profile = UserProfile(user_id=user.id)
        self._db.add(profile)
        await self._db.flush()

        # Eagerly attach profile so callers don't need a separate query
        user.profile = profile
        return user

    async def activate(self, user: User) -> User:
        """Mark user as active + email verified."""
        user.is_active = True
        user.is_email_verified = True
        self._db.add(user)
        await self._db.flush()
        return user

    async def update_profile(
        self,
        user: User,
        *,
        first_name: str | None = None,
        last_name: str | None = None,
        bio: str | None = None,
        preferred_language: str | None = None,
        skill_level: str | None = None,
    ) -> User:
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name

        if user.profile is None:
            user.profile = UserProfile(user_id=user.id)
            self._db.add(user.profile)

        if bio is not None:
            user.profile.bio = bio
        if preferred_language is not None:
            user.profile.preferred_language = preferred_language
        if skill_level is not None:
            user.profile.skill_level = skill_level

        self._db.add(user)
        await self._db.flush()
        return user

    async def commit(self) -> None:
        await self._db.commit()
