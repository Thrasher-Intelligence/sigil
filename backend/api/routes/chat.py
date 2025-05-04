import sys
import os # <-- Add OS import for file operations
from fastapi import APIRouter, HTTPException, status, Request, Response # Import Request and Response
from typing import Optional, List, Dict, Any # Import necessary types
from pydantic import BaseModel # Import BaseModel for request body

# Import Pydantic models from schemas.chat
from ..schemas.chat import (
    ChatRequest, ChatResponse, Message, ChatRequestV2, ChatResponseV2, MessageV2
)

# Import core logic functions using relative paths
from ..core.inference import generate_response
from ..core.prompt_builder import generate_prompt
from ..core.cleaner import truncate_at_stop_token, clean_response
from ..core.history_manager import (
    save_chat_messages, get_session, list_sessions, delete_session, update_session_title
)

router = APIRouter()

MIN_NARRATIVE_TOKENS = 350  # Replicate constant or import from a config module

# --- ADDED: Pydantic model for rename request ---
class RenameSessionRequest(BaseModel):
    newName: str
# --- END ADDITION ---

# Chat endpoint - check if model is loaded
@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, request: Request): # Add request: Request
    app_state = request.app.state # Access app state
    # Check if model is loaded
    if not app_state.model or not app_state.tokenizer:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Model is not loaded. Please load a model via the /api/v1/model/load endpoint first.",
        )

    try:
        # Retrieve components from app_state
        current_tokenizer = app_state.tokenizer
        current_model = app_state.model
        current_device = app_state.device
        current_system_prompt = app_state.system_prompt
        current_temperature = app_state.temperature
        current_top_p = app_state.top_p
        current_max_new_tokens = app_state.max_new_tokens
        if current_max_new_tokens < MIN_NARRATIVE_TOKENS:
            current_max_new_tokens = MIN_NARRATIVE_TOKENS

        # --- Updated Prompt Formatting ---
        messages = [
            {"role": "system", "content": current_system_prompt},
            {"role": "user", "content": req.message}
        ]
        prompt = current_tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )

        # --- Call Refactored Generation Function ---
        response_text = generate_response(
            model=current_model,
            tokenizer=current_tokenizer,
            device=current_device,
            prompt=prompt,
            temperature=current_temperature,
            top_p=current_top_p,
            max_new_tokens=current_max_new_tokens
        )
        # --- End Call ---

        # Clean the response before returning
        cleaned_response_text = clean_response(response_text)
        truncated_response_text = truncate_at_stop_token(cleaned_response_text)
        return {"response": truncated_response_text}

    except Exception as e:
        print(f"Error during chat generation: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during generation: {e}"
        )

# --- V2 Chat Endpoint --- (New)
@router.post("/chat-v2", response_model=ChatResponseV2)
def chat_v2(req: ChatRequestV2, request: Request): # Add request: Request
    app_state = request.app.state # Access app state
    # Check if model is loaded
    if not app_state.model or not app_state.tokenizer:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Model is not loaded. Please load a model first.",
        )

    try:
        # --- ADDED: Debug received messages --- 
        print(f"--- Received Request Body (Thread: {req.thread_id or 'New'}) ---")
        print(f"Mode: {req.mode}")
        print(f"Message: {req.message}")
        print(f"Messages: {req.messages}")
        print("-------------------------------------------")
        # --- End Debug --- 

        # Retrieve components from app_state
        current_tokenizer = app_state.tokenizer
        current_model = app_state.model
        current_device = app_state.device
        current_system_prompt = app_state.system_prompt
        current_temperature = app_state.temperature
        current_top_p = app_state.top_p
        current_max_new_tokens = app_state.max_new_tokens
        if getattr(req, 'mode', None) == 'chat' and (current_max_new_tokens is None or current_max_new_tokens < MIN_NARRATIVE_TOKENS):
            current_max_new_tokens = MIN_NARRATIVE_TOKENS

        messages_list = [msg.dict() for msg in req.messages] if req.messages else None

        # Generate the prompt using the helper function
        prompt = generate_prompt(
            mode=req.mode,
            system_prompt=current_system_prompt,
            tokenizer=current_tokenizer,
            message=req.message,
            messages=messages_list
        )

        # --- ADDED: Print the generated prompt for debugging ---
        print(f"--- Prompt for Generation (Thread: {req.thread_id or 'New'}) ---")
        print(prompt)
        print("--------------------------------------------------")
        # --- End Debug Print ---

        # --- Call Refactored Generation Function ---
        response_text = generate_response(
            model=current_model,
            tokenizer=current_tokenizer,
            device=current_device,
            prompt=prompt,
            temperature=current_temperature,
            top_p=current_top_p,
            max_new_tokens=current_max_new_tokens
        )
        # --- End Call ---

        # Clean the response
        cleaned_response_text = clean_response(response_text)
        truncated_response_text = truncate_at_stop_token(cleaned_response_text)

        # --- Save Chat History ---
        new_thread_id = None
        try:
            # Prepare messages to save
            # In instruction mode, history starts with the user message and the response
            # In chat mode, history includes the *input* messages + the new response
            messages_to_save = []
            if req.mode == 'instruction':
                user_message = {"role": "user", "content": req.message}
                assistant_message = {"role": "assistant", "content": truncated_response_text}
                messages_to_save = [user_message, assistant_message]
            elif req.mode == 'chat' and req.messages:
                # Get the latest user message (should be the last one in the list)
                last_user_message_obj = req.messages[-1] 
                if last_user_message_obj.role != 'user':
                    print("Warning: Expected last message in chat history to be from user for saving.", file=sys.stderr)
                    # Decide how to handle this - maybe save only assistant? For now, proceed cautiously.
                    last_user_message_dict = None 
                else:
                    last_user_message_dict = last_user_message_obj.dict()

                assistant_message = {"role": "assistant", "content": truncated_response_text}
                
                if req.thread_id:
                    # If continuing a thread, save the last user message AND the new assistant response
                    messages_to_save = []
                    if last_user_message_dict:
                        messages_to_save.append(last_user_message_dict)
                    messages_to_save.append(assistant_message)
                else:
                    # If starting a new thread, save all provided input messages + the new response
                    input_message_dicts = [msg.dict() for msg in req.messages] # Includes the last user message
                    messages_to_save = input_message_dicts + [assistant_message]
            
            if messages_to_save: # Only save if we have something to save
                # --- ADDED: Gather current settings for saving ---
                current_settings = {
                    "temperature": app_state.temperature,
                    "top_p": app_state.top_p,
                    "max_new_tokens": app_state.max_new_tokens 
                    # Add any other relevant sampling params stored in app_state here
                }
                current_sys_prompt = app_state.system_prompt
                # --- End gather ---

                new_thread_id = save_chat_messages(
                    req.thread_id, 
                    messages_to_save,
                    sampling_settings=current_settings,  # <-- Pass settings
                    system_prompt=current_sys_prompt     # <-- Pass system prompt
                )
            else:
                 # Should not happen with validation, but handle defensively
                 print("Warning: No messages to save.", file=sys.stderr)
                 new_thread_id = req.thread_id # Return original thread_id if nothing was saved

        except Exception as save_e:
            # Log the saving error but don't fail the chat request
            print(f"Error saving chat history: {save_e}", file=sys.stderr)
            # Keep new_thread_id as None or the original req.thread_id
            new_thread_id = req.thread_id
        # --- End Save Chat History ---

        response_data = {
            "response": truncated_response_text,
            "thread_id": new_thread_id # Include the thread_id in the response
        }
        if req.return_prompt:
            response_data["raw_prompt"] = prompt
        return response_data

    except ValueError as ve: # Catch specific errors from prompt generation or validation
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        print(f"Error during chat generation (v2): {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during generation (v2): {e}"
        )

# --- Session Management Endpoints --- ADDED

@router.get("/sessions", response_model=List[Dict[str, Any]])
def get_saved_sessions():
    """Lists all saved chat sessions with metadata and title."""
    try:
        sessions = list_sessions()
        return sessions
    except Exception as e:
        print(f"Error listing sessions: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve saved sessions"
        )

@router.get("/session/{thread_id}", response_model=Dict[str, Any])
def get_specific_session(thread_id: str, request: Request): # <-- Added request: Request
    """Loads a specific chat session by its thread_id and updates app state."""
    app_state = request.app.state # <-- Added access to app_state
    try:
        session_data = get_session(thread_id)
        if session_data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with ID '{thread_id}' not found."
            )
        
        # --- ADDED: Update app_state with loaded settings --- 
        loaded_settings = session_data.get("sampling_settings")
        loaded_prompt = session_data.get("system_prompt")

        if loaded_settings is not None and isinstance(loaded_settings, dict):
            app_state.temperature = loaded_settings.get("temperature", app_state.temperature) # Keep old value if missing
            app_state.top_p = loaded_settings.get("top_p", app_state.top_p)
            app_state.max_new_tokens = loaded_settings.get("max_new_tokens", app_state.max_new_tokens)
            # Update any other settings similarly
            print(f"Loaded settings for thread {thread_id}: Temp={app_state.temperature}, TopP={app_state.top_p}, MaxTokens={app_state.max_new_tokens}")
        else:
            print(f"No valid sampling_settings found in thread {thread_id}, keeping current app state values.")

        if loaded_prompt is not None:
            app_state.system_prompt = loaded_prompt
            print(f"Loaded system prompt for thread {thread_id}")
        else:
            print(f"No system_prompt found in thread {thread_id}, keeping current app state value.")
        # --- End Update ---
        
        # Ensure custom_title is included in the response (get_session already does this)
        return session_data # Return the full session data as before
    except ValueError: # Catch invalid thread_id from get_session
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid thread_id format for '{thread_id}'"
        )
    except Exception as e:
        # Catch any other unexpected errors during the call
        print(f"Unexpected error calling get_session for {thread_id}: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected server error occurred while retrieving session {thread_id}"
        )

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

# --- MODIFIED: Endpoint to Delete a Session (Uses history_manager) ---
@router.delete("/session/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_specific_session(thread_id: str):
    """Deletes a specific chat session file by its thread_id using the history manager."""
    try:
        deleted = delete_session(thread_id)
        if not deleted:
            # delete_session returns False if file not found or if deletion fails
            # We need to check if the file existed before attempting deletion
            # Re-check existence via get_session maybe? Or assume failure means 404/500?
            # Let's assume if delete_session returns False, it means file wasn't found initially
            # (as OSError is handled internally and printed by delete_session)
            # A more robust way would be for delete_session to raise specific exceptions.
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session file for ID '{thread_id}' not found or could not be deleted."
                # Consider separating 404 from 500 based on delete_session return/exceptions later
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