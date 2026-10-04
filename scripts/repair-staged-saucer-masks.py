"""Repair only nine visually reviewed opaque saucers, retaining source RGB.

Fill holes inside the existing closed porcelain contour. Never apply this to
handles or transparent vessels; each result requires new visual approval.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

root = Path('output/round29-rijks')
records = {r['id']: r for r in json.loads((root / 'cutouts/results.json').read_text())}
inputs = {r['id']: r for r in json.loads((root / 'inputs.json').read_text())}
destination = root / 'saucer-repairs'
destination.mkdir(exist_ok=True)
repairs = {}
selected = []
for number in range(20059081, 20059090):
    object_id = f'rks-{number}'
    record = records[object_id]
    alpha = np.asarray(Image.open(record['maskPath']).convert('L')).copy()
    # Preserve existing antialiasing; restore opacity only in enclosed holes.
    flood = Image.fromarray(np.where(alpha >= 128, 255, 0).astype(np.uint8)).copy()
    ImageDraw.floodfill(flood, (0, 0), 128, thresh=0)
    if 128 not in np.asarray(flood):
        raise ValueError('Exterior flood fill failed; no repair may proceed')
    enclosed = np.asarray(flood) == 0
    alpha[enclosed] = 255
    if number in (20059082, 20059086, 20059089):
        # These three round opaque saucers have an open interior gap. Recover
        # the convex silhouette from the retained rim, then re-review it.
        points = []
        for y, row in enumerate(alpha >= 128):
            xs = np.flatnonzero(row)
            if len(xs):
                points.extend([(int(xs[0]), y), (int(xs[-1]), y)])
        points = sorted(set(points))
        def cross(o, a, b):
            return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
        halves = []
        for sequence in (points, list(reversed(points))):
            half = []
            for point in sequence:
                while len(half) >= 2 and cross(half[-2], half[-1], point) <= 0:
                    half.pop()
                half.append(point)
            halves.append(half[:-1])
        inside = Image.new('L', (alpha.shape[1], alpha.shape[0]))
        ImageDraw.Draw(inside).polygon(halves[0]+halves[1], fill=255)
        alpha = np.maximum(alpha, np.asarray(inside))
    mask = destination / f'{object_id}.png'
    Image.fromarray(alpha).save(mask)
    repairs[object_id] = {
        'sourceSha256': record['sourceSha256'],
        'maskPath': str(mask),
        'maskSha256': hashlib.sha256(mask.read_bytes()).hexdigest(),
        'notes': 'Visually reviewed opaque saucer: fill enclosed erased porcelain interior, preserve exterior contour and original RGB. Re-review required.',
    }
    selected.append(inputs[object_id])
    print(object_id, 'restored pixels', int(enclosed.sum()))
(destination / 'repairs.json').write_text(json.dumps(repairs, indent=2))
(destination / 'inputs.json').write_text(json.dumps(selected, indent=2))
