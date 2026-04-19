# LLM Evaluation: Hallucination, Ragas, TruLens & Metrics

> 🎯 **Interview Context**: The question "How do you know your agent isn't hallucinating?" separates senior engineers from juniors. Anyone can build a demo. Only production engineers measure whether it actually works.

---

## Why Evaluation Is Make-or-Break

A demo chatbot that works 80% of the time gets applause. A production chatbot that works 80% of the time has a **20% failure rate**. At 10,000 queries/day, that is 2,000 wrong answers per day. In telecom customer service, those wrong answers generate escalations, complaints, and churn.

**Evaluation is not a feature. It is the difference between a toy and a product.**

---

## 1. The Three Things You Evaluate

### (A) Retrieval Quality (RAG systems)

"Did we find the right documents?"

| Metric | What It Measures | How to Compute |
|---|---|---|
| **Context Precision** | Are the retrieved chunks relevant to the question? | % of retrieved chunks that contain the answer |
| **Context Recall** | Did we find ALL the relevant chunks? | % of relevant chunks that were actually retrieved |
| **MRR (Mean Reciprocal Rank)** | Is the most relevant chunk ranked first? | 1/rank of the first correct result |

### (B) Generation Quality

"Is the answer correct and well-formed?"

| Metric | What It Measures | How to Compute |
|---|---|---|
| **Faithfulness** | Is the answer supported by the retrieved context? | Check each claim against source docs |
| **Answer Relevancy** | Does the answer actually address the question? | Semantic similarity between question and answer |
| **Correctness** | Is the answer factually right? | Compare against ground-truth reference answers |

### (C) End-to-End Quality

"Is the user happy?"

| Metric | What It Measures |
|---|---|
| **Task Completion Rate** | Did the user's problem get solved? |
| **Escalation Rate** | How often did the AI hand off to a human? |
| **User Satisfaction (CSAT)** | Post-interaction survey scores |
| **Resolution Time** | How long from first message to resolution? |

---

## 2. Hallucination Detection

Hallucination is when the LLM generates text that sounds confident but is factually wrong. There are two types:

### Intrinsic Hallucination
The model contradicts the source material it was given.

```
Context: "Our return policy allows returns within 30 days."
Question: "What is your return policy?"
Model Answer: "You can return items within 60 days for a full refund."
→ The model fabricated "60 days" when the source says "30 days"
```

### Extrinsic Hallucination
The model adds information that isn't in the source — it might be true or false, but it's not grounded.

```
Context: "Our return policy allows returns within 30 days."
Model Answer: "You can return items within 30 days. Most customers 
             find this very convenient compared to other retailers."
→ "Most customers find this convenient" is not from the source
```

### How to Detect Hallucination Automatically

**Method 1: Claim Decomposition**

```python
# Step 1: Break the answer into individual claims
claims = decompose_into_claims(answer)
# ["Returns are allowed within 30 days", 
#  "Full refund is provided",
#  "Most customers find this convenient"]

# Step 2: For each claim, check if the source supports it
for claim in claims:
    is_supported = check_entailment(source_context, claim)
    # Uses an NLI (Natural Language Inference) model
    # Returns: "entailed", "contradicted", or "neutral"
```

**Method 2: LLM-as-Judge**

```python
judge_prompt = f"""
Given the following context and answer, identify any statements 
in the answer that are NOT supported by the context.

Context: {context}
Answer: {answer}

For each unsupported statement, explain why it's not grounded.
If all statements are supported, say "FULLY GROUNDED".
"""

verdict = llm.generate(judge_prompt)
```

### 💡 Interview Answer

> "We used a two-layer hallucination check. First, an automated NLI model scored each response for faithfulness against the retrieved context. Second, we ran weekly audits with a sample of 100 conversations reviewed by domain experts. The automated check caught 90% of hallucinations in real-time; the human audit caught the subtle ones and helped us improve our prompts."

---

## 3. RAGAS Framework

**RAGAS** (Retrieval Augmented Generation Assessment) is the most widely used evaluation framework for RAG systems. It provides automated metrics without needing human-labeled ground truth for every question.

### Core RAGAS Metrics

| Metric | What It Measures | Score Range |
|---|---|---|
| **Faithfulness** | % of claims in the answer that are supported by context | 0 to 1 |
| **Answer Relevancy** | How relevant the answer is to the question | 0 to 1 |
| **Context Precision** | Are the retrieved docs relevant? | 0 to 1 |
| **Context Recall** | Did we retrieve all necessary info? | 0 to 1 |

### Using RAGAS in Code

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall
)
from datasets import Dataset

# Prepare your evaluation dataset
eval_data = {
    "question": ["What is our refund policy?", ...],
    "answer": ["You can return within 30 days...", ...],
    "contexts": [["Our policy allows returns within 30 days..."], ...],
    "ground_truth": ["Returns accepted within 30 days for full refund.", ...]
}

dataset = Dataset.from_dict(eval_data)

# Run evaluation
results = evaluate(
    dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall]
)

print(results)
# {'faithfulness': 0.92, 'answer_relevancy': 0.88, 
#  'context_precision': 0.85, 'context_recall': 0.79}
```

### Interpreting Scores

- **Faithfulness < 0.8**: Your model is hallucinating. Fix your prompts or retrieval.
- **Context Recall < 0.7**: Your retrieval is missing relevant docs. Fix chunking or embeddings.
- **Context Precision < 0.7**: You're retrieving irrelevant docs. Noise in the context confuses the LLM.
- **Answer Relevancy < 0.8**: The model answers a different question. Strengthen your system prompt.

---

## 4. TruLens — Observability for LLM Apps

TruLens takes a different approach: it wraps your LLM application and records every call, providing a dashboard for monitoring evaluation metrics over time.

```python
from trulens_eval import TruChain, Feedback, Select
from trulens_eval.feedback import Groundedness

# Wrap your existing LangChain chain
tru_chain = TruChain(
    your_langchain_chain,
    app_id="customer-support-v2",
    feedbacks=[
        Feedback(groundedness.groundedness_measure)
            .on(Select.RecordCalls.retrieve.rets)  # Retrieved docs
            .on_output()                            # Generated answer
    ]
)

# Now use tru_chain instead of your_langchain_chain
# TruLens records every interaction and computes metrics
response = tru_chain.invoke("What is the refund policy?")

# View results in the dashboard
tru.run_dashboard()  # Opens local web dashboard
```

**TruLens vs RAGAS:**
- RAGAS: batch evaluation on a test set (like unit tests)
- TruLens: continuous monitoring in production (like application monitoring)
- Use both: RAGAS for pre-deployment testing, TruLens for production observability

---

## 5. Building Your Evaluation Pipeline (Production Pattern)

### The Three-Stage Evaluation Architecture

```
STAGE 1: OFFLINE EVALUATION (pre-deployment)
  ├── Curated test set: 50-200 question/answer pairs
  ├── Run RAGAS metrics
  ├── Automated regression tests (did we get worse?)
  └── Gate: must pass all thresholds to deploy

STAGE 2: ONLINE EVALUATION (production monitoring)
  ├── TruLens/Langsmith tracing on every request
  ├── Real-time faithfulness scoring
  ├── Alert if metrics drop below threshold
  └── Log all low-confidence responses for review

STAGE 3: HUMAN EVALUATION (weekly/monthly)
  ├── Sample 100 production conversations
  ├── Domain experts rate: correct/partially correct/wrong
  ├── Identify failure patterns
  └── Feed findings back into prompts and retrieval
```

### Setting Thresholds

| Metric | Minimum for Production | Target |
|---|---|---|
| Faithfulness | 0.85 | 0.95 |
| Answer Relevancy | 0.80 | 0.90 |
| Context Precision | 0.75 | 0.85 |
| Task Completion Rate | 0.70 | 0.85 |
| Escalation Rate | < 0.30 | < 0.15 |

---

## 6. LLM-as-Judge Pattern

When you don't have ground-truth labels, use a stronger LLM to evaluate a weaker one.

```python
judge_prompt = """
You are an expert evaluator. Rate the following answer on a scale 
of 1-5 for each dimension:

QUESTION: {question}
CONTEXT PROVIDED: {context}  
ANSWER GIVEN: {answer}

Dimensions:
1. ACCURACY (1-5): Is the answer factually correct based on the context?
2. COMPLETENESS (1-5): Does the answer fully address the question?
3. CLARITY (1-5): Is the answer clear and easy to understand?
4. GROUNDEDNESS (1-5): Is every claim in the answer traceable to the context?

Return JSON: {"accuracy": X, "completeness": X, "clarity": X, "groundedness": X}
"""
```

### 💡 Interview Story

> "In production, we ran a three-tier evaluation system. Every response was scored in real-time by an automated groundedness check. Anything scoring below 0.85 was flagged. Weekly, we sampled 100 flagged conversations and had domain experts review them. The insights from those reviews went back into our system prompts and retrieval tuning. Over three months, our faithfulness score went from 0.82 to 0.95."

---

## Quick-Fire Interview Questions

<details>
<summary><strong>Q: How do you evaluate an agent (not just a chatbot)?</strong></summary>

Agents are harder because they take multiple steps. You evaluate: (1) Task completion — did it accomplish the goal? (2) Step efficiency — did it take a reasonable number of tool calls? (3) Error recovery — when a tool call fails, does the agent recover or crash? (4) No-op detection — does it avoid unnecessary actions? Build test scenarios with expected tool call sequences and compare.

</details>

<details>
<summary><strong>Q: What do you do when the model says "I don't know" too often?</strong></summary>

This usually means your retrieval is failing — the model correctly identifies that the context doesn't contain the answer. Check context recall first. If retrieval is fine, your prompt may be too conservative. Gradually loosen the "only answer from context" instruction and monitor faithfulness to find the right balance.

</details>

<details>
<summary><strong>Q: How do you A/B test LLM changes?</strong></summary>

Route 5-10% of production traffic to the new model/prompt. Log both responses. Use LLM-as-judge to compare quality at scale, then validate with human evaluation on a sample. Key metrics: task completion rate, user satisfaction, and average response latency. Don't just measure quality — slower responses might hurt UX even if they're more accurate.

</details>

<details>
<summary><strong>Q: What metrics do you report to stakeholders?</strong></summary>

Non-technical stakeholders don't care about faithfulness scores. Report: (1) Hours saved per week (2) Ticket resolution rate (3) Customer satisfaction change (4) Escalation rate trend (5) Cost per interaction vs. human agent cost. Translate ML metrics into business outcomes.

</details>
