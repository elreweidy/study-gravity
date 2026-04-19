---
id: context-managers
title: Context Managers & Resources
category: foundations
difficulty: intermediate
estimatedMinutes: 30
tags: [interview, core-concept, safety]
prerequisites: []
lastUpdated: 2026-04-19
---

# Context Managers & Resources

## TL;DR
Context managers guarantee that setup and teardown tasks (like opening and closing a database) happen safely, even if a massive error causes your code to violently crash. In AI Engineering, you must use the `with` keyword to strictly manage limited resources like GPU memory and network connections, otherwise your application will eventually freeze up and die.

---

## Why This Matters

When you write a tiny script to test ChatGPT on your shiny new laptop, you don't really care about "managing resources". The script starts, talks to the AI, and finishes in 3 seconds. The computer handles the cleanup perfectly.

But what happens when you build a real AI system supporting 1,000 users at once? 
Every time a user asks a question, your system opens a network port to talk to OpenAI. If the AI replies with an error—and your code crashes without formally closing that extremely specific network port—that port stays "open" forever. 

> 🔑 Key Insight: Crashing in modern AI infrastructure is completely normal because network connections are fragile. **Context Managers ensure your system degrades gracefully.** They act as a mathematical guarantee that if you open a door to access a limited resource, that door will be slammed shut whether the code succeeds, fails, or throws a fatal exception.

---

## Dependency Bridges & Future Context
> ⚠️ **Future Context:** At the end of this tutorial, we will briefly touch on how to manage context layers inside asynchronous tasks using `async with`. Do not worry about what `async` means right now! If you don't fully understand it, skip it and come back after you have successfully worked through the **[Asyncio](#topic/asyncio)** module.

---

## Core Concepts (Zero to Hero)

### 1. Zero Level: The `with` Keyword
If you have ever opened a file in Python, you have already used a Context Manager. 

```python
# The WRONG way to do it (Lacks defensive teardown):
file = open("data.txt", "r")
text = file.read()
# If file.read() crashes, the program halts right here!
# file.close() is never reached! The file is permanently locked!
file.close() 

# The RIGHT way to do it (Using a Context Manager):
with open("data.txt", "r") as file:
    text = file.read()
# Even if the sky falls and file.read() crashes violently, 
# the 'with' block GUARANTEES the file is closed automatically.
```

### 2. Beginner Level: Building a Class-Based Context Manager
To build your own context manager, you just create a standard Class with two special magic methods: 
- `__enter__()`: The specific actions to take when opening the door.
- `__exit__()`: The specific actions to take when closing the door.

Let's build a tool that times exactly how long the LLM takes to think, and always prints the final result, even if the model throws an error.

```python
import time

class AIStopwatch:
    def __init__(self, task_name):
        self.task_name = task_name

    def __enter__(self):
        print(f"[{self.task_name}] Clock started...")
        self.start_time = time.time()
        return self # We hand the object to the 'with' block

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        print(f"[{self.task_name}] Clock stopped! Took {duration:.2f} seconds.")
        
        if exc_type is not None:
            print(f"⚠️ Oh no! It crashed with error: {exc_val}")
            return False # Returning False means "Allow the crash to happen"

# Good run:
with AIStopwatch("GPT-4 Call"):
    time.sleep(1.5) # Simulating a good call

# Crash run:
with AIStopwatch("Database Query"):
    raise ValueError("Database disconnected!") 
    # Because of our Context Manager, the stopwatch STILL PRINTS THE TIME before crashing!
```

### 3. Intermediate Level: The `@contextmanager` Generator
Writing massive classes just to close a connection is extremely tedious. Python offers an elegant shortcut. If you combine the `@contextmanager` decorator with the `yield` keyword, you can build them in three specific lines of code!

```python
from contextlib import contextmanager
import os

@contextmanager
def temporary_api_key(temp_key):
    # 1. This area acts as the 'enter' method
    original_key = os.environ.get("OPENAI_API_KEY")
    os.environ["OPENAI_API_KEY"] = temp_key
    
    try:
        # 2. We pause the function and hand control over to the 'with' block
        yield
    finally:
        # 3. This area acts as the 'exit' method. 
        # The 'finally' guarantees it runs securely regardless of crashes!
        if original_key:
            os.environ["OPENAI_API_KEY"] = original_key

# Let's test it:
with temporary_api_key("sk-test-123"):
    print("Calling OpenAI safely with temporary key.")

print("Temporary key wiped securely.")
```

### 4. Hero Level: Async Context Loops
When you orchestrate multi-agent systems, everything happens concurrently across networks. Standard `with` locks are not equipped to handle asynchronous event loops. You must use `async with`, which natively triggers `__aenter__` and `__aexit__` under the hood to ensure non-blocking safety.

```python
import aiohttp
import asyncio

async def fetch_embeddings_securely(text):
    # We securely open the Network Session block
    async with aiohttp.ClientSession() as session:
        
        # We securely open the API Request block
        async with session.post("https://api.openai.com/.../embeddings", json={"input": text}) as response:
            
            # If the response times out, both blocks safely securely dissolve!
            return await response.json()
```

---

## In Practice

### Anti-Pattern: Swallowing Exceptions Dangerously
If your `__exit__` method returns the boolean `True`, Python assumes the fatal exception has been completely handled and completely silences the stack trace. 

```python
class BadSuppressor:
    def __enter__(self): pass
    def __exit__(self, exc_type, exc_val, exc_tb):
        print("Pretending everything is fine...")
        return True # ⚠️ DISASTER: Completely silences any crashes!

with BadSuppressor():
    raise ValueError("The vector storage is completely deleted!")

print("The application keeps running happily!")
# The app has absolutely no idea the database was destroyed.
```

> 💡 Pro Tip: Never return `True` from an `__exit__` method unless you are specifically building a rigorous error-suppression wrapper and you explicitly know exactly what you are doing mathematically!

---

## Interview Angle

<details>
<summary>🎯 Interview Tip: "When using the `@contextmanager` decorator, what happens if the code inside the `with` block raises an error and your generator doesn't have a `try/finally` block around the `yield`?"</summary>
"If there's no `try/finally` wrapper around the `yield`, the error violently rips through the generator and terminates it permanently. This means any cleanup code written *after* the `yield` line will never actually execute, causing a massive resource leak in production. The exact safety of the decorator relies entirely on placing the cleanup code inside that `finally` zone."

*What they're testing:* Do you actually know how the decorator magically converts a generator into a safe layout, or do you just blindly copy-paste the `yield` syntax?
</details>

<details>
<summary>🎯 Interview Tip: "You have a buggy script making API calls to an LLM. It repeatedly hits timeouts and crashes. Every time it crashes, it forgets to close the underlying network port. How do you definitively stop this?"</summary>
"I would immediately pull the network access logic inside a context manager via a `with` statement block. By ensuring the port's teardown code is encapsulated within an `__exit__` dunder method—or within the `finally` block of a generator—Python actively guarantees the port closure executes inherently as the execution scope drops, completely independent of the API exception."

*What they're testing:* Recognition that `try/except/finally` in main blocks is just manual, error-prone boilerplate for what a Context Manager does fundamentally by design.
</details>

---

## Key Takeaways

- <mark>Context managers isolate environment setups and teardowns</mark> into perfectly safe, isolated chunks of logic.
- The `with` statement guarantees that the exit code will absolutely run, even if your prompt triggers an unhandled system crash.
- Classes require manually implementing the `__enter__` and `__exit__` magic methods.
- You can rapidly build context managers using the `@contextmanager` decorator by putting a `yield` inside a `try...finally` block.
- For async agent loops hitting cloud LLM providers, always swap to utilizing `async with` blocks to prevent thread-locking.

## Connected Topics
- Ensure that the schemas surrounding these robust closures never fail by reviewing [Type Hints & Pydantic Validation](#topic/type-hints-pydantic).
