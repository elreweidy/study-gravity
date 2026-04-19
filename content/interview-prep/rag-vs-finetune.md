# RAG vs Fine-Tuning vs Prompting: When to Use What

> 🎯 **Interview Context**: This is the #1 architectural question in GenAI interviews. "Why did you choose RAG instead of fine-tuning?" You must have a crisp, decisive answer with tradeoffs — not a wishy-washy "it depends."

---

## The Decision Framework (Memorize This Table)

| Dimension | Prompting (In-Context) | RAG | Fine-Tuning |
|---|---|---|---|
| **Data freshness** | Static (training cutoff) | ✅ Real-time (fetches live docs) | Static (frozen at training time) |
| **Setup cost** | Zero | Medium (build retrieval pipeline) | High (curate dataset, train, evaluate) |
| **Per-query cost** | Low | Medium (embedding + retrieval + bigger prompt) | Low (smaller prompts needed) |
| **Knowledge source** | Model's training data only | External documents you control | Baked into model weights |
| **Customization depth** | Surface-level (format, tone) | Factual grounding | Deep behavioral changes |
| **Hallucination risk** | High (no grounding) | Low (grounded in retrieved docs) | Medium (can still confabulate) |
| **Best for** | Simple tasks, prototypes | Knowledge-heavy Q&A, support bots | Domain-specific language, specialized reasoning |

---

## When to Use Pure Prompting

**Use prompting when:**
- Your task is generic and well-covered by the model's training data
- You need a quick prototype (hours, not days)
- The knowledge required is common (programming, general knowledge, writing)
- Your context fits within the context window

**Real example:**
> "We needed a tool that summarizes meeting transcripts into action items. GPT-4 handles this perfectly with just a system prompt and a structured output format. No RAG or fine-tuning needed — meeting summaries are well within the model's training distribution."

---

## When to Use RAG

**Use RAG when:**
- Your users ask questions about YOUR specific data (company docs, product manuals, policies)
- The data changes frequently (knowledge base, documentation, pricing)
- You need citations — you want to point users to the source document
- You cannot or should not put sensitive data into model weights

### The RAG Architecture (Draw This in the Interview)

```
  ┌─────────────────────────────────────────┐
  │            INDEXING PHASE (offline)       │
  │                                           │
  │  Documents → Chunk → Embed → Vector Store │
  └─────────────────────────────────────────┘

  ┌─────────────────────────────────────────┐
  │           QUERY PHASE (real-time)         │
  │                                           │
  │  User Query                               │
  │     ↓                                     │
  │  Embed Query → Search Vector Store        │
  │     ↓                                     │
  │  Retrieve Top-K Chunks                    │
  │     ↓                                     │
  │  Augment Prompt: "Context: {chunks}       │
  │                   Question: {query}"      │
  │     ↓                                     │
  │  LLM generates grounded answer            │
  └─────────────────────────────────────────┘
```

### Critical RAG Design Decisions

**Chunking Strategy:**
```python
# Too small = chunks lack context, retrieval finds fragments
# Too large = chunks are unfocused, dilute the relevant info
# Sweet spot for most use cases:
chunk_size = 800      # characters
chunk_overlap = 200   # 25% overlap to catch boundary info
```

**Embedding Model Selection:**
- `text-embedding-3-small` — Fast, cheap, good for most use cases
- `text-embedding-3-large` — Better retrieval quality, 6x the cost
- Domain-specific models (like `gte-large`) if OpenAI embeddings underperform on your domain

**Hybrid Search (Advanced):**
Combine vector similarity search with keyword search (BM25). Vector finds semantically similar passages. Keywords catch exact matches (product IDs, error codes) that embeddings miss.

```python
# Example: FAISS for vector search + BM25 for keyword search
# Merge results with Reciprocal Rank Fusion
vector_results = faiss_store.similarity_search(query, k=5)
keyword_results = bm25_retriever.get_relevant_documents(query, k=5)
final_results = reciprocal_rank_fusion(vector_results, keyword_results)
```

### 💡 Interview Story

> "In our customer support system, we used RAG with our company's policy documents and product manuals. The key design decision was hybrid search — pure vector search missed exact product codes and error numbers, so we added BM25 keyword matching alongside it. This one change improved our answer accuracy from 78% to 91%."

---

## When to Use Fine-Tuning

**Use fine-tuning when:**
- You need the model to learn a new BEHAVIOR or STYLE, not just new facts
- You have a consistent, repetitive task where the output format is very specific
- You want to reduce prompt size (fine-tuned models need shorter prompts)
- Domain-specific jargon or reasoning patterns are not in the base model

### Fine-Tuning Does NOT Do What Most People Think

Common misconception: "I'll fine-tune the model on our company docs so it knows our products."

**This is wrong.** Fine-tuning teaches the model HOW to respond, not WHAT to know. If you want it to know your product catalog, use RAG. If you want it to respond in a specific tone, format, or reasoning style — fine-tune.

### When Fine-Tuning Makes Sense

| Use Case | Why Fine-Tuning Works Here |
|---|---|
| Medical report generation | Specific format, specialized terminology |
| Code review in your codebase style | Consistent style guide adherence |
| Sentiment analysis in Arabic telecom dialect | Base model doesn't handle this well |
| Structured data extraction from your specific PDF layouts | Pattern is highly repetitive and consistent |

### LoRA / QLoRA — The Efficient Approach

You don't fine-tune the entire model. That costs thousands of dollars and requires massive GPU clusters. Instead, you use **LoRA (Low-Rank Adaptation)**:

```python
# LoRA only trains a small number of adapter parameters
# Original model: 7 billion parameters (frozen)
# LoRA adapters: ~10 million parameters (trainable)
# Result: 99% less compute, nearly the same quality

from peft import LoraConfig, get_peft_model

lora_config = LoraConfig(
    r=16,              # Rank of the adapter matrices
    lora_alpha=32,     # Scaling factor
    target_modules=["q_proj", "v_proj"],  # Which layers to adapt
    lora_dropout=0.05
)

model = get_peft_model(base_model, lora_config)
# Now model.trainable_parameters() is ~0.1% of total
```

**QLoRA** goes further — it loads the base model in 4-bit quantization, reducing memory to the point where you can fine-tune a 70B parameter model on a single A100 GPU.

---

## The Hybrid Approach (What You Actually Do in Production)

In practice, you rarely use just one technique. The best systems layer them:

```
Layer 1: FINE-TUNING
  → Teach the model your company's communication style
  → Trained once, used forever

Layer 2: RAG
  → Ground every response in up-to-date documents
  → Eliminates hallucination about facts

Layer 3: PROMPTING  
  → Few-shot examples for edge cases
  → System prompt for guardrails and output format
```

### 💡 The Interview Answer

> "The question isn't RAG OR fine-tuning — it's which layer solves which problem. I use fine-tuning to teach the model our output format and domain vocabulary. I use RAG to ground responses in current, factual data. And I use prompting for guardrails and edge case handling. In our production system, all three were active simultaneously."

---

## The Cost-Benefit Decision Tree

```
Is the task generic and well-covered by GPT-4?
  ├─ YES → Pure prompting. You're done.
  └─ NO → Does the task require access to YOUR specific data?
              ├─ YES → RAG. Build the retrieval pipeline.
              │         Does retrieval accuracy plateau below your target?
              │           ├─ YES → Add hybrid search (BM25 + vector)
              │           └─ STILL NOT ENOUGH → Fine-tune embeddings on your domain
              └─ NO → Does the task require a specific OUTPUT behavior?
                        ├─ YES → Fine-tune with LoRA
                        └─ NO → Better prompting. Add more few-shot examples.
```

---

## Quick-Fire Interview Questions

<details>
<summary><strong>Q: Can fine-tuning reduce hallucination?</strong></summary>

Only partially. Fine-tuning can teach the model to say "I don't know" more often (if your training data includes examples of this). But it cannot prevent hallucination about facts the model doesn't have. For factual grounding, you MUST use RAG. The combination of fine-tuning (for behavior) + RAG (for facts) is the strongest anti-hallucination stack.

</details>

<details>
<summary><strong>Q: How much data do you need for fine-tuning?</strong></summary>

For LoRA on a 7B model: typically 500-5000 high-quality examples. Quality matters infinitely more than quantity. 500 perfect examples will outperform 10,000 noisy ones. Each example should represent the exact input/output behavior you want. Always hold out 10-20% for evaluation.

</details>

<details>
<summary><strong>Q: What is the biggest risk of RAG?</strong></summary>

Retrieving the wrong documents. If your chunking is bad or your embedding model doesn't understand your domain, the system will confidently generate an answer from irrelevant context. This is worse than no RAG because the user trusts the system ("it has access to our docs!") but gets wrong answers. Always measure retrieval precision before evaluating generation quality.

</details>

<details>
<summary><strong>Q: When would you NOT use RAG?</strong></summary>

When the task doesn't require external knowledge — creative writing, translation, code generation from specs. Also when latency is critical and you can't afford the retrieval overhead (50-200ms added). In those cases, a well-prompted or fine-tuned model without retrieval is faster and simpler.

</details>
