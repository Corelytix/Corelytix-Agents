from typing import List, Dict, Any


def generate_activity_heatmap(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> List[float]:
    """
    Bucket activity counts into 'buckets' time intervals,
    returning either raw counts or normalized [0.0–1.0].

    Args:
        timestamps: list of epoch ms timestamps.
        counts: list of integer counts per timestamp.
        buckets: number of time buckets to aggregate into.
        normalize: whether to scale values to [0,1].

    Returns:
        List of bucket values (floats if normalized).
    """
    if not timestamps or not counts or len(timestamps) != len(counts):
        return []

    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    agg = [0] * buckets
    for t, c in zip(timestamps, counts):
        idx = min(buckets - 1, int((t - t_min) / bucket_size))
        agg[idx] += c

    if normalize:
        m = max(agg) or 1
        return [round(val / m, 4) for val in agg]
    return agg


def generate_heatmap_with_meta(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> Dict[str, Any]:
    """
    Extended version that returns both heatmap values and metadata.
    """
    values = generate_activity_heatmap(timestamps, counts, buckets, normalize)
    return {
        "heatmap": values,
        "buckets": buckets,
        "normalized": normalize,
        "count_total": sum(counts),
        "time_span": (min(timestamps), max(timestamps)) if timestamps else (None, None)
    }


def classify_activity_level(heatmap: List[float]) -> str:
    """
    Classify overall activity level from a heatmap.
    """
    if not heatmap:
        return "none"
    avg = sum(heatmap) / len(heatmap)
    if avg < 0.2:
        return "low"
    elif avg < 0.6:
        return "medium"
    return "high"
