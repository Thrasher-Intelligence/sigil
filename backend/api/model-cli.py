#!/usr/bin/env python3
# This is to test downloading a model.

import os
import argparse
import sys
import webbrowser # Add webbrowser import
from pathlib import Path
from dotenv import load_dotenv
from huggingface_hub import snapshot_download, HfApi
from huggingface_hub.utils import HfHubHTTPError, LocalEntryNotFoundError
from huggingface_hub.hf_api import ModelInfo # Import ModelInfo for type hinting
import requests
from typing import List, Optional # For type hinting

# Define the target download directory relative to the user's home
DEFAULT_DOWNLOAD_ROOT = Path.home() / "sigil" / "backend" / "models"

def validate_token_and_get_username(token: str) -> Optional[str]:
    """Validates the Hugging Face token using the whoami endpoint and returns the username."""
    if not token:
        return None # Cannot validate an empty token
        
    print("Validating Hugging Face token...")
    try:
        api = HfApi(token=token)
        user_info = api.whoami(token=token) # Pass token explicitly for clarity
        
        # Check if user_info is a dictionary and contains the 'name' key
        if isinstance(user_info, dict) and 'name' in user_info:
            return user_info.get('name')
        else:
            print("Warning: Unexpected response format from whoami endpoint.", file=sys.stderr)
            return None
            
    except HfHubHTTPError as e:
        # Specifically check for 401 Unauthorized, which strongly indicates an invalid token
        if e.response and e.response.status_code == 401:
             print("Error: Hugging Face token appears to be invalid or expired (401 Unauthorized).", file=sys.stderr)
        else:
             print(f"Error validating token (HTTP Error): {e}", file=sys.stderr)
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error validating token (Network Error): {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"An unexpected error occurred during token validation: {e}", file=sys.stderr)
        return None
        
def get_project_root() -> Path:
    """
    Returns the path to the project root directory.
    This is the directory containing the .env file.
    """
    # Start from the current file's directory and go up until we find the project root
    current_dir = Path(__file__).parent
    
    # Go up to three parent directories looking for a recognized project root indicator
    # such as .env, requirements.txt, or other project-specific files
    for _ in range(4):  # Limit the search to avoid infinite loops
        # Check for common files/directories that might indicate we're at the project root
        if (current_dir / "requirements.txt").exists() or (current_dir / "README.md").exists():
            return current_dir
        
        # Move up one directory
        parent_dir = current_dir.parent
        if parent_dir == current_dir:  # We've reached the filesystem root
            break
        current_dir = parent_dir
    
    # If we couldn't find a clear project root, return the directory three levels up from current file
    # This should be the project root in most standard layouts
    return Path(__file__).parent.parent.parent

def _migrate_token_from_home_to_project_root() -> bool:
    """
    Migrates the HUGGINGFACE_TOKEN from ~/.env to the project root .env file.
    Returns True if migration was performed, False otherwise.
    
    This is a one-time migration to support the transition from storing tokens in the
    user's home directory to storing them in the project root directory.
    
    DEPRECATION NOTICE: This function will be removed in approximately six months (around Q2 2024)
    after users have had time to migrate their tokens.
    """
    home_env_path = Path.home() / ".env"
    project_env_path = get_project_root() / ".env"
    
    # Check if home .env exists
    if not home_env_path.exists():
        return False
    
    # Load from home directory first to see if token exists there
    load_dotenv(dotenv_path=home_env_path)
    token = os.getenv("HUGGINGFACE_TOKEN")
    
    if not token:
        return False  # No token in home .env to migrate
    
    # Token exists in home .env, now save it to project .env
    try:
        # Ensure project root directory exists
        project_env_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Read existing project .env lines or initialize empty list
        lines = []
        token_line = f"HUGGINGFACE_TOKEN={token}"
        token_found = False
        
        if project_env_path.exists():
            with open(project_env_path, 'r') as f:
                lines = f.readlines()
            
            # Check if token already exists in project .env and update it
            for i, line in enumerate(lines):
                if line.strip().startswith("HUGGINGFACE_TOKEN="):
                    lines[i] = token_line + "\n"
                    token_found = True
                    break
        
        # If token line wasn't found, append it
        if not token_found:
            # Add a newline before appending if the file exists and doesn't end with one
            if lines and not lines[-1].endswith('\n'):
                lines.append('\n')
            lines.append(token_line + "\n")
        
        # Write the token to project .env
        with open(project_env_path, 'w') as f:
            f.writelines(lines)
        
        # Now remove the token line from home .env
        home_lines = []
        with open(home_env_path, 'r') as f:
            home_lines = f.readlines()
        
        # Remove the HUGGINGFACE_TOKEN line
        home_lines = [line for line in home_lines if not line.strip().startswith("HUGGINGFACE_TOKEN=")]
        
        # Write back the modified home .env without the token
        with open(home_env_path, 'w') as f:
            f.writelines(home_lines)
        
        print(f"NOTICE: Migrated HUGGINGFACE_TOKEN from {home_env_path} to {project_env_path}")
        print("This is a one-time migration. Your token is now stored in the project directory instead of your home directory.")
        return True
    
    except Exception as e:
        print(f"Error during token migration: {e}", file=sys.stderr)
        return False

def load_env() -> Optional[str]:
    """Loads environment variables from project root .env file, prompts to add token if missing, and validates token."""
    # First try migrating from home .env if needed
    migration_performed = _migrate_token_from_home_to_project_root()
    
    # If we migrated the token, print a notice about the change
    if migration_performed:
        print("\nIMPORTANT: Your Hugging Face token has been automatically migrated from your home directory")
        print("to the project directory. This change helps make the project more portable and self-contained.")
    
    env_path = get_project_root() / ".env"
    
    # Load existing .env file if it exists
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        print(f"Checked environment file: {env_path}")
    else:
        print(f"Info: Environment file not found at {env_path}")

    hf_token = os.getenv("HUGGINGFACE_TOKEN")

    if not hf_token:
        print("\nWarning: HUGGINGFACE_TOKEN not found in environment.")
        try:
            response = input("Would you like to enter your Hugging Face token now? (Needed for private/gated models) (y/n): ").strip().lower()
            if response in ['y', 'yes']:
                new_token = input("Paste your Hugging Face token here: ").strip()
                if not new_token:
                    print("Error: Token cannot be empty.", file=sys.stderr)
                    print("Proceeding without a token. You may encounter issues with private/gated models.")
                    # No token validation needed here as it's empty
                    return None 
                
                # Try saving and reloading
                try:
                    lines = []
                    token_found = False
                        
                    # Create the project root directory if it doesn't exist
                    env_path.parent.mkdir(parents=True, exist_ok=True)
                        
                    if env_path.exists():
                        with open(env_path, 'r') as f:
                            lines = f.readlines()
                        for i, line in enumerate(lines):
                            if line.strip().startswith("HUGGINGFACE_TOKEN="):
                                lines[i] = f"HUGGINGFACE_TOKEN={new_token}\n"
                                token_found = True
                                break
                    if not token_found:
                        lines.append(f"\nHUGGINGFACE_TOKEN={new_token}\n")
                    with open(env_path, 'w') as f:
                        f.writelines(lines)
                    print(f"Token saved to {env_path}")
                    load_dotenv(dotenv_path=env_path, override=True)
                    hf_token = os.getenv("HUGGINGFACE_TOKEN")
                    if hf_token != new_token:
                        print("Warning: Token saved, but failed to reload. Using entered token for this session.", file=sys.stderr)
                        hf_token = new_token # Use the entered token anyway
                        
                except OSError as e:
                     print(f"Error updating {env_path}: {e}", file=sys.stderr)
                     print("Proceeding without saving the token. Using entered token for this session.")
                     hf_token = new_token # Use the entered token for this session
                     
            else:
                print("Proceeding without a Hugging Face token.")
                print("You can manually create or update ~/.env with HUGGINGFACE_TOKEN=your_token later.")
                # No token validation needed here
                return None
                
        except EOFError:
            print("\nOperation cancelled.", file=sys.stderr)
            # No token validation needed here
            return None
    else:
         print("Hugging Face token found.")

    # --- Token Validation Step --- 
    if hf_token: # Only validate if we have a token
        print("-"*20) # Separator
        username = validate_token_and_get_username(hf_token)
        if username:
            print(f"✅ Logged into Huggingface as: {username}")
        else:
            # The validation function already printed the specific error
            print(f"❌ Huggingface token validation failed. Private/gated model downloads may not work.")
            # Optional: Could add logic here to prompt for re-entry if validation fails
        print("-"*20) # Separator
    else:
         # This path is reached if token wasn't found initially and user declined to enter one
         print("Info: No Hugging Face token provided. Cannot download private or gated models.")

    return hf_token

def search_models(query: str, token: Optional[str], limit: int = 10) -> List[ModelInfo]:
    """Searches Hugging Face Hub for models matching the query."""
    print(f"Searching for models matching '{query}'...")
    try:
        api = HfApi(token=token)
        # Convert the generator returned by list_models to a list immediately
        model_generator = api.list_models(search=query, limit=limit, sort="likes", direction=-1)
        models = list(model_generator)
        
        if not models: # Now this check works on the list
            print("No models found matching your query.")
            return []

        print(f"\nFound {len(models)} models:") # len() now works on the list
        for i, model in enumerate(models):
            # Check if the model is private
            privacy_indicator = " (Private)" if model.private else ""
            
            # Truncate long descriptions
            description = model.pipeline_tag or "No description" # Use pipeline_tag as description fallback
            if model.id and model.id.startswith("sentence-transformers/"): # Often have long, less useful descriptions
                 description = model.pipeline_tag or "Sentence Transformer"
            
            print(f"  [{i+1}] {model.id}{privacy_indicator:<50} (Likes: {model.likes:<5}) - {description}")
            # Other potentially useful info: model.tags, model.lastModified
        
        return models # Already a list, no need for list(models)
    except requests.exceptions.RequestException as e:
        print(f"Network error during search: {e}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"An unexpected error occurred during search: {e}", file=sys.stderr)
        return []

def is_model_gated(model_name: str, token: Optional[str]) -> bool:
    """Checks if a model on Hugging Face Hub is gated."""
    try:
        api = HfApi(token=token)
        model_info = api.model_info(model_name, token=token)
        
        if hasattr(model_info, 'gated') and model_info.gated:
            # ModelInfo has a 'gated' attribute, and it's truthy
            # The value can sometimes be a string like 'auto' or 'manual'
            return True
        return False
    except HfHubHTTPError as e:
        # Handle cases like model not found (404) or auth issues (401) during the info check
        print(f"Warning: Could not retrieve model info for {model_name} to check gated status: {e}", file=sys.stderr)
        # Decide how to handle: assume not gated to allow download attempt, 
        # or assume gated to be safe. Let's assume not gated for now.
        return False
    except requests.exceptions.RequestException as e:
        print(f"Warning: Network error checking gated status for {model_name}: {e}", file=sys.stderr)
        return False # Assume not gated on network error
    except Exception as e:
        print(f"Warning: Unexpected error checking gated status for {model_name}: {e}", file=sys.stderr)
        return False # Assume not gated on unexpected error

def download_model(model_name: str, token: Optional[str]):
    """Downloads a model from Hugging Face Hub, handling gated models with retry."""
    # --- Gated Model Check --- 
    print(f"Checking access requirements for {model_name}...")
    
    # Initial check
    if is_model_gated(model_name, token):
        model_url = f"https://huggingface.co/{model_name}"
        print(f"\nWarning: Model '{model_name}' is gated and requires accepting terms on Hugging Face.", file=sys.stderr)
        print(f"Please visit {model_url} to review and accept the license agreement.", file=sys.stderr)
        
        opened_browser = False
        try:
            response = input("Would you like to open the model page in your browser now? (y/n): ").strip().lower()
            if response in ['y', 'yes']:
                try:
                    if webbrowser.open(model_url):
                        print(f"\nOpened model page: {model_url}")
                        print("Please review and accept the terms on the Hugging Face website, then return here.")
                        opened_browser = True
                    else:
                        print("\nWarning: Could not automatically open the web browser.", file=sys.stderr)
                        print(f"Please manually visit: {model_url}", file=sys.stderr)
                except Exception as e:
                    print(f"\nWarning: An error occurred trying to open the web browser: {e}", file=sys.stderr)
                    print(f"Please manually visit: {model_url}", file=sys.stderr)
            # If user said no, or browser didn't open, explain they need to do it manually
            if not opened_browser and response not in ['y', 'yes']:
                 print("\nYou will need to manually visit the link above and accept the terms before downloading.")
                 
        except EOFError:
             print("\nOperation cancelled.", file=sys.stderr)
             sys.exit(1)

        # Ask to retry download
        for attempt in range(2): # Allow one retry check
            try:
                retry_response = input("Once you've accepted the license, attempt download now? (y/n): ").strip().lower()
                if retry_response in ['y', 'yes']:
                    print("\nRe-checking model access...")
                    if not is_model_gated(model_name, token):
                        print("Access confirmed. Proceeding with download...")
                        # Break out of the gated check block and proceed to download
                        break # Exit the retry loop and continue in download_model
                    else:
                        print("Warning: It seems the license agreement hasn't been accepted or access hasn't updated yet.", file=sys.stderr)
                        if attempt == 0:
                             print("Please ensure you have accepted the terms on the website.", file=sys.stderr)
                             # Continue loop to ask again
                        else:
                             print("Exiting. Please try running the script again later.", file=sys.stderr)
                             sys.exit(1)
                elif retry_response in ['n', 'no']:
                    print("Download aborted. You can run the script again later.")
                    sys.exit(0)
                else:
                    print("Invalid input. Please enter 'y' or 'n'.")
                    if attempt == 0:
                        # Re-prompt in the loop
                        continue 
                    else:
                        # Exit after second invalid input
                        sys.exit(1)
            except EOFError:
                print("\nOperation cancelled.", file=sys.stderr)
                sys.exit(1)
        else:
            # This else block executes if the loop completed without break (i.e., access not confirmed)
            # This should only be reachable if the second check failed and we exited above, but added for safety.
             sys.exit(1)

    # --- End Gated Model Check ---
    # If we reached here, either the model wasn't gated initially, 
    # or it was gated, the user accepted, and the re-check passed.
    
    # Construct the specific path for this model
    model_path = DEFAULT_DOWNLOAD_ROOT / model_name.replace("/", "--") # Use HF's recommended local dir naming
    
    print(f"Target download directory: {model_path}")

    # Check if model already exists
    if model_path.exists() and any(model_path.iterdir()): # Check if dir exists and is not empty
        print(f"Model directory {model_path} seems to exist and is not empty. Skipping download.")
        # A more robust check might verify specific files (config.json, etc.)
        return

    # Ensure the parent directory exists
    try:
        model_path.parent.mkdir(parents=True, exist_ok=True)
        print(f"Ensured parent directory exists: {model_path.parent}")
    except OSError as e:
        print(f"Error creating directory {model_path.parent}: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Downloading {model_name} to {model_path}...")
    try:
        snapshot_download(
            repo_id=model_name,
            local_dir=str(model_path),
            token=token,
            local_dir_use_symlinks=False
        )
        print("Download complete.")
    except HfHubHTTPError as e:
        # Check if it's specifically a 401 Unauthorized, often due to needing a token
        if e.response and e.response.status_code == 401:
             print(f"HTTP Error 401 (Unauthorized): {e}. This model might require authentication. Ensure HUGGINGFACE_TOKEN is set correctly in ~/.env", file=sys.stderr)
        else:
             print(f"HTTP Error downloading model: {e}. Invalid model name or network issue?", file=sys.stderr)
        sys.exit(1)
    except LocalEntryNotFoundError as e:
         print(f"Error: Model or specific file not found on Hugging Face Hub: {e}", file=sys.stderr)
         sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"Network error during download: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e: # Catch potential filesystem errors too
        print(f"An unexpected error occurred during download: {e}", file=sys.stderr)
        # Attempt to clean up potentially incomplete download directory
        if model_path.exists():
            try:
                import shutil
                shutil.rmtree(model_path)
                print(f"Cleaned up potentially incomplete directory: {model_path}")
            except Exception as cleanup_e:
                print(f"Error during cleanup: {cleanup_e}", file=sys.stderr)
        sys.exit(1)

def get_model_name_from_user(hf_token: Optional[str]) -> Optional[str]:
    """Handles user interaction to get the desired model name, either directly or via search."""
    while True:
        print("\nChoose an option:")
        print("  [1] Enter model name directly")
        print("  [2] Search for a model")
        print("  [q] Quit")
        
        choice = input("Enter your choice: ").strip().lower()

        if choice == '1':
            try:
                model_name = input("Enter the Hugging Face model name (e.g., 'google/flan-t5-small'): ").strip()
                if not model_name:
                    print("Error: Model name cannot be empty.", file=sys.stderr)
                    continue # Ask for choice again
                return model_name
            except EOFError:
                print("\nOperation cancelled.", file=sys.stderr)
                return None # Indicate cancellation

        elif choice == '2':
            while True: # Loop for searching
                try:
                    query = input("Enter search keywords (or 'b' to go back, 'q' to quit): ").strip()
                    if not query:
                        continue
                    if query == 'b':
                        break # Break search loop, go back to main choice
                    if query == 'q':
                        return None # Indicate quit

                    found_models = search_models(query, hf_token)
                    
                    if not found_models:
                        # search_models already printed a message
                        continue # Allow searching again

                    while True: # Loop for selection
                         select_prompt = f"Enter number (1-{len(found_models)}) to select, 's' to search again, or 'q' to quit: "
                         selection = input(select_prompt).strip().lower()

                         if selection == 's':
                             break # Break selection loop, go back to search query input
                         if selection == 'q':
                             return None # Indicate quit

                         try:
                             index = int(selection) - 1
                             if 0 <= index < len(found_models):
                                 selected_model = found_models[index].id
                                 print(f"Selected: {selected_model}")
                                 return selected_model
                             else:
                                 print(f"Invalid number. Please enter a number between 1 and {len(found_models)}.")
                         except ValueError:
                             print("Invalid input. Please enter a number, 's', or 'q'.")
                         except EOFError:
                              print("\nOperation cancelled.", file=sys.stderr)
                              return None # Indicate cancellation
                    
                    # If we broke from selection loop with 's', continue the outer search loop
                    if selection == 's': 
                        continue
                
                except EOFError:
                    print("\nOperation cancelled.", file=sys.stderr)
                    return None # Indicate cancellation
            # If we broke from search loop with 'b', continue the outer choice loop
            if query == 'b':
                 continue

        elif choice == 'q':
            return None # Indicate quit
        
        else:
            print("Invalid choice. Please enter '1', '2', or 'q'.")
            
def main():
    """Parses CLI arguments, handles user interaction, and initiates the model download."""
    # Keep the parser for potential future arguments
    parser = argparse.ArgumentParser(description="Download models from Hugging Face Hub, with search capability.")
    # Example of a potential future argument:
    # parser.add_argument("--output-dir", help="Override default download directory.") 
    args = parser.parse_args() 
    
    hf_token = load_env()
    
    model_name = get_model_name_from_user(hf_token)

    if model_name:
        download_model(model_name, hf_token)
    else:
        print("No model selected. Exiting.")
        sys.exit(0)

if __name__ == "__main__":
    main()
