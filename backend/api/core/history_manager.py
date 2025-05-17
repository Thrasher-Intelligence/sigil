import os
import json
import datetime
from datetime import UTC
import logging
from typing import Optional, List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)

# Define the directory where chat histories will be stored
# --- MODIFIED: Point to 'saved_chats' at the project root level --- 
# Assumes history_manager.py is in backend/api/core
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
HISTORY_DIR = os.path.join(PROJECT_ROOT, "saved_chats")
# HISTORY_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "chat_history") # Old path
# --- END MODIFICATION ---

os.makedirs(HISTORY_DIR, exist_ok=True)

def generate_thread_id() -> str:
    """Generates a unique thread ID based on timestamp."""
    now = datetime.datetime.now()
    return now.strftime("%Y%m%d_%H%M%S_%f")

def get_session_filepath(thread_id: str) -> str:
    """Gets the full path for a session's JSON file."""
    # Basic sanitization to prevent path traversal
    if ".." in thread_id or "/" in thread_id or "\\" in thread_id:
        raise ValueError("Invalid thread_id format containing path elements.")
    return os.path.join(HISTORY_DIR, f"{thread_id}.json")

def save_chat_messages(
    thread_id: Optional[str], 
    messages: List[Dict[str, Any]],
    sampling_settings: Optional[Dict[str, Any]] = None,
    system_prompt: Optional[str] = None
) -> str:
    """
    Saves a list of messages and associated settings to a chat session file.
    If thread_id is None, creates a new session.
    Saves sampling settings and system prompt if provided.
    Returns the thread_id of the saved session.
    """
    if thread_id is None:
        thread_id = generate_thread_id()
        # For a new thread, create the full structure
        session_data = {
            "thread_id": thread_id, 
            "messages": messages, 
            "metadata": {"created_at": datetime.datetime.now(UTC).isoformat()},
            "sampling_settings": sampling_settings,
            "system_prompt": system_prompt,
            "custom_title": None # Initialize custom title for new sessions
        }
    else:
        try:
            filepath = get_session_filepath(thread_id)
        except ValueError as e:
             print(f"Error saving: {e}")
             raise 

        if os.path.exists(filepath):
            try:
                with open(filepath, 'r') as f:
                    session_data = json.load(f)
                # Append new messages
                session_data["messages"].extend(messages)
                session_data["metadata"]["last_updated"] = datetime.datetime.now(UTC).isoformat()
                # Update settings only if they are explicitly passed in
                if sampling_settings is not None:
                    session_data["sampling_settings"] = sampling_settings
                if system_prompt is not None:
                    session_data["system_prompt"] = system_prompt
                # Ensure custom_title field exists if loading older session file
                if "custom_title" not in session_data:
                    session_data["custom_title"] = None
            except (json.JSONDecodeError, IOError) as e:
                logging.warning(f"Error reading session file {thread_id}: {e}. Overwriting with new data.")
                # If file is corrupted, overwrite with current state
                session_data = {
                    "thread_id": thread_id, 
                    "messages": messages, 
                    "metadata": {"last_updated": datetime.datetime.utcnow().isoformat()},
                    "sampling_settings": sampling_settings,
                    "system_prompt": system_prompt,
                    "custom_title": None
                }
        else:
             # If file doesn't exist for the given ID, create it
             session_data = {
                 "thread_id": thread_id, 
                 "messages": messages, 
                 "metadata": {"created_at": datetime.datetime.now(UTC).isoformat()},
                 "sampling_settings": sampling_settings,
                 "system_prompt": system_prompt,
                 "custom_title": None
             }

    # Get filepath again (needed if it was a new thread_id or file didn't exist)
    try:
        filepath = get_session_filepath(thread_id)
    except ValueError as e:
         logging.error(f"Error getting filepath for saving: {e}")
         raise
         
    try:
        with open(filepath, 'w') as f:
            json.dump(session_data, f, indent=2)
    except IOError as e:
        logging.error(f"Error writing session file {thread_id}: {e}")
        raise # Re-raise the exception to signal failure

    return thread_id

# --- NEW: Function to update only the custom title ---
def update_session_title(thread_id: str, new_title: str) -> bool:
    """
    Updates the custom_title field for a specific session.
    Returns True if successful, False otherwise.
    Raises ValueError on invalid thread_id.
    """
    try:
        filepath = get_session_filepath(thread_id)
    except ValueError as e:
        logging.error(f"Error updating title (invalid thread_id): {e}")
        raise

    if not os.path.exists(filepath):
        logging.warning(f"Session file not found for title update: {filepath}")
        return False

    try:
        with open(filepath, 'r') as f:
            session_data = json.load(f)

        session_data["custom_title"] = new_title.strip() # Save the stripped title
        session_data["metadata"]["last_updated"] = datetime.datetime.now(UTC).isoformat() # Also update timestamp

        with open(filepath, 'w') as f:
            json.dump(session_data, f, indent=2)
        
        logging.info(f"Successfully updated title for session {thread_id}")
        return True
    except (json.JSONDecodeError, IOError, KeyError) as e:
        logging.error(f"Error updating title for session {thread_id}: {e}")
        return False
# --- END NEW FUNCTION ---

def get_session(thread_id: str) -> Optional[Dict[str, Any]]:
    """Loads a chat session from its JSON file."""
    try:
        filepath = get_session_filepath(thread_id)
    except ValueError:
        return None # Invalid thread_id format
        
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, 'r') as f:
            session_data = json.load(f)
        # Ensure custom_title field is present in the response, even if None
        if "custom_title" not in session_data:
            session_data["custom_title"] = None
        return session_data
    except (json.JSONDecodeError, IOError) as e:
        logging.error(f"Error reading session file {thread_id}: {e}")
        return None # Indicate failure to load

def list_sessions() -> List[Dict[str, Any]]:
    """Lists all available chat sessions with basic metadata and title."""
    sessions_list = []
    if not os.path.isdir(HISTORY_DIR):
        logging.warning(f"History directory not found: {HISTORY_DIR}")
        return []
    try:
        for filename in os.listdir(HISTORY_DIR):
            if filename.endswith(".json"):
                thread_id = filename[:-5] # Remove .json extension
                # Add basic check for potentially invalid filenames from listdir
                if ".." in thread_id or "/" in thread_id or "\\" in thread_id:
                    logging.warning(f"Skipping potentially unsafe filename: {filename}")
                    continue
                
                # --- MODIFIED: Read title from session data ---
                session_data = get_session(thread_id) # Use get_session to load full data
                if not session_data:
                    logging.warning(f"Skipping session {thread_id} due to loading error.")
                    continue # Skip if session failed to load

                # Prioritize custom_title
                title = session_data.get("custom_title")
                
                # Fallback to first user message if custom_title is None or empty
                if not title:
                    messages = session_data.get("messages", [])
                    first_user_message = next((msg.get("content") for msg in messages if msg.get("role") == "user"), None)
                    if first_user_message:
                         title = first_user_message[:50] + ('...' if len(first_user_message) > 50 else '') # Truncate
                    else:
                         title = thread_id # Ultimate fallback to thread_id

                sessions_list.append({
                    "thread_id": thread_id,
                    "title": title, # Use the determined title
                    "last_updated": session_data.get("metadata", {}).get("last_updated"),
                    "created_at": session_data.get("metadata", {}).get("created_at")
                    # Removed direct file reading here, use get_session
                })
                # --- END MODIFICATION ---

        # Sort sessions, e.g., by last updated descending (most recent first)
        sessions_list.sort(key=lambda x: x.get("last_updated") or x.get("created_at") or '', reverse=True)

    except OSError as e:
        logging.error(f"Error listing directory {HISTORY_DIR}: {e}")
        return [] # Return empty list on error

    return sessions_list

# --- NEW: Function to delete a session file ---
def delete_session(thread_id: str) -> bool:
    """
    Deletes a session file based on thread_id.
    Returns True if successful, False otherwise.
    Raises ValueError on invalid thread_id format.
    """
    try:
        filepath = get_session_filepath(thread_id)
    except ValueError as e:
        logging.error(f"Invalid thread_id for deletion: {e}")
        raise # Re-raise the specific error

    if not os.path.exists(filepath):
        logging.warning(f"Session file not found for deletion: {filepath}")
        return False # Indicate file not found

    try:
        os.remove(filepath)
        logging.info(f"Successfully deleted session file: {filepath}")
        return True
    except OSError as e:
        logging.error(f"Error deleting session file {filepath}: {e}")
        return False # Indicate deletion failed
# --- End Delete Function --- 

# --- NEW: Function to edit a specific message in a chat session ---
def edit_chat_message(thread_id: str, message_index: int, new_content: str) -> bool:
    """
    Edits a specific message in a chat session.
    
    Args:
        thread_id: The ID of the chat thread
        message_index: The index of the message to edit in the messages list
        new_content: The new content for the message
        
    Returns:
        True if successful, False otherwise
        
    Raises:
        ValueError: If thread_id format is invalid or message_index is out of range
    """
    try:
        filepath = get_session_filepath(thread_id)
    except ValueError as e:
        logging.error(f"Error editing message (invalid thread_id): {e}")
        raise

    if not os.path.exists(filepath):
        logging.warning(f"Session file not found for message edit: {filepath}")
        return False

    try:
        with open(filepath, 'r') as f:
            session_data = json.load(f)
        
        # Check if messages list exists and is properly formed
        if not isinstance(session_data.get("messages"), list):
            logging.error(f"Session {thread_id} has malformed or missing 'messages' list")
            return False
            
        # Check if message_index is valid
        if message_index < 0 or message_index >= len(session_data["messages"]):
            error_msg = f"Message index {message_index} out of range (0-{len(session_data['messages'])-1})"
            logging.error(error_msg)
            raise ValueError(error_msg)
        
        # Get the existing message to preserve all fields
        message = session_data["messages"][message_index]
        
        # Update the content and mark as edited
        message["content"] = new_content
        message["edited"] = True
        
        # Update the last_updated timestamp
        session_data["metadata"]["last_updated"] = datetime.datetime.now(UTC).isoformat()
        
        # Write the updated session data back to the file
        with open(filepath, 'w') as f:
            json.dump(session_data, f, indent=2)
            
        logging.debug(f"Successfully edited message {message_index} in session {thread_id}")
        return True
    except json.JSONDecodeError as e:
        logging.error(f"JSON decode error when editing message in session {thread_id}: {e}")
        return False
    except IOError as e:
        logging.error(f"I/O error when editing message in session {thread_id}: {e}")
        return False
    except KeyError as e:
        logging.error(f"Missing key error when editing message in session {thread_id}: {e}")
        return False
    except (json.JSONDecodeError, IOError, KeyError, Exception) as e:
        if not isinstance(e, ValueError):  # Let ValueError propagate for invalid indices
            logging.error(f"Unexpected error when editing message in session {thread_id}: {e}")
            return False
        raise  # Re-raise ValueError
# --- END NEW FUNCTION ---