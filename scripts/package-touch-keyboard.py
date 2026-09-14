"""Package an arduino-cli build and refresh the browser uploader's integrity data."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--build-dir", type=Path, required=True)
parser.add_argument("--boot-app", type=Path, required=True)
parser.add_argument("--version", required=True)
args = parser.parse_args()
sketch = ROOT / "firmware/SolForge_Touch_Keyboard"
destination = ROOT / "assets/firmware/grand-koleos-touch-keyboard"
artifacts = [
    (args.build_dir / "SolForge_Touch_Keyboard.ino.bootloader.bin", "bootloader.bin", 0, 0x8000),
    (args.build_dir / "SolForge_Touch_Keyboard.ino.partitions.bin", "partitions.bin", 0x8000, 0x1000),
    (args.boot_app, "boot_app0.bin", 0xE000, 0x2000),
    (args.build_dir / "SolForge_Touch_Keyboard.ino.bin", "grand-koleos-macro.bin", 0x10000, 0x300000),
]
for source, _, _, limit in artifacts:
    if not source.is_file() or not 0 < source.stat().st_size <= limit:
        raise ValueError(f"Missing or oversized build artifact: {source}")

# Stable source fingerprint, including vendored display and touch drivers.
digest = hashlib.sha256()
for source in sorted(sketch.rglob("*")):
    if source.suffix in {".ino", ".cpp", ".h"}:
        digest.update(source.relative_to(sketch).as_posix().encode() + b"\0")
        digest.update(source.read_bytes())
manifest = {
    "name": "SolForge Touch Keyboard", "version": args.version,
    "chip": "ESP32-S3", "board": "ESP32-4827S043C", "display": "JC4827W543C",
    "flashMode": "dio", "flashFreq": "80m", "flashSize": "4MB",
    "configAddress": 0x310000, "configSize": 45056, "interactionVersion": 1,
    "sourceSha256": hashlib.sha256((sketch / "SolForge_Touch_Keyboard.ino").read_bytes()).hexdigest(),
    "sourceTreeSha256": digest.hexdigest(), "files": [],
}
for source, name, address, _ in artifacts:
    data = source.read_bytes()
    shutil.copyfile(source, destination / name)
    manifest["files"].append({"path": name, "address": address, "size": len(data), "sha256": hashlib.sha256(data).hexdigest()})
(destination / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"Packaged {args.version}: {len(artifacts)} verified artifacts, 44 KiB settings image")
