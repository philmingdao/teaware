"""Resumable foreground segmentation. Original photographs are never overwritten.

Writes candidates and QA records, not approved publication assets. Cache keys
include source bytes, model bytes and all processing settings. A failed item does
not stop the batch; publication is a separate, strict operation.
"""
import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sqlite3
import time
from collections import deque
from types import SimpleNamespace
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

MASK_VERSION = 'mask-v2-flat-preservation'
EXPORT_VERSION = 'webp-v1-adaptive'
ort.disable_telemetry_events()


class MpsSession:
    """Adapter preserving the same tensor preprocessing and logits interface."""
    def __init__(self, model, threads, precision):
        import torch
        from transformers import AutoModelForImageSegmentation
        if not torch.backends.mps.is_available(): raise ValueError('Apple MPS is unavailable')
        torch.set_num_threads(threads)
        self.torch = torch
        self.dtype = torch.float16 if precision == 'float16' else torch.float32
        self.model = AutoModelForImageSegmentation.from_pretrained(str(model), trust_remote_code=True,
            local_files_only=True, use_safetensors=True).eval().to(device='mps', dtype=self.dtype)

    def get_inputs(self):
        return [SimpleNamespace(name='input')]

    def get_providers(self):
        return ['PyTorchMPS']

    def run(self, output_names, inputs):
        with self.torch.inference_mode():
            output = self.model(self.torch.from_numpy(inputs['input']).to(device='mps', dtype=self.dtype))[-1]
            return [output.float().cpu().numpy()]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def atomic_json(path, value):
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)


def infer_many(session, images):
    tensors = []
    for image in images:
        array = np.asarray(image.resize((1024, 1024), Image.Resampling.LANCZOS), dtype=np.float32)
        array /= max(float(array.max()), 1)
        array = (array - np.array([.485, .456, .406], dtype=np.float32)) / np.array([.229, .224, .225], dtype=np.float32)
        tensors.append(array.transpose(2, 0, 1))
    result = session.run(None, {session.get_inputs()[0].name: np.stack(tensors)})[-1]
    masks = []
    for image, logits in zip(images, result):
        probability = 1 / (1 + np.exp(-np.clip(np.asarray(logits).squeeze(), -80, 80)))
        spread = float(np.ptp(probability))
        if spread < 1e-6: raise ValueError('constant mask')
        probability = (probability - probability.min()) / spread
        alpha = np.asarray(Image.fromarray(np.uint8(probability * 255)).resize(image.size, Image.Resampling.LANCZOS)).copy()
        alpha[alpha <= 12] = 0
        alpha[alpha >= 244] = 255
        masks.append(alpha)
    return masks


def inspect(alpha, image):
    opaque = alpha >= 128
    ys, xs = np.where(opaque)
    if not len(xs):
        raise ValueError('empty foreground')
    bounds = Image.fromarray(np.uint8(alpha >= 16) * 255).getbbox()
    coverage = float(opaque.mean())
    # Connectivity is a diagnostic at 300px, not a destructive cleanup of the mask.
    diagnostic = np.asarray(Image.fromarray(np.uint8(opaque) * 255).resize((300, 300), Image.Resampling.NEAREST)) > 0
    visited = np.zeros_like(diagnostic)
    areas = []
    for y, x in zip(*np.where(diagnostic)):
        if visited[y, x]: continue
        queue = deque([(int(y), int(x))])
        visited[y, x] = True
        area = 0
        while queue:
            cy, cx = queue.popleft()
            area += 1
            for ny, nx in [(cy-1, cx), (cy+1, cx), (cy, cx-1), (cy, cx+1)]:
                if 0 <= ny < 300 and 0 <= nx < 300 and diagnostic[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))
        areas.append(area)
    count = len(areas)
    substantial = int(sum(area > max(8, diagnostic.sum() * .005) for area in areas))
    border = np.concatenate([opaque[0], opaque[-1], opaque[:, 0], opaque[:, -1]])
    uncertain = float(((alpha > 24) & (alpha < 230)).sum() / max(1, (alpha > 0).sum()))
    flags = []
    if coverage < .025: flags.append('tiny-foreground')
    if coverage > .88: flags.append('background-retained-or-close-crop')
    if border.mean() > .005: flags.append('source-border-contact')
    if substantial > 1: flags.append('multiple-components')
    if uncertain > .12: flags.append('uncertain-alpha')
    if max(image.size) < 1200: flags.append('low-source-resolution')
    if min(bounds[2] - bounds[0], bounds[3] - bounds[1]) < 60: flags.append('narrow-foreground')
    return bounds, {'coverage': round(coverage, 5), 'components': count,
                    'substantialComponents': substantial, 'borderCoverage': round(float(border.mean()), 5),
                    'uncertainAlpha': round(uncertain, 5), 'flags': flags}


def grounding(alpha):
    opaque = alpha >= 96
    ys, xs = np.where(opaque)
    top, bottom = int(ys.min()), int(ys.max())
    height = bottom - top + 1
    foot_y, foot_x = np.where(opaque & (np.arange(alpha.shape[0])[:, None] >= bottom - max(2, height * .018)))
    widest = (0, 0)
    for y in range(round(top + height * .2), round(top + height * .7) + 1):
        row = np.pad(opaque[y].astype(np.int8), (1, 1))
        edges = np.diff(row)
        starts, stops = np.where(edges == 1)[0], np.where(edges == -1)[0]
        if len(starts):
            i = int(np.argmax(stops - starts))
            if stops[i] - starts[i] > widest[1]: widest = (int(starts[i]), int(stops[i] - starts[i]))
    size = alpha.shape[0]
    pct = lambda n: round(float(n) / size * 100, 3)
    return {'shadowBaselinePercent': pct(bottom + 1),
            'shadowContactCenterPercent': pct((foot_x.min() + foot_x.max() + 1) / 2),
            'shadowContactWidthPercent': pct(foot_x.max() - foot_x.min() + 1),
            'shadowCastCenterPercent': pct(widest[0] + widest[1] / 2),
            'shadowCastWidthPercent': pct(widest[1] * .96)}


def export(image, alpha, bounds, path, size, margin, quality):
    rgba = image.convert('RGBA')
    rgba.putalpha(Image.fromarray(alpha))
    if not np.array_equal(np.asarray(rgba)[:, :, :3], np.asarray(image)):
        raise ValueError('RGB changed before resize')
    cropped = rgba.crop(bounds)
    scale = min(size * (1 - 2 * margin) / cropped.width, size * (1 - 2 * margin) / cropped.height, 1)
    target = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
    cropped = cropped.resize(target, Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (size, size))
    canvas.paste(cropped, ((size - target[0]) // 2, (size - target[1]) // 2))
    temp = path.with_suffix('.tmp')
    canvas.save(temp, format='WEBP', quality=quality, method=4, exact=True)
    decoded = Image.open(temp).convert('RGBA')
    before, after = np.asarray(canvas), np.asarray(decoded)
    if not np.array_equal(before[:, :, 3], after[:, :, 3]):
        raise ValueError('WebP alpha is not lossless')
    if np.any(after[0, :, 3]) or np.any(after[-1, :, 3]) or np.any(after[:, 0, 3]) or np.any(after[:, -1, 3]):
        raise ValueError('Export perimeter is not transparent')
    fg = before[:, :, 3] >= 244
    rmse = float(np.sqrt(np.mean((before[fg, :3].astype(float) - after[fg, :3]) ** 2)))
    temp.replace(path)
    return {'rgbUnchangedBeforeResize': True, 'alphaLossless': True, 'rgbEncodingRMSE': round(rmse, 3),
            'candidateSha256': digest(path), 'bytes': path.stat().st_size, 'objectSize': list(target), 'bounds': list(bounds),
            **grounding(after[:, :, 3])}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--inputs', type=Path, default=Path('output/collection-cutouts/inventory.json'))
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=Path('output/collection-cutouts'))
    parser.add_argument('--limit', type=int)
    parser.add_argument('--threads', type=int, default=4)
    parser.add_argument('--provider', default='CPUExecutionProvider')
    parser.add_argument('--backend', choices=['onnx', 'mps'], default='onnx')
    parser.add_argument('--precision', choices=['float32', 'float16'], default='float32')
    parser.add_argument('--batch-size', type=int, default=1)
    parser.add_argument('--coreml-format', choices=['MLProgram', 'NeuralNetwork'], default='MLProgram')
    parser.add_argument('--size', type=int, default=1200)
    parser.add_argument('--margin', type=float, default=.10)
    parser.add_argument('--quality', type=int, default=88)
    parser.add_argument('--repairs', type=Path)
    args = parser.parse_args()
    if not .05 <= args.margin <= .25 or not 80 <= args.quality <= 100 or args.size < 600:
        parser.error('Invalid export settings')
    if not 1 <= args.batch_size <= 4 or (args.backend == 'onnx' and args.batch_size != 1): parser.error('ONNX requires batch 1; MPS supports 1..4')
    for name in ['masks', 'candidates', 'records']:
        (args.output / name).mkdir(parents=True, exist_ok=True)
    items = json.loads(args.inputs.read_text())
    if args.limit is not None: items = items[:args.limit]
    if not items: parser.error('No inputs')
    node = shutil.which('node')
    if not node: parser.error('Node is required for tea-only admission verification')
    subprocess.run([node, 'scripts/verify-teaware.mjs'], check=True)
    catalogue = {row['id']: row for row in json.loads(Path('src/data/artworks.json').read_text())}
    for item in items:
        artwork = catalogue.get(item['id'])
        if not artwork or item.get('kind') != 'object' or item['inputPath'] != 'public' + artwork['imageUrl']:
            parser.error('Only current tea-ware originals may be processed: ' + item['id'])
    repairs = json.loads(args.repairs.read_text()) if args.repairs else {}
    if args.backend == 'mps':
        model_sha = hashlib.sha256(''.join(digest(args.model / name) for name in ['model.safetensors', 'birefnet.py', 'BiRefNet_config.py', 'config.json']).encode()).hexdigest()
    else:
        model_sha = digest(args.model)
    execution = f'PyTorchMPS:{args.precision}' if args.backend == 'mps' else args.provider + (':' + args.coreml_format if args.provider == 'CoreMLExecutionProvider' else '')
    if args.batch_size > 1: execution += f':batch{args.batch_size}'
    settings = {'maskVersion': MASK_VERSION, 'exportVersion': EXPORT_VERSION, 'modelSha256': model_sha, 'execution': execution, 'size': args.size, 'margin': args.margin, 'quality': args.quality}
    db = sqlite3.connect(args.output / 'state.sqlite')
    db.execute('CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, cache_key TEXT, state TEXT, record TEXT)')
    options = ort.SessionOptions()
    options.intra_op_num_threads = args.threads
    options.inter_op_num_threads = 1
    options.log_severity_level = 3
    if args.backend == 'onnx' and args.provider not in ort.get_available_providers(): raise ValueError('Provider not available')
    providers = [('CoreMLExecutionProvider', {'ModelFormat': args.coreml_format, 'MLComputeUnits': 'ALL',
                  'RequireStaticInputShapes': '0', 'EnableOnSubgraphs': '0'}) , 'CPUExecutionProvider'] if args.provider == 'CoreMLExecutionProvider' else [args.provider]
    tick = time.perf_counter()
    session = MpsSession(args.model, args.threads, args.precision) if args.backend == 'mps' else ort.InferenceSession(str(args.model), sess_options=options, providers=providers)
    print(json.dumps({'event': 'ready', 'providers': session.get_providers(), 'modelLoadSeconds': round(time.perf_counter() - tick, 2), **settings}), flush=True)
    started = time.perf_counter()
    counts = {'candidate': 0, 'needs-review': 0, 'error': 0, 'cached': 0}
    for index, item in enumerate(items):
        tick = time.perf_counter()
        key = None
        try:
            source = Path(item['inputPath'])
            source_sha = digest(source)
            if item.get('sourceSha256') and item['sourceSha256'] != source_sha: raise ValueError('Source changed since inventory')
            repair = repairs.get(item['id'], {})
            if repair and repair.get('sourceSha256') != source_sha: raise ValueError('Repair belongs to a different original')
            if repair.get('maskPath'):
                if digest(Path(repair['maskPath'])) != repair.get('maskSha256'): raise ValueError('Repair mask changed')
            kind = repair.get('kind', item.get('kind', 'object'))
            if kind != 'object': raise ValueError('Non-tea image kinds are excluded')
            key = hashlib.sha256((source_sha + kind + json.dumps(settings, sort_keys=True) + json.dumps(repair, sort_keys=True)).encode()).hexdigest()
            path = args.output / 'candidates' / f'{key}.webp'
            record_path = args.output / 'records' / f'{key}.json'
            if record_path.exists() and path.exists():
                record = json.loads(record_path.read_text())
                counts['cached'] += 1
            else:
                image = ImageOps.exif_transpose(Image.open(source)).convert('RGB')
                mask_key = hashlib.sha256((source_sha + kind + model_sha + MASK_VERSION + execution).encode()).hexdigest()
                mask_path = args.output / 'masks' / f'{mask_key}.png'
                if mask_path.exists():
                    alpha = np.asarray(Image.open(mask_path).convert('L')).copy()
                    if alpha.shape != (image.height, image.width): raise ValueError('Mask cache dimensions mismatch')
                else:
                    pending = [(image, mask_path)]
                    seen = {source_sha}
                    for future in items[index + 1:index + args.batch_size]:
                        try:
                            future_source = Path(future['inputPath'])
                            future_kind = future.get('kind', 'object')
                            if future_kind != 'object': continue
                            future_sha = digest(future_source)
                            if future.get('sourceSha256') and future['sourceSha256'] != future_sha: continue
                            if future_sha in seen: continue
                            seen.add(future_sha)
                            future_key = hashlib.sha256((future_sha + future_kind + model_sha + MASK_VERSION + execution).encode()).hexdigest()
                            future_path = args.output / 'masks' / f'{future_key}.png'
                            if not future_path.exists():
                                pending.append((ImageOps.exif_transpose(Image.open(future_source)).convert('RGB'), future_path))
                        except Exception:
                            # The main loop records and reports this item's failure.
                            continue
                    masks = infer_many(session, [pair[0] for pair in pending])
                    for inferred, (_, destination) in zip(masks, pending): Image.fromarray(inferred).save(destination)
                    alpha = masks[0]
                if repair.get('maskPath'):
                    alpha = np.asarray(Image.open(repair['maskPath']).convert('L')).copy()
                    if alpha.shape != (image.height, image.width): raise ValueError('Repair mask must match original dimensions')
                if repair.get('keepBox'):
                    x0, y0, x1, y1 = repair['keepBox']
                    if not (0 <= x0 < x1 <= image.width and 0 <= y0 < y1 <= image.height): raise ValueError('Invalid repair crop')
                    alpha[:y0] = 0; alpha[y1:] = 0; alpha[:, :x0] = 0; alpha[:, x1:] = 0
                bounds, qa = inspect(alpha, image)
                measurements = export(image, alpha, bounds, path, args.size, args.margin, args.quality)
                encoding_quality = args.quality
                for higher_quality in [92, 96, 100]:
                    if measurements['rgbEncodingRMSE'] <= 5: break
                    if higher_quality > encoding_quality:
                        measurements = export(image, alpha, bounds, path, args.size, args.margin, higher_quality)
                        encoding_quality = higher_quality
                if measurements['rgbEncodingRMSE'] > 5: qa['flags'].append('encoding-error')
                state = 'needs-review' if qa['flags'] else 'candidate'
                record = {'cacheKey': key, 'sourceSha256': source_sha, 'state': state, 'settings': settings, 'kind': kind,
                          'maskPath': str(mask_path), 'candidatePath': str(path), 'qa': qa, 'repair': repair, 'encodingQuality': encoding_quality, **measurements,
                          'seconds': round(time.perf_counter() - tick, 3)}
                atomic_json(record_path, record)
                counts[state] += 1
            record = {**record, 'id': item['id'], 'inputPath': str(source)}
        except Exception as error:
            counts['error'] += 1
            record = {'id': item['id'], 'state': 'error', 'error': str(error), 'seconds': round(time.perf_counter() - tick, 3)}
        db.execute('INSERT OR REPLACE INTO items VALUES (?,?,?,?)', (item['id'], key, record['state'], json.dumps(record)))
        db.commit()
        with (args.output / 'events.jsonl').open('a') as log:
            log.write(json.dumps({'index': index + 1, **record}) + '\n')
        status = {'processed': index + 1, 'total': len(items), 'counts': counts,
                  'elapsedSeconds': round(time.perf_counter() - started, 2), 'lastId': item['id'],
                  'lastState': record['state'], 'pid': os.getpid()}
        atomic_json(args.output / 'progress.json', status)
        if (index + 1) % 50 == 0:
            atomic_json(args.output / 'results.json', [json.loads(row[0]) for row in db.execute('SELECT record FROM items ORDER BY id')])
        if index < 20 or (index + 1) % 50 == 0: print(json.dumps(status), flush=True)
    records = [json.loads(row[0]) for row in db.execute('SELECT record FROM items ORDER BY id')]
    atomic_json(args.output / 'results.json', records)
    print(json.dumps({'event': 'finished', **status}), flush=True)


if __name__ == '__main__':
    main()
