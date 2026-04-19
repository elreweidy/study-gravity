# LangChain Deep Dive: Chains, Agents, Tools, Memory

> 🎯 **Interview Context**: When they ask about LangChain, they want to know you understand the architecture — not that you can import a library. Explain the WHY behind each component.

---

## The Core Mental Model

LangChain exists to solve one problem: **LLMs are stateless text-in-text-out machines, but real applications need memory, tools, and decision-making.**

LangChain wraps an LLM with:
1. **Chains** — predetermined sequences of steps
2. **Agents** — LLM-driven decision makers that choose steps dynamically
3. **Tools** — functions the LLM can call to interact with the outside world
4. **Memory** — persistent context across turns

---

## 1. Chains vs. Agents — The Critical Distinction

This is the #1 thing they will ask. Know this cold.

### Chains: Deterministic Pipelines

A **Chain** is a fixed sequence of operations. You define the steps at build time. The LLM has NO choice about what happens next.

```python
# A simple chain: always does step 1 → step 2 → step 3
from langchain.chains import LLMChain, SequentialChain

# Step 1: Summarize the document
summarize_chain = LLMChain(llm=llm, prompt=summarize_prompt)

# Step 2: Extract key entities
extract_chain = LLMChain(llm=llm, prompt=extract_prompt)

# Step 3: Generate a report
report_chain = LLMChain(llm=llm, prompt=report_prompt)

# These ALWAYS run in this exact order
pipeline = SequentialChain(
    chains=[summarize_chain, extract_chain, report_chain],
    input_variables=["document"]
)
```

**When to use Chains:**
- You know all the steps in advance
- The workflow is predictable
- You want maximum reliability and testability
- Example: "Summarize → Translate → Format" — every document goes through the same pipeline

### Agents: Dynamic Decision Makers

An **Agent** is fundamentally different. You give the LLM a set of tools and a goal, and the LLM itself **decides which tools to call, in what order, and when to stop.**

```python
from langchain.agents import initialize_agent, Tool

tools = [
    Tool(name="SearchDatabase", func=search_db, description="Search the customer database by ID or name"),
    Tool(name="GetWeather", func=get_weather, description="Get current weather for a city"),
    Tool(name="SendEmail", func=send_email, description="Send an email to a specified address"),
]

agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent="zero-shot-react-description",  # Uses ReAct prompting
    verbose=True
)

# The LLM decides which tools to use based on the query
agent.run("Find customer #1234 and email them today's weather in Riyadh")
```

**What happens internally (the ReAct loop):**
```
Thought: I need to find customer #1234 first
Action: SearchDatabase
Action Input: {"id": "1234"}
Observation: Customer found — name: Ahmed, email: ahmed@example.com

Thought: Now I need to get the weather in Riyadh
Action: GetWeather
Action Input: {"city": "Riyadh"}
Observation: 42°C, sunny, clear skies

Thought: Now I can compose and send the email
Action: SendEmail
Action Input: {"to": "ahmed@example.com", "body": "Today's weather in Riyadh: 42°C, sunny"}
Observation: Email sent successfully

Thought: I have completed all the tasks
Final Answer: I found customer #1234 (Ahmed) and emailed them the weather in Riyadh.
```

**When to use Agents:**
- The workflow depends on user input
- You need conditional logic ("if X, do Y, else do Z")
- The number of steps is unknown ahead of time
- Example: Customer service bot that might need to check an order, issue a refund, OR escalate — depending on what the user asks

### 💡 The Interview One-Liner

> "A Chain is a recipe — you follow the same steps every time. An Agent is a chef — it looks at what's in the fridge and decides what to cook."

---

## 2. Tools and Function Calling

Tools are how LLMs interact with the real world. The LLM cannot actually search a database or send an email — it generates a structured output (a function call) that YOUR code executes.

### How Tool Schemas Work

```python
# You define what the tool does and what inputs it expects
# The LLM reads this description to decide WHEN to use it

tools = [
    Tool(
        name="SearchOrders",
        func=search_orders,
        description="""
        Use this tool to search for customer orders.
        Input should be a JSON object with:
        - customer_id (required): string
        - status (optional): 'pending' | 'shipped' | 'delivered'
        Returns a list of matching orders.
        """
    )
]
```

**The critical insight:** The quality of your tool descriptions directly controls how well the agent performs. Vague descriptions = wrong tool calls. This is prompt engineering applied to tools.

### OpenAI Function Calling (Modern Approach)

```python
# OpenAI's native function calling — more structured than the older approach
functions = [
    {
        "name": "search_orders",
        "description": "Search for customer orders by ID and status",
        "parameters": {
            "type": "object",
            "properties": {
                "customer_id": {"type": "string", "description": "The unique customer ID"},
                "status": {
                    "type": "string",
                    "enum": ["pending", "shipped", "delivered"],
                    "description": "Filter by order status"
                }
            },
            "required": ["customer_id"]
        }
    }
]
```

**Interview tip:** If they ask "How does the LLM know which tool to call?" the answer is: **The LLM reads the tool descriptions and parameter schemas. It then generates a structured JSON output specifying which function to call and with what arguments. Your code parses that JSON and executes the actual function.**

---

## 3. Memory Management

LLMs have no memory. Every API call is independent. Memory in LangChain is a layer that injects previous conversation context into each new prompt.

### The Four Memory Types You Must Know

| Memory Type | How It Works | Pros | Cons | When To Use |
|---|---|---|---|---|
| `ConversationBufferMemory` | Stores every single message verbatim | Perfect recall | Token limit explodes on long conversations | Short conversations (<20 turns) |
| `ConversationBufferWindowMemory` | Stores only the last K messages | Bounded token usage | Loses early context | Medium conversations with recent-focus |
| `ConversationSummaryMemory` | Uses an LLM to summarize the history periodically | Compact, unbounded history | Costs extra LLM calls; may lose details | Long conversations (support tickets) |
| `VectorStoreMemory` | Embeds messages and retrieves semantically similar ones | Finds relevant context from ANY point in history | Setup complexity; retrieval may miss context | Multi-session, knowledge-heavy applications |

### Your Cross-Session Memory Story

When they ask about memory, connect it to your real experience:

> "In our system, we used a hybrid approach. Within a session, we kept a buffer window of the last 10 messages for immediate context. But across sessions, we stored conversation summaries in a vector store indexed by customer ID. When a returning user called back, we retrieved their previous interaction summaries and injected them into the system prompt. This is why our intent classification was so accurate — the system already knew the customer's history."

---

## 4. RAG — Retrieval Augmented Generation

RAG is not a product or library. It is a **pattern**: instead of relying solely on the LLM's training data, you retrieve relevant documents at query time and stuff them into the prompt.

### The RAG Pipeline (Know This Flow Cold)

```
User Query
    ↓
[1] EMBED the query → convert to a vector
    ↓
[2] SEARCH the vector store → find top-K similar documents
    ↓
[3] STUFF into prompt → "Here is the relevant context: {docs}\n\nNow answer: {query}"
    ↓
[4] LLM generates answer grounded in the retrieved documents
```

### The Components

**Document Loaders** → Read your data (PDFs, CSVs, HTML, databases, APIs)
```python
from langchain.document_loaders import PyPDFLoader
loader = PyPDFLoader("company_policy.pdf")
docs = loader.load()  # Returns list of Document objects
```

**Text Splitters** → Break documents into chunks (this is where most people mess up)
```python
from langchain.text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,       # Characters per chunk
    chunk_overlap=200,     # Overlap to avoid losing context at boundaries
    separators=["\n\n", "\n", ". ", " "]  # Split hierarchy
)
chunks = splitter.split_documents(docs)
```

**Embeddings** → Convert text to vectors
```python
from langchain.embeddings import OpenAIEmbeddings
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
```

**Vector Stores** → Store and search vectors
```python
from langchain.vectorstores import FAISS
vectorstore = FAISS.from_documents(chunks, embeddings)

# At query time:
relevant_docs = vectorstore.similarity_search("What is our refund policy?", k=4)
```

### 💡 Chunking Strategies — The Interview Trap

They might ask: "How do you decide chunk size?"

> "It depends on the document type. For dense technical docs, I use smaller chunks (500-800 chars) with higher overlap (20-30%) so each chunk is focused. For narrative text like support transcripts, I use larger chunks (1000-1500) because context spans longer passages. The key metric is retrieval precision — I test whether the right chunks come back for representative queries."

---

## Quick-Fire Interview Questions

<details>
<summary><strong>Q: What is LCEL (LangChain Expression Language)?</strong></summary>

LCEL is LangChain's modern way of composing chains using the pipe operator (`|`). Instead of wrapping everything in classes, you compose components declaratively:

```python
chain = prompt | llm | output_parser
```

It supports streaming, batching, and async natively. It replaced the older `LLMChain` class approach.

</details>

<details>
<summary><strong>Q: What is LangGraph?</strong></summary>

LangGraph is LangChain's framework for building **stateful, multi-step agent workflows** as a graph. Each node is a function, edges define transitions, and the state is passed between nodes. It gives you more control than the basic Agent executor — you can define conditional edges, loops, and human-in-the-loop breakpoints.

</details>

<details>
<summary><strong>Q: What is LangSmith?</strong></summary>

LangSmith is LangChain's observability platform. It traces every LLM call, tool invocation, and retrieval step in your chain/agent. You use it for debugging, evaluating output quality, and monitoring production performance. Think of it as "DataDog for LLM applications."

</details>

<details>
<summary><strong>Q: How do you handle hallucination in a RAG system?</strong></summary>

Three layers: (1) **Retrieval quality** — if you retrieve the wrong chunks, the LLM will hallucinate from bad context. Improve chunking and embedding quality. (2) **Prompt engineering** — explicitly instruct: "Only answer based on the provided context. If the answer is not in the context, say 'I don't know.'" (3) **Post-processing validation** — use an LLM-as-judge or RAGAS framework to score answer faithfulness against the retrieved source.

</details>
