# Deep Learning: Architectures & Training

> 🎯 **Interview Context**: Because of your 'Ivy' project, they will assume you know what happens under the hood of DL frameworks. You need to be able to talk about the math of the training loop and architectural design choices.

---

## 1. The Deep Learning Training Loop

Whether you are using PyTorch, TensorFlow, or wrapping them in Ivy, building a neural network involves these four sequential steps repeated millions of times:

1. **Forward Pass (Prediction)**: The input data passes through the network's layers, multiplying by weights and adding biases, until it produces a prediction at the end.
2. **Loss Calculation (The Error)**: You measure how wrong the prediction was compared to the actual ground truth using a Loss Function.
3. **Backpropagation (The Blame Game)**: The algorithm runs backwards from the output to the input, using calculus (the chain rule) to calculate the *gradient*. It figures out exactly how much each weight contributed to the error.
4. **Optimization (The Fix)**: The Optimizer updates the weights, nudging them in the opposite direction of the gradient so the error will be smaller next time.

---

## 2. Loss Functions vs Optimizers

### Loss Functions (How wrong are we?)
The loss function depends entirely on what you are trying to predict.
- **Cross-Entropy Loss**: Used for Classification (e.g., predicting if an image is a cat or dog, or predicting the next word). It heavily penalizes confident wrong answers.
- **Mean Squared Error (MSE)**: Used for Regression (e.g., predicting a continuous number like house prices). 

### Optimizers (How do we fix the weights?)
- **SGD (Stochastic Gradient Descent)**: The grandfather of optimizers. It takes a step downhill based solely on the current batch's gradient. It's often slow and gets stuck in local minimums.
- **Adam (Adaptive Moment Estimation)**: The standard in modern deep learning. It tracks the "momentum" of past gradients. If you are rolling downhill in a stable direction, Adam accelerates. If the terrain gets bumpy, Adam slows down and adapts the learning rate for each individual weight.

---

## 3. Core Architectures

### CNNs (Convolutional Neural Networks)
Used heavily in your visual field projects (like 3D medical imaging).
- **Convolutions**: Filters (matrices) slide across an image to extract features (edges, textures, shapes). They preserve *spatial relationships* (pixels near each other are processed together).
- **Pooling**: Shrinks the image representation to reduce computation and make the model robust to shifts (if a tumor is slightly to the left, pooling ensures the model still detects it).

### RNNs / LSTMs (Recurrent Neural Networks)
The old king of sequential data (text, time-series). 
- **The flaw**: They process data one step at a time. To understand word 100, they must process words 1 to 99 first. This "vanishing gradient" problem means they forget early context, and they cannot be parallelized on GPUs.

### U-Net (Your Medical Imaging Project)
You used this for the Inferior Alveolar Nerve Detection.
- **Architecture**: It is shaped like a "U". It uses an encoder to downsample an image and capture the *context* ("what is this?"), and a decoder to upsample it back to its original size to output a segmentation mask, capturing the *localization* ("where exactly is it?").
- **Skip Connections**: It hardwires connections across the U, ensuring the high-resolution location details aren't lost during the deep compression.

---

## 4. The 'Ivy' Narrative (Your Secret Weapon)

> 💡 **"Tell me about your time at Ivy."**

"Deep Learning suffers from heavy fragmentation. If a research lab releases a state-of-the-art model in Jax, a production team running PyTorch can't use it easily. 

At Ivy, I developed the unified core framework that structurally abstracted these backends. By mapping operations from PyTorch, TensorFlow, Jax, and NumPy into a single computational graph, we effectively built a Rosetta Stone for deep learning arrays. This required an intimate understanding of how tensors, gradients, and auto-grad systems operated natively at the C++/CUDA levels across different math libraries. 

It taught me that frameworks don't matter—the underlying computational theory defines the system."
