from fastapi import APIRouter, HTTPException, status, Request
from ..schemas.common import ModelSettings, SettingsUpdateResponse

router = APIRouter()

@router.post("/settings/update", response_model=SettingsUpdateResponse)
def update_generation_settings(settings: ModelSettings, request: Request):
    """Update generation parameters stored in application state."""
    app_state = request.app.state
    # No need to check if model is loaded, these are just parameters
    updated_settings = {}
    if settings.system_prompt is not None:
        app_state.system_prompt = settings.system_prompt
        updated_settings["system_prompt"] = app_state.system_prompt
        print(f"🔄 System prompt updated to: '{app_state.system_prompt}'")
    if settings.temperature is not None:
        if not (0 < settings.temperature <= 2.0): # Allow slightly higher temp range
            raise HTTPException(status_code=400, detail="Temperature must be between 0 (exclusive) and 2.0 (inclusive).")
        app_state.temperature = settings.temperature
        updated_settings["temperature"] = app_state.temperature
        print(f"🔄 Temperature updated to: {app_state.temperature}")
    if settings.top_p is not None:
        if not (0 < settings.top_p <= 1.0):
            raise HTTPException(status_code=400, detail="Top P must be between 0 (exclusive) and 1.0 (inclusive).")
        app_state.top_p = settings.top_p
        updated_settings["top_p"] = app_state.top_p
        print(f"🔄 Top P updated to: {app_state.top_p}")
    if settings.max_new_tokens is not None:
        if settings.max_new_tokens <= 0:
            raise HTTPException(status_code=400, detail="Max new tokens must be positive.")
        app_state.max_new_tokens = settings.max_new_tokens
        updated_settings["max_new_tokens"] = app_state.max_new_tokens
        print(f"🔄 Max new tokens updated to: {app_state.max_new_tokens}")

    if not updated_settings:
        # Use 400 Bad Request if no valid settings were provided
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid settings provided to update.")

    return {"message": "Generation settings updated successfully.", "updated_settings": updated_settings} 