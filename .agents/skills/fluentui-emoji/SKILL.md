---
name: fluentui-emoji
description: Use Microsoft Fluent UI Emoji assets as expressive visual elements in this workspace. Keeps functional action icons in Lucide and reserves emoji illustrations for empty states, stage identity, and subject-matter moments.
license: MIT
---

# Fluent UI Emoji

Use this skill when an interface needs a friendly, recognizable visual asset from Microsoft Fluent Emoji.

## Placement

- Use assets for card identity, empty states, illustrations, banners, onboarding, and stage identity.
- Do not use emoji glyphs or emoji images as generic controls, action icons, status primitives, or navigation icons.
- Keep Lucide for save, reset, delete, edit, add, navigation, and other interface actions.
- Keep one icon family for one control; never mix Fluent Emoji with Lucide inside the same button.

## Asset Style

| Style | Use |
| --- | --- |
| Flat | Preferred for compact web UI, card headers, and list identity |
| Color | Use for larger expressive moments that need stronger visual weight |
| 3D | Use only in selected empty states or major brand moments |
| High Contrast | Use for compact monochrome UI or accessibility-focused contexts |

## Sizing

- Inline identity: 20–24px.
- Card header or status: 32–48px.
- Empty state: 96–160px.
- Reserve intrinsic aspect ratio and do not stretch assets.
- Add `alt=""` for decorative assets. Add concise alt text when the asset communicates meaning.

## Project Vocabulary

Included assets:

- `assets/Fire/fire_flat.svg` — Sấy Sinh, drying/fire process.
- `assets/Broom/broom_flat.svg` — cleaning/reset-oriented expressive moments only.
- `assets/Factory/factory_flat.svg` — Xưởng/SX identity.
- `assets/Package/package_flat.svg` — stock/package/delivery identity.
- `assets/Check-mark-button/check_mark_button_flat.svg` — illustrative success moments; use Lucide check for save buttons.
- `assets/Right-arrow/right_arrow_flat.svg` — expressive directional moments; use Lucide arrow-right for navigation controls.

The selected assets are copied from the MIT-licensed Microsoft Fluent Emoji repository:
`https://github.com/microsoft/fluentui-emoji`

Full license: `LICENSE`.

## Implementation Rules

- Prefer inline SVG or a local asset file; do not hotlink asset CDNs.
- Do not recolor emoji assets with CSS unless the asset is a neutral monochrome/High Contrast variant.
- Do not add emoji text fallbacks for SVG assets.
- Validate contrast against the surrounding surface. Asset decoration must not be the sole status indicator.
- Keep motion restrained: only meaningful entrance or state transition, never repetitive bouncing or pulsing.
