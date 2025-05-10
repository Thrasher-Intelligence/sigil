import os
import sys
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import json
from .config import settings

# --- Module-level cache for the currently loaded model ---
_current_model_state = {
    "tokenizer": None,
    "model": None,
    "device": None,
}

# --- Helper to unload the current model ---
def _unload_current_model_if_exists():
    """Checks the cache and unloads the model if one is present."""
    global _current_model_state
    model_unloaded = False
    tokenizer_unloaded = False

    if _current_model_state["model"] is not None:
        print(f"⏳ Unloading existing model from device '{_current_model_state['device']}'...")
        del _current_model_state["model"]
        _current_model_state["model"] = None
        model_unloaded = True
        print("   ✅ Model object deleted.")

    if _current_model_state["tokenizer"] is not None:
        del _current_model_state["tokenizer"]
        _current_model_state["tokenizer"] = None
        tokenizer_unloaded = True
        print("   ✅ Tokenizer object deleted.")

    if _current_model_state["device"] == 'cuda':
        try:
            torch.cuda.empty_cache()
            print("   ✅ torch.cuda.empty_cache() called.")
        except Exception as e:
            print(f"   ⚠️ Error calling torch.cuda.empty_cache(): {e}", file=sys.stderr)
    
    if model_unloaded or tokenizer_unloaded:
        print("   Unload process complete.")
    
    _current_model_state["device"] = None


# --- Model Registry (REMOVED) ---
# MODEL_REGISTRY = {
#     # Paths should be relative to the project root (the directory containing 'backend' and 'frontend')
#     "tinyllama": "backend/models/tinyllama",
# }

# --- Model Loading Helper ---
def load_model_internal(path: str):
    """Loads the tokenizer and model from the specified path, resolving relative paths from the project root."""
    global _current_model_state

    # Unload any existing model before loading a new one
    _unload_current_model_if_exists()

    # Calculate project root relative to this file's location (backend/api/core)
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    absolute_path = os.path.join(project_root, path)

    # Check if the resolved absolute path is a directory
    if not os.path.isdir(absolute_path):
        # TODO: Consider checking if the path *will* exist if downloaded,
        # or handle Hugging Face model names directly.
        raise ValueError(f"Invalid directory path provided or not found: '{path}' (resolved to '{absolute_path}')")

    print(f"⏳ Attempting to load model from '{absolute_path}' with accelerate...")
    try:
        # Trust remote code can be necessary for some models, consider security implications
        # For now, keeping it False as in the original code.
        # TODO: Potentially allow trust_remote_code=True based on model registry flags
        # Load using the resolved absolute path
        tokenizer = AutoTokenizer.from_pretrained(absolute_path, local_files_only=True, trust_remote_code=False)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
            print("   ⚠️ Added pad_token = eos_token")
        
        # -------------------------------------------------------------
        # Determine prompt handling mode for this tokenizer / model
        # -------------------------------------------------------------
        prompt_mode = "template"  # default assumption
        custom_prompt_config = None

        if tokenizer.chat_template is None:
            # Try to find a prompt_config.json next to the model
            cfg_path = os.path.join(absolute_path, "prompt_config.json")
            if os.path.isfile(cfg_path):
                try:
                    with open(cfg_path, "r", encoding="utf-8") as cfg_file:
                        custom_prompt_config = json.load(cfg_file)
                    prompt_mode = "custom"
                    print(f"   ✅ Loaded custom prompt_config.json for prompts.")
                except Exception as cfg_err:
                    print(f"   ⚠️ Failed to load prompt_config.json: {cfg_err}. Falling back to simple prompt.")
                    prompt_mode = "fallback"
            else:
                # No template and no config – final fallback
                prompt_mode = "fallback"

            if prompt_mode == "fallback":
                # For backward-compatibility we still install a generic chat template
                DEFAULT_CHAT_TEMPLATE = "{% for message in messages %}{% if message['role'] == 'user' %}{{ bos_token + '[INST] ' + message['content'] + ' [/INST]' }}{% elif message['role'] == 'assistant' %}{{ ' ' + message['content'] + eos_token }}{% elif message['role'] == 'system' %}{{ bos_token + '[INST] <<SYS>>\\n' + message['content'] + '\\n<</SYS>>\\n\\n' }}{% endif %}{% endfor %}"
                tokenizer.chat_template = DEFAULT_CHAT_TEMPLATE
                print("   ⚠️ Applied default Jinja chat template (generic).")

        # Attach prompt metadata to tokenizer so routes can store in app.state
        tokenizer.prompt_mode = prompt_mode  # e.g. template / custom / fallback
        tokenizer.custom_prompt_config = custom_prompt_config
        # -------------------------------------------------------------

        # Determine the desired device mapping strategy
        if torch.cuda.is_available():
            chosen_device_map = "auto"  # Let accelerate place layers on CUDA devices
            print("   Detected CUDA. Loading model with device_map='auto' (CUDA)...")
        else:
            # Force CPU placement to avoid known issues with MPS on some macOS setups
            chosen_device_map = "cpu"
            print("   CUDA not available. Loading model with device_map='cpu' (force CPU)...")

        # ---> ADDED: Get precision setting <---
        precision_setting = settings.model_precision
        if precision_setting == "fp16":
            torch_dtype = torch.float16
            print(f"   Applying precision: {precision_setting} (torch.float16)")
        else: # Default to fp32
            torch_dtype = torch.float32
            print(f"   Applying precision: fp32 (torch.float32)")
        # ---> END ADDED <---

        # Load model with the chosen device_map and precision
        model = AutoModelForCausalLM.from_pretrained(
            absolute_path,
            local_files_only=True,
            trust_remote_code=False,
            device_map=chosen_device_map,
            torch_dtype=torch_dtype # <-- Pass the determined dtype
        )
        model.eval()
        
        # Determine the primary device after accelerate placement
        # If any part is on CUDA, consider 'cuda' the primary device for reporting.
        # model.device might point to the device of the *first* parameter, 
        # or accelerate might provide a better way. Let's check model.hf_device_map
        device = 'cpu' # Default to CPU
        if hasattr(model, 'hf_device_map') and model.hf_device_map:
            devices_used = set(model.hf_device_map.values())
            # Check if any device is a CUDA device (either string starting with 'cuda' or an integer index)
            if any( (isinstance(d, str) and d.startswith('cuda')) or isinstance(d, int) for d in devices_used ):
                device = 'cuda' # Report cuda if any layer is on GPU
        
        print(f"   ✅ Model loaded from '{absolute_path}'. Effective device: '{device.upper()}'. Distribution: {getattr(model, 'hf_device_map', 'N/A')}")

        # Update the cache with the newly loaded model
        _current_model_state["tokenizer"] = tokenizer
        _current_model_state["model"] = model
        _current_model_state["device"] = device
        print(f"   ℹ️ Model and tokenizer cached. Current state: device='{device}'")

        # The explicit model.to(device) calls are no longer needed as accelerate handles placement.

        return tokenizer, model, device

    except Exception as e:
        print(f"❌ Error loading model from '{absolute_path}' with accelerate: {e}", file=sys.stderr)
        # Re-raise a more specific exception or handle as needed
        raise RuntimeError(f"Failed to load model from '{absolute_path}' with accelerate: {e}") from e

def load_model_by_name(model_name: str):
    """Loads a model by its name, assuming it's a directory inside backend/models."""
    # Construct the expected relative path from the project root
    relative_path = os.path.join("backend", "models", model_name)
    
    # No registry lookup needed
    # path = MODEL_REGISTRY.get(model_name)
    # if not path:
    #     raise ValueError(f"Unknown model name: '{model_name}'. Available models: {list(MODEL_REGISTRY.keys())}")
    
    # load_model_internal will handle path resolution and existence checks
    print(f"Attempting dynamic load for model name '{model_name}' using path '{relative_path}'")
    try:
        return load_model_internal(relative_path)
    except ValueError as ve:
        # Re-raise value errors (e.g., path not found) with potentially more context
        raise ValueError(f"Model directory not found or invalid for '{model_name}' at expected path '{relative_path}'. {ve}") from ve
    except RuntimeError as re:
        # Re-raise runtime errors from loading
        raise RuntimeError(f"Failed to load model '{model_name}' from path '{relative_path}'. {re}") from re 