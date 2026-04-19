---
id: decorators
title: Decorators & Higher-Order Functions
category: foundations
difficulty: intermediate
estimatedMinutes: 40
tags: [interview, core-concept, performance]
prerequisites: []
lastUpdated: 2026-04-19
---

# Decorators & Higher-Order Functions

## TL;DR
Decorators are a tool in Python that lets you change how a function works without actually rewriting the function itself. In AI engineering, we use decorators constantly to automatically track how fast code runs, to securely cache expensive AI answers, and to easily set up API routes in frameworks like FastAPI.

---

## Why This Matters

Imagine you write an application that talks to OpenAI to summarize text. Soon, you realize you need to check how long the OpenAI call takes. Then, you realize you also need to retry the call if it fails. Then, you need to check if the user has enough credits.

If you write this logic inside every single function, your code becomes a massive, unreadable mess of `if/else` checks. 

> 🔑 Key Insight: A Decorator solves this by "wrapping" your function like a present. You just write your core logic once, and simply place a `@retry` or `@check_credits` tag on top of the function. The decorator handles all the complex rules automatically.

From an **interview perspective**, knowing how to read a decorator is beginner level. But knowing how to *build* a custom decorator that accepts arguments is a senior-level requirement for any system architecture role.

---

## Dependency Bridges & Future Context
> ⚠️ **Future Vision:** In this tutorial, we will mention handling network errors and saving things to a "Cache". If you do not completely understand how to handle exceptions yet, do not worry! We will cover that in depth in **[Error Handling & Defensive Coding](#topic/error-handling)**. For now, just focus purely on how the wrapper passes information up and down.

---

## Core Concepts (Zero to Hero)

### 1. Zero Level: Functions inside Functions
In Python, functions are just normal objects. You can treat them exactly like a string or a number. You can pass a function into another function, and you can even return a function!

Let's look at this absolutely basic example:

```python
# 1. We create a normal, boring function
def say_hello():
    print("Hello, AI Engineer!")

# 2. We create a function that takes ANOTHER function as an argument
def execute_twice(func):
    print("I am about to run your function twice...")
    func()
    func()

# 3. We pass our function in (Notice we do NOT use brackets '()' here!)
execute_twice(say_hello)

# Output:
# I am about to run your function twice...
# Hello, AI Engineer!
# Hello, AI Engineer!
```

### 2. Beginner Level: Building a Wrapper
A decorator is simply a function that takes in a function, creates a "wrapper" around it, and gives the wrapper back to you.

```python
def my_custom_decorator(original_function):
    # We define a new function inside, which wraps the original one
    def wrapper_function():
        print("--- [START] System Check ---")
        original_function() # We run the actual code here!
        print("--- [END] Clean Shutdown ---")
        
    return wrapper_function # We give back the new wrapper

# We can apply it manually:
def download_data():
    print("Downloading 10GB dataset...")

# We replace the original function with the wrapped version
download_data = my_custom_decorator(download_data)

download_data()

# Output:
# --- [START] System Check ---
# Downloading 10GB dataset...
# --- [END] Clean Shutdown ---
```

### 3. Intermediate Level: The `@` Syntax (The Magic Tool)
Doing `download_data = my_custom_decorator(download_data)` is annoying. Python gives us a shortcut. If you place `@my_custom_decorator` above a function, Python does that exact rewriting step for you automatically!

```python
@my_custom_decorator
def train_model():
    print("Model is training...")

train_model()
# Python automatically runs the wrapper!
```

### 4. Hero Level: Passing `*args` and `**kwargs`
What if the function we want to decorate takes arguments (like `def add_numbers(a, b):`)? Our simple wrapper from above would fail because `wrapper_function()` takes no arguments!

To make a decorator truly heroic and able to wrap *any* function, we must use `*args` (any number of normal arguments) and `**kwargs` (any number of keyword arguments like `name="John"`).

```python
def universal_logger(func):
    def wrapper(*args, **kwargs):
        print(f"Executing: {func.__name__} with inputs: {args}")
        # We must give the arguments to the function!
        result = func(*args, **kwargs) 
        print(f"Finished! Result was: {result}")
        return result # Always return the result!
    return wrapper

@universal_logger
def calculate_loss(prediction, target):
    return target - prediction

final_loss = calculate_loss(0.8, 1.0)
# Output:
# Executing: calculate_loss with inputs: (0.8, 1.0)
# Finished! Result was: 0.2
```

---

## In Practice

Let's look at exactly how this is used in serious AI environments.

### Practical Example: Measuring AI Latency
LLMs are slow. You need to know exactly how many seconds an API call took without writing `time.time()` 50 times in your scripts.

```python
import time

def track_speed(func):
    def wrapper(*args, **kwargs):
        start_time = time.time()
        
        # Execute the AI generation
        result = func(*args, **kwargs)
        
        end_time = time.time()
        print(f"⏱️ [SPEED ALERT] {func.__name__} took {end_time - start_time:.2f} seconds!")
        return result
    return wrapper

@track_speed
def ask_gpt4(prompt):
    # Simulating a slow API response
    time.sleep(2.5)
    return "This is the AI's answer."

response = ask_gpt4("Explain quantum computing.")
# Output: ⏱️ [SPEED ALERT] ask_gpt4 took 2.50 seconds!
```

### Anti-Pattern: Forgetting `functools.wraps`
When you use a wrapper, Python thinks the wrapper is now the actual function. It completely forgets the original function's name and documentation. This destroys autocomplete in your IDE!

```python
from functools import wraps

def safe_decorator(func):
    @wraps(func) # ⚠️ CRITICAL: Always use this! It copies the original name and docs over.
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper
```

---

## Interview Angle

<details>
<summary>🎯 Interview Tip: "Can you explain what `*args` and `**kwargs` do, and why they are strictly mandatory when writing a professional decorator?"</summary>
"`*args` catches any number of standard variables, and `**kwargs` catches any number of named variables (like `x=5`). They are mandatory in decorators because a decorator acts as a universal middle-man. Without them, the decorator would crash if applied to a function that requires specific inputs. By using `*args` and `**kwargs`, the decorator safely catches everything and passes it down flawlessly."

*What they're testing:* Do you understand how Python handles loose variables, and do you know how to build flexible, unbreakable code?
</details>

<details>
<summary>🎯 Interview Tip: "What happens if a decorated function is supposed to return a number, but when you run it, it returns `None`?"</summary>
"This happens when the engineer forgets to include the `return` statement inside the decorator's wrapper function. The wrapper executes the inner function, but forgets to capture the result and hand it back to the main application. A proper wrapper must always capture the output (`result = func()`) and explicitly return it."

*What they're testing:* Debugging hidden state. Missing returns in decorators is the most common bug junior developers make.
</details>

<details>
<summary>🎯 Interview Tip: "What does the `@wraps(func)` statement from the `functools` library do?"</summary>
"When Python wraps a function, it replaces the original function with the wrapper. This means the function loses its original name and docstring, breaking debugging tools and IDE autocomplete. `@wraps(func)` is a utility that copies the original function's identity (name, docs, and type hints) onto the wrapper, keeping the development experience intact."

*What they're testing:* Do you build code that plays nicely with team environments and IDE tooling?
</details>

---

## Key Takeaways

- A decorator is just a function that wraps another function to add hidden super-powers without changing the original code.
- <mark>Functions in Python are treated exactly like normal variables</mark>; you can pass them around naturally.
- The `@name` syntax is just a lazy shortcut. It does exactly the same thing as `func = name(func)`.
- Always use `*args` and `**kwargs` inside your wrappers so they can handle any input perfectly.
- Never forget to actually `return` the final result inside your wrapper!
- Always import and use `@wraps` from `functools` so your IDE doesn't lose track of the function names.

## Connected Topics
- Wondering how to apply decorators to error timeouts? Learn in [Error Handling & Defensive Coding](#topic/error-handling).
- Next up: Learn how to manage 50 gigabytes of data lazily using [Generators & Lazy Evaluation](#topic/generators-iterators).
