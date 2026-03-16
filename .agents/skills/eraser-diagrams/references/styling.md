# Eraser Styling Guide

## Global Attributes
These attributes transform the look and feel of the entire diagram. Place them at the top of your code.

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `colorMode` | `pastel` (default), `bold`, `outline` | `pastel` | Controls fill color lightness. |
| `styleMode` | `shadow` (default), `plain`, `watercolor` | `shadow` | Controls embellishments (shadows, textures). |
| `typeface` | `rough` (default), `clean`, `mono` | `rough` | Sets the font style. |

**Example**:
```eraser
colorMode bold
styleMode plain
typeface mono
```

## Node & Connection Attributes
Attributes applied to specific elements.

| Attribute | Description | Example |
|-----------|-------------|---------|
| `color`   | Sets stroke or fill color. Accepts names or hex codes. | `[color: blue]`, `[color: "#ff0000"]` |
| `icon`    | Sets the icon for a node. | `[icon: aws-ec2]` |
| `label`   | Overrides the display text. | `[label: "My Server"]` |