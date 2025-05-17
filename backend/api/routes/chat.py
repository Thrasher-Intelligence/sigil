import sys
import os
from fastapi import APIRouter, HTTPException, status, Request, Response
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

# Import Pydantic models from schemas.chat
from ..schemas.chat import (
    ChatRequest, ChatResponse, Message, ChatRequestV2, ChatResponseV2, MessageV2
)

# Import core logic functions using relative paths
from ..core.inference import generate_response
from ..core.prompt_builder import generate_prompt
from ..core.cleaner import truncate_at_stop_token, clean_response
from ..core.history_manager import (
    save_chat_messages, get_session, list_sessions, delete_session, update_session_title,
    edit_chat_message
)

router = APIRouter()

MIN_NARRATIVE_TOKENS = 350  # Replicate constant or import from a config module

# --- ADDED: Pydantic models for requests ---
class RenameSessionRequest(BaseModel):
    newName: str

class EditMessageRequest(BaseModel):
    new_content: str
# --- END ADDITIONS ---

# Chat endpoint - check if model is loaded
@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, request: Request): # Add request: Request
    app_state = request.app.state # Access app state
    # Check if model is loaded
    if not app_state.model or not app_state.tokenizer:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Model is not loaded. Please use the /model/load endpoint first."
        )
    
    # Use the core module to generate a prompt
    messages = []
    if req.system_prompt:
        messages.append({"role": "system", "content": req.system_prompt})
    
    # If we have messages array, use those
    if req.messages and len(req.messages) > 0:
        messages.extend([{"role": msg.role, "content": msg.content} for msg in req.messages])
    # Otherwise, add the single message from req.message
    else:
        messages.append({"role": "user", "content": req.message})
    
    prompt = generate_prompt(
        mode="chat",
        system_prompt=req.system_prompt,
        tokenizer=app_state.tokenizer,
        messages=messages
    )
    
    # Call inference with the generated prompt
    raw_response = generate_response(
        app_state.model, 
        app_state.tokenizer, 
        app_state.device,
        prompt,
        req.temperature,
        req.top_p,
        req.max_tokens,
        req.repetition_penalty
    )
    
    # First truncate at stop tokens if provided
    truncated_response = truncate_at_stop_token(raw_response, req.stop) if req.stop else raw_response
    
    # Then clean the response (remove speaker tags)
    content = clean_response(truncated_response)
    
    # If a thread_id is provided in the request, save the chat history
    thread_id = req.thread_id
    
    if thread_id or req.save_chat:
        # Prepare new messages to be saved (context + request + response)
        saved_messages = []
        
        # Add the system message first
        saved_messages.append({"role": "system", "content": req.system_prompt})
        
        # Add the existing context messages if they exist
        if req.messages and len(req.messages) > 0:
            saved_messages.extend([{"role": msg.role, "content": msg.content} for msg in req.messages])
        # Otherwise add the single message
        else:
            saved_messages.append({"role": "user", "content": req.message})
        
        # Add the assistant's response to be saved
        saved_messages.append({"role": "assistant", "content": content})
        
        # Save all messages with the provided or new thread_id
        thread_id = save_chat_messages(
            thread_id, 
            saved_messages,
            sampling_settings={
                "temperature": req.temperature,
                "max_tokens": req.max_tokens,
                "top_p": req.top_p,
                "stop": req.stop
            },
            system_prompt=req.system_prompt
        )
    
    # Return properly formatted response to the user
    return ChatResponse(
        content=content, 
        thread_id=thread_id
    )

# Chat version 2 endpoint with extended functionality
@router.post("/chat/v2", response_model=ChatResponseV2)
async def chat_v2(req: ChatRequestV2, request: Request):
    """Enhanced chat endpoint with additional features for narrative generation."""
    try:
        app_state = request.app.state
        
        # Check if model is loaded
        if not app_state.model or not app_state.tokenizer:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Model is not loaded. Please use the /model/load endpoint first."
            )
        
        # Debug info before generating prompt
        print(f"DEBUG: Generating prompt with mode={req.mode}", file=sys.stderr)
        print(f"DEBUG: message={req.message}", file=sys.stderr)
        print(f"DEBUG: system_prompt={req.system_prompt}", file=sys.stderr)
        print(f"DEBUG: messages={req.messages}", file=sys.stderr)
        
        # Validate the messages list before passing to generate_prompt
        validated_messages = []
        if req.messages:
            try:
                validated_messages = [
                    {"role": msg.role, "content": msg.content}
                    for msg in req.messages
                    if msg and hasattr(msg, 'role') and hasattr(msg, 'content')
                ]
            except Exception as msg_error:
                print(f"WARNING: Error validating messages: {msg_error}", file=sys.stderr)
            
        # Use the core module to generate a prompt
        try:
            prompt = generate_prompt(
                mode=req.mode,
                system_prompt=req.system_prompt or "You are a helpful assistant.", 
                tokenizer=app_state.tokenizer,
                message=req.message,
                messages=validated_messages
            )
            print(f"DEBUG: Prompt generated successfully, length={len(prompt)}", file=sys.stderr)
        except Exception as prompt_error:
            print(f"ERROR: Failed to generate prompt: {prompt_error}", file=sys.stderr)
            raise
    
        # Get max length
        max_tokens = req.max_tokens if req.max_tokens > 0 else 4096  # Default if not set
        
        # Call inference with the generated prompt
        raw_response = generate_response(
            app_state.model, 
            app_state.tokenizer, 
            app_state.device,
            prompt,
            req.temperature,
            req.top_p,
            max_tokens,
            req.repetition_penalty
        )
        
        # First truncate at stop tokens if provided
        truncated_response = truncate_at_stop_token(raw_response, req.stop) if req.stop else raw_response
        
        # Then clean the response (remove speaker tags)
        content = clean_response(truncated_response)
        
        # Check token length of the response to see if it's a narrative
        # This is a simple heuristic, could be replaced with more sophisticated detection
        is_narrative = len(content.split()) >= MIN_NARRATIVE_TOKENS
        # If a thread_id is provided in the request, save the chat history
        thread_id = req.thread_id
        
        if thread_id or req.save_chat:
            # Prepare new messages to be saved (context + request + response)
            saved_messages = []
            
            # Add the system message first (if not empty)
            if req.system_prompt and req.system_prompt.strip():
                saved_messages.append({"role": "system", "content": req.system_prompt})
            
            # Add the existing context messages if req.messages is not None
            if req.messages:
                try:
                    saved_messages.extend([{"role": msg.role, "content": msg.content} for msg in req.messages if msg and hasattr(msg, 'role') and hasattr(msg, 'content')])
                except Exception as msg_error:
                    print(f"WARNING: Error processing messages: {msg_error}", file=sys.stderr)
            
            # Add the assistant's response to be saved
            saved_messages.append({"role": "assistant", "content": content})
            
            # Save all messages with the provided or new thread_id
            thread_id = save_chat_messages(
                thread_id, 
                saved_messages,
                sampling_settings={
                    "temperature": req.temperature,
                    "max_tokens": max_tokens,
                    "top_p": req.top_p,
                    "stop": req.stop
                },
                system_prompt=req.system_prompt
            )
    
    # Return properly formatted response to the user
        return ChatResponseV2(
            content=content, 
            thread_id=thread_id,
            is_narrative=is_narrative,
            metadata={
                "total_tokens": len(content.split()),  # Simple approximation, replace with actual token count
                "elapsed_time": 0,  # Placeholder, replace with actual timing if available
                "model_used": "local",  # Placeholder
            }
        )
    except Exception as e:
        print(f"❌ CRITICAL ERROR in chat_v2: {str(e)}", file=sys.stderr)
        print(f"Request details: mode={req.mode}, has_message={req.message is not None}, messages_provided={req.messages is not None}", file=sys.stderr)
        
        if req.messages:
            try:
                print(f"Message count: {len(req.messages)}", file=sys.stderr)
                if req.messages and len(req.messages) > 0:
                    msg = req.messages[0]
                    if hasattr(msg, 'role'):
                        print(f"First message role: {msg.role}", file=sys.stderr)
                    else:
                        print("First message has no 'role' attribute", file=sys.stderr)
                        print(f"First message type: {type(msg)}", file=sys.stderr)
                        print(f"First message content: {str(msg)[:100]}", file=sys.stderr)
            except Exception as debug_error:
                print(f"Error during debug logging: {debug_error}", file=sys.stderr)
        
        print(f"All request fields: temperature={req.temperature}, top_p={req.top_p}, max_tokens={req.max_tokens}, repetition_penalty={req.repetition_penalty}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        
        # Return a more informative error message
        error_message = f"An error occurred during chat generation: {str(e)}"
        
        # Add CORS headers to error response
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_message,
            headers=headers
        )

# --- NEW: Endpoint to List Sessions ---
@router.get("/sessions", response_model=List[Dict[str, Any]])
def get_saved_sessions():
    """Gets a list of all saved chat sessions using the history manager."""
    try:
        sessions = list_sessions()
        return sessions
    except Exception as e:
        print(f"Error listing saved sessions: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list saved sessions"
        )
# --- END NEW ENDPOINT ---

# --- NEW: Endpoint to Get a Specific Session ---
@router.get("/session/{thread_id}", response_model=Dict[str, Any])
def get_specific_session(thread_id: str):
    """Gets a specific chat session using the history manager."""
    try:
        session_data = get_session(thread_id)
        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID '{thread_id}' not found."
            )
        return session_data
    except ValueError as e:
        # Raised by get_session (via get_session_filepath) for invalid thread_id format
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid thread_id format: {e}"
        )
    except Exception as e:
        # Catch any other unexpected errors during the call
        print(f"Unexpected error calling get_session for {thread_id}: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected server error occurred while retrieving session {thread_id}"
        )
# --- END NEW ENDPOINT ---

# --- NEW: Endpoint to Rename a Session ---
@router.put("/session/{thread_id}/rename", status_code=status.HTTP_204_NO_CONTENT)
def rename_specific_session(thread_id: str, req: RenameSessionRequest):
    """Renames a specific chat session using the history manager."""
    if not req.newName or not req.newName.strip():
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New name cannot be empty."
        )
    try:
        success = update_session_title(thread_id, req.newName)
        if not success:
            # update_session_title returns False if file not found or if update fails
            # Assume file not found is the primary reason for failure here (404)
            # A more robust approach would involve specific exceptions from history_manager
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID '{thread_id}' not found or could not be updated."
            )
        # If success is True
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except ValueError as e:
        # Raised by update_session_title (via get_session_filepath) for invalid thread_id format
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid thread_id format: {e}"
        )
    except Exception as e:
        # Catch any other unexpected errors during the call
        print(f"Unexpected error calling update_session_title for {thread_id}: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected server error occurred while renaming session {thread_id}"
        )
# --- END NEW ENDPOINT ---

# --- NEW: Endpoint to Edit a Message in a Session ---
@router.put("/session/{thread_id}/message/{message_index}")
def edit_message_in_session(thread_id: str, message_index: int, req: EditMessageRequest):
    """Edits a specific message in a chat session using the history manager."""
    try:
        # Convert string path parameter to integer
        message_index = int(message_index)
        
        print(f"API: Received edit request for message {message_index} in thread {thread_id}")
        print(f"API: New content: {req.new_content[:50]}{'...' if len(req.new_content) > 50 else ''}")

        # Try to get session data to debug message indices
        try:
            session_data = get_session(thread_id)
            if session_data and "messages" in session_data:
                print(f"API: Thread has {len(session_data['messages'])} messages")
                if 0 <= message_index < len(session_data["messages"]):
                    msg_role = session_data["messages"][message_index].get("role", "unknown")
                    print(f"API: Message {message_index} has role '{msg_role}'")
                else:
                    print(f"API: Message index {message_index} is out of range (0-{len(session_data['messages'])-1})")
        except Exception as debug_e:
            print(f"API: Debug info error: {debug_e}", file=sys.stderr)

        # Call the history manager function to edit the message
        success = edit_chat_message(thread_id, message_index, req.new_content)

        if not success:
            # edit_chat_message returns False if file not found or edit fails
            print(f"API: Failed to edit message {message_index} in thread {thread_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID '{thread_id}' not found or message could not be edited."
            )
        
        # If success is True, return a success response
        print(f"API: Successfully edited message {message_index} in thread {thread_id}")
        return {
            "success": True,
            "thread_id": thread_id,
            "message_index": message_index
        }

    except ValueError as e:
        # Raised for invalid thread_id format or if message_index is out of range
        print(f"API: Value error when editing message {message_index} in thread {thread_id}: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}"
        )
    except Exception as e:
        # Catch any other unexpected errors
        print(f"API: Unexpected error editing message {message_index} in session {thread_id}: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected server error occurred while editing the message"
        )
# --- END NEW ENDPOINT ---

# --- MODIFIED: Endpoint to Delete a Session (Uses history_manager) ---
@router.delete("/session/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_specific_session(thread_id: str):
    """Deletes a specific chat session file by its thread_id using the history manager."""
    try:
        deleted = delete_session(thread_id)
        if not deleted:
            # delete_session returns False if file not found or if deletion fails
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID '{thread_id}' not found or could not be deleted."
            )
        # If deleted is True, success!
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except ValueError as e:
        # Raised by delete_session (via get_session_filepath) for invalid thread_id format
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid thread_id format: {e}"
        )
    except Exception as e:
        # Catch any other unexpected errors during the call
        print(f"Unexpected error calling delete_session for {thread_id}: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected server error occurred while deleting session {thread_id}"
        )
# --- End Modified Delete Endpoint ---

# --- End Session Management Endpoints ---