# Agents Skills

A research and development framework for AI agents and customizable agent skills. This project explores the frontiers of multi-agent systems, skill composition, and agent interoperability across diverse domains.

## Vision

This project serves as an experimental playground for understanding, developing, and refining AI agent capabilities. We investigate how agents can collaborate, how skills can be composed and transferred, and how to build robust, adaptable agent systems.

## Research Focus Areas

### Multi-Agent Systems
- Agent coordination and communication protocols
- Distributed problem-solving across agent networks
- Consensus mechanisms and collective intelligence
- Conflict resolution in multi-agent environments

### Skill Composition
- Modular skill architecture design
- Skill discovery and composition algorithms
- Transfer learning between agents
- Dynamic skill acquisition and adaptation

### Agent Interoperability
- Cross-platform agent communication standards
- Unified agent interface specifications
- Protocol translation and mediation
- Heterogeneous agent integration

### Agent Specialization
- Domain-specific agent development
- Role-based agent configuration
- Expertise clustering and specialization
- Adaptive role switching

## Goals

### For Researchers
- Provide a testbed for agent behavior studies
- Enable reproducible agent experiments
- Document patterns and anti-patterns in agent design
- Contribute to the theoretical foundations of multi-agent systems

### For Developers
- Offer ready-to-use agent implementations
- Demonstrate best practices in agent architecture
- Provide templates for custom agent development
- Enable rapid prototyping of agent-based solutions

## Project Structure

```
agents-skills/
├── README.md                          # This file
├── LICENSE                            # MIT License
├── AGENTS.md                          # Agent catalog and documentation
├── CHANGELOG.md                       # R&D progress and version history
├── docs/
│   ├── guides/
│   │   └── getting-started.md         # Setup and usage guide
│   └── research/
│       └── README.md                  # Research methodology and findings
├── agents/                            # Agent definitions
│   └── codebase-analysis/
│       └── gemini.md                  # Large-context codebase specialist
└── subagents/                         # Sub-agent definitions (future use)
```

## Available Agents

### Codebase Analysis Agent
**Specialty:** Large-context codebase analysis  
**Capability:** Processes entire codebases using Gemini's 1M+ token context window  
**Use Cases:**
- Comprehensive architecture analysis
- Cross-file dependency mapping
- Technical debt identification
- Legacy system documentation
- Security auditing at scale

[Detailed Documentation →](agents/codebase-analysis/gemini.md)

### Qwen Coding Specialist
**Specialty:** Advanced code implementation and rapid prototyping
**Capability:** Complex feature development with sandbox execution and checkpointing
**Use Cases:**
- Full-stack feature implementation
- Rapid prototyping and MVP development
- Codebase migrations and modernization
- Safe experimental development

[Detailed Documentation →](agents/coding-specialist/qwen.md)

## Quick Start

### Prerequisites
- Git
- Text editor or IDE
- Familiarity with markdown and YAML frontmatter

### Installation

```bash
# Clone the repository
git clone git@github.com:KhucHieuNghi/agents-skills.git
cd agents-skills

# Explore available agents
ls -la agents/

# Read agent documentation
cat agents/codebase-analysis/gemini.md
```

### Usage

Each agent is defined in a markdown file with YAML frontmatter describing its capabilities and configuration. See [AGENTS.md](AGENTS.md) for detailed usage instructions.

## Contributing

We welcome contributions from both researchers and developers!

### Adding a New Agent

1. Create a new directory under `agents/` with a descriptive name
2. Add your agent definition as `README.md` or `[agent-name].md`
3. Include YAML frontmatter with:
   - `description`: Brief agent description
   - `model`: Recommended model/API
   - `tools`: Available tools and capabilities
4. Document the agent's purpose, approach, and use cases
5. Update [AGENTS.md](AGENTS.md) with the new agent entry

### Research Contributions

1. Add research notes to `docs/research/`
2. Use descriptive filenames: `[date]-[topic].md`
3. Include methodology, findings, and conclusions
4. Cross-reference related agents or experiments

### Documentation Improvements

- Improve clarity of existing docs
- Add examples and tutorials
- Translate documentation
- Fix typos and errors

## Development Roadmap

### Phase 1: Foundation (Current)
- [x] Basic project structure
- [x] Initial agent definitions
- [x] Documentation framework

### Phase 2: Expansion
- [ ] Multi-agent orchestration patterns
- [ ] Skill composition experiments
- [ ] Interoperability protocols
- [ ] Performance benchmarks

### Phase 3: Advanced Topics
- [ ] Self-improving agents
- [ ] Emergent behavior studies
- [ ] Real-world deployment guides
- [ ] Community agent marketplace

## Resources

- [Getting Started Guide](docs/guides/getting-started.md)
- [Agent Catalog](AGENTS.md)
- [Research Documentation](docs/research/)
- [Changelog](CHANGELOG.md)

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the AI research and development community
- Inspired by advances in large language models and agent-based systems
- Special thanks to all contributors and researchers pushing the boundaries of AI agents

---

**Note:** This is a living document. As the project evolves, this README will be updated to reflect new capabilities, research findings, and community contributions.
