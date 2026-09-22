import os
import math
import torch
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

VAL_FILE = os.path.join(PROJECT_ROOT, "dataset", "split_dataset", "validate", "val.txt")
LORA_DIR = os.path.join(PROJECT_ROOT, "models", "marathi-gpt-lora")
BASE_MODEL = "l3cube-pune/marathi-gpt"

print(f"Loading Base Model: {BASE_MODEL}")
print(f"Loading LoRA Weights from: {LORA_DIR}")

tokenizer = AutoTokenizer.from_pretrained(LORA_DIR)
base_model = AutoModelForCausalLM.from_pretrained(BASE_MODEL)
model = PeftModel.from_pretrained(base_model, LORA_DIR).merge_and_unload()
model.eval()

print("Evaluating on validation dataset...")
dataset = load_dataset("text", data_files={"validation": VAL_FILE})

def calculate_perplexity(model, tokenizer, sentences):
    total_loss = 0.0
    total_tokens = 0
    criterion = torch.nn.CrossEntropyLoss(reduction="sum")

    with torch.no_grad():
        for sentence in sentences:
            text = sentence.strip()
            if not text:
                continue
            inputs = tokenizer(text, return_tensors="pt")
            input_ids = inputs.input_ids
            if input_ids.shape[1] < 2:
                continue
            
            outputs = model(input_ids)
            logits = outputs.logits
            
            # Shift logits and labels for causal LM evaluation
            shift_logits = logits[..., :-1, :].contiguous().view(-1, logits.size(-1))
            shift_labels = input_ids[..., 1:].contiguous().view(-1)
            
            loss = criterion(shift_logits, shift_labels)
            total_loss += loss.item()
            total_tokens += shift_labels.numel()

    if total_tokens == 0:
        return float("inf")
    
    avg_loss = total_loss / total_tokens
    perplexity = math.exp(avg_loss)
    return avg_loss, perplexity

sentences = [line for line in dataset["validation"]["text"] if line.strip()]
sample_size = min(200, len(sentences))
eval_sentences = sentences[:sample_size]

avg_loss, perplexity = calculate_perplexity(model, tokenizer, eval_sentences)

print("=" * 60)
print("         FINE-TUNED MARATHI-GPT MODEL EVALUATION         ")
print("=" * 60)
print(f" Evaluated Sentences : {sample_size}")
print(f" Average Loss       : {avg_loss:.4f}")
print(f" Model Perplexity   : {perplexity:.4f}")
print("=" * 60)
