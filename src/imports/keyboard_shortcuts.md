# FlytBase Sentinel — Keyboard Shortcuts Reference

> Designed for trained operators. Touch-primary interface; keyboard is supplemental for desktop monitoring stations.

## Global Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus forward through all interactive elements |
| `Shift + Tab` | Move focus backward |
| `Escape` | Deselect current entity (zone / drone / team) |
| `F` | Toggle fleet panel (expand / collapse Drone Fleet) |
| `L` | Toggle activity log (expand / collapse Activity Log) |

## Map Interaction

| Key | Action |
|-----|--------|
| `M` | Switch to Map view |
| `G` | Switch to Drone Grid view (Contain/Rescue only) |
| `↑ ↓ ← →` | Pan the map when map area is focused |

## Action Bar

| Key | Action |
|-----|--------|
| `1` – `9` | Quick-focus action button by position (1 = leftmost visible) |
| `Enter` | Confirm a focused action button |
| `Space` | Same as Enter |
| `Enter` (hold 2s) | Authorize Containment (hold-to-confirm action only) |
| `Space` (hold 2s) | Same as Enter hold |

## Scene-Specific

### Scan / Baseline
| Key | Action |
|-----|--------|
| *(No active operator actions needed)* | AI is monitoring autonomously |

### Alert Command
| Key | Action |
|-----|--------|
| `D` | Dismiss alert interrupt |
| `S` | Dispatch Scout drone |

### Verify
| Key | Action |
|-----|--------|
| `M` | Monitor only (do not escalate) |
| `C` | Confirm incident (escalate to contain) |

### Contain
| Key | Action |
|-----|--------|
| `A` | Authorize containment (triggers hold-to-confirm countdown) |

### Rescue
| Key | Action |
|-----|--------|
| `E` | Emergency evacuate toggle |
| `R` | Activate automatic route |
| `X` | Acknowledge signal exception |

## Review Dock (Prototype Only)

| Key | Action |
|-----|--------|
| `P` | Toggle Review Dock open / closed |

---

*Note: All `focus-visible` ring styles are in `src/styles/keyboard.css`. Touch targets meet minimum 44×44px requirement.*
