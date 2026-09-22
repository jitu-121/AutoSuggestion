import re
from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

# Outlier & Common Colloquial Phonetic Adjustments
OUTLIER_PATTERNS = [
    (r'^omkar$', 'ओंकार'),
    (r'^onkar$', 'ओंकार'),
    (r'^om$', 'ओं'),
    (r'^amkar$', 'अंकार'),
    (r'^namaskar$', 'नमस्कार'),
    (r'^jitendra$', 'जितेंद्र'),
    (r'^jitender$', 'जितेंद्र'),
    (r'^baravkar$', 'बारवकर'),
    (r'^pune$', 'पुणे'),
    (r'^stationla$', 'स्टेशनला'),
    (r'^station$', 'स्टेशन'),
    (r'^kamache$', 'कामाचे'),
    (r'^update$', 'अपडेट'),
    (r'^krupaya$', 'कृपया'),
    (r'^mala$', 'मला'),
    (r'^tumcha$', 'तुमचा'),
    (r'^tumche$', 'तुमचे'),
    (r'^tujha$', 'तुझा'),
    (r'^phone$', 'फोन'),
    (r'^chitrapat$', 'चित्रपट'),
    (r'^udya$', 'उद्या'),
    (r'^sakali$', 'सकाळी'),
    (r'^nav$', 'नाव'),
    (r'^havaman$', 'हवामान'),
    (r'^jevat$', 'जेवत'),
    (r'^rastyavar$', 'रस्त्यावर'),
    (r'^khup$', 'खूप'),
    (r'^abhyas$', 'अभ्यास'),
    (r'^suru$', 'सुरू'),
    (r'^file$', 'फाईल'),
    (r'^aaj$', 'आज'),
    (r'^ho$', 'हो'),
    (r'^nahi$', 'नाही'),
]

def natural_marathi_transliterate(word: str) -> str:
    """
    Natural Colloquial Marathi Phonetic Algorithm with Outlier Handling.
    Converts Roman Marathi input into natural Devanagari script.
    """
    w = word.strip()
    if not w:
        return ""
    
    # If text is already Devanagari script, return as is
    if any('\u0900' <= char <= '\u097F' for char in w):
        return word

    w_lower = w.lower()

    # 1. Check Outlier Exact Patterns (e.g. omkar -> ओंकार)
    for pat, dev_sub in OUTLIER_PATTERNS:
        if re.match(pat, w_lower):
            return dev_sub

    # 2. Pre-process colloquial Roman Marathi spelling patterns
    # Nasal 'n' or 'm' before dental/velar consonants -> Anusvara (M)
    w_proc = re.sub(r'n(?=[tdgkb])', 'M', w_lower)
    w_proc = re.sub(r'om(?=[k])', 'oM', w_proc)
    
    # Map 'sh' to ITRANS 'sh' for Devanagari 'श'
    w_proc = w_proc.replace('sh', 'sh')
    
    # Vowel digraphs
    w_proc = w_proc.replace('ee', 'I').replace('oo', 'U').replace('aa', 'A')

    try:
        dev = transliterate(w_proc, sanscript.ITRANS, sanscript.DEVANAGARI)
        
        # Strip word-ending Halant (\u094D) for natural spoken Marathi pronunciation
        if dev.endswith('\u094D'):
            dev = dev[:-1]
            
        # Clean double halants or stray anusvara halants
        dev = dev.replace('\u0902\u094D', '\u0902')
        return dev
    except Exception:
        return word

def get_transliteration_candidates(word: str, k: int = 5) -> list:
    
    w = word.strip().lower()
    if not w:
        return []
        
    candidates = []
    seen = set()

    # Top primary candidate
    primary = natural_marathi_transliterate(w)
    if primary:
        candidates.append(primary)
        seen.add(primary)

    # Specific phonetic variations
    if w.startswith("om") or w.startswith("on"):
        alt_om = "ओंकार" if "kar" in w else "ओं"
        if alt_om not in seen:
            candidates.append(alt_om)
            seen.add(alt_om)
        alt_om2 = "ओमकार" if "kar" in w else "ओम"
        if alt_om2 not in seen:
            candidates.append(alt_om2)
            seen.add(alt_om2)

    if w.startswith("jiten"):
        vars_jiten = ["जितेन", "जितेंद्र", "जितेन्द्र", "जितेश", "जितेन्द्रिय"]
        for vj in vars_jiten:
            if vj not in seen:
                candidates.append(vj)
                seen.add(vj)

    if w.startswith("mayu"):
        vars_mayur = ["मयुर", "मयूर", "मयुरा", "मयुरी", "मायुर"]
        for vm in vars_mayur:
            if vm not in seen:
                candidates.append(vm)
                seen.add(vm)

    # Phonetic variations (vowel length changes, anusvara changes)
    try:
        # Long vowel variant
        w_long = w.replace('u', 'oo').replace('i', 'ee').replace('a', 'aa')
        v_long = natural_marathi_transliterate(w_long)
        if v_long and v_long not in seen:
            candidates.append(v_long)
            seen.add(v_long)

        # Anusvara variant
        w_nasal = re.sub(r'n', 'M', w)
        v_nasal = natural_marathi_transliterate(w_nasal)
        if v_nasal and v_nasal not in seen:
            candidates.append(v_nasal)
            seen.add(v_nasal)

        # Short vowel variant
        w_short = w.replace('oo', 'u').replace('ee', 'i').replace('aa', 'a')
        v_short = natural_marathi_transliterate(w_short)
        if v_short and v_short not in seen:
            candidates.append(v_short)
            seen.add(v_short)
    except Exception:
        pass

    # Pad with reasonable suffixes if needed
    if len(candidates) < k and primary:
        suffixes = ["ात", "ान", "ाने", "ाला", "ाचा"]
        for s in suffixes:
            cand = primary + s
            if cand not in seen:
                candidates.append(cand)
                seen.add(cand)
            if len(candidates) >= k:
                break

    return candidates[:k]

def transliterate_text(text: str) -> str:
    """Transliterates sentence to Marathi script."""
    words = re.split(r'(\s+)', text)
    result = []
    for w in words:
        if w.strip():
            result.append(natural_marathi_transliterate(w))
        else:
            result.append(w)
    return "".join(result)

# Alias for backward compatibility
rule_based_transliterate = natural_marathi_transliterate

if __name__ == "__main__":
    print("Testing Outliers & Transliteration Candidates:")
    test_words = ['omkar', 'jiten', 'jitendra', 'mayur', 'ganesh']
    for tw in test_words:
        cands = get_transliteration_candidates(tw)
        print(f"  Word: '{tw:10}' -> Candidates: {cands}")
