"""Blender Python: sample animation data from a DAE file and emit one JSON line.

Invoked as:
    blender --background --factory-startup --python scripts/blender/sample-animations.py -- <input.dae>

Output: a single line on stdout starting with '__SAMPLE__ ' followed by JSON.
The wrapping mjs script extracts that line.
"""

from __future__ import annotations

import json
import os
import sys

import bpy


def _argv_after_double_dash() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def main() -> int:
    args = _argv_after_double_dash()
    if not args:
        sys.stderr.write("[sample] usage: -- <input.dae>\n")
        return 2

    in_path = os.path.abspath(args[0])
    if not os.path.exists(in_path):
        sys.stderr.write(f"[sample] not found: {in_path}\n")
        return 2

    bpy.ops.wm.read_factory_settings(use_empty=True)

    try:
        bpy.ops.wm.collada_import(filepath=in_path)
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"[sample] collada import failed: {exc}\n")
        return 3

    actions = []
    for a in bpy.data.actions:
        actions.append(
            {
                "name": a.name,
                "frame_start": int(a.frame_range[0]),
                "frame_end": int(a.frame_range[1]),
                "fcurves": len(a.fcurves),
            }
        )

    strips = 0
    armatures = 0
    skinned_meshes = 0
    for obj in bpy.data.objects:
        if obj.type == "ARMATURE":
            armatures += 1
        if obj.type == "MESH":
            for mod in obj.modifiers:
                if mod.type == "ARMATURE":
                    skinned_meshes += 1
                    break
        ad = obj.animation_data
        if ad is None:
            continue
        for trk in ad.nla_tracks:
            strips += len(trk.strips)

    payload = {
        "file": in_path,
        "actionCount": len(actions),
        "actions": actions,
        "strips": strips,
        "armatures": armatures,
        "skinnedMeshes": skinned_meshes,
    }
    sys.stdout.write("__SAMPLE__ " + json.dumps(payload) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
