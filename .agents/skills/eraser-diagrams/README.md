# Eraser Diagrams Agent Skill

This agent skill enables Claude to generate professional architecture diagrams using the Eraser API.

## Quick Start

This skill is automatically available to agents when placed in `.agents/skills/eraser-diagrams/`.

**Trigger phrases:**
- "Create a diagram of..."
- "Visualize this architecture..."
- "Draw a flowchart for..."
- "Generate an ERD for..."

## File Structure

```
.agents/skills/eraser-diagrams/
├── SKILL.md                              # Main skill documentation
├── README.md                             # This file
└── references/
    ├── syntax/                           # Syntax documentation
    │   ├── architecture-syntax.md        # Cloud architecture DSL
    │   ├── bpmn-syntax.md                # BPMN/swimlane DSL
    │   ├── erd-syntax.md                 # Entity-relationship DSL
    │   ├── flowchart-syntax.md           # Flow chart DSL
    │   └── sequence-syntax.md            # Sequence diagram DSL
    ├── examples/                         # Working examples
    │   ├── examples-architecture.md      # Architecture examples
    │   ├── examples-bpmn.md              # BPMN examples
    │   ├── examples-erd.md               # ERD examples
    │   ├── examples-flowchart.md         # Flow chart examples
    │   ├── examples-sequence.md          # Sequence examples
    │   └── examples-iac-aws-guide.md     # IaC to diagram guide
    ├── icons-quick-reference.md          # Common icons (curated)
    ├── eraser-standard-icons.csv         # Complete icon list (1000+)
    └── styling.md                        # Visual styling guide
```

## Capabilities

### Supported Diagram Types

1. **Cloud Architecture** - AWS, Azure, GCP infrastructure
2. **Flow Charts** - Process flows, decision trees
3. **Sequence Diagrams** - API flows, system interactions
4. **ERD** - Database schemas, data models
5. **BPMN** - Business processes, swimlanes

### Key Features

- **Infrastructure as Code** - Parse Terraform, CloudFormation, etc.
- **Natural Language** - Generate from text descriptions
- **1000+ Icons** - AWS, Azure, GCP, K8s, and general tech icons
- **Color Coding** - Differentiate environments, security zones
- **Groups & Nesting** - Organize complex architectures
- **Editable Output** - Get links to edit in Eraser web UI

## Usage Example

**User Request:**
> "Create a diagram of a typical 3-tier web app on AWS"

**Agent Response:**
```bash
# Generate DSL
cat > diagram.eraser <<'EOF'
direction right
colorMode bold

Client [icon: user]
AWS {
  LoadBalancer [icon: aws-elastic-load-balancing]
  AppServer [icon: aws-ec2]
  Database [icon: aws-rds]
}

Client > LoadBalancer > AppServer > Database
EOF

# Call API
curl -X POST https://app.eraser.io/api/render/diagram \
  -H "Content-Type: application/json" \
  -d '{
    "text": "...",
    "diagramType": "cloud-architecture-diagram"
  }'
```

**Output:**
- Edit URL: `https://app.eraser.io/workspace/xyz123`
- Image URL: `https://app.eraser.io/api/files/abc456.png`

## Development

### Updating the Skill

When updating Eraser documentation:

1. Copy new syntax files to `references/syntax/`
2. Copy new examples to `references/examples/`
3. Update `icons-quick-reference.md` if new common icons are added
4. Update version in `SKILL.md` metadata

### Testing

Test with common scenarios:

```bash
# Test AWS architecture
"Create a diagram showing Lambda connecting to DynamoDB"

# Test flow chart
"Draw a flowchart for user login process"

# Test sequence diagram
"Show the sequence of API calls for checkout"

# Test ERD
"Create an ERD for a blog system with users, posts, and comments"

# Test BPMN
"Diagram the order fulfillment process across departments"
```

## Best Practices for Agents

### 1. Choose the Right Diagram Type

- Infrastructure/cloud → **Cloud Architecture**
- Process/workflow → **Flow Chart** or **BPMN**
- API/interactions → **Sequence Diagram**
- Database schema → **ERD**

### 2. Use Appropriate Icons

```
✅ Good: [icon: aws-lambda]
❌ Bad:  [icon: server]  (for AWS Lambda)
```

### 3. Apply Color Coding

```
✅ Environments:
   ProdDB [color: green]
   StageDB [color: yellow]
   DevDB [color: blue]

✅ Security zones:
   PublicAPI [color: orange]
   PrivateService [color: green]
```

### 4. Organize with Groups

```
✅ Nested groups for complex architectures:
Production {
  VPC {
    PublicSubnet { ... }
    PrivateSubnet { ... }
  }
}
```

### 5. Validate Before API Call

- Unique node names
- Quoted labels with spaces
- Valid icons (check references)
- Matching braces

## API Reference

### Endpoint
```
POST https://app.eraser.io/api/render/diagram
```

### Parameters
| Parameter | Required | Values |
|-----------|----------|--------|
| text | Yes | DSL code string |
| diagramType | Yes | `cloud-architecture-diagram`, `flowchart-diagram`, `sequence-diagram`, `entity-relationship-diagram`, `bpmn-diagram` |
| background | No | `true` (default), `false` |
| theme | No | `light` (default), `dark` |
| scale | No | `1`, `2`, `3` (default) |
| returnFile | No | `png` (default), `svg` |

### Response
```json
{
  "editUrl": "https://app.eraser.io/workspace/...",
  "fileUrl": "https://app.eraser.io/api/files/....png"
}
```

## Troubleshooting

### Common Issues

**"Invalid DSL syntax"**
- Check syntax references for proper format
- Ensure labels with spaces are quoted
- Verify all braces are matched

**"Icon not found"**
- Check `icons-quick-reference.md`
- Use generic icons: `server`, `database`, `user`
- Verify icon name spelling

**"API connection failed"**
- Check network connectivity
- Verify endpoint URL
- Check for rate limiting

## Resources

- **Eraser Documentation**: https://docs.eraser.io
- **Icon Gallery**: https://docs.eraser.io/docs/icons
- **Syntax Reference**: See `references/syntax/` folder

## Version History

### v2.0.0 (Current)
- Reorganized references into syntax/ and examples/
- Added comprehensive API integration guide
- Added agent workflow documentation
- Added error handling section
- Created icons quick reference
- Streamlined SKILL.md for better readability

### v1.0.0
- Initial release
- Basic syntax documentation
- Example diagrams

## License

MIT License - See LICENSE file for details

## Credits

- **Eraser Labs** - Diagram generation API
- **Documentation** - Adapted from official Eraser docs
