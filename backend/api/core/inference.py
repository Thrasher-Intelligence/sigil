import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

def generate_response(
    model: AutoModelForCausalLM,
    tokenizer: AutoTokenizer,
    device: str,
    prompt: str,
    temperature: float,
    top_p: float,
    max_new_tokens: int,
    repetition_penalty: float = 1.0,
) -> str:
    """Generates a response string using the provided model and parameters.
    
    If the response is cut off (generated tokens equal max_new_tokens), a continuation
    will be automatically generated and appended to the original response.
    """
    try:
        # Store original device
        original_device = device
        inference_device = device
        
        # Check if we need to move to CPU for inference due to MPS issues
        if device == 'mps':
            print("   ⚠️ MPS device detected. Moving model and inputs to CPU for generation.")
            inference_device = 'cpu'
            model.to(inference_device) # Move model to CPU

        # Move inputs to the chosen inference device (CPU or original MPS/CUDA)
        inputs = tokenizer(prompt, return_tensors="pt").to(inference_device)
        input_ids = inputs["input_ids"]
        attention_mask = inputs.get("attention_mask")
        input_length = input_ids.shape[1]

        # --- Removed MPS cache clearing as we're moving to CPU ---
        # if device == 'mps':
        #     torch.mps.empty_cache()
        # --- End MPS cache clearing ---

        print("--- Debug: Inference Parameters ---")
        print(f"   Prompt (first 100 chars): {prompt[:100]}...")
        print(f"   Temperature: {temperature}")
        print(f"   Top P: {top_p}")
        print(f"   Repetition Penalty: {repetition_penalty}")
        print(f"   Max New Tokens: {max_new_tokens}")
        print(f"   Inference Device: {inference_device}")
        print("------------------------------------")

        with torch.no_grad():
            outputs = model.generate(
                input_ids=input_ids,
                attention_mask=attention_mask,
                max_new_tokens=max_new_tokens,
                do_sample=True,
                temperature=temperature,
                top_k=50, # Keep default top_k
                top_p=top_p,
                repetition_penalty=repetition_penalty,
                pad_token_id=tokenizer.pad_token_id
            )

        # --- Debug: Token Count ---
        total_tokens = outputs[0].shape[0]
        generated_tokens = total_tokens - input_length
        print(f"   Tokens in prompt: {input_length}")
        print(f"   Tokens generated: {generated_tokens} (limit {max_new_tokens})")
        print("------------------------------------")
        # --- End Debug ---

        generated_ids = outputs[0][input_length:]
        # Decode on CPU is fine
        response_text = tokenizer.decode(generated_ids, skip_special_tokens=True)
        
        # --- Check if response might be cut off (generated tokens equals max_new_tokens) ---
        if generated_tokens >= max_new_tokens:
            print(f"   🔁 Chaining a continuation pass... (generated {generated_tokens}/{max_new_tokens})")
            
            # Create continuation prompt by appending the current response
            continuation_prompt = f"{prompt}{response_text}\nContinue:"
            
            # Generate continuation with same parameters (but reusing the model that's already on the right device)
            continuation_inputs = tokenizer(continuation_prompt, return_tensors="pt").to(inference_device)
            continuation_input_ids = continuation_inputs["input_ids"]
            continuation_attention_mask = continuation_inputs.get("attention_mask")
            continuation_input_length = continuation_input_ids.shape[1]
            
            # Use a fixed number of tokens for the continuation (e.g., 500)
            continuation_max_tokens = 500
            
            print(f"   Continuation prompt length: {continuation_input_length} tokens")
            print(f"   Generating up to {continuation_max_tokens} additional tokens")
            
            with torch.no_grad():
                continuation_outputs = model.generate(
                    input_ids=continuation_input_ids,
                    attention_mask=continuation_attention_mask,
                    max_new_tokens=continuation_max_tokens,
                    do_sample=True,
                    temperature=temperature,
                    top_k=50,
                    top_p=top_p,
                    repetition_penalty=repetition_penalty,
                    pad_token_id=tokenizer.pad_token_id
                )
            
            # Decode only the newly generated tokens
            continuation_generated_ids = continuation_outputs[0][continuation_input_length:]
            continuation_text = tokenizer.decode(continuation_generated_ids, skip_special_tokens=True)
            
            # Report tokens generated in continuation
            continuation_generated_tokens = continuation_generated_ids.shape[0]
            print(f"   Continuation generated: {continuation_generated_tokens} tokens")
            
            # Append continuation to original response
            response_text = response_text + continuation_text
            print("   ✅ Continuation complete and appended to response")
        # --- End continuation handling ---
        
        # --- Move model back to original device if it was moved ---
        if original_device == 'mps' and inference_device == 'cpu':
             print("   ✅ Generation complete. Moving model back to MPS.")
             model.to(original_device)
        # --- End move back ---
             
        return response_text

    except Exception as e:
        # Re-raise exceptions to be handled by the calling endpoint
        print(f"Error during core generation: {e}") # Log error here
        raise e 