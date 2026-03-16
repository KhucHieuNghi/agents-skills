---
name: eraser-diagrams
description: 'Generates professional architecture diagrams from code, infrastructure, or descriptions using Eraser API. Supports cloud architecture, flowcharts, ERDs, sequence diagrams, and BPMN.'
license: MIT
compatibility: Requires network access to call Eraser API
allowed-tools: Read Write Bash(curl:*)
metadata:
  version: "2.0.0"
  author: Eraser Labs
  tags: diagram, architecture, infrastructure, visualization, terraform, aws, azure, cloud, flowchart, sequence, erd, bpmn
---

# Eraser Diagram Generator

Generates professional architecture diagrams directly from code, infrastructure files, or natural language descriptions using the Eraser API.

## When to Use This Skill

Activate this skill when the user:

- Asks to **create, generate, or visualize a diagram**
- Wants to **document architecture** from code or infrastructure files
- Has **Terraform, AWS, Azure, or other infrastructure** files to visualize
- Describes a system or process and wants it **visualized**
- Mentions keywords: "diagram", "architecture", "visualize", "draw", "flow", "process"

## Supported Diagram Types

Eraser supports five types of diagrams:

| Diagram Type | Use Case | diagramType Parameter |
|--------------|----------|----------------------|
| **Cloud Architecture** | AWS/Azure/GCP infrastructure, system architecture, microservices | `cloud-architecture-diagram` |
| **Flow Charts** | Process flows, user journeys, decision trees, business logic | `flowchart-diagram` |
| **Sequence Diagrams** | API flows, request/response patterns, system interactions | `sequence-diagram` |
| **ERD (Entity Relationship)** | Database schemas, data models, table relationships | `entity-relationship-diagram` |
| **BPMN (Swimlane)** | Business processes, cross-functional workflows, roles/responsibilities | `bpmn-diagram` |

### Quick Syntax Reference

**Cloud Architecture:**
```
Server [icon: aws-ec2, color: blue]
Database [icon: aws-rds, color: green]

VPC {
  Server
  Database
}

Server > Database: Query [color: green]
```

**Flow Chart:**
```
Start [shape: oval] > Process [shape: rectangle] > Decision [shape: diamond]
Decision > End: Yes [color: green]
Decision > Start: No [color: red]
```

**Sequence Diagram:**
```
User > API: Request
activate API
API > DB: Query
DB > API: Results
API > User: Response
deactivate API
```

**ERD:**
```
Users {
  id uuid pk
  email string
}

Orders {
  id uuid pk
  user_id uuid fk
}

Users.id < Orders.user_id
```

**BPMN:**
```
CustomerService {
  ReceiveOrder [type: event]
  ValidateOrder [type: activity]
  Approved? [type: gateway]
}

ReceiveOrder > ValidateOrder > Approved?
```

For detailed syntax, see:
- [Cloud Architecture Syntax](./references/syntax/architecture-syntax.md)
- [Flow Chart Syntax](./references/syntax/flowchart-syntax.md)
- [Sequence Diagram Syntax](./references/syntax/sequence-syntax.md)
- [ERD Syntax](./references/syntax/erd-syntax.md)
- [BPMN Syntax](./references/syntax/bpmn-syntax.md)

## Agent Workflow

Follow these steps when generating diagrams:

### 1. Understand the Request

- **Identify diagram type** needed based on user's request
- **Extract key components** from the description or files
- **Read infrastructure files** if provided (Terraform, CloudFormation, etc.)

Example:
```bash
# Read infrastructure file
cat terraform/main.tf
# or use the Read tool
```

### 2. Generate DSL Code

- Use appropriate **syntax** from reference documentation
- Add **icons** to represent technologies (see [Icons Quick Reference](./references/icons-quick-reference.md))
- Use **colors** to differentiate environments, status, or data flows
- Organize with **groups** for complex architectures
- Add **labels** to connections to show data flow

**Best Practices:**
- ✅ Match icons to actual technologies (`aws-lambda` not just `server`)
- ✅ Use colors consistently (green=prod, yellow=staging, blue=dev)
- ✅ Group related components (VPC, regions, environments)
- ✅ Label connections with meaningful descriptions
- ✅ Use global directives for styling (`colorMode bold`, `styleMode plain`)

**Common Patterns:**

*Multi-tier architecture:*
```
direction right
colorMode bold

Client [icon: user]
AWS {
  LB [icon: aws-elastic-load-balancing]
  App [icon: aws-ec2]
  DB [icon: aws-rds]
}

Client > LB > App > DB
```

*Microservices with messaging:*
```
direction right
UserService [icon: aws-lambda, color: blue]
OrderService [icon: aws-lambda, color: green]
Queue [icon: aws-simple-queue-service, color: purple]

UserService > Queue > OrderService
```

### 3. Call Eraser API

Use curl to generate the diagram:

```bash
curl -X POST https://app.eraser.io/api/render/diagram \
  -H "Content-Type: application/json" \
  -d '{
    "text": "YOUR_DSL_CODE_HERE",
    "diagramType": "cloud-architecture-diagram",
    "background": true,
    "theme": "light",
    "scale": "3",
    "returnFile": "png"
  }'
```

**API Parameters:**

| Parameter | Required | Description | Values |
|-----------|----------|-------------|--------|
| `text` | ✅ Yes | The DSL code for the diagram | String |
| `diagramType` | ✅ Yes | Type of diagram | `cloud-architecture-diagram`, `flowchart-diagram`, `sequence-diagram`, `entity-relationship-diagram`, `bpmn-diagram` |
| `background` | No | Include background | `true` (default), `false` |
| `theme` | No | Color theme | `light` (default), `dark` |
| `scale` | No | Resolution scale | `1`, `2`, `3` (default) |
| `returnFile` | No | Return format | `png` (default), `svg` |

**API Response:**

```json
{
  "editUrl": "https://app.eraser.io/workspace/xyz123",
  "fileUrl": "https://app.eraser.io/api/files/abc456.png"
}
```

- `editUrl` - Link to edit diagram in Eraser's web editor
- `fileUrl` - Direct link to the generated image file

### 4. Handle Response

**On Success:**
```bash
# Parse the response
EDIT_URL=$(echo "$response" | jq -r '.editUrl')
FILE_URL=$(echo "$response" | jq -r '.fileUrl')

# Inform the user
echo "✅ Diagram generated successfully!"
echo "📝 Edit: $EDIT_URL"
echo "🖼️  View: $FILE_URL"
```

**Present to user:**
- Show the **editUrl** so they can modify the diagram
- Show the **fileUrl** so they can view/download the image
- Optionally save the DSL code to a file for version control

### 5. Save DSL Code (Optional)

Save the DSL for future edits:

```bash
cat > diagram.eraser <<'EOF'
direction right
colorMode bold

// Your DSL code here
EOF
```

## Error Handling

### Common Errors and Solutions

**Invalid DSL Syntax:**
```
Error: "Unexpected token at line X"
```
Solution: Check syntax against reference docs, ensure proper quoting for labels with spaces

**Missing Icon:**
```
Error: "Icon 'xyz' not found"
```
Solution: Use [Icons Quick Reference](./references/icons-quick-reference.md) or generic icons like `server`, `database`

**API Connection Failed:**
```
Error: "Could not connect to eraser.io"
```
Solution: Check network connectivity, verify API endpoint is correct

**Invalid Diagram Type:**
```
Error: "Invalid diagramType"
```
Solution: Use one of: `cloud-architecture-diagram`, `flowchart-diagram`, `sequence-diagram`, `entity-relationship-diagram`, `bpmn-diagram`

### Validation Checklist

Before calling the API:
- ✅ All node names are unique
- ✅ Labels with spaces are quoted: `"My Server"`
- ✅ Hex colors are quoted: `"#ff0000"`
- ✅ Groups have matching braces `{ }`
- ✅ Connections reference defined nodes
- ✅ Icons exist (check references)

## Tips for Better Diagrams

### Visual Hierarchy

Use groups to show containment:
```
Production {
  VPC {
    PublicSubnet {
      LoadBalancer [icon: aws-elastic-load-balancing]
    }
    PrivateSubnet {
      AppServer [icon: aws-ec2]
      Database [icon: aws-rds]
    }
  }
}
```

### Color Coding

**By Environment:**
```
ProdDB [icon: aws-rds, color: green]
StageDB [icon: aws-rds, color: yellow]
DevDB [icon: aws-rds, color: blue]
```

**By Security Zone:**
```
PublicAPI [color: orange]  // Public-facing
PrivateService [color: green]  // Internal only
```

**By Data Flow:**
```
User > API: HTTPS [color: blue]
API > DB: SQL [color: green]
API > Cache: Redis [color: orange]
```

### Global Styling

```
// Apply to entire diagram
direction right          // Layout direction
colorMode bold          // Vibrant colors
styleMode plain         // Clean, no shadows
typeface clean          // Modern font
```

## Examples

For complete working examples, see:
- [Architecture Examples](./references/examples/examples-architecture.md) - AWS, Azure, GCP, Kubernetes
- [Flow Chart Examples](./references/examples/examples-flowchart.md) - Process flows, decision trees
- [Sequence Examples](./references/examples/examples-sequence.md) - API flows, authentication
- [ERD Examples](./references/examples/examples-erd.md) - E-commerce, SaaS schemas
- [BPMN Examples](./references/examples/examples-bpmn.md) - Order fulfillment, approval workflows
- [IaC AWS Guide](./references/examples/examples-iac-aws-guide.md) - Terraform to diagrams

## Reference Documentation

### Syntax Guides
- [Cloud Architecture Syntax](./references/syntax/architecture-syntax.md)
- [Flow Chart Syntax](./references/syntax/flowchart-syntax.md)
- [Sequence Diagram Syntax](./references/syntax/sequence-syntax.md)
- [ERD Syntax](./references/syntax/erd-syntax.md)
- [BPMN Syntax](./references/syntax/bpmn-syntax.md)

### Visual Elements
- [Icons Quick Reference](./references/icons-quick-reference.md) - Common icons organized by category
- [Complete Icon List](./references/eraser-standard-icons.csv) - All 1000+ available icons
- [Styling Guide](./references/styling.md) - Colors, themes, and visual styling

## Complete Workflow Example

```bash
# 1. Read infrastructure file (if provided)
terraform_content=$(cat infrastructure/main.tf)

# 2. Generate DSL code
cat > diagram.eraser <<'EOF'
direction right
colorMode bold
styleMode plain

Client [icon: user, color: gray]

AWS {
  CloudFront [icon: aws-cloudfront, color: orange]
  EKS {
    API [icon: aws-lambda, color: blue]
    Worker [icon: aws-lambda, color: green]
  }
  Database {
    RDS [icon: aws-rds, color: green]
    Cache [icon: aws-elasticache, color: orange]
  }
}

Client > CloudFront: HTTPS
CloudFront > API: Forward
API > RDS: Query [color: green]
API > Cache: Check [color: orange]
API > Worker: Async [color: purple]
EOF

# 3. Call Eraser API
response=$(curl -s -X POST https://app.eraser.io/api/render/diagram \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": $(jq -Rs . < diagram.eraser),
    \"diagramType\": \"cloud-architecture-diagram\",
    \"background\": true,
    \"theme\": \"light\",
    \"scale\": \"3\"
  }")

# 4. Handle response
if [ $? -eq 0 ]; then
  edit_url=$(echo "$response" | jq -r '.editUrl')
  file_url=$(echo "$response" | jq -r '.fileUrl')

  echo "✅ Diagram generated!"
  echo "📝 Edit: $edit_url"
  echo "🖼️  View: $file_url"
else
  echo "❌ Error generating diagram"
  echo "$response"
fi
```

## Notes

- Free tier diagrams include a watermark but are fully functional
- The `editUrl` allows users to modify diagrams in the Eraser web editor
- DSL code can be saved to version control for documentation-as-code
- Diagrams can be regenerated from DSL at any time
- All colors and icons significantly improve diagram clarity
