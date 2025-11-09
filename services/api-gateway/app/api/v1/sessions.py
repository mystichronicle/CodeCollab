from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.session import SessionCreate, SessionUpdate, SessionResponse
from app.api.v1.auth import get_current_user
from app.core.mongodb import get_database
from typing import List
from datetime import datetime
import logging
import uuid
import secrets
import string

router = APIRouter()
logger = logging.getLogger(__name__)


def generate_share_code() -> str:
    """Generate a 8-character alphanumeric share code"""
    characters = string.ascii_uppercase + string.digits
    code = ''.join(secrets.choice(characters) for _ in range(8))
    return code


async def get_session_or_404(session_id: str):
    """Helper function to get session or raise 404"""
    db = get_database()
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    session.pop('_id', None)
    return session


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session: SessionCreate,
    current_user = Depends(get_current_user)
):
    """Create a new coding session"""
    db = get_database()
    session_id = str(uuid.uuid4())
    share_code = generate_share_code()
    now = datetime.utcnow().isoformat()
    
    new_session = {
        "id": session_id,
        "name": session.name,
        "language": session.language,
        "description": session.description,
        "owner_id": current_user.id,
        "owner_username": current_user.username,
        "participants": [current_user.username],
        "code": session.code or "",
        "is_active": True,
        "share_code": share_code,
        "created_at": now,
        "updated_at": now,
        "last_accessed_at": now,
        "access_count": 0,
        "tags": session.tags or []
    }
    
    await db.sessions.insert_one(new_session)
    logger.info(f"Created session {session_id} with share code {share_code} by user {current_user.username}")
    
    new_session.pop('_id', None)
    return new_session


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    language: str = None,
    tags: str = None,  # Comma-separated tags
    current_user = Depends(get_current_user)
):
    """List all sessions where user is participant or owner"""
    db = get_database()
    
    query = {"participants": current_user.username}
    
    if language:
        query["language"] = language
    
    # Filter by tags if provided (comma-separated)
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",")]
        query["tags"] = {"$all": tag_list}
    
    sessions_cursor = db.sessions.find(query)
    user_sessions = []
    async for session in sessions_cursor:
        session.pop('_id', None)
        user_sessions.append(session)
    
    # Sort by updated_at descending
    user_sessions.sort(key=lambda x: x.get("updated_at", x.get("created_at")), reverse=True)
    
    logger.info(f"User {current_user.username} listing {len(user_sessions)} sessions")
    return user_sessions


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    current_user = Depends(get_current_user)
):
    """Get session by ID"""
    db = get_database()
    session = await get_session_or_404(session_id)
    
    # Check if user has access
    if current_user.username not in session["participants"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this session"
        )
    
    # Track session access (activity tracking)
    await db.sessions.update_one(
        {"id": session_id},
        {
            "$set": {"last_accessed_at": datetime.utcnow().isoformat()},
            "$inc": {"access_count": 1}
        }
    )
    
    logger.info(f"User {current_user.username} accessing session {session_id}")
    
    # Return updated session with access tracking
    updated_session = await get_session_or_404(session_id)
    return updated_session


@router.put("/sessions/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    session_update: SessionUpdate,
    current_user = Depends(get_current_user)
):
    """Update session (name, code, or status)"""
    db = get_database()
    session = await get_session_or_404(session_id)
    
    # Check if user is owner
    if session["owner_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only session owner can update the session"
        )
    
    update_fields = {"updated_at": datetime.utcnow().isoformat()}
    
    if session_update.name is not None:
        update_fields["name"] = session_update.name
    if session_update.description is not None:
        update_fields["description"] = session_update.description
    if session_update.code is not None:
        update_fields["code"] = session_update.code
    if session_update.tags is not None:
        update_fields["tags"] = session_update.tags
    
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": update_fields}
    )
    
    updated_session = await db.sessions.find_one({"id": session_id})
    
    logger.info(f"User {current_user.username} updated session {session_id}")
    return updated_session


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    current_user = Depends(get_current_user)
):
    """Delete a session (owner only)"""
    db = get_database()
    session = await get_session_or_404(session_id)
    
    # Check if user is owner
    if session["owner_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can delete this session"
        )
    
    await db.sessions.delete_one({"id": session_id})
    logger.info(f"User {current_user.username} deleted session {session_id}")
    return None


@router.post("/sessions/{session_id}/join", response_model=SessionResponse)
async def join_session(
    session_id: str,
    current_user = Depends(get_current_user)
):
    """Join an existing coding session"""
    db = get_database()
    session = await get_session_or_404(session_id)
    
    # Check if session is active
    if not session["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This session is not active"
        )
    
    # Add user to participants if not already present
    if current_user.username not in session["participants"]:
        await db.sessions.update_one(
            {"id": session_id},
            {
                "$addToSet": {"participants": current_user.username},
                "$set": {"updated_at": datetime.utcnow().isoformat()}
            }
        )
        logger.info(f"User {current_user.username} joined session {session_id}")
    
    # Fetch updated session
    updated_session = await get_session_or_404(session_id)
    return updated_session


@router.post("/sessions/join-by-code/{share_code}", response_model=SessionResponse)
async def join_session_by_code(
    share_code: str,
    current_user = Depends(get_current_user)
):
    """Join a session using a share code"""
    db = get_database()
    
    # Look up session by share code
    share_code_upper = share_code.upper()
    session = await db.sessions.find_one({"share_code": share_code_upper})
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid share code"
        )
    
    # Check if session is active
    if not session["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This session is not active"
        )
    
    # Add user to participants if not already present
    if current_user.username not in session["participants"]:
        await db.sessions.update_one(
            {"share_code": share_code_upper},
            {
                "$addToSet": {"participants": current_user.username},
                "$set": {"updated_at": datetime.utcnow().isoformat()}
            }
        )
        logger.info(f"User {current_user.username} joined session {session['id']} using share code {share_code}")
    
    # Remove MongoDB _id
    session.pop('_id', None)
    return session


@router.get("/sessions/{session_id}/export")
async def export_session(
    session_id: str,
    current_user = Depends(get_current_user)
):
    """Export session code as downloadable file"""
    from fastapi.responses import Response
    
    session = await get_session_or_404(session_id)
    
    # Check if user has access
    if current_user.username not in session["participants"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this session"
        )
    
    # Determine file extension based on language
    extensions = {
        "python": "py",
        "javascript": "js",
        "typescript": "ts",
        "go": "go",
        "rust": "rs",
        "cpp": "cpp",
        "c": "c",
        "java": "java",
        "vlang": "v",
        "zig": "zig",
        "elixir": "ex"
    }
    
    ext = extensions.get(session["language"], "txt")
    filename = f"{session['name'].replace(' ', '_')}.{ext}"
    code = session.get("code", "")
    
    logger.info(f"User {current_user.username} exporting session {session_id}")
    
    return Response(
        content=code,
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

