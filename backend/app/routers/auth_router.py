from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check duplicate email
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    # Student validation
    if user_in.system_role == "STUDENT":
        if not user_in.ra_number:
            raise HTTPException(status_code=400, detail="RA Number is mandatory for Student role.")
        existing_ra = db.query(models.User).filter(models.User.ra_number == user_in.ra_number).first()
        if existing_ra:
            raise HTTPException(status_code=400, detail="RA Number is already registered.")

    hashed_pw = auth.get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        password_hash=hashed_pw,
        full_name=user_in.full_name,
        system_role=user_in.system_role,
        ra_number=user_in.ra_number if user_in.system_role == "STUDENT" else None,
        department=user_in.department,
        class_mentor_id=user_in.class_mentor_id,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log audit
    audit = models.AuditLog(
        user_id=new_user.id,
        action="USER_REGISTERED",
        entity="users",
        entity_id=new_user.id,
        new_value=f"Registered user {new_user.email} as {new_user.system_role}"
    )
    db.add(audit)
    db.commit()

    access_token = auth.create_access_token(data={"sub": new_user.id, "role": new_user.system_role})
    return {"access_token": access_token, "token_type": "bearer", "user": new_user}


@router.post("/login", response_model=schemas.Token)
def login_user(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not auth.verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated.")

    access_token = auth.create_access_token(data={"sub": user.id, "role": user.system_role})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.post("/token", response_model=schemas.Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token(data={"sub": user.id, "role": user.system_role})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
