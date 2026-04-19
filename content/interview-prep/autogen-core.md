# AutoGen: Multi-Agent Conversations & Code Execution

> 🎯 **Interview Context**: AutoGen is Microsoft's answer to "what if agents could talk to each other?" If LangChain is about one agent using tools, AutoGen is about multiple agents collaborating. Know the distinction.

---

## The Core Idea

AutoGen's architecture is simple but powerful:

1. You create multiple **agents**, each with a specific role
2. Agents **talk to each other** in a structured conversation
3. One agent can write code, another can review it, a third can execute it
4. The conversation continues until a termination condition is met

This is fundamentally different from LangChain's single-agent-with-tools model. In AutoGen, the tools ARE other agents.

---

## 1. The Two Core Agent Types

### AssistantAgent — The LLM Brain

The `AssistantAgent` is powered by an LLM. It reads messages, reasons about them, and generates responses. Think of it as the "thinker."

```python
from autogen import AssistantAgent

analyst = AssistantAgent(
    name="DataAnalyst",
    system_message="""You are a senior data analyst. 
    When given a dataset question, write Python code to analyze it.
    Always explain your reasoning before writing code.""",
    llm_config={"model": "gpt-4", "temperature": 0}
)
```

### UserProxyAgent — The Human Stand-In

The `UserProxyAgent` acts on behalf of the human. It can:
- **Execute code** that the AssistantAgent writes
- **Provide human input** when needed
- **Auto-reply** based on rules you define

```python
from autogen import UserProxyAgent

executor = UserProxyAgent(
    name="CodeExecutor",
    human_input_mode="NEVER",          # Fully autonomous
    code_execution_config={
        "work_dir": "workspace",        # Where code files are saved
        "use_docker": True              # SAFETY: run in container
    },
    max_consecutive_auto_reply=5        # Stop after 5 back-and-forths
)
```

### 💡 The Interview One-Liner

> "In AutoGen, the AssistantAgent is the brain that writes code and reasons. The UserProxyAgent is the hands that execute code and provide feedback. They work together in a conversation loop until the task is done."

---

## 2. How a Two-Agent Conversation Works

```python
# Start the conversation — the executor sends the task to the analyst
executor.initiate_chat(
    analyst,
    message="Analyze sales_data.csv and find the top 5 products by revenue"
)
```

**What happens internally:**

```
[CodeExecutor → DataAnalyst]: "Analyze sales_data.csv and find the top 5 products by revenue"

[DataAnalyst → CodeExecutor]: "I'll load the CSV and group by product. Here's the code:
```python
import pandas as pd
df = pd.read_csv('sales_data.csv')
top5 = df.groupby('product')['revenue'].sum().nlargest(5)
print(top5)
```"

[CodeExecutor]: *executes the code in Docker*
[CodeExecutor → DataAnalyst]: "Output:
Product_A    $15,234
Product_B    $12,100
Product_C    $9,800
Product_D    $7,650
Product_E    $5,420"

[DataAnalyst → CodeExecutor]: "The top 5 products by revenue are:
1. Product_A: $15,234 (leading by 26% over #2)
2. Product_B: $12,100
..."

[CodeExecutor]: TERMINATE (task complete)
```

The key insight: **the conversation IS the control flow.** There are no if/else branches in your code. The agents negotiate the workflow through natural conversation.

---

## 3. Group Chat — Multiple Agents Collaborating

This is AutoGen's killer feature. You can set up a group chat where multiple specialized agents talk to each other.

```python
from autogen import GroupChat, GroupChatManager

# Define specialized agents
coder = AssistantAgent(
    name="Coder",
    system_message="You write Python code to solve problems. Only output code.",
    llm_config=llm_config
)

reviewer = AssistantAgent(
    name="CodeReviewer", 
    system_message="""You review code for bugs, security issues, and best practices. 
    Be specific about what's wrong and suggest fixes.""",
    llm_config=llm_config
)

tester = AssistantAgent(
    name="Tester",
    system_message="You write unit tests for the provided code. Use pytest.",
    llm_config=llm_config
)

executor = UserProxyAgent(
    name="Executor",
    code_execution_config={"use_docker": True},
    human_input_mode="NEVER"
)

# Create the group chat
group_chat = GroupChat(
    agents=[executor, coder, reviewer, tester],
    messages=[],
    max_round=12    # Maximum conversation turns
)

manager = GroupChatManager(groupchat=group_chat, llm_config=llm_config)

# Start the conversation
executor.initiate_chat(
    manager,
    message="Build a function that validates email addresses using regex"
)
```

**The conversation flow:**
```
Executor → "Build a function that validates email addresses"
   ↓ (Manager routes to Coder)
Coder → writes validate_email() function
   ↓ (Manager routes to Reviewer)  
Reviewer → "Line 3 doesn't handle unicode domains. Also, you should compile the regex."
   ↓ (Manager routes to Coder)
Coder → writes improved version
   ↓ (Manager routes to Tester)
Tester → writes 8 pytest test cases
   ↓ (Manager routes to Executor)
Executor → runs tests → "7 passed, 1 failed"
   ↓ (Manager routes to Coder)
Coder → fixes the edge case
   ↓ ... continues until all tests pass
```

### How Does the Manager Choose Who Speaks Next?

The `GroupChatManager` uses the LLM to decide which agent should respond next based on:
- The current conversation context
- Each agent's `system_message` (their role description)
- What was just said

You can also specify `speaker_selection_method="round_robin"` for a fixed rotation.

---

## 4. Code Execution Safety

This is a guaranteed interview question: "How do you safely execute LLM-generated code?"

### The Docker Isolation Pattern

```python
executor = UserProxyAgent(
    name="SafeExecutor",
    code_execution_config={
        "work_dir": "sandbox",
        "use_docker": "python:3.11-slim",  # Specify exact image
        "timeout": 60,                      # Kill after 60 seconds
    }
)
```

**Why Docker?**
- The LLM-generated code runs inside an isolated container
- It cannot access your host filesystem, network, or other processes
- If the code has an infinite loop, the timeout kills it
- If the code tries to `rm -rf /`, it only destroys the container

**Without Docker (development/testing):**
```python
code_execution_config={
    "work_dir": "sandbox",
    "use_docker": False  # Runs locally — ONLY for testing
}
```

### 💡 Interview Answer

> "In production, we always run LLM-generated code inside Docker containers with strict timeouts. The container has no network access and a read-only filesystem except for the working directory. This is non-negotiable because you cannot trust LLM-generated code — it might be syntactically correct but logically destructive."

---

## 5. AutoGen vs LangChain — When to Use Which

| Dimension | LangChain | AutoGen |
|---|---|---|
| **Mental Model** | One agent, many tools | Many agents, talking to each other |
| **Control Flow** | Defined by chains/graphs | Emergent from conversation |
| **Best For** | RAG pipelines, single-task agents, API integrations | Complex multi-step reasoning, code generation, review workflows |
| **Code Execution** | Not built-in (you add it) | First-class Docker sandboxing |
| **Production Readiness** | More mature ecosystem, LangSmith for monitoring | Newer, more experimental |
| **When Your System Is** | "Search → Reason → Answer" | "Plan → Code → Review → Test → Deploy" |

### 💡 The Killer Interview Answer

> "I use both, for different things. LangChain is my go-to for RAG pipelines and customer-facing chatbots where the workflow is predictable: retrieve context, generate answer, maybe call one tool. AutoGen shines when I need multiple perspectives on a problem — like having a coder, reviewer, and tester collaborating. The agents catch each other's mistakes in ways that a single agent with a review prompt never could."

---

## Quick-Fire Interview Questions

<details>
<summary><strong>Q: What if two agents disagree in a group chat?</strong></summary>

This is actually a feature, not a bug. When the Reviewer disagrees with the Coder, the conversation naturally produces a refinement cycle. The GroupChatManager routes the disagreement back to the Coder who produces an improved version. You control the maximum number of rounds to prevent infinite loops.

</details>

<details>
<summary><strong>Q: How do you terminate an AutoGen conversation?</strong></summary>

Multiple ways: (1) Max rounds reached. (2) An agent outputs a specific keyword like "TERMINATE". (3) The UserProxyAgent's `is_termination_msg` function returns True. (4) `max_consecutive_auto_reply` is reached. Always define at least two termination conditions as safety nets.

</details>

<details>
<summary><strong>Q: Can AutoGen agents call external APIs?</strong></summary>

Yes. You can register Python functions as tools on the AssistantAgent using `register_function()`. When the agent decides to use that function, AutoGen's runtime executes it. This bridges AutoGen and traditional API integrations similar to LangChain's tools.

</details>

<details>
<summary><strong>Q: How does AutoGen compare to CrewAI?</strong></summary>

CrewAI is inspired by AutoGen but adds the concept of "crews" with defined roles, goals, and backstories for each agent. It is more opinionated and easier to set up for simple multi-agent workflows. AutoGen is more flexible and lower-level — you have full control over the conversation protocol. Choose CrewAI for quick prototypes, AutoGen for complex, customized agent workflows.

</details>
