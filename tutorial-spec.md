---
title: Tutorial Authoring Specification
version: 2.0.0
lastUpdated: 2026-04-19
---

# Tutorial Authoring Specification v2

This document governs the structure, tone, depth, and formatting conventions for all tutorials in the Study Antigravity learning framework.

## Depth & Length Guidelines

**Target length:** 1,200–2,500 words per tutorial. Density over volume. Every sentence must earn its place. No filler.

| Topic Density | Example Topics | Target Length |
|--------------|----------------|---------------|
| Focused/narrow | Context Managers, Error Handling | ~1,200 words |
| Standard | Generators, Decorators, Clustering | ~1,800 words |
| Dense/complex | Transformer Architecture, RAG Retrieval | ~2,500 words |

**Visual-first understanding:** Diagrams and tables before prose.
**Active, not passive:** Readers must interact, not just scroll.
**Essence extraction:** After reading, the core idea should stick in memory like a brand.

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

### 3. Essence Map
A visual diagram (Mermaid graph or simple ASCII art) placed immediately after the TL;DR that captures the *entire* concept in one glance. Do not skip this. Visual learning is mandatory.

### 4. Why This Matters
3-5 short paragraphs connecting the topic to:
- The reader's **daily work** as an AI engineer
- **Concrete use cases** they'll encounter (RAG pipelines, API servers, agents, etc.)
- **Interview relevance** — what this topic signals to an interviewer

### 5. Core Concepts
The bulk of the tutorial. Break into H3 subsections, each covering one focused idea. Each subsection should have:
- **Explanatory text** that builds intuition
- **Code examples** that are complete and runnable
- **Callout blocks** for key insights, warnings, and definitions
- **Tables** for comparisons and decision matrices (minimum 1 per tutorial)

### 6. In Practice (Zero to Hero Examples)
Real-world patterns, production code, and anti-patterns to avoid. 
**Every concept must be backed by exceptionally rich examples**. Do not just summarize; build the concept from absolute zero up to hero-level execution. Show the reader how this topic appears in actual AI engineering work, going step-by-step.

### 7. Dependency Bridges & Future Context
If a concept requires understanding a future topic (or if a specific detail only makes sense once you learn X), **explicitly state that**. Write callouts saying: *"Do not worry about X right now. If you don't understand this specific line, we will cover it in [Future Topic]—come back to this later."*

### 8. Interview Angle
4-6 interview questions using `<details>` blocks. Each answer should include:
- The actual answer (2-4 sentences)
- "What they're testing" (1 sentence — the meta-skill being evaluated)

### 9. Checkpoint Quiz
3 quick-fire multiple-choice questions that the user must answer correctly to mark the topic as "completed". Use the following syntax:

```markdown
### Checkpoint Quiz

? What does the `yield` keyword do?
- [ ] Terminates the function permanently
- [x] Pauses the function and returns a value
- [ ] Creates a new thread
- [ ] Imports an external module
```

### 10. Key Takeaways
- Bullet list of the 6-8 most important things to remember. 
- Use `<mark>` for the single most critical takeaway.
- **Mental Model:** End with a single-sentence analogy that makes the concept unforgettable (e.g., "A decorator is a gift wrapper for functions").

### 11. Connected Topics
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
- [ ] Essence Map is present after TL;DR
- [ ] Each H3 concept section has at least one code example
- [ ] At least 3 callout blocks are used across the tutorial
- [ ] At least 1 comparison table is included
- [ ] `<mark>` is used for 2-4 critical terms/phrases
- [ ] 4+ interview questions with detailed answers
- [ ] Checkpoint Quiz contains exactly 3 multiple-choice questions
- [ ] Key Takeaways section has 6-8 bullets + 1 Mental Model
- [ ] Connected Topics links use correct `#topic/id` format
- [ ] Density and word count follow the updated 1,200–2,500 word spec
