# Device frames

Apple product bezels used for 2D device frames. The PNGs are **not committed**:
Apple licenses them for creating marketing materials, not for redistribution.
The app works without them; frames are simply unavailable.

To set up, download the bezels from
https://developer.apple.com/design/resources/#product-bezels, open the disk
images, and copy the PNGs here using this layout:

| Folder | Source (Apple download) | Files |
|--------|-------------------------|-------|
| `iphone-18-pro/` | `Bezel-iPhone-18.dmg`, iPhone 18 Pro | `black`, `burgundy`, `glacier`, `silver` |
| `ipad-pro-13/` | `Bezel-iPad-Pro-(M5).dmg`, iPad Pro (M5) 13" | `silver`, `space-black` |

Name each file `<color>-<portrait|landscape>.png`, lowercase with dashes,
e.g. `iPhone 18 Pro - Black - Portrait.png` becomes `iphone-18-pro/black-portrait.png`.
