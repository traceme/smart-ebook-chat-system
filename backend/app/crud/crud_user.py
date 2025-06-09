from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import get_password_hash, verify_password


class CRUDUser:
    def get_by_email(self, db: Session, *, email: str) -> User | None:
        return db.query(User).filter(User.email == email).first()
    
    def get_by_id(self, db: Session, *, user_id: str) -> User | None:
        return db.query(User).filter(User.id == user_id).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def authenticate(self, db: Session, *, email: str, password: str) -> User | None:
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def is_active(self, user: User) -> bool:
        return user.is_active


user = CRUDUser() 