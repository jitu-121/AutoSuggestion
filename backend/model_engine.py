import os
import torch
import torch.nn.functional as F
from typing import List, Dict
import re
import threading

class L3CubeMarathiModelEngine:
    """
    Fine-Tuned L3Cube Marathi Neural Language Model Engine.
    Loads base model 'l3cube-pune/marathi-gpt' and fine-tuned PEFT LoRA adapter
    weights simultaneously to allow live comparative evaluation.
    """
    def __init__(self, model_name: str = "l3cube-pune/marathi-gpt"):
        self.model_name = model_name
        self.tokenizer = None
        self.base_model = None
        self.lora_model = None
        self.is_loaded = False
        
        # Load HuggingFace + LoRA model in background thread
        thread = threading.Thread(target=self._load_hf_model_thread, daemon=True)
        thread.start()

    def _load_hf_model_thread(self):
        try:
            from transformers import AutoTokenizer, AutoModelForCausalLM
            from peft import PeftModel

            backend_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(backend_dir)
            lora_dir = os.path.join(project_root, "models", "marathi-gpt-lora")

            print(f"[*] Loading Base Model: {self.model_name}...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.base_model = AutoModelForCausalLM.from_pretrained(self.model_name)
            self.base_model.eval()

            if os.path.exists(lora_dir):
                print(f"[*] Loading Fine-Tuned Marathi-GPT LoRA Model from: {lora_dir}...")
                lora_base = AutoModelForCausalLM.from_pretrained(self.model_name)
                self.lora_model = PeftModel.from_pretrained(lora_base, lora_dir).merge_and_unload()
                self.lora_model.eval()
                print("[*] Both Base Model & Fine-Tuned PEFT LoRA Marathi Model ready!")
            else:
                self.lora_model = None
                print("[*] Base Model ready!")

            self.is_loaded = True

        except Exception as e:
            print(f"[!] Warning loading model: {e}")
            self.is_loaded = False

    def predict_top_5(self, text_prefix: str, active_word: str = "", model_mode: str = "fine_tuned") -> List[Dict[str, float]]:
        """
        Calculates the Top 5 most probable next Marathi words (1 to 2 words max)
        for any input sentence using either Base Model or Fine-Tuned LoRA Model.
        """
        clean_prefix = text_prefix.strip()
        if not clean_prefix and active_word:
            clean_prefix = active_word

        results = []
        seen = set()

        # Choose target model based on model_mode
        target_model = self.lora_model if (model_mode == "fine_tuned" and self.lora_model is not None) else self.base_model

        # 1. Neural LM inference
        if self.is_loaded and self.tokenizer and target_model is not None and clean_prefix:
            try:
                inputs = self.tokenizer(clean_prefix, return_tensors="pt")
                with torch.no_grad():
                    outputs = target_model(**inputs)
                    next_token_logits = outputs.logits[0, -1, :]
                    probs = F.softmax(next_token_logits, dim=-1)
                    
                    top_k = torch.topk(probs, k=35)
                    
                    for score, token_id in zip(top_k.values.tolist(), top_k.indices.tolist()):
                        word = self.tokenizer.decode([token_id]).strip()
                        # Extract Devanagari Marathi words cleanly
                        clean_w = re.sub(r'[^\u0900-\u097F]', '', word)
                        # Skip empty words or pure Devanagari/Arabic numbers
                        if clean_w and clean_w not in seen and not re.match(r'^[\u0966-\u096F\d]+$', clean_w):
                            seen.add(clean_w)
                            results.append({"word": clean_w, "score": round(score, 3)})
                            if len(results) >= 5:
                                break
            except Exception as ex:
                print(f"[!] Neural inference exception: {ex}")

        # 2. Dynamic generic fallback if results are still under 5
        generic_fallbacks = ["आहे", "आणि", "म्हणजे", "नाही", "करता", "होते", "मध्ये"]
        for g in generic_fallbacks:
            if g not in seen:
                seen.add(g)
                results.append({"word": g, "score": 0.10})
            if len(results) >= 5:
                break

        return results[:5]

    def wait_until_loaded(self, timeout: float = 30.0):
        import time
        start = time.time()
        while not self.is_loaded and (time.time() - start) < timeout:
            time.sleep(0.2)
        return self.is_loaded

# Global Singleton Instance
model_engine = L3CubeMarathiModelEngine()

if __name__ == "__main__":
    print("Waiting for L3Cube Models to load...")
    model_engine.wait_until_loaded()
    print("\n--- BASE MODEL PREDICTIONS ---")
    res_base = model_engine.predict_top_5("तू आज ", model_mode="base")
    print("Prefix: 'तू आज ' -> Top 5:", [r['word'] for r in res_base])

    print("\n--- FINE-TUNED LORA PREDICTIONS ---")
    res_ft = model_engine.predict_top_5("तू आज ", model_mode="fine_tuned")
    print("Prefix: 'तू आज ' -> Top 5:", [r['word'] for r in res_ft])


