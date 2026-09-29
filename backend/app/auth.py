import os
import datetime
from typing import List, Optional, Callable
import jwt
from dotenv import load_dotenv
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Path
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

# Load .env file from workspace/backend if present
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path=env_path)
load_dotenv()

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is missing. Please set SECRET_KEY in environment or .env file.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours for hackathon ease

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_raw = payload.get("sub")
        if user_id_raw is None:
            raise credentials_exception
        user_id = int(user_id_raw)
    except (jwt.PyJWTError, ValueError, TypeError):
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def require_role(*allowed_roles: str):
    """
    Dependency factory to restrict endpoint access to specified system roles.
    Allowed roles: SUPER_ADMIN, ADMIN, CLUB_ADMIN, FACULTY, STUDENT
    """
    def role_dependency(current_user: models.User = Depends(get_current_user)):
        if current_user.system_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. System role '{current_user.system_role}' is not authorized. Allowed: {list(allowed_roles)}"
            )
        return current_user
    return role_dependency


def require_club_access(club_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Verifies that the user has administrative or membership rights for a specific club.
    Allowed: SUPER_ADMIN, ADMIN, assigned club_admin_id, assigned faculty_coordinator_id, or active ClubMember.
    """
    if current_user.system_role in ["SUPER_ADMIN", "ADMIN"]:
        return current_user

    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    if club.club_admin_id == current_user.id or club.faculty_coordinator_id == current_user.id:
        return current_user

    membership = db.query(models.ClubMember).filter(
        models.ClubMember.club_id == club_id,
        models.ClubMember.user_id == current_user.id,
        models.ClubMember.status == "ACTIVE"
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You do not have management permissions or membership for this club."
        )

    return current_user


def require_permission(permission_code: str, club_id: int, current_user: models.User, db: Session) -> bool:
    """
    Checks if user has a specific dynamic role permission in the given club.
    Super Admins, Admins, and Club Admins automatically pass.
    Dynamic club members must have a dynamic_role linked to the permission code.
    """
    if current_user.system_role in ["SUPER_ADMIN", "ADMIN"]:
        return True

    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if club and club.club_admin_id == current_user.id:
        return True

    membership = db.query(models.ClubMember).filter(
        models.ClubMember.club_id == club_id,
        models.ClubMember.user_id == current_user.id,
        models.ClubMember.status == "ACTIVE"
    ).first()

    if not membership or not membership.dynamic_role_id:
        return False

    perm = db.query(models.Permission).filter(models.Permission.code == permission_code).first()
    if not perm:
        return False

    has_role_perm = db.query(models.RolePermission).filter(
        models.RolePermission.dynamic_role_id == membership.dynamic_role_id,
        models.RolePermission.permission_id == perm.id
    ).first()

    return has_role_perm is not None
