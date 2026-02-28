# Getting Started with Agents Skills

Welcome to the Agents Skills framework! This guide will help you set up the project and start using agents for your research or development work.

## Prerequisites

Before you begin, ensure you have:

- **Git** - For cloning and version control
- **Text Editor or IDE** - VS Code, Vim, Emacs, or any editor supporting markdown
- **Basic Knowledge** - Familiarity with:
  - Markdown syntax
  - YAML frontmatter
  - Command line basics
  - AI/ML concepts (helpful but not required)

## Installation

### Step 1: Clone the Repository

```bash
git clone git@github.com:KhucHieuNghi/agents-skills.git
cd agents-skills
```

### Step 2: Explore the Structure

Familiarize yourself with the project layout:

```bash
# View the main files
ls -la

# Check available agents
ls -la agents/

# View documentation
ls -la docs/
```

### Step 3: Read the Documentation

Start with these essential files:

```bash
# Main project documentation
cat README.md

# Agent catalog
cat AGENTS.md

# Changelog for recent changes
cat CHANGELOG.md
```

## Understanding Agents

### What is an Agent?

In this framework, an **agent** is a specialized AI assistant with defined capabilities, tools, and use cases. Each agent is documented in a markdown file with:

1. **YAML Frontmatter** - Configuration and metadata
2. **Documentation** - Purpose, approach, and capabilities
3. **Examples** - Usage patterns and best practices

### Agent Structure

```markdown
---
description: Brief description of the agent
model: Recommended AI model/API
tools:
  write: true
  edit: true
  read: true
  bash: true
  glob: true
  grep: true
---

# Agent Name

## Core Responsibilities
...
```

## Using Available Agents

### Codebase Analysis Agent

The codebase analysis agent specializes in large-context analysis using Gemini's 1M+ token context window.

#### When to Use It

- Analyzing entire project architectures
- Understanding complex multi-module applications
- Identifying refactoring opportunities
- Documenting legacy systems
- Performing security audits

#### Basic Usage

```bash
# Full codebase analysis
gemini --prompt "Analyze this codebase architecture" --all-files

# Find security issues
gemini --prompt "Find security vulnerabilities" --all-files

# Document API structure
gemini --prompt "Document the API structure" --include-directories api,docs,tests

# Identify technical debt
gemini --prompt "Identify technical debt patterns" --all-files --yolo
```

#### Advanced Options

```bash
# Monitor memory usage
gemini --prompt "Analyze code" --all-files --show-memory-usage

# Enable checkpointing for safety
gemini --prompt "Refactor codebase" --all-files --checkpointing

# Include specific directories
gemini --prompt "Review changes" --include-directories src,tests,docs
```

### Qwen Coding Specialist

The Qwen Coding Specialist is an advanced implementation agent for complex coding tasks, rapid prototyping, and safe code evolution.

#### When to Use It

- Implementing complex multi-file features
- Rapid prototyping and MVP development
- Codebase migrations and modernization
- Safe experimental development with sandbox execution
- Performance optimization requiring detailed analysis

#### Basic Usage

```bash
# Comprehensive codebase analysis with memory monitoring
qwen --all-files --show-memory-usage --prompt "Analyze codebase structure and identify optimization opportunities"

# Safe prototyping with checkpointing
qwen --sandbox --checkpointing --debug --prompt "Implement experimental feature with safety checks"

# Rapid implementation with YOLO mode
qwen --yolo --checkpointing --extensions framework-tools --prompt "Implement feature following established patterns"

# Interactive development session
qwen --prompt-interactive --all-files --show-memory-usage "Start guided implementation session"
```

#### Advanced Options

```bash
# Full-stack feature implementation
qwen --all-files --checkpointing --prompt "Implement user authentication system across frontend and backend"

# Migration project
qwen --sandbox --checkpointing --prompt "Migrate from Express to Fastify framework"

# Performance optimization
qwen --all-files --show-memory-usage --prompt "Optimize database queries and implement caching"
```

#### Best Practices

- Always use `--checkpointing` for significant changes
- Test in `--sandbox` before applying to main codebase
- Monitor `--show-memory-usage` for large operations
- Use `todowrite` and `task` tools for complex implementations
- Combine with Codebase Analysis Agent: analyze first, then implement

#### Collaboration with Codebase Analysis Agent

These two agents work exceptionally well together:

1. **Analysis Phase**: Use Codebase Analysis Agent to understand the codebase
   ```bash
   gemini --all-files --prompt "Analyze this codebase and identify optimization opportunities"
   ```

2. **Implementation Phase**: Use Qwen Coding Specialist to implement the changes
   ```bash
   qwen --all-files --checkpointing --prompt "Implement the identified optimizations"
   ```

This workflow ensures comprehensive understanding before making changes, leading to better implementation decisions.

## Creating Your First Agent

### Step 1: Plan Your Agent

Define:
- **Purpose**: What problem will it solve?
- **Target Users**: Researchers, developers, or both?
- **Tools Needed**: What capabilities are required?

### Step 2: Create the Agent File

```bash
# Create a new agent directory
mkdir -p agents/my-custom-agent

# Create the agent definition
touch agents/my-custom-agent/README.md
```

### Step 3: Write the Agent Definition

```markdown
---
description: My custom agent for specific tasks
model: recommended-model-name
tools:
  write: true
  read: true
  bash: true
---

# My Custom Agent

## Core Responsibilities

- Task 1
- Task 2

## Approach

How the agent operates...

## Core Capabilities

### Capability 1
Description...

## Usage Examples

### Example 1
```bash
# Command here
```

**Expected Output:**
Description...
```

### Step 4: Test Your Agent

- Test with real use cases
- Document any issues
- Refine the approach

### Step 5: Update the Catalog

Add your agent to `AGENTS.md` following the existing format.

## Research Workflow

### For Researchers

1. **Define Research Question**
   - What agent behavior are you investigating?
   - What hypotheses do you have?

2. **Design Experiment**
   - Create agent configuration
   - Define success metrics
   - Plan data collection

3. **Document in `docs/research/`**
   ```bash
   touch docs/research/$(date +%Y-%m-%d)-my-experiment.md
   ```

4. **Conduct Experiment**
   - Run agent with specific prompts
   - Record observations
   - Note unexpected behaviors

5. **Analyze Results**
   - Review findings
   - Compare against hypotheses
   - Document conclusions

6. **Share Findings**
   - Update research notes
   - Contribute to changelog
   - Share with community

### Example Research Document

```markdown
# Experiment: [Title]

**Date:** 2026-02-28  
**Researcher:** [Your Name]  
**Status:** In Progress

## Research Question

What is the effect of X on Y?

## Hypothesis

We expect that X will cause Y to increase by Z%.

## Methodology

1. Step 1
2. Step 2
3. Step 3

## Results

### Observation 1
Details...

### Observation 2
Details...

## Analysis

What do these results mean?

## Conclusions

Key findings...

## Next Steps

- Further investigation needed on...
- Try varying parameter X...
- Test with different models...

## References

- Related research
- External resources
```

## Development Workflow

### For Developers

1. **Identify Need**
   - What task needs automation?
   - What existing agents are close but not quite right?

2. **Design Agent**
   - Define capabilities
   - Choose appropriate tools
   - Document approach

3. **Implement**
   - Create agent definition
   - Add to appropriate category
   - Write usage examples

4. **Test**
   - Test in real scenarios
   - Gather feedback
   - Iterate on design

5. **Document**
   - Add to AGENTS.md
   - Create examples
   - Update README if needed

## Best Practices

### Agent Design

1. **Start Simple**
   - Begin with core capabilities
   - Add complexity incrementally
   - Test frequently

2. **Be Specific**
   - Clear description of purpose
   - Well-defined responsibilities
   - Specific use cases

3. **Document Everything**
   - Include examples
   - Show expected outputs
   - Explain edge cases

4. **Use Appropriate Tools**
   - Only enable needed tools
   - Consider security implications
   - Document tool usage

### Research Documentation

1. **Be Thorough**
   - Document methodology
   - Record all observations
   - Include raw data when possible

2. **Be Objective**
   - Report failures as well as successes
   - Note limitations
   - Avoid confirmation bias

3. **Be Reproducible**
   - Include exact commands used
   - Document environment
   - Share configurations

### Version Control

1. **Commit Frequently**
   - Small, focused commits
   - Clear commit messages
   - Logical grouping

2. **Use Branches**
   - Feature branches for new agents
   - Experiment branches for research
   - Main branch for stable code

3. **Document Changes**
   - Update CHANGELOG.md
   - Note breaking changes
   - Tag releases

## Troubleshooting

### Common Issues

**Issue**: Agent not working as expected  
**Solution**: 
- Check YAML frontmatter syntax
- Verify tool permissions
- Review agent documentation
- Test with simpler prompts first

**Issue**: Context window too small  
**Solution**:
- Use large-context models
- Filter files with `--include-directories`
- Break analysis into smaller chunks

**Issue**: Agent doesn't have needed tools  
**Solution**:
- Check tool list in YAML frontmatter
- Add missing tools
- Redefine agent capabilities

### Getting Help

1. **Check Documentation**
   - README.md
   - AGENTS.md
   - Agent-specific docs

2. **Review Examples**
   - Look at existing agents
   - Check research notes
   - See usage patterns

3. **Ask Questions**
   - Open an issue on GitHub
   - Join community discussions
   - Contact maintainers

## Next Steps

### Immediate Actions

1. [ ] Explore existing agents in `agents/`
2. [ ] Read the codebase analysis agent documentation
3. [ ] Try using an agent on your codebase
4. [ ] Create your first custom agent

### Short-term Goals

1. [ ] Contribute a research note
2. [ ] Improve existing agent documentation
3. [ ] Test multi-agent scenarios
4. [ ] Share findings with community

### Long-term Goals

1. [ ] Develop novel agent architectures
2. [ ] Contribute to interoperability standards
3. [ ] Publish research findings
4. [ ] Build production-ready agents

## Resources

### Internal

- [README.md](../README.md) - Project overview
- [AGENTS.md](../AGENTS.md) - Agent catalog
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [docs/research/](../research/) - Research documentation

### External

- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [Markdown Guide](https://www.markdownguide.org/)
- [YAML Specification](https://yaml.org/spec/)

---

**Welcome to the community!** We're excited to see what you build and discover.

For questions or contributions, please refer to the main [README.md](../README.md) or open an issue on GitHub.
