# Feature 7.3 Phase 2a: ユーザー認証 - 実装計画書

**作成日**: 2026-02-03  
**対象フェーズ**: Phase 2a - 基本的なユーザー認証  
**前提条件**: Phase 1a（バージョン管理基本実装）完了

---

## 1. 概要

Phase 2aでは、relation-mapアプリケーションに基本的なユーザー認証機能を実装します。これにより、各ユーザーが独立してデータを管理でき、将来的な複数プロジェクト対応の基盤となります。

### 1.1 実装スコープ

**含まれる機能**:
- ユーザー登録（Sign up）
- ログイン/ログアウト（Sign in/out）
- JWT トークンベース認証
- 認証ミドルウェア
- 認証状態管理（フロントエンド）
- 既存データの単一ユーザーへのマイグレーション

**除外される機能**:
- プロジェクト管理（Phase 2bで実装）
- パスワードリセット/メール認証（将来拡張）
- OAuth/ソーシャルログイン（将来拡張）
- ユーザープロフィール管理（将来拡張）

### 1.2 技術スタック

**バックエンド**:
- **FastAPI**: Web フレームワーク
- **python-jose**: JWT 生成・検証
- **passlib[bcrypt]**: パスワードハッシュ化
- **SQLAlchemy**: ORM

**フロントエンド**:
- **React Context API**: 認証状態管理
- **localStorage**: トークン保存
- **React Router**: 認証ルーティング

---

## 2. バックエンド実装

### 2.1 データモデル

#### 2.1.1 新規テーブル: `users`

```python
# backend/models.py

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # リレーションシップ（Phase 2bで追加予定）
    # projects = relationship("Project", back_populates="owner")
```

#### 2.1.2 既存テーブルの拡張

Phase 2aでは、既存のEntity/Relation/Versionテーブルに`user_id`カラムを追加し、デフォルトユーザーに関連付けます。

```python
# 既存モデルに追加

class Entity(Base):
    # ... 既存のカラム ...
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Phase 2aでは一時的にNullable
    user = relationship("User")

class Relation(Base):
    # ... 既存のカラム ...
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("User")

class RelationType(Base):
    # ... 既存のカラム ...
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("User")

class Version(Base):
    # ... 既存のカラム ...
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = Column(String, nullable=True)  # ユーザー名またはID
    user = relationship("User")
```

### 2.2 スキーマ定義

#### 2.2.1 認証スキーマ

```python
# backend/schemas.py に追加

from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime
from typing import Optional

# ユーザー登録リクエスト
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must contain only alphanumeric characters, hyphens, and underscores')
        return v

# ログインリクエスト
class UserLogin(BaseModel):
    username: str
    password: str

# ユーザーレスポンス（パスワードは含めない）
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

# トークンレスポンス
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# トークンペイロード
class TokenPayload(BaseModel):
    sub: int  # user_id
    username: str
    exp: datetime
```

### 2.3 認証ユーティリティ

#### 2.3.1 パスワードハッシュ化・検証

```python
# backend/auth.py (新規ファイル)

from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

# パスワードコンテキスト
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT設定
SECRET_KEY = "your-secret-key-here-change-in-production"  # TODO: 環境変数から読み込む
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7日間

# HTTPBearer スキーマ
security = HTTPBearer()

def hash_password(password: str) -> str:
    """パスワードをハッシュ化"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """パスワードを検証"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWTトークンを生成"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    """JWTトークンをデコード"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

#### 2.3.2 認証依存関数

```python
# backend/auth.py (続き)

from backend.db import get_db
from backend.models import User

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """現在のユーザーを取得（認証必須）"""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """アクティブなユーザーのみ許可"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

# オプショナル認証（開発用）
def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """認証オプション（トークンがあれば検証、なければNone）"""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None
```

### 2.4 認証API エンドポイント

#### 2.4.1 認証ルーター

```python
# backend/auth_api.py (新規ファイル)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.db import get_db
from backend.models import User
from backend.schemas import UserCreate, UserLogin, Token, UserResponse
from backend.auth import (
    hash_password, 
    verify_password, 
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """新規ユーザー登録"""
    # ユーザー名の重複チェック
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
        if existing_user.username == user_data.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # ユーザー作成
    hashed_password = hash_password(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # JWTトークン生成
    access_token = create_access_token(
        data={"sub": new_user.id, "username": new_user.username}
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse.from_orm(new_user)
    )

@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """ユーザーログイン"""
    user = db.query(User).filter(User.username == user_data.username).first()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive"
        )
    
    # JWTトークン生成
    access_token = create_access_token(
        data={"sub": user.id, "username": user.username}
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse.from_orm(new_user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """現在のユーザー情報取得"""
    return UserResponse.from_orm(current_user)

@router.post("/logout")
def logout():
    """ログアウト（クライアント側でトークン削除）"""
    # JWTはステートレスなので、サーバー側では何もしない
    # クライアント側でトークンを削除する必要がある
    return {"message": "Logged out successfully"}
```

### 2.5 既存APIの認証対応

#### 2.5.1 Entity API の修正

```python
# backend/api.py の修正

from backend.auth import get_current_user
from backend.models import User

# 既存のエンドポイントに current_user を追加

@router.post("/entities", response_model=EntityResponse)
def create_entity(
    entity: EntityCreate,
    current_user: User = Depends(get_current_user),  # 追加
    db: Session = Depends(get_db)
):
    new_entity = Entity(
        label=entity.label,
        properties=entity.properties,
        user_id=current_user.id  # 追加
    )
    db.add(new_entity)
    create_version_snapshot(db, f"Added entity: {entity.label}", user=current_user)  # 修正
    db.commit()
    db.refresh(new_entity)
    return new_entity

@router.get("/entities", response_model=List[EntityResponse])
def get_entities(
    current_user: User = Depends(get_current_user),  # 追加
    db: Session = Depends(get_db)
):
    # 現在のユーザーのエンティティのみ取得
    entities = db.query(Entity).filter(Entity.user_id == current_user.id).all()
    return entities

# 他のエンドポイントも同様に修正...
```

#### 2.5.2 バージョンサービスの修正

```python
# backend/version_service.py の修正

def create_version_snapshot(
    db: Session, 
    description: str = "Auto-saved", 
    user: Optional[User] = None
):
    """現在の状態のスナップショットを作成"""
    # user_idフィルタリングを追加
    user_id = user.id if user else None
    
    entities = db.query(Entity).filter(Entity.user_id == user_id).all()
    relations = db.query(Relation).filter(Relation.user_id == user_id).all()
    relation_types = db.query(RelationType).filter(RelationType.user_id == user_id).all()
    
    # スナップショット作成
    snapshot = {
        "entities": [
            {"id": e.id, "label": e.label, "properties": e.properties}
            for e in entities
        ],
        "relations": [
            {"id": r.id, "from": r.from_entity, "to": r.to_entity, "type": r.relation_type}
            for r in relations
        ],
        "relationTypes": [
            {"id": rt.id, "name": rt.name, "color": rt.color}
            for rt in relation_types
        ]
    }
    
    # バージョン番号を取得
    last_version = db.query(Version).filter(Version.user_id == user_id)\
        .order_by(Version.version_number.desc()).first()
    version_number = (last_version.version_number + 1) if last_version else 1
    
    # バージョンを保存
    new_version = Version(
        version_number=version_number,
        description=description,
        snapshot=snapshot,
        user_id=user_id,
        created_by=user.username if user else "system"
    )
    
    db.add(new_version)
    # db.commit() は呼び出し元で行う
    
    return new_version
```

### 2.6 データベースマイグレーション

#### 2.6.1 マイグレーションスクリプト

```python
# backend/migrate_auth.py (新規ファイル)

"""
データベースマイグレーション: Phase 2a ユーザー認証
既存データをデフォルトユーザーに移行
"""

from sqlalchemy import text
from backend.db import engine, SessionLocal
from backend.models import Base, User
from backend.auth import hash_password

def migrate_to_auth():
    """Phase 2a マイグレーション実行"""
    db = SessionLocal()
    
    try:
        print("Starting Phase 2a migration...")
        
        # 1. 新しいテーブルを作成
        print("Creating new tables...")
        Base.metadata.create_all(bind=engine)
        
        # 2. 既存テーブルに user_id カラムを追加
        print("Adding user_id columns to existing tables...")
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE entities ADD COLUMN user_id INTEGER"))
            conn.execute(text("ALTER TABLE relations ADD COLUMN user_id INTEGER"))
            conn.execute(text("ALTER TABLE relation_types ADD COLUMN user_id INTEGER"))
            conn.execute(text("ALTER TABLE versions ADD COLUMN user_id INTEGER"))
            conn.execute(text("ALTER TABLE versions ADD COLUMN created_by TEXT"))
            conn.commit()
        
        # 3. デフォルトユーザーを作成
        print("Creating default user...")
        default_user = User(
            username="admin",
            email="admin@localhost",
            password_hash=hash_password("admin123"),
            is_active=True
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)
        print(f"Default user created: id={default_user.id}, username={default_user.username}")
        
        # 4. 既存データをデフォルトユーザーに関連付け
        print("Migrating existing data to default user...")
        with engine.connect() as conn:
            conn.execute(
                text("UPDATE entities SET user_id = :user_id WHERE user_id IS NULL"),
                {"user_id": default_user.id}
            )
            conn.execute(
                text("UPDATE relations SET user_id = :user_id WHERE user_id IS NULL"),
                {"user_id": default_user.id}
            )
            conn.execute(
                text("UPDATE relation_types SET user_id = :user_id WHERE user_id IS NULL"),
                {"user_id": default_user.id}
            )
            conn.execute(
                text("UPDATE versions SET user_id = :user_id WHERE user_id IS NULL"),
                {"user_id": default_user.id}
            )
            conn.execute(
                text("UPDATE versions SET created_by = 'admin' WHERE created_by IS NULL"),
            )
            conn.commit()
        
        print("Migration completed successfully!")
        print("\nDefault login credentials:")
        print("  Username: admin")
        print("  Password: admin123")
        print("\n⚠️  Please change the default password after first login!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_to_auth()
```

### 2.7 main.py の更新

```python
# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import router as api_router
from backend.auth_api import router as auth_router  # 追加
from backend.db import engine
from backend.models import Base

app = FastAPI(title="Relation Map API", version="1.2.0")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# データベース初期化
Base.metadata.create_all(bind=engine)

# ルーター登録
app.include_router(auth_router, prefix="/api")  # 追加
app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Relation Map API", "version": "1.2.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}
```

### 2.8 依存パッケージの追加

```txt
# backend/requirements.txt に追加

python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
```

---

## 3. フロントエンド実装

### 3.1 認証コンテキスト

#### 3.1.1 AuthContext 作成

```typescript
// frontend/src/contexts/AuthContext.tsx (新規ファイル)

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { loginUser, registerUser, getCurrentUser } from '../api/auth';

interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  // 初期化：トークンがあればユーザー情報を取得
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
          setToken(storedToken);
        } catch (error) {
          console.error('Failed to fetch user info:', error);
          localStorage.removeItem('access_token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await loginUser(username, password);
    setToken(response.access_token);
    setUser(response.user);
    localStorage.setItem('access_token', response.access_token);
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await registerUser(username, email, password);
    setToken(response.access_token);
    setUser(response.user);
    localStorage.setItem('access_token', response.access_token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 3.2 認証API クライアント

```typescript
// frontend/src/api/auth.ts (新規ファイル)

const API_BASE_URL = 'http://localhost:8000/api';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    username: string;
    email: string;
    created_at: string;
    is_active: boolean;
  };
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export async function loginUser(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  return response.json();
}

export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Registration failed');
  }

  return response.json();
}

export async function getCurrentUser() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No access token found');
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  return response.json();
}

export async function logoutUser(): Promise<void> {
  const token = localStorage.getItem('access_token');
  if (token) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }
  localStorage.removeItem('access_token');
}
```

### 3.3 既存API クライアントの修正

```typescript
// frontend/src/api/client.ts の修正

// すべてのAPI呼び出しにAuthorizationヘッダーを追加

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// 既存の関数を修正
export async function fetchEntities(): Promise<Entity[]> {
  const response = await fetch(`${API_BASE_URL}/entities`, {
    headers: getAuthHeaders(),  // 修正
  });
  // ... 残りは同じ
}

export async function createEntity(entity: Omit<Entity, 'id'>): Promise<Entity> {
  const response = await fetch(`${API_BASE_URL}/entities`, {
    method: 'POST',
    headers: getAuthHeaders(),  // 修正
    body: JSON.stringify(entity),
  });
  // ... 残りは同じ
}

// 他の関数も同様に修正...
```

### 3.4 認証UI コンポーネント

#### 3.4.1 LoginPage

```typescript
// frontend/src/components/LoginPage.tsx (新規ファイル)

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Relation Map</h1>
        <div className="login-tabs">
          <button
            className={isLogin ? 'active' : ''}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            className={!isLogin ? 'active' : ''}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              pattern="^[a-zA-Z0-9_-]+$"
              placeholder="Enter username"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter email"
              />
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Enter password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        {isLogin && (
          <div className="default-credentials">
            <p>Default credentials:</p>
            <p>Username: <strong>admin</strong></p>
            <p>Password: <strong>admin123</strong></p>
          </div>
        )}
      </div>
    </div>
  );
};
```

#### 3.4.2 ProtectedRoute

```typescript
// frontend/src/components/ProtectedRoute.tsx (新規ファイル)

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

### 3.5 App.tsx の更新

```typescript
// frontend/src/App.tsx の修正

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainApp } from './components/MainApp';  // 既存のアプリを分離

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
```

### 3.6 ナビゲーションバーの更新

```typescript
// frontend/src/components/Navbar.tsx (既存ファイルに追加)

import { useAuth } from '../contexts/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">Relation Map</div>
      <div className="navbar-user">
        <span>Welcome, {user?.username}</span>
        <button onClick={logout} className="logout-button">
          Logout
        </button>
      </div>
    </nav>
  );
};
```

### 3.7 スタイリング

```css
/* frontend/src/components/LoginPage.css (新規ファイル) */

.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-container {
  background: white;
  padding: 40px;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
}

.login-container h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.login-tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 2px solid #eee;
}

.login-tabs button {
  flex: 1;
  padding: 10px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  transition: all 0.3s;
}

.login-tabs button.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-weight: 600;
  color: #333;
}

.form-group input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.error-message {
  padding: 10px;
  background: #fee;
  color: #c33;
  border-radius: 5px;
  font-size: 14px;
}

.submit-button {
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.submit-button:hover {
  background: #5568d3;
}

.submit-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.default-credentials {
  margin-top: 20px;
  padding: 15px;
  background: #f0f4ff;
  border-radius: 5px;
  font-size: 13px;
  color: #666;
}

.default-credentials strong {
  color: #667eea;
}

.loading-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

## 4. テスト計画

### 4.1 バックエンドテスト

#### 4.1.1 認証APIテスト

```python
# backend/tests/test_auth.py (新規ファイル)

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db import get_db, Base, engine
from sqlalchemy.orm import Session

client = TestClient(app)

@pytest.fixture
def test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_register_user(test_db):
    """ユーザー登録テスト"""
    response = client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "testuser"

def test_register_duplicate_username(test_db):
    """重複ユーザー名でのエラー"""
    client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test1@example.com",
        "password": "testpass123"
    })
    
    response = client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test2@example.com",
        "password": "testpass123"
    })
    assert response.status_code == 400

def test_login(test_db):
    """ログインテスト"""
    # ユーザー登録
    client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    })
    
    # ログイン
    response = client.post("/api/auth/login", json={
        "username": "testuser",
        "password": "testpass123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

def test_login_wrong_password(test_db):
    """間違ったパスワードでのエラー"""
    client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    })
    
    response = client.post("/api/auth/login", json={
        "username": "testuser",
        "password": "wrongpass"
    })
    assert response.status_code == 401

def test_get_current_user(test_db):
    """現在のユーザー情報取得テスト"""
    # 登録してトークン取得
    register_response = client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    })
    token = register_response.json()["access_token"]
    
    # ユーザー情報取得
    response = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"

def test_protected_endpoint_without_token(test_db):
    """トークンなしでの保護エンドポイントアクセス"""
    response = client.get("/api/entities")
    assert response.status_code == 403  # or 401
```

#### 4.1.2 データ分離テスト

```python
# backend/tests/test_data_isolation.py (新規ファイル)

def test_user_data_isolation(test_db):
    """ユーザーごとのデータ分離テスト"""
    # ユーザー1登録
    user1_response = client.post("/api/auth/register", json={
        "username": "user1",
        "email": "user1@example.com",
        "password": "pass123"
    })
    token1 = user1_response.json()["access_token"]
    
    # ユーザー2登録
    user2_response = client.post("/api/auth/register", json={
        "username": "user2",
        "email": "user2@example.com",
        "password": "pass123"
    })
    token2 = user2_response.json()["access_token"]
    
    # ユーザー1がエンティティ作成
    client.post("/api/entities", 
        headers={"Authorization": f"Bearer {token1}"},
        json={"label": "User1Entity", "properties": {}}
    )
    
    # ユーザー2がエンティティ作成
    client.post("/api/entities",
        headers={"Authorization": f"Bearer {token2}"},
        json={"label": "User2Entity", "properties": {}}
    )
    
    # ユーザー1は自分のエンティティのみ取得
    response1 = client.get("/api/entities", 
        headers={"Authorization": f"Bearer {token1}"}
    )
    entities1 = response1.json()
    assert len(entities1) == 1
    assert entities1[0]["label"] == "User1Entity"
    
    # ユーザー2は自分のエンティティのみ取得
    response2 = client.get("/api/entities",
        headers={"Authorization": f"Bearer {token2}"}
    )
    entities2 = response2.json()
    assert len(entities2) == 1
    assert entities2[0]["label"] == "User2Entity"
```

### 4.2 フロントエンドテスト

```typescript
// frontend/src/__tests__/AuthContext.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { loginUser } from '../api/auth';

jest.mock('../api/auth');

describe('AuthContext', () => {
  test('provides authentication state', async () => {
    const TestComponent = () => {
      const { isAuthenticated } = useAuth();
      return <div>{isAuthenticated ? 'Logged in' : 'Logged out'}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Logged out')).toBeInTheDocument();
  });

  // 他のテスト...
});
```

---

## 5. 実装チェックリスト

### 5.1 バックエンド

- [ ] **モデル実装**
  - [ ] User モデル作成
  - [ ] 既存モデルに user_id 追加
- [ ] **認証ロジック**
  - [ ] パスワードハッシュ化関数
  - [ ] JWT生成・検証関数
  - [ ] 認証依存関数（get_current_user）
- [ ] **認証API**
  - [ ] POST /auth/register
  - [ ] POST /auth/login
  - [ ] GET /auth/me
  - [ ] POST /auth/logout
- [ ] **既存API修正**
  - [ ] Entitiesエンドポイントに認証追加
  - [ ] Relationsエンドポイントに認証追加
  - [ ] Versionsエンドポイントに認証追加
  - [ ] user_idでのフィルタリング実装
- [ ] **マイグレーション**
  - [ ] migrate_auth.py スクリプト作成
  - [ ] デフォルトユーザー作成
  - [ ] 既存データの移行
- [ ] **依存関係**
  - [ ] requirements.txt 更新
  - [ ] パッケージインストール

### 5.2 フロントエンド

- [ ] **認証コンテキスト**
  - [ ] AuthContext 作成
  - [ ] AuthProvider 実装
  - [ ] useAuth フック
- [ ] **認証API クライアント**
  - [ ] auth.ts 作成
  - [ ] loginUser 関数
  - [ ] registerUser 関数
  - [ ] getCurrentUser 関数
- [ ] **既存APIクライアント修正**
  - [ ] Authorizationヘッダー追加
  - [ ] エラーハンドリング改善
- [ ] **UIコンポーネント**
  - [ ] LoginPage コンポーネント
  - [ ] ProtectedRoute コンポーネント
  - [ ] Navbar にログアウトボタン追加
- [ ] **ルーティング**
  - [ ] React Router 設定
  - [ ] 保護ルート実装
- [ ] **スタイリング**
  - [ ] LoginPage.css
  - [ ] 認証関連スタイル

### 5.3 テスト

- [ ] **バックエンドテスト**
  - [ ] 認証APIテスト (10+ テスト)
  - [ ] データ分離テスト (5+ テスト)
  - [ ] 既存テストの修正
- [ ] **フロントエンドテスト**
  - [ ] AuthContext テスト (5+ テスト)
  - [ ] LoginPage テスト (5+ テスト)
  - [ ] ProtectedRoute テスト (3+ テスト)

### 5.4 ドキュメント

- [ ] README.md 更新（認証機能の説明）
- [ ] API_REFERENCE.md 更新（認証エンドポイント）
- [ ] DEVELOPER_GUIDE.md 更新（認証実装ガイド）
- [ ] CHANGELOG.md 更新（v1.2.0）

---

## 6. マイルストーン

| マイルストーン | 期間 | 完了条件 |
|-------------|-----|---------|
| M1: バックエンド認証実装 | 1日 | User モデル + 認証API完成 |
| M2: データマイグレーション | 0.5日 | マイグレーションスクリプト完成、既存データ移行 |
| M3: 既存API認証対応 | 0.5日 | すべての既存エンドポイントに認証追加 |
| M4: フロントエンド認証UI | 1日 | LoginPage + AuthContext 完成 |
| M5: 統合・テスト | 1日 | E2E動作確認、全テスト通過 |
| M6: ドキュメント | 0.5日 | ドキュメント更新完了 |

**合計推定期間**: 4-5日

---

## 7. リリース計画

### 7.1 v1.2.0 リリース内容

- ユーザー認証機能
- ユーザー登録・ログイン
- JWT トークンベース認証
- 既存データの保護
- データ分離（ユーザーごとのデータ管理）

### 7.2 リリース前チェックリスト

- [ ] すべてのユニットテスト通過
- [ ] E2Eテスト通過
- [ ] セキュリティレビュー完了
- [ ] ドキュメント更新完了
- [ ] マイグレーションスクリプト検証完了

### 7.3 既知の制限事項

- パスワードリセット機能なし（将来実装）
- メール認証なし（将来実装）
- OAuth/ソーシャルログインなし（将来実装）

---

## 8. 参考資料

- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT.io](https://jwt.io/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [React Context API](https://react.dev/reference/react/useContext)

---

**次のステップ**: Phase 2aの実装開始

実装完了後は [feature7_3_phase2a_implementation_summary.md](feature7_3_phase2a_implementation_summary.md) を作成してください。
