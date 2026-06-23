import numpy as np

def calculate_metrics(pred_mask: np.ndarray, gt_mask: np.ndarray = None):
    """
    Calcula métricas básicas de segmentación.
    Si hay ground truth, calcula Dice e IoU; si no, solo volumen.
    """
    metrics = {}
    seg_volume = np.sum(pred_mask)
    metrics["segmented_voxels"] = int(seg_volume)

    if gt_mask is not None:
        intersection = np.sum(pred_mask * gt_mask)
        union = np.sum(pred_mask) + np.sum(gt_mask)
        dice = 2 * intersection / union if union > 0 else 0
        iou = intersection / (np.sum(pred_mask | gt_mask)) if np.sum(pred_mask | gt_mask) > 0 else 0
        metrics.update({
            "dice": round(float(dice), 4),
            "iou": round(float(iou), 4)
        })

    return metrics
