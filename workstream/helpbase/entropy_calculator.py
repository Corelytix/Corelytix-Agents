import math
from typing import List, Dict, Any


def compute_shannon_entropy(addresses: List[str]) -> float:
    """
    Compute Shannon entropy (bits) of an address sequence.
    """
    if not addresses:
        return 0.0
    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1
    total = len(addresses)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        entropy -= p * math.log2(p)
    return round(entropy, 4)


def entropy_breakdown(addresses: List[str]) -> Dict[str, Any]:
    """
    Provide detailed breakdown for entropy calculation:
    - total count
    - frequency distribution
    - individual probabilities
    - entropy value
    """
    if not addresses:
        return {"total": 0, "distribution": {}, "probabilities": {}, "entropy": 0.0}

    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1
    total = len(addresses)

    probs: Dict[str, float] = {a: round(c / total, 4) for a, c in freq.items()}
    entropy = compute_shannon_entropy(addresses)

    return {
        "total": total,
        "distribution": freq,
        "probabilities": probs,
        "entropy": entropy,
    }


def classify_entropy(entropy: float, max_bits: int) -> str:
    """
    Classify entropy relative to maximum possible bits.
    """
    if max_bits <= 0:
        return "undefined"
    ratio = entropy / max_bits
    if ratio < 0.3:
        return "low"
    elif ratio < 0.7:
        return "medium"
    return "high"
