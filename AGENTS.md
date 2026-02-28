# Agent Catalog

This document catalogs all available agents in the Agents Skills framework, including their capabilities, use cases, and configuration details.

## Table of Contents

- [Overview](#overview)
- [Available Agents](#available-agents)
- [Agent Architecture](#agent-architecture)
- [Usage Patterns](#usage-patterns)
- [Adding New Agents](#adding-new-agents)

## Overview

Agents in this framework are specialized AI assistants designed for specific tasks. Each agent is defined through:

- **YAML Frontmatter**: Configuration and metadata
- **Markdown Documentation**: Purpose, approach, and usage
- **Capability Definitions**: Tools and skills the agent possesses

## Available Agents

### 1. Codebase Analysis Agent

**File:** `agents/codebase-analysis/gemini.md`  
**Type:** Specialized Analysis Agent  
**Status:** Active

#### Description

A large-context codebase analysis specialist leveraging advanced language models with extended context windows (1M+ tokens). This agent excels at holistic understanding of entire codebases rather than file-by-file analysis.

#### Capabilities

- **Full Codebase Context**: Load entire projects for complete visibility
- **Cross-File Analysis**: Identify dependencies and interactions across multiple files
- **Pattern Recognition**: Detect architectural patterns and anti-patterns at scale
- **Technical Debt Assessment**: Spot systemic issues requiring full context
- **Documentation Generation**: Create comprehensive docs from code exploration

#### Configuration

```yaml
description: Large-context codebase analysis specialist using extended context windows for comprehensive deep-dive exploration and understanding
model: anthropic/claude-sonnet-4-20250514  # Or equivalent large-context model
tools:
  write: true
  edit: true
  read: true
  bash: true
  glob: true
  grep: true
```

#### Use Cases

1. **Architecture Analysis**
   - Understand overall system design
   - Identify architectural patterns
   - Assess system evolution and technical debt

2. **Legacy Code Documentation**
   - Document complex legacy systems
   - Map undocumented dependencies
   - Create migration guides

3. **Security Auditing**
   - Find vulnerabilities across the entire codebase
   - Identify security anti-patterns
   - Assess exposure surface

4. **Refactoring Planning**
   - Identify refactoring opportunities
   - Assess impact of changes
   - Plan migration strategies

#### Optimal Usage

```bash
# Full codebase analysis
gemini --prompt "Analyze this entire codebase architecture" --all-files

# Memory-monitored deep dive
gemini --prompt "Find all security vulnerabilities" --all-files --show-memory-usage

# Multi-directory analysis
gemini --prompt "Document the API structure" --include-directories api,docs,tests

# Automated large-scale review
gemini --prompt "Identify technical debt patterns" --all-files --yolo
```

#### Best Practices

- Use `--all-files` flag for complete codebase visibility
- Enable `--show-memory-usage` to monitor context utilization
- Use `--checkpointing` for safe large-scale modifications
- Include relevant directories with `--include-directories`

---

### 2. Qwen Coding Specialist

**File:** `agents/coding-specialist/qwen.md`  
**Type:** Implementation Agent  
**Status:** Active

#### Description

An advanced coding implementation specialist leveraging Qwen's rapid development capabilities. This agent excels at complex feature implementation, rapid prototyping, and safe code evolution through sandbox execution and checkpointing.

#### Capabilities

- **Multi-file Implementation**: Implement complex features spanning multiple files and modules
- **Rapid Prototyping**: Quick proof-of-concept development using sandbox environments
- **Safe Code Evolution**: Checkpointed development with automatic tracking and rollback capability
- **Performance Optimization**: Implement improvements with comprehensive analysis
- **Advanced Tooling**: Task management, todo tracking, and workflow coordination

#### Configuration

```yaml
description: Advanced coding implementation specialist using Qwen's rapid development capabilities, sandbox execution, and comprehensive codebase analysis
model: anthropic/claude-sonnet-4-20250514
tools:
  write: true
  edit: true
  read: true
  bash: true
  glob: true
  grep: true
  list: true
  task: true
  todowrite: true
  todoread: true
```

#### Use Cases

1. **Full-stack Feature Implementation**
   - Build features across frontend, backend, and database layers
   - Handle complex multi-module integrations
   - Implement end-to-end functionality

2. **Migration Projects**
   - Framework upgrades and technology migrations
   - Code modernization initiatives
   - Architecture refactoring

3. **Rapid Development**
   - MVP development with quality foundations
   - Spike solutions for complex problems
   - Integration prototypes

4. **Safe Experimentation**
   - Sandbox-based experimental development
   - Performance optimization testing
   - Proof-of-concept implementations

#### Optimal Usage

```bash
# Comprehensive analysis with memory monitoring
qwen --all-files --show-memory-usage --prompt "Analyze codebase structure and identify optimization opportunities"

# Safe prototyping with checkpointing
qwen --sandbox --checkpointing --debug --prompt "Implement experimental feature with safety checks"

# Rapid implementation
qwen --yolo --checkpointing --extensions framework-tools --prompt "Implement feature following established patterns"

# Interactive development
qwen --prompt-interactive --all-files --show-memory-usage "Start guided implementation session"
```

#### Best Practices

- Use `--sandbox` for experimental implementations
- Always enable `--checkpointing` for significant changes
- Monitor memory usage with `--show-memory-usage` for large operations
- Use task and todo tools for complex multi-step implementations
- Test in sandbox before applying to main codebase

#### Integration with Other Agents

- **Codebase Analysis Agent**: Use Gemini for analysis, then Qwen for implementation
- **Documentation Agents**: Coordinate for comprehensive project documentation
- **Testing Agents**: Work together for quality assurance and validation

---


## Agent Architecture

### Standard Agent Structure

All agents follow a consistent structure:

```
agents/[agent-category]/
├── [agent-name].md          # Main agent definition
├── examples/                # Usage examples (optional)
│   ├── example-1.md
│   └── example-2.md
└── templates/               # Reusable templates (optional)
    └── template.md
```

### YAML Frontmatter Schema

```yaml
description: string          # Brief agent description
model: string               # Recommended model/API
tools:                      # Available tools
  write: boolean           # File write capability
  edit: boolean            # File edit capability
  read: boolean            # File read capability
  bash: boolean            # Shell command execution
  glob: boolean            # File pattern matching
  grep: boolean            # Content searching
  [custom]: boolean        # Custom tools
---
```

### Required Sections

Each agent documentation should include:

1. **Core Responsibilities**: What the agent does
2. **Approach**: How the agent operates
3. **Core Capabilities**: Detailed capability descriptions
4. **Specialized Use Cases**: When to use this agent
5. **Integration**: How to use with other agents

## Usage Patterns

### Single Agent Usage

Use a single agent for focused tasks:

```bash
# Analyze codebase
agent codebase-analysis --task "Find security issues"

# Generate documentation
agent codebase-analysis --task "Document API endpoints"
```

### Multi-Agent Collaboration (Planned)

Future versions will support agent chaining:

```bash
# Analyze and then refactor
agent codebase-analysis --output-to refactoring-agent

# Security audit followed by fix generation
agent security-analyzer --output-to fix-generator
```

### Agent Specialization

Agents can be specialized for specific domains:

- **Frontend Specialist**: Focus on UI/UX code analysis
- **Backend Specialist**: Focus on API and database code
- **DevOps Specialist**: Focus on infrastructure and deployment
- **Security Specialist**: Focus on vulnerability detection

## Adding New Agents

### Step 1: Plan Your Agent

Define:
- **Purpose**: What problem does it solve?
- **Target Users**: Researchers, developers, or both?
- **Unique Value**: What makes it different from existing agents?
- **Required Tools**: What capabilities does it need?

### Step 2: Create Agent Definition

Create a new markdown file in `agents/[category]/`:

```markdown
---
description: Your agent description
model: recommended-model
tools:
  write: true
  read: true
  # ... other tools
---

# Your Agent Name

## Core Responsibilities

- Responsibility 1
- Responsibility 2

## Approach

How the agent operates...

## Core Capabilities

### Capability 1
Description...

## Specialized Use Cases

### Use Case 1
Details...

## Integration with Workflow

How to use this agent...
```

### Step 3: Document Examples

Add usage examples to help users understand:

```markdown
## Examples

### Example 1: [Description]

```bash
# Command or code
```

**Expected Output:**
Description of results...
```

### Step 4: Update Catalog

Add your agent to this AGENTS.md file following the format of existing agents.

### Step 5: Test and Iterate

- Test your agent with real use cases
- Gather feedback from users
- Iterate on the agent definition
- Document lessons learned

## Future Agents (Planned)

### Multi-Agent Orchestrator
- Coordinate multiple agents for complex tasks
- Manage agent communication and workflow
- Handle agent conflicts and consensus

### Skill Composer
- Combine multiple agent skills dynamically
- Discover optimal skill combinations
- Transfer skills between agents

### Domain Adapter
- Translate between different domain languages
- Bridge gaps between specialized agents
- Enable cross-domain collaboration

### Learning Agent
- Learn from user interactions
- Adapt to new patterns
- Self-improve over time

## Agent Comparison Matrix

| Agent | Context Size | Specialization | Best For |
|-------|-------------|----------------|----------|
| Codebase Analysis | Large (1M+) | Code analysis | Architecture review, legacy docs |
| Qwen Coding Specialist | Medium | Code implementation | Feature development, prototyping |

## Contributing

To add a new agent:

1. Fork the repository
2. Create your agent in `agents/[category]/`
3. Update this catalog
4. Submit a pull request with:
   - Agent definition
   - Usage examples
   - Documentation updates

## Research Notes

See `docs/research/` for:
- Agent design patterns
- Performance benchmarks
- Usability studies
- Emerging best practices

---

*Last updated: [Date will be maintained by maintainers]*
