import uuid
from pydantic import BaseModel, EmailStr

# Shared properties
class UserBase(BaseModel):
    email: EmailStr

# Properties to receive on user creation
class UserCreate(UserBase):
    password: str

# Properties to receive on user update
class UserUpdate(UserBase):
    pass

# Properties shared by models stored in DB
class UserInDBBase(UserBase):
    id: uuid.UUID
    is_active: bool
    is_superuser: bool

    class Config:
        orm_mode = True

# Properties to return to client
class User(UserInDBBase):
    pass

# Properties properties stored in DB
class UserInDB(UserInDBBase):
    hashed_password: str 