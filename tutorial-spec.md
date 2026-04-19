---
title: Tutorial Authoring Specification
version: 2.0.0
lastUpdated: 2026-04-19
---

# Tutorial Authoring Specification v2

This document governs the structure, tone, depth, and formatting conventions for all tutorials in the Study Antigravity learning framework.

## Depth & Length Guidelines

**Target length:** 2,500–5,000 words per tutorial, depending on topic density.

| Topic Density | Example Topics | Target Length |
|--------------|----------------|---------------|
| Focused/narrow | Context Managers, Error Handling | ~2,500 words |
| Standard | Generators, Decorators, Clustering | ~3,500 words |
| Dense/complex | Transformer Architecture, RAG Retrieval | ~5,000 words |

**Every word should count**, but the goal is that someone finishing a tutorial should:
1. Understand the *concept* well enough to explain it in an interview
2. Understand the *implementation* well enough to use it in production
3. Be aware of *pitfalls* that only experience normally teaches

## Required Sections

### 1. Frontmatter (YAML)
```yaml
---
id: topic-id
title: Full Topic Title
category: category-id
difficulty: beginner|intermediate|advanced
estimatedMinutes: 30-55
tags: [interview, core-concept]
prerequisites: [topic-id-1, topic-id-2]
lastUpdated: 2026-04-19
---
```

### 2. TL;DR
2-3 sentences. The "elevator pitch" — if someone reads only this, they should know what the topic is, why it matters, and the key insight.

### 3. Why This Matters
3-5 short paragraphs connecting the topic to:
- The reader's **daily work** as an AI engineer
- **Concrete use cases** they'll encounter (RAG pipelines, API servers, agents, etc.)
- **Interview relevance** — what this topic signals to an interviewer

### 4. Core Concepts
The bulk of the tutorial. Break into H3 subsections, each covering one focused idea. Each subsection should have:
- **Explanatory text** that builds intuition
- **Code examples** that are complete and runnable
- **Callout blocks** for key insights, warnings, and definitions
- **Tables** for comparisons and decision matrices

### 5. In Practice (Zero to Hero Examples)
Real-world patterns, production code, and anti-patterns to avoid. 
**Every concept must be backed by exceptionally rich examples**. Do not just summarize; build the concept from absolute zero up to hero-level execution. Show the reader how this topic appears in actual AI engineering work, going step-by-step.

### 6. Dependency Bridges & Future Context
If a concept requires understanding a future topic (or if a specific detail only makes sense once you learn X), **explicitly state that**. Write callouts saying: *"Do not worry about X right now. If you don't understand this specific line, we will cover it in [Future Topic]—come back to this later."*

### 6. Interview Angle
4-6 interview questions using `<details>` blocks. Each answer should include:
- The actual answer (2-4 sentences)
- "What they're testing" (1 sentence — the meta-skill being evaluated)

### 7. Key Takeaways
Bullet list of the 6-8 most important things to remember. Use `<mark>` for the single most critical takeaway.

### 8. Connected Topics
Links to prerequisites and next steps using hash-based navigation: `[Title](#topic/topic-id)`

## Visual Styling Conventions

### Callout Blocks
Use blockquotes with emoji prefixes. The app's JS post-processor transforms these into styled callout boxes:

```markdown
> 🔑 Key Insight text here — for the most important conceptual takeaways

> 📌 Definition text here — for precise definitions of terms

> ⚠️ Warning text here — for gotchas, bugs, and things that break in production

> 🎯 Interview Tip text here — for interview-specific advice

> 💡 Pro Tip text here — for efficiency tips and best practices

> ⚡ Example text here — for detailed walkthroughs of specific scenarios
```

### Highlighted Terms
Use `<mark>` for critical terms or phrases that the reader must internalize:
```markdown
<mark>in Python, functions are first-class objects</mark>
```

### Code Blocks
Always specify the language for syntax highlighting:
````markdown
```python
def example():
    pass
```
````

### Tables
Use tables liberally for:
- Decision matrices (when to use X vs Y)
- Feature comparisons
- Parameter explanations
- Algorithm complexities

### Bold & Emphasis
- **Bold** for key terms on first introduction
- *Italic* for emphasis and secondary callouts

## Tone & Voice

- **Accessible plain English** — The text must be simple to read for non-native English speakers. Avoid convoluted jargon, idioms, or overly academic prose. Speak plainly but densely.
- **Direct and confident** — state things, don't hedge.
- **Example Heavy (Zero to Hero)** — Never describe a concept theoretically without an immediate, deep, practical code example. 
- **Practical, not academic** — "this is how you'd actually use it" > "in the general case".
- **Second person** — "you" and "your"
- **Concise but complete** — no fluff, but don't skip explanations that build understanding
- **Real-world anchored** — every concept ties back to AI engineering work

## Quality Checklist

Before a tutorial is complete, verify:
- [ ] All code examples are syntactically correct and complete
- [ ] Each H3 concept section has at least one code example
- [ ] At least 3 callout blocks are used across the tutorial
- [ ] At least 2 tables are included for comparisons
- [ ] `<mark>` is used for 2-4 critical terms/phrases
- [ ] 4+ interview questions with detailed answers
- [ ] Key Takeaways section has 6-8 bullets
- [ ] Connected Topics links use correct `#topic/id` format
- [ ] Estimated reading time is realistic
