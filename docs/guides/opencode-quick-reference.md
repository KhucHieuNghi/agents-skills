# OpenCode Agents Quick Reference

Quick commands and workflows for using Agents Skills with OpenCode.

## 🚀 Quick Setup

```bash
# Install all agents
for agent in agents/*/; do cp -r "$agent" ~/.config/opencode/agents/; done

# Or install individually
cp -r agents/codebase-analysis ~/.config/opencode/agents/
cp -r agents/coding-specialist ~/.config/opencode/agents/
```

## 📋 Available Agents

### Codebase Analysis Agent
```bash
# Analyze entire codebase
opencode --agent codebase-analysis --all-files --prompt "Analyze architecture"

# Security audit
opencode --agent codebase-analysis --all-files --prompt "Find security vulnerabilities"

# Document API
opencode --agent codebase-analysis --include-directories api,docs --prompt "Document API"
```

### Qwen Coding Specialist
```bash
# Implement with safety
opencode --agent coding-specialist --sandbox --checkpointing --prompt "Implement feature"

# Rapid prototyping
opencode --agent coding-specialist --yolo --prompt "Create prototype"

# Full implementation
opencode --agent coding-specialist --all-files --checkpointing --prompt "Refactor database"
```

## 🔄 Common Workflows

### Workflow 1: Analyze → Implement
```bash
# Step 1: Analyze
opencode --agent codebase-analysis --all-files --prompt "Analyze and identify improvements"

# Step 2: Implement
opencode --agent coding-specialist --all-files --checkpointing --prompt "Implement improvements"
```

### Workflow 2: Security Audit
```bash
# Find issues
opencode --agent codebase-analysis --all-files --prompt "Security audit"

# Fix issues
opencode --agent coding-specialist --all-files --checkpointing --prompt "Fix security issues"
```

### Workflow 3: Legacy Documentation
```bash
# Analyze
opencode --agent codebase-analysis --all-files --prompt "Analyze legacy system"

# Document
opencode --agent coding-specialist --checkpointing --prompt "Create documentation"
```

### Workflow 4: Rapid Prototyping
```bash
# Prototype
opencode --agent coding-specialist --yolo --sandbox --prompt "Create prototype"

# Iterate
opencode --agent coding-specialist --sandbox --prompt "Add features"
```

## 🛠️ Essential Flags

| Flag | Description | When to Use |
|------|-------------|-------------|
| `--all-files` | Load entire codebase | Comprehensive analysis |
| `--sandbox` | Safe experimentation | Testing new ideas |
| `--checkpointing` | Track changes | Significant changes |
| `--yolo` | Fast execution | Quick prototypes |
| `--show-memory-usage` | Monitor resources | Large codebases |
| `--include-directories` | Selective loading | Focused analysis |
| `--exclude-directories` | Skip directories | Ignore node_modules |

## ⚡ Bash Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Analysis
alias analyze='opencode --agent codebase-analysis --all-files'
alias security='opencode --agent codebase-analysis --all-files --prompt "Security audit"'
alias docs='opencode --agent codebase-analysis --prompt "Document codebase"'

# Implementation
alias implement='opencode --agent coding-specialist --checkpointing'
alias prototype='opencode --agent coding-specialist --sandbox --yolo'
alias refactor='opencode --agent coding-specialist --all-files --checkpointing'
```

**Usage:**
```bash
analyze --prompt "Find issues"
implement --prompt "Add feature"
prototype --prompt "Test idea"
```

## 🎯 Use Case Examples

### New Feature Development
```bash
# 1. Understand current state
analyze --prompt "Analyze authentication system"

# 2. Implement feature
implement --prompt "Add OAuth2 authentication"

# 3. Review
analyze --prompt "Review implementation"
```

### Code Migration
```bash
# 1. Analyze current
analyze --prompt "Analyze Express.js app"

# 2. Plan migration
# (Review analysis output)

# 3. Execute migration
refactor --prompt "Migrate to Fastify"
```

### Performance Optimization
```bash
# 1. Find bottlenecks
analyze --show-memory-usage --prompt "Find performance bottlenecks"

# 2. Optimize
implement --prompt "Optimize database queries"

# 3. Verify
analyze --prompt "Verify optimizations"
```

### Bug Fixing
```bash
# 1. Investigate
analyze --prompt "Investigate issue in user module"

# 2. Fix
implement --prompt "Fix the identified issue"

# 3. Test
# (Run your test suite)
```

## 📝 Best Practices

### ✅ Do
- Always analyze before implementing
- Use `--checkpointing` for significant changes
- Test in `--sandbox` for experiments
- Review agent output before applying
- Monitor memory with `--show-memory-usage`

### ❌ Don't
- Skip analysis phase
- Forget checkpointing on large changes
- Apply experimental changes directly
- Ignore agent warnings
- Run without understanding context

## 🆘 Troubleshooting

**Agent not found:**
```bash
ls ~/.config/opencode/agents/
# Reinstall: cp -r agents/AGENT_NAME ~/.config/opencode/agents/
```

**Context too small:**
```bash
# Use directory filtering
--include-directories src,lib
```

**Changes not saved:**
```bash
# Check write permissions
grep "write:" ~/.config/opencode/agents/*/qwen.md
```

**Out of memory:**
```bash
# Reduce scope
--include-directories src
```

## 📚 Documentation Links

- [OpenCode Integration Guide](./opencode-integration.md) - Detailed setup and workflows
- [Getting Started Guide](./getting-started.md) - Basic usage
- [Agent Catalog](../../AGENTS.md) - All available agents
- [CHANGELOG](../../CHANGELOG.md) - Version history

## 🔗 Resources

- **Repository:** https://github.com/KhucHieuNghi/agents-skills
- **OpenCode:** https://opencode.ai
- **Issues:** https://github.com/KhucHieuNghi/agents-skills/issues

---

**Tip:** Bookmark this page for quick reference!

*For detailed information, see the full [OpenCode Integration Guide](./opencode-integration.md)*
