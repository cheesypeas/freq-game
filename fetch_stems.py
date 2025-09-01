#!/usr/bin/env python3
"""
Fetch N stems from MUSDB18 (compressed stems) and MedleyDB via Zenodo.

Features
- MUSDB18 (record 1117372): per-track STEMS .mp4 files. Optional extraction to WAV stems via stempeg.
- MedleyDB v2 (record 3677432 by default): downloads first N files matching likely stem archives.

Notes
- Some Zenodo records may change; you can override record IDs via CLI.
- Respect dataset licenses; many are non-commercial/research.

Example
  python fetch_stems.py --source musdb --num 5 --output ./data --extract
  python fetch_stems.py --source medleydb --num 5 --output ./data
  python fetch_stems.py --source both --num 3 --output ./data --extract
"""

import argparse
import os
import sys
import re
import json
from typing import Iterable, List, Optional, Tuple

try:
    import requests
except Exception as exc:  # pragma: no cover
    print("ERROR: requests is required. Install with: pip install requests", file=sys.stderr)
    raise


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def zenodo_list_files(record_id: str, access_token: Optional[str] = None) -> List[dict]:
    url = f"https://zenodo.org/api/records/{record_id}"
    headers = {"Accept": "application/json"}
    params = {}
    if access_token:
        params["access_token"] = access_token
    resp = requests.get(url, headers=headers, params=params, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    files = data.get("files") or data.get("hits", {}).get("hits", [])
    if isinstance(files, list):
        return files
    # Some legacy payloads nest under data['files'] as dict-like
    return list(files or [])


def select_files(files: List[dict], patterns: Iterable[str], limit: int) -> List[dict]:
    compiled = [re.compile(p, re.IGNORECASE) for p in patterns]
    selected: List[dict] = []
    for f in files:
        name = f.get("key") or f.get("filename") or f.get("name") or ""
        for c in compiled:
            if c.search(name):
                selected.append(f)
                break
        if len(selected) >= limit:
            break
    return selected


def file_download_url(file_entry: dict) -> Optional[str]:
    links = file_entry.get("links") or {}
    # Prefer direct download link if present
    for k in ("download", "self", "file"):
        if links.get(k):
            return links[k]
    # Fallback compose from bucket/key
    bucket = file_entry.get("bucket")
    key = file_entry.get("key") or file_entry.get("filename") or file_entry.get("name")
    if bucket and key:
        return f"{bucket}/{key}"
    return None


def stream_download(url: str, dest_path: str, access_token: Optional[str] = None) -> None:
    ensure_dir(os.path.dirname(dest_path))
    params = {"access_token": access_token} if access_token else None
    with requests.get(url, stream=True, timeout=180, params=params) as r:
        r.raise_for_status()
        total = int(r.headers.get("Content-Length", 0))
        chunk = 1024 * 1024
        downloaded = 0
        with open(dest_path, "wb") as f:
            for part in r.iter_content(chunk_size=chunk):
                if not part:
                    continue
                f.write(part)
                downloaded += len(part)
                if total:
                    pct = 100.0 * downloaded / total
                    sys.stdout.write(f"\rDownloading {os.path.basename(dest_path)}: {pct:5.1f}%")
                    sys.stdout.flush()
        if total:
            sys.stdout.write("\n")


def musdb_fetch(
    num: int,
    out_dir: str,
    record_id: str = "1117372",
    access_token: Optional[str] = None,
    extract: bool = False,
) -> List[str]:
    """
    Fetch N MUSDB18 compressed STEMS files (.mp4) from Zenodo and optionally extract WAV stems.
    Default record_id corresponds to MUSDB18 (compressed STEMS), not HQ WAV.
    Returns list of downloaded file paths.
    """
    print(f"Listing MUSDB18 files from Zenodo record {record_id}...")
    files = zenodo_list_files(record_id, access_token=access_token)
    if not files:
        raise RuntimeError("No files found in MUSDB18 record.")

    # Typical names include e.g., 'A Classic Education - NightOwl STEMS.mp4'
    patterns = [r"\.mp4$", r"stems?\.mp4$"]
    selected = select_files(files, patterns, num)
    if not selected:
        # Print first few file names for debugging
        example_names = [
            (f.get("key") or f.get("filename") or f.get("name") or "?") for f in files[:10]
        ]
        raise RuntimeError(
            "Could not identify per-track mp4 STEMS in MUSDB18 record. Sample names: "
            + ", ".join(example_names)
        )

    dest_paths: List[str] = []
    target_dir = os.path.join(out_dir, "musdb18")
    ensure_dir(target_dir)

    for entry in selected:
        name = entry.get("key") or entry.get("filename") or entry.get("name") or "musdb_track.mp4"
        url = file_download_url(entry)
        if not url:
            print(f"Skipping {name}: no download URL found")
            continue
        dest = os.path.join(target_dir, name)
        print(f"Fetching MUSDB18: {name}")
        stream_download(url, dest, access_token=access_token)
        dest_paths.append(dest)

        if extract:
            try:
                extract_stems_from_mp4(dest, os.path.splitext(dest)[0])
            except Exception as exc:  # pragma: no cover
                print(f"WARN: extraction failed for {name}: {exc}")

    return dest_paths


def extract_stems_from_mp4(mp4_path: str, out_base: str) -> None:
    """
    Extract WAV stems from a STEMS .mp4 using stempeg + soundfile.
    Output files named out_base_<stem_index>.wav and a JSON mapping if available.
    """
    try:
        import stempeg  # type: ignore
        import soundfile as sf  # type: ignore
    except Exception as exc:
        raise RuntimeError(
            "stempeg and soundfile are required for --extract. Install with: pip install stempeg soundfile"
        ) from exc

    print(f"Extracting stems from {os.path.basename(mp4_path)}...")
    stems, rate = stempeg.read_stems(mp4_path)
    # stems shape: (num_stems, num_samples, channels)
    mapping = {}
    for idx, audio in enumerate(stems):
        wav_path = f"{out_base}_stem{idx+1}.wav"
        sf.write(wav_path, audio, rate)
        mapping[str(idx + 1)] = os.path.basename(wav_path)

    # Save simple mapping JSON
    with open(f"{out_base}_stems.json", "w", encoding="utf-8") as f:
        json.dump({"stems": mapping, "source": os.path.basename(mp4_path)}, f, indent=2)


def medleydb_fetch(
    num: int,
    out_dir: str,
    record_id: str = "3677432",
    access_token: Optional[str] = None,
) -> List[str]:
    """
    Fetch N MedleyDB v2 multitrack files from Zenodo record.
    Attempts to select likely stem-containing archives (.zip/.wav) using name heuristics.
    Returns list of downloaded file paths.
    """
    print(f"Listing MedleyDB files from Zenodo record {record_id}...")
    files = zenodo_list_files(record_id, access_token=access_token)
    if not files:
        raise RuntimeError("No files found in MedleyDB record.")

    # Heuristic patterns for multitrack/stems archives
    patterns = [
        r"multitrack.*\.zip$",
        r"stems?.*\.zip$",
        r"\.wav$",
        r"\.flac$",
    ]
    selected = select_files(files, patterns, num)
    if not selected:
        example_names = [
            (f.get("key") or f.get("filename") or f.get("name") or "?") for f in files[:10]
        ]
        raise RuntimeError(
            "Could not identify stem-like files in MedleyDB record. Sample names: "
            + ", ".join(example_names)
        )

    dest_paths: List[str] = []
    target_dir = os.path.join(out_dir, "medleydb")
    ensure_dir(target_dir)

    for entry in selected:
        name = entry.get("key") or entry.get("filename") or entry.get("name") or "medleydb_item"
        url = file_download_url(entry)
        if not url:
            print(f"Skipping {name}: no download URL found")
            continue
        dest = os.path.join(target_dir, name)
        print(f"Fetching MedleyDB: {name}")
        stream_download(url, dest, access_token=access_token)
        dest_paths.append(dest)

    return dest_paths


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch N stems from MUSDB18 and MedleyDB via Zenodo")
    parser.add_argument("--source", choices=["musdb", "medleydb", "both"], default="both", help="Source dataset(s)")
    parser.add_argument("--num", type=int, required=True, help="Number of items (tracks/files) to fetch per source")
    parser.add_argument("--output", type=str, default="./downloads", help="Output directory")
    parser.add_argument("--zenodo-token", type=str, default=None, help="Zenodo access token if required")
    parser.add_argument("--musdb-record-id", type=str, default="1117372", help="Zenodo record id for MUSDB18 (compressed)")
    parser.add_argument("--medleydb-record-id", type=str, default="3677432", help="Zenodo record id for MedleyDB v2")
    parser.add_argument("--extract", action="store_true", help="Extract WAV stems from MUSDB .mp4 using stempeg")
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    ensure_dir(args.output)

    fetched: List[Tuple[str, str]] = []
    if args.source in ("musdb", "both"):
        paths = musdb_fetch(
            num=args.num,
            out_dir=args.output,
            record_id=args.musdb_record_id,
            access_token=args.zenodo_token,
            extract=args.extract,
        )
        fetched.extend([("musdb", p) for p in paths])

    if args.source in ("medleydb", "both"):
        paths = medleydb_fetch(
            num=args.num,
            out_dir=args.output,
            record_id=args.medleydb_record_id,
            access_token=args.zenodo_token,
        )
        fetched.extend([("medleydb", p) for p in paths])

    print("\nDone. Fetched:")
    for src, path in fetched:
        print(f"  [{src}] {path}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

