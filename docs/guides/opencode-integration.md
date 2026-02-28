# OpenCode Agent Integration Guide

This guide explains how to use the Agents Skills framework agents with OpenCode for enhanced AI-powered development workflows.

## Overview

The Agents Skills framework provides specialized AI agents designed for specific development tasks. When integrated with OpenCode, these agents become powerful tools in your development workflow, enabling:

- **Intelligent Codebase Analysis** - Understand complex codebases holistically
- **Advanced Implementation** - Rapid prototyping and feature development
- **Safe Experimentation** - Test changes in sandboxed environments
- **Collaborative Workflows** - Multi-agent coordination for complex tasks

## Installation & Setup

### Option 1: Copy Agents to OpenCode Config (Recommended)

```bash
# Create the agents directory if it doesn't exist
mkdir -p ~/.config/opencode/agents

# Copy all agents from this repository
cp -r agents/codebase-analysis ~/.config/opencode/agents/
cp -r agents/coding-specialist ~/.config/opencode/agents/

# Verify installation
ls -la ~/.config/opencode/agents/
```

### Option 2: Symlink for Development (Advanced)

If you're actively developing agents, use symlinks to keep changes synchronized:

```bash
# Navigate to your agents-skills repository
cd /path/to/agents-skills

# Create symlinks
ln -s $(pwd)/agents/codebase-analysis ~/.config/opencode/agents/codebase-analysis
ln -s $(pwd)/agents/coding-specialist ~/.config/opencode/agents/coding-specialist

# Verify symlinks
ls -la ~/.config/opencode/agents/
```

### Option 3: Selective Agent Installation

Install only the agents you need:

```bash
# Install only Codebase Analysis Agent
cp -r agents/codebase-analysis ~/.config/opencode/agents/

# Install only Qwen Coding Specialist
cp -r agents/coding-specialist ~/.config/opencode/agents/
```

## Agent Configuration

### Understanding Agent Files

Each agent is defined in a markdown file with YAML frontmatter:

```yaml
---
description: Brief description of the agent
model: anthropic/claude-sonnet-4-20250514
tools:
  write: true
  edit: true
  read: true
  bash: true
  glob: true
  grep: true
---
```

### Customizing Agent Behavior

You can customize agents by editing their configuration files:

```bash
# Edit an agent's configuration
nano ~/.config/opencode/agents/codebase-analysis/gemini.md

# Modify tools, description, or add custom capabilities
```

**Common Customizations:**

1. **Change Default Model:**
   ```yaml
   model: anthropic/claude-opus-4-20250514  # Use more powerful model
   ```

2. **Enable/Disable Tools:**
   ```yaml
   tools:
     write: false  # Disable file writing for read-only analysis
     read: true
   ```

3. **Add Custom Metadata:**
   ```yaml
   custom_settings:
     max_files: 100
     timeout: 300
   ```

## Available Agents

### 1. Codebase Analysis Agent (Gemini)

**Location:** `~/.config/opencode/agents/codebase-analysis/gemini.md`

**Purpose:** Large-context codebase analysis using extended context windows (1M+ tokens)

**Best For:**
- Understanding complex, multi-file codebases
- Identifying architectural patterns
- Finding security vulnerabilities across entire projects
- Documenting legacy systems
- Planning refactoring efforts

**OpenCode Usage:**

```bash
# Load the agent and analyze current directory
opencode --agent codebase-analysis --prompt "Analyze this codebase architecture"

# With full context
opencode --agent codebase-analysis --all-files --prompt "Find all security vulnerabilities"

# Target specific directories
opencode --agent codebase-analysis --include-directories src,tests --prompt "Document the API structure"
```

**Key Features:**
- `--all-files`: Load entire codebase into context
- `--show-memory-usage`: Monitor context utilization
- `--include-directories`: Focus on specific directories
- `--yolo`: Automated large-scale analysis

### 2. Qwen Coding Specialist

**Location:** `~/.config/opencode/agents/coding-specialist/qwen.md`

**Purpose:** Advanced coding implementation with rapid prototyping capabilities

**Best For:**
- Implementing complex multi-file features
- Rapid prototyping and MVP development
- Safe experimental development
- Codebase migrations and modernization
- Performance optimization

**OpenCode Usage:**

```bash
# Implement a feature with safety checks
opencode --agent coding-specialist --sandbox --checkpointing --prompt "Implement user authentication"

# Rapid prototyping
opencode --agent coding-specialist --yolo --prompt "Create a proof-of-concept for the new API"

# With full context awareness
opencode --agent coding-specialist --all-files --checkpointing --prompt "Refactor the database layer"
```

**Key Features:**
- `--sandbox`: Safe experimental development
- `--checkpointing`: Track and revert changes
- `--yolo`: Rapid automated implementation
- `--show-memory-usage`: Monitor resource usage
- Advanced tools: `list`, `task`, `todowrite`, `todoread`

## Practical Workflows

### Workflow 1: Analyze → Plan → Implement

Perfect for starting new features or refactoring:

```bash
# Step 1: Analyze the codebase
opencode --agent codebase-analysis --all-files --prompt "Analyze the current authentication system and identify improvement opportunities"

# Step 2: Plan the implementation (manual or with another agent)
# Review the analysis and create an implementation plan

# Step 3: Implement with safety
opencode --agent coding-specialist --all-files --sandbox --checkpointing --prompt "Implement OAuth2 authentication based on the analysis findings"
```

### Workflow 2: Legacy Code Documentation

Document an unknown or legacy codebase:

```bash
# Step 1: Comprehensive analysis
opencode --agent codebase-analysis --all-files --prompt "Document the architecture of this legacy system, including:
- Overall system design
- Key components and their interactions
- Data flow diagrams
- Dependencies and external integrations
- Potential technical debt areas"

# Step 2: Create documentation files
opencode --agent coding-specialist --checkpointing --prompt "Create comprehensive documentation in docs/ based on the analysis"
```

### Workflow 3: Security Audit & Remediation

Find and fix security issues:

```bash
# Step 1: Security analysis
opencode --agent codebase-analysis --all-files --prompt "Perform a comprehensive security audit:
- Find all authentication/authorization issues
- Identify SQL injection vulnerabilities
- Check for XSS vulnerabilities
- Review input validation
- Assess secret management"

# Step 2: Implement fixes
opencode --agent coding-specialist --all-files --sandbox --checkpointing --prompt "Fix the security vulnerabilities identified in the audit"
```

### Workflow 4: Rapid Prototyping

Quickly build and test new features:

```bash
# Create a working prototype
opencode --agent coding-specialist --yolo --sandbox --prompt "Create a working prototype of a real-time chat system with:
- WebSocket connections
- Message persistence
- User authentication
- Basic UI"

# Test and iterate
opencode --agent coding-specialist --sandbox --prompt "Add message encryption to the chat prototype"
```

### Workflow 5: Migration Projects

Modernize or migrate codebases:

```bash
# Analyze current state
opencode --agent codebase-analysis --all-files --prompt "Analyze the current Express.js application structure for migration to Fastify"

# Plan migration
# Review analysis and create migration strategy

# Execute migration
opencode --agent coding-specialist --all-files --checkpointing --prompt "Migrate the Express.js application to Fastify while maintaining all functionality"
```

## Advanced Usage Patterns

### Pattern 1: Multi-Agent Chaining

Use multiple agents in sequence for complex tasks:

```bash
# Agent 1: Analyze
opencode --agent codebase-analysis --all-files --output-to analysis.md --prompt "Analyze codebase"

# Agent 2: Plan (using analysis)
opencode --agent coding-specialist --input-from analysis.md --prompt "Create implementation plan"

# Agent 3: Implement
opencode --agent coding-specialist --checkpointing --prompt "Execute the implementation plan"
```

### Pattern 2: Checkpoint Management

Use checkpointing for safe experimentation:

```bash
# Start with checkpointing enabled
opencode --agent coding-specialist --checkpointing --prompt "Begin refactoring the database layer"

# If something goes wrong, revert
opencode --agent coding-specialist --rollback --prompt "Revert to last checkpoint"

# Continue from checkpoint
opencode --agent coding-specialist --checkpointing --prompt "Continue refactoring with adjustments"
```

### Pattern 3: Sandbox Development

Test radical changes safely:

```bash
# Work in sandbox
opencode --agent coding-specialist --sandbox --prompt "Experiment with a new architecture pattern"

# Review changes
# If satisfied, apply to main codebase
opencode --agent coding-specialist --apply-from-sandbox --prompt "Apply sandbox changes to main codebase"
```

### Pattern 4: Interactive Development

Guided implementation sessions:

```bash
# Start interactive session
opencode --agent coding-specialist --interactive --all-files --prompt "Let's implement the new feature together"

# The agent will ask clarifying questions and guide you through the process
```

## Configuration Best Practices

### 1. Project-Specific Agent Configs

Create project-specific agent configurations:

```bash
# Create project config
mkdir -p .opencode/agents/
cp ~/.config/opencode/agents/codebase-analysis/gemini.md .opencode/agents/

# Customize for project
# Edit .opencode/agents/gemini.md with project-specific settings
```

### 2. Environment Variables

Set environment variables for agent behavior:

```bash
# Add to ~/.bashrc or ~/.zshrc
export OPENCODE_AGENT_TIMEOUT=300
export OPENCODE_MAX_FILES=100
export OPENCODE_CHECKPOINT_DIR=".opencode/checkpoints"
```

### 3. Agent Aliases

Create shortcuts for common commands:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias analyze='opencode --agent codebase-analysis --all-files'
alias implement='opencode --agent coding-specialist --checkpointing'
alias prototype='opencode --agent coding-specialist --sandbox --yolo'

# Usage
analyze --prompt "Find security issues"
implement --prompt "Add user profile feature"
prototype --prompt "Create a new component"
```

## Integration with Development Workflow

### Git Workflow Integration

```bash
# Before starting work
opencode --agent codebase-analysis --all-files --prompt "Analyze current state before feature implementation"

# Implement feature
opencode --agent coding-specialist --checkpointing --prompt "Implement the new feature"

# Before committing
opencode --agent codebase-analysis --prompt "Review changes and suggest improvements"

# Commit with good message
# Use agent output to write commit message
```

### CI/CD Integration

```yaml
# .github/workflows/agents.yml
name: Agent Analysis
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Codebase Analysis
        run: |
          opencode --agent codebase-analysis --all-files --prompt "Check for issues"
      - name: Security Audit
        run: |
          opencode --agent codebase-analysis --all-files --prompt "Security audit"
```

### IDE Integration

**VS Code:**
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Analyze Codebase",
      "type": "shell",
      "command": "opencode --agent codebase-analysis --all-files --prompt 'Analyze this codebase'",
      "group": "build"
    },
    {
      "label": "Implement Feature",
      "type": "shell",
      "command": "opencode --agent coding-specialist --checkpointing --prompt 'Implement feature'",
      "group": "build"
    }
  ]
}
```

## Troubleshooting

### Common Issues

**Issue: Agent not found**
```bash
# Verify agent installation
ls ~/.config/opencode/agents/

# Reinstall agent
cp -r /path/to/agents-skills/agents/codebase-analysis ~/.config/opencode/agents/
```

**Issue: Context window too small**
```bash
# Use directory filtering
opencode --agent codebase-analysis --include-directories src --prompt "Analyze"

# Or upgrade to a model with larger context
# Edit agent config: model: anthropic/claude-opus-4-20250514
```

**Issue: Changes not being saved**
```bash
# Ensure write tool is enabled in agent config
grep "write:" ~/.config/opencode/agents/coding-specialist/qwen.md

# Should show: write: true
```

**Issue: Sandbox not working**
```bash
# Check sandbox directory exists
mkdir -p ~/.config/opencode/sandbox

# Verify permissions
chmod 755 ~/.config/opencode/sandbox
```

### Performance Optimization

**Large Codebases:**
```bash
# Use selective loading
opencode --agent codebase-analysis --include-directories src,lib --exclude-directories node_modules,dist

# Monitor memory
opencode --agent codebase-analysis --all-files --show-memory-usage
```

**Slow Operations:**
```bash
# Use YOLO mode for faster execution
opencode --agent coding-specialist --yolo --prompt "Quick task"

# Or reduce context
opencode --agent coding-specialist --include-directories src --prompt "Focused task"
```

## Best Practices

### 1. Start with Analysis

Always analyze before implementing:
```bash
# Good
opencode --agent codebase-analysis --all-files --prompt "Analyze"
# Review analysis
opencode --agent coding-specialist --prompt "Implement"

# Bad (implementing blindly)
opencode --agent coding-specialist --prompt "Implement feature"
```

### 2. Use Checkpoints for Safety

Enable checkpointing for significant changes:
```bash
# Good
opencode --agent coding-specialist --checkpointing --prompt "Refactor database layer"

# Risky (no rollback option)
opencode --agent coding-specialist --prompt "Refactor database layer"
```

### 3. Test in Sandbox First

Experiment safely:
```bash
# Good
opencode --agent coding-specialist --sandbox --prompt "Experiment with new pattern"

# Risky (direct to production)
opencode --agent coding-specialist --prompt "Experiment with new pattern"
```

### 4. Review Agent Output

Always review before applying:
```bash
# Generate but don't apply automatically
opencode --agent coding-specialist --dry-run --prompt "Generate code"
# Review output
# Then apply if satisfied
```

### 5. Document Agent Decisions

Keep track of agent-assisted changes:
```bash
# Create a log
opencode --agent codebase-analysis --prompt "Analyze" > agents/logs/analysis-$(date +%Y%m%d).md

# Commit with context
git commit -m "feat(auth): implement OAuth2

Agent-assisted implementation using Qwen Coding Specialist.
See agents/logs/analysis-20240228.md for analysis details."
```

## Resources

### Internal Documentation
- [Agent Catalog](../AGENTS.md)
- [Getting Started Guide](./getting-started.md)
- [Research Documentation](../research/)

### External Resources
- [OpenCode Documentation](https://opencode.ai/docs)
- [Agent Skills Repository](https://github.com/KhucHieuNghi/agents-skills)
- [Anthropic Claude Documentation](https://docs.anthropic.com/)

## Contributing

To improve these agents or add new ones:

1. Fork the [agents-skills repository](https://github.com/KhucHieuNghi/agents-skills)
2. Make your changes
3. Test with OpenCode
4. Submit a pull request

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review agent configuration files

---

**Note:** This guide is a living document. As OpenCode and the agents evolve, update this guide to reflect new capabilities and best practices.

*Last updated: 2026-02-28*
