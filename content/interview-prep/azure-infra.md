# Azure OpenAI & Enterprise LLM Infrastructure

> 🎯 **Interview Context**: STC is an enterprise telecom. They don't care about your hobby projects on the OpenAI API. They want to know you can operate LLMs inside corporate guardrails — data residency, rate limits, private networking, and compliance.

---

## 1. Azure OpenAI vs Direct OpenAI API

The #1 reason enterprises use Azure OpenAI instead of the direct OpenAI API:

**Data Privacy.** With Azure OpenAI:
- Your prompts and completions are NOT used to train or improve OpenAI's models
- Data stays within your Azure tenant's geographic region
- You get enterprise SLAs (99.9% uptime guarantees)
- Full audit logging via Azure Monitor

```
Direct OpenAI API:
  Your app → OpenAI servers (US) → response
  Data passes through OpenAI's infrastructure

Azure OpenAI:
  Your app → YOUR Azure subscription → Azure-hosted model → response
  Data never leaves your Azure boundary
```

### 💡 Interview One-Liner

> "We used Azure OpenAI specifically for data residency and compliance. Our customer conversations contain PII that cannot leave the region. Azure gives us the same GPT-4 models but within our private network boundary with enterprise audit trails."

---

## 2. Model Deployments and Management

In Azure OpenAI, you don't just "call gpt-4." You create a **deployment** — a named instance of a specific model version in a specific region.

### Deployment Architecture

```
Azure OpenAI Resource (East US)
  ├── deployment: "gpt4-production"    → gpt-4 (0613)
  ├── deployment: "gpt4-staging"       → gpt-4 (1106-preview)  
  ├── deployment: "gpt35-fast"         → gpt-3.5-turbo (0125)
  └── deployment: "embeddings-prod"    → text-embedding-3-small
```

```python
from openai import AzureOpenAI

client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_KEY"),
    api_version="2024-02-01",
    azure_endpoint="https://my-resource.openai.azure.com"
)

response = client.chat.completions.create(
    model="gpt4-production",  # This is your DEPLOYMENT name, not the model name
    messages=[{"role": "user", "content": "Hello"}]
)
```

### Why This Matters

- **Blue-green deployments**: Run staging on a newer model version while production stays stable
- **Regional compliance**: Deploy models in specific Azure regions to meet data residency requirements
- **Independent scaling**: Each deployment has its own rate limits

---

## 3. Rate Limits & Throttling (TPM / RPM)

Azure OpenAI rate limits are measured in **Tokens Per Minute (TPM)** and **Requests Per Minute (RPM)**, not just API calls.

### Standard Pay-As-You-Go Limits

| Model | Default TPM | Default RPM |
|---|---|---|
| GPT-4 | 10,000 | 30 |
| GPT-4 (high capacity) | 80,000 | 480 |
| GPT-3.5-Turbo | 120,000 | 720 |
| text-embedding-3-small | 350,000 | 2,100 |

### How to Handle Rate Limits in Production

```python
import time
from openai import RateLimitError

def call_with_backoff(client, messages, max_retries=5):
    """Exponential backoff for rate limits."""
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(
                model="gpt4-production",
                messages=messages
            )
        except RateLimitError:
            wait_time = (2 ** attempt) + random.uniform(0, 1)
            print(f"Rate limited. Retrying in {wait_time:.1f}s...")
            time.sleep(wait_time)
    raise Exception("Max retries exceeded")
```

### PTU vs Pay-As-You-Go (Provisioned Throughput Units)

| Dimension | Pay-As-You-Go | PTU (Provisioned) |
|---|---|---|
| **Pricing** | Per token, variable | Fixed monthly reservation |
| **Latency** | Variable (shared infra) | Guaranteed low (dedicated capacity) |
| **Rate limits** | TPM-based, can spike | Guaranteed throughput |
| **Best for** | Development, variable workloads | Production with predictable load |
| **Cost at scale** | Expensive | Cheaper per token at high volume |

### 💡 Interview Answer

> "For production workloads with predictable volume, I recommend PTUs. You reserve dedicated GPU capacity, which eliminates the latency spikes you get with shared pay-as-you-go infrastructure. For development and testing, pay-as-you-go makes sense because the traffic is bursty and unpredictable."

---

## 4. Private Networking & Security

Enterprise telecom architecture requires LLM traffic to stay inside private networks.

### The Architecture Stack

```
┌──────────────────────────────────┐
│        Your Application           │
│   (App Service / AKS / VM)       │
└─────────────┬────────────────────┘
              │  (Private Endpoint)
              │  Traffic stays in Azure backbone
              │  Never touches public internet
┌─────────────▼────────────────────┐
│     Azure OpenAI Resource         │
│   (Public access: DISABLED)       │
│   (Private endpoint: ENABLED)     │
└──────────────────────────────────┘
```

### Key Configuration

```bash
# Disable public access to your Azure OpenAI resource
az cognitiveservices account update \
    --name my-openai-resource \
    --resource-group my-rg \
    --public-network-access Disabled

# Create a private endpoint
az network private-endpoint create \
    --name openai-pe \
    --resource-group my-rg \
    --vnet-name my-vnet \
    --subnet ai-subnet \
    --connection-name openai-connection \
    --private-connection-resource-id /subscriptions/.../openAI/my-resource \
    --group-ids account
```

### Azure Content Safety

Azure adds a content filtering layer on top of the base models. Every request passes through filters for:
- **Hate speech** (severity: low/medium/high)
- **Sexual content**
- **Violence**
- **Self-harm**

You can configure thresholds per deployment, but you cannot fully disable them (unlike direct OpenAI API). This matters for medical or security use cases where the model needs to discuss sensitive topics.

---

## 5. Latency Optimization

Enterprise users expect fast responses. Here is how you reduce LLM latency:

### Streaming Responses
Start showing output to the user immediately instead of waiting for the full completion:

```python
stream = client.chat.completions.create(
    model="gpt4-production",
    messages=messages,
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

### Prompt Caching
Azure supports prompt caching — if the beginning of your prompt (system message + context) is identical across requests, Azure caches that prefix and only processes the new tokens. This reduces latency by 30-50% for systems with long, static system prompts.

### Model Selection for Latency
- **GPT-3.5-Turbo**: ~200ms first token, ~30 tokens/sec
- **GPT-4**: ~500ms first token, ~15 tokens/sec
- **GPT-4o**: ~250ms first token, ~50 tokens/sec

For customer-facing real-time chat, use GPT-4o or GPT-3.5-Turbo. Reserve GPT-4 for background analytical tasks where latency is less critical.

---

## Quick-Fire Interview Questions

<details>
<summary><strong>Q: How do you handle Azure OpenAI in multiple regions?</strong></summary>

Create separate Azure OpenAI resources in each region. Use Azure API Management or a custom load balancer to route requests to the nearest region. This serves two purposes: latency reduction (users hit the closest region) and compliance (data stays in-region). Implement failover so if one region hits rate limits, traffic routes to another.

</details>

<details>
<summary><strong>Q: How do you monitor LLM costs?</strong></summary>

Azure Cost Management tracks spend per deployment. I also log token counts (prompt_tokens, completion_tokens) from every API response to my own analytics dashboard. This lets me spot cost anomalies — like a runaway agent loop that's burning through tokens. Set up Azure Alerts for when daily spend exceeds thresholds.

</details>

<details>
<summary><strong>Q: What is the difference between Azure AI Services and Azure OpenAI?</strong></summary>

Azure AI Services is the umbrella — it includes Computer Vision, Speech, Language, and OpenAI. Azure OpenAI is specifically the hosted GPT/embedding models. They share the same authentication and networking patterns (private endpoints, managed identity) but have different endpoints and pricing.

</details>

<details>
<summary><strong>Q: How do you handle API key rotation?</strong></summary>

Never hardcode keys. Use Azure Managed Identity for service-to-service auth (no keys at all). If you must use keys, store them in Azure Key Vault with automatic rotation policies. Your application reads the key from Key Vault at startup and caches it. When the key rotates, your app fetches the new one on the next restart or cache expiry.

</details>
