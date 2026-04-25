"""Blender Python: convert one DAE file to GLB with animation tracks preserved.

Invoked by ../convert-dae-to-glb.mjs as:
    blender --background --factory-startup --python scripts/blender/dae-to-glb.py -- <input.dae> <output.glb>

Behavior:
- Wipes the default Blender scene (factory-startup also helps).
- Imports the DAE.
- Pushes any active Action onto an NLA strip so the gltf exporter sees it.
- Exports GLB with animations baked into samples (works for skeletal AND transform-only).
- DAEs with no animation export cleanly as static models — emits a warning, doesn't fail.
- DAEs with multiple actions / NLA tracks — gltf exporter handles via NLA mode.

Exit code 0 on success, non-zero on hard failure. Warnings go to stderr.
"""

from __future__ import annotations

import sys
import os

import bpy


def _argv_after_double_dash() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def _wipe_scene() -> None:
    """Remove all data from the default scene so import is clean."""
    # Select all objects across all scenes, delete.
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _ensure_actions_on_nla() -> int:
    """For every armature/object that has an active action, push it onto its NLA stack.

    glTF exporter with export_animations=True will pick up:
      - actions assigned via animation_data.action (current "active action"), and
      - NLA strips.
    Pushing actions to NLA is the safe path for DAE imports that may attach actions
    through animation_data.action only, and ensures multi-action DAEs are all kept.

    Returns the count of actions promoted.
    """
    promoted = 0
    for obj in bpy.data.objects:
        ad = obj.animation_data
        if ad is None or ad.action is None:
            continue
        action = ad.action
        # Skip if this action is already on an NLA track to avoid duplicates.
        already = False
        for trk in ad.nla_tracks:
            for strip in trk.strips:
                if strip.action == action:
                    already = True
                    break
            if already:
                break
        if already:
            continue
        track = ad.nla_tracks.new()
        track.name = f"{action.name}_track"
        track.strips.new(name=action.name, start=int(action.frame_range[0]), action=action)
        promoted += 1
    return promoted


def _count_animation_data() -> tuple[int, int]:
    """Return (action_count, total_nla_strip_count)."""
    actions = len(bpy.data.actions)
    strips = 0
    for obj in bpy.data.objects:
        ad = obj.animation_data
        if ad is None:
            continue
        for trk in ad.nla_tracks:
            strips += len(trk.strips)
    return actions, strips


def main() -> int:
    args = _argv_after_double_dash()
    if len(args) < 2:
        sys.stderr.write("[dae-to-glb] usage: -- <input.dae> <output.glb>\n")
        return 2

    in_path = os.path.abspath(args[0])
    out_path = os.path.abspath(args[1])

    if not os.path.exists(in_path):
        sys.stderr.write(f"[dae-to-glb] input not found: {in_path}\n")
        return 2

    out_dir = os.path.dirname(out_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    _wipe_scene()

    try:
        bpy.ops.wm.collada_import(filepath=in_path)
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"[dae-to-glb] collada import failed for {in_path}: {exc}\n")
        return 3

    promoted = _ensure_actions_on_nla()
    actions, strips = _count_animation_data()

    if actions == 0 and strips == 0:
        sys.stderr.write(
            f"[dae-to-glb] WARNING: no animation tracks found in {in_path} "
            f"(static mesh / T-pose). Will export as static GLB.\n"
        )

    try:
        # export_apply=False -> preserve modifier stack rather than baking.
        # export_force_sampling=True -> sample every frame, robust for DAE source.
        # export_animations=True -> include all NLA strips + active actions.
        # export_yup=True -> standard glTF Y-up convention.
        # export_format='GLB' -> single-file binary output.
        bpy.ops.export_scene.gltf(
            filepath=out_path,
            export_format="GLB",
            export_animations=True,
            export_force_sampling=True,
            export_yup=True,
            export_apply=False,
            export_skins=True,
            export_morph=True,
            export_lights=False,
            export_cameras=False,
        )
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"[dae-to-glb] gltf export failed for {out_path}: {exc}\n")
        return 4

    sys.stderr.write(
        f"[dae-to-glb] OK {os.path.basename(in_path)} -> "
        f"{os.path.basename(out_path)} (actions={actions} strips={strips} promoted={promoted})\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
