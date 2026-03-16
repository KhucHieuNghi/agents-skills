# Flow Chart Example

## Troubleshooting Process
A simple decision tree for troubleshooting.

```eraser
// Global Styles
direction down
shape oval

// Nodes
Start [icon: play]
IsPluggedIn? [shape: diamond]
TurnOn [shape: rectangle]
PlugIn [shape: rectangle]
End [icon: stop]

// Connections
Start > IsPluggedIn?
IsPluggedIn? > TurnOn: Yes
IsPluggedIn? > PlugIn: No
PlugIn > TurnOn
TurnOn > End
```
