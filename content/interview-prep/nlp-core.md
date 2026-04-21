# NLP Core: From Tokens to Transformers

> 🎯 **Interview Context**: For a telecom like STC, voice and text are the lifeblood of their AI applications. Demonstrating that you know what happens to a word *before* it hits an LLM (and *after* it leaves as voice) is critical. 

---

## 1. The Preprocessing Foundation

LLMs handle a lot of this natively now, but in classic NLP (and when building your GenAI Customer Insights extractor), you need to know how to clean data.

- **Tokenization**: Breaking text into units. A token isn't always a word. In modern subword tokenizers (like BPE used in GPT), "unhappiness" might be split into `["un", "happi", "ness"]`. This solves the "Out of Vocabulary" problem.
- **Lemmatization vs. Stemming**: 
  - *Stemming* aggressively chops the ends of words (e.g., "running" → "run", "better" → "bet"). It is fast but often grammatically wrong.
  - *Lemmatization* (what SpaCy does) uses dictionary lookups to return the proper root word (e.g., "better" → "good"). It is slower but contextually accurate.
- **Stop Words**: Removing "the", "a", "is". *Warning:* You don't remove stop words for LLMs or Deep Learning models! They need the grammatical context. You only remove stop words for classical algorithms like TF-IDF or Naive Bayes.

---

## 2. Embeddings: Words into Math

Models don't read English. They read matrices. The evolution of embeddings is the evolution of NLP.

### Static Embeddings (Word2Vec / GloVe)
In the old days, every word had exactly *one* vector. 
If the word was "bank", it had the same vector whether the sentence was "river bank" or "bank account." The model physically could not tell the difference.

### Contextual Embeddings (BERT / GPT)
This changed everything. In modern models, the vector for "bank" is dynamically calculated based on the surrounding words. The model looks at "river" and adjusts the vector for "bank" to mean "muddy edge of water."

---

## 3. The Transformer & Self-Attention

> 💡 **"Explain Self-Attention."** This is a guaranteed technical question. 

### The Simple Pitch
"Self-attention is a mechanism that allows a model to look at a sentence and weigh how important every other word is to the current word it's processing."

### The Deep Dive (Query, Key, Value)
Imagine a cocktail party. 
- **Query (What I want)**: You are looking around the room, thinking, "I need to find someone talking about PyTorch."
- **Key (What I have)**: Every person in the room is wearing a nametag that says what they are discussing.
- **Value (The actual output)**: When your Query matches someone's Key, you walk over and listen to their actual conversation (the Value).

In a sentence: *"The bank of the river."*
When processing the word "bank", its **Query** looks at the **Keys** of all other words. It heavily matches with the Key of "river". Therefore, it pulls the **Value** of the river context into itself, updating its mathematical representation.

**Why did Transformers replace LSTMs/RNNs?**
LSTMs had to process words sequentially (one arrow pointing to the next). Transformers process all words simultaneously in parallel across massive GPUs. Parallelization = scale. 

---

## 4. The Voice Bridge: STT and TTS

For STC, text is often just the middle layer. The outer layers are audio.

### STT (Speech-to-Text / ASR)
Turning audio waves into text. The latency bottleneck here usually comes from waiting for the user to finish speaking (Endpointing/VAD - Voice Activity Detection). 
*Your pitch*: "We used streaming inference for STT. Instead of waiting for the full audio file to land, we transcribe in chunks, anticipating the user's intent early."

### TTS (Text-to-Speech)
Turning text back into natural audio.
*SSML (Speech Synthesis Markup Language)*: The HTML of voice. It allows you to inject pauses, change pronunciation (lexicons), or alter pitch.
`<speak> Welcome to S T C. <break time="500ms"/> How can I help? </speak>`

### 💡 The Telecom Edge Story
> "In conversational AI, latency is the killer. If an LLM takes 2 seconds to generate text, and TTS takes 1 second to synthesize it, the 3-second pause feels unnatural on a phone call. I built streaming pipelines where the moment the LLM generates the first 5 words, the TTS synthesizes them and streams the audio back to the caller while the LLM is still finishing the rest of the sentence. This reduced perceived latency to under 500ms."
