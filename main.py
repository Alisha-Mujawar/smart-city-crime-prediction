# main.py - Complete Smart City Crime Prediction Backend
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import pickle
import sqlite3
import json
import os
import hashlib
import secrets
from collections import Counter, defaultdict

app = FastAPI(title="Smart City Crime Prediction System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DB_PATH = "smart_city.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT,
            role TEXT NOT NULL,
            location TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Complaints table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            complaint_text TEXT NOT NULL,
            citizen_name TEXT,
            citizen_email TEXT,
            location TEXT NOT NULL,
            predicted_crime TEXT,
            confidence REAL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Tokens table for sessions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Insert default admin accounts for each location
    admin_locations = ['north', 'south', 'east', 'west', 'central']
    for loc in admin_locations:
        cursor.execute("SELECT COUNT(*) FROM users WHERE email=?", (f"admin_{loc}@smartcity.com",))
        if cursor.fetchone()[0] == 0:
            password_hash = hashlib.sha256(f"admin123".encode()).hexdigest()
            cursor.execute('''
                INSERT INTO users (email, password, name, role, location)
                VALUES (?, ?, ?, 'admin', ?)
            ''', (f"admin_{loc}@smartcity.com", password_hash, f"{loc.capitalize()} Zone Admin", loc))
    
    conn.commit()
    conn.close()

init_db()

# Load crime model
def load_model() -> Optional[Dict[str, Any]]:
    try:
        with open('crime_model.pkl', 'rb') as f:
            model_data = pickle.load(f)
            print("✓ Crime model loaded successfully")
            return model_data
    except FileNotFoundError:
        print("✗ Crime model not found. Please run train_crime_model.py first")
        return None
    except Exception as e:
        print(f"✗ Error loading model: {e}")
        return None

model_data = load_model()

# Pydantic models
class SignupRequest(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None
    role: str
    location: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str
    location: Optional[str] = None

class ComplaintRequest(BaseModel):
    complaint_text: str
    citizen_name: Optional[str] = None
    citizen_email: Optional[str] = None
    location: str

class PredictRequest(BaseModel):
    complaint_text: str

class StatusUpdateRequest(BaseModel):
    status: str
    location: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: int) -> str:
    token = secrets.token_hex(32)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO sessions (user_id, token) VALUES (?, ?)", (user_id, token))
    conn.commit()
    conn.close()
    return token

def get_user_id_after_insert(cursor, email: str) -> int:
    """Safely get user_id after insert"""
    user_id = cursor.lastrowid
    if user_id is None:
        cursor.execute("SELECT id FROM users WHERE email=?", (email,))
        result = cursor.fetchone()
        if result:
            user_id = result[0]
        else:
            user_id = 0
    return user_id

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT u.* FROM users u
        JOIN sessions s ON u.id = s.user_id
        WHERE s.token = ?
    ''', (token,))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "email": user[1],
            "name": user[3],
            "phone": user[4],
            "role": user[5],
            "location": user[6]
        }
    return None

def predict_crime(complaint_text: str):
    if model_data is None:
        return "Unknown", 0.0
    
    pipeline = model_data['pipeline']
    prediction = pipeline.predict([complaint_text])[0]
    probabilities = pipeline.predict_proba([complaint_text])[0]
    confidence = float(max(probabilities))
    
    return prediction, confidence

# Routes for serving HTML
@app.get("/")
async def landing_page():
    return FileResponse("static/landing.html")

@app.get("/auth")
async def auth_page():
    return FileResponse("static/auth.html")

@app.get("/citizen-dashboard")
async def citizen_dashboard():
    return FileResponse("static/citizen-dashboard.html")

@app.get("/admin-dashboard")
async def admin_dashboard():
    return FileResponse("static/admin-dashboard.html")

# Authentication routes
@app.post("/api/signup")
async def signup(request: SignupRequest):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if user exists
        cursor.execute("SELECT COUNT(*) FROM users WHERE email=?", (request.email,))
        if cursor.fetchone()[0] > 0:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Insert new user
        password_hash = hash_password(request.password)
        cursor.execute('''
            INSERT INTO users (email, password, name, phone, role, location)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (request.email, password_hash, request.name, request.phone, request.role, request.location))
        
        # Safely get user_id
        user_id = get_user_id_after_insert(cursor, request.email)
        
        if user_id == 0:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        conn.commit()
        
        # Create token
        token = create_token(user_id)
        
        return {
            "success": True,
            "token": token,
            "user": {
                "id": user_id,
                "email": request.email,
                "name": request.name,
                "phone": request.phone,
                "role": request.role,
                "location": request.location
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.post("/api/login")
async def login(request: LoginRequest):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check user credentials
    password_hash = hash_password(request.password)
    cursor.execute('''
        SELECT * FROM users 
        WHERE email=? AND password=? AND role=?
    ''', (request.email, password_hash, request.role))
    
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # For admin, verify location
    if request.role == 'admin':
        if user[6] != request.location:
            raise HTTPException(status_code=401, detail="Invalid location for this admin")
    
    # Create token
    token = create_token(user[0])
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user[0],
            "email": user[1],
            "name": user[3],
            "phone": user[4],
            "role": user[5],
            "location": user[6]
        }
    }

# Complaint routes
@app.post("/api/submit-complaint")
async def submit_complaint(request: ComplaintRequest):
    if not request.complaint_text.strip():
        raise HTTPException(status_code=400, detail="Complaint text cannot be empty")
    
    # Predict crime category
    predicted_crime, confidence = predict_crime(request.complaint_text)
    
    # Save to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO complaints (complaint_text, citizen_name, citizen_email, location, predicted_crime, confidence)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (request.complaint_text, request.citizen_name, request.citizen_email, 
              request.location, predicted_crime, confidence))
        
        complaint_id = cursor.lastrowid
        if complaint_id is None:
            complaint_id = 0
        
        conn.commit()
        
        return {
            "complaint_id": complaint_id,
            "complaint_text": request.complaint_text,
            "predicted_crime": predicted_crime,
            "confidence": confidence,
            "status": "pending",
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.post("/api/predict")
async def predict(request: PredictRequest):
    predicted_crime, confidence = predict_crime(request.complaint_text)
    
    return {
        "complaint_text": request.complaint_text,
        "predicted_crime": predicted_crime,
        "confidence": confidence
    }

# Citizen routes
@app.get("/api/citizen/complaints")
async def get_citizen_complaints(email: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM complaints 
        WHERE citizen_email=?
        ORDER BY created_at DESC
    ''', (email,))
    
    complaints = cursor.fetchall()
    conn.close()
    
    return [
        {
            "id": c[0],
            "complaint_text": c[1],
            "citizen_name": c[2],
            "citizen_email": c[3],
            "location": c[4],
            "predicted_crime": c[5],
            "confidence": c[6],
            "status": c[7],
            "timestamp": c[8]
        }
        for c in complaints
    ]

# Admin routes
@app.get("/api/admin/complaints")
async def get_admin_complaints(location: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM complaints 
        WHERE location=?
        ORDER BY created_at DESC
    ''', (location,))
    
    complaints = cursor.fetchall()
    conn.close()
    
    return [
        {
            "id": c[0],
            "complaint_text": c[1],
            "citizen_name": c[2],
            "citizen_email": c[3],
            "location": c[4],
            "predicted_crime": c[5],
            "confidence": c[6],
            "status": c[7],
            "timestamp": c[8]
        }
        for c in complaints
    ]

@app.put("/api/admin/update-status/{complaint_id}")
async def update_status(complaint_id: int, request: StatusUpdateRequest):
    if request.status not in ['pending', 'in_progress', 'resolved']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE complaints SET status=? WHERE id=?
        ''', (request.status, complaint_id))
        conn.commit()
        
        return {"success": True, "message": f"Status updated to {request.status}"}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.get("/api/admin/analytics")
async def get_analytics(location: str, period: str = "current"):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all complaints for location
    cursor.execute('''
        SELECT * FROM complaints 
        WHERE location=?
        ORDER BY created_at
    ''', (location,))
    
    complaints = cursor.fetchall()
    conn.close()
    
    # Calculate analytics
    category_counts = Counter()
    status_counts = Counter()
    monthly_trends = defaultdict(int)
    
    for c in complaints:
        category = c[5] or "Unknown"
        category_counts[category] += 1
        status_counts[c[7]] += 1
        
        # Monthly trend
        if c[8]:
            month = c[8][:7]  # YYYY-MM
            monthly_trends[month] += 1
    
    categories = [
        {"category": cat, "count": count}
        for cat, count in category_counts.most_common()
    ]
    
    trends = [
        {"month": month, "count": count}
        for month, count in sorted(monthly_trends.items())
    ]
    
    status = {
        "pending": status_counts.get("pending", 0),
        "in_progress": status_counts.get("in_progress", 0),
        "resolved": status_counts.get("resolved", 0)
    }
    
    return {
        "categories": categories,
        "trends": trends,
        "status": status,
        "total": len(complaints)
    }

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")