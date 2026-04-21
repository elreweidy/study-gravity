# Classical ML & Evaluation Mathematics

> 🎯 **Interview Context**: Everyone in 2026 is an "AI Expert" who calls the OpenAI API. Very few are Data Scientists who understand statistical baselines. Proving you know classical ML proves you are a rigorously trained engineer.

---

## 1. Classical ML Paradigms

You must be able to rattle off the difference instantly if asked.

- **Supervised Learning**: The data has labels. You know the answers in the training set (e.g., predicting house prices, classifying emails as spam/ham). Algorithms: Linear Regression, Random Forest, SVM.
- **Unsupervised Learning**: The data has NO labels. The model must find structure on its own (e.g., customer segmentation, grouping similar genes). Algorithms: K-Means Clustering, PCA (Dimensionality Reduction).

---

## 2. The Bias-Variance Tradeoff

This is the most common classical ML interview question. It is the fundamental problem of modeling.

### High Bias (Underfitting)
The model is too simple. It makes huge assumptions and creates a rigid rule. It performs terribly on both the training data and the test data.
*Analogy:* Studying for a math test by memorizing that "every answer is 4." You fail the practice test and the real test.

### High Variance (Overfitting)
The model is too complex. It literally memorizes the training data, capturing all the noise and outliers instead of the underlying pattern. It performs perfectly on training data but completely bombing on the unseen test data.
*Analogy:* Memorizing the exact answers to the practice test but failing the real test because the questions changed slightly.

### The Tradeoff
You are always trying to find the sweet spot in the middle—a model complex enough to learn the pattern (low bias) but simple enough to generalize to unseen real-world data (low variance).

---

## 3. Evaluation Metrics Beyond "Accuracy"

Accuracy (Total Correct / Total Guesses) is a terrible metric if your data is imbalanced. 
If you are building a model to detect a rare disease that 1 in 1,000 people have, a model that simply predicts "Everyone is Healthy" will have 99.9% accuracy, but it is a completely useless, dangerous model.

### The Confusion Matrix Fundamentals
- **True Positives (TP)**: Model predicted Disease, Patient has Disease. (Good)
- **True Negatives (TN)**: Model predicted Healthy, Patient is Healthy. (Good)
- **False Positives (FP) [Type I Error]**: Model predicted Disease, Patient is Healthy. (False Alarm)
- **False Negatives (FN) [Type II Error]**: Model predicted Healthy, Patient has Disease. (Dangerous)

### Precision
*Out of all the times the model yelled "Positive!", how many times was it actually right?*
- `Precision = TP / (TP + FP)`
- **When to optimize for Precision:** When False Positives are very expensive. (e.g., Predicting if an email is spam. If you flag a crucial work email as spam, that's terrible. You want to be highly precise when you do flag something.)

### Recall (Sensitivity)
*Out of all the actual positive cases in reality, how many did the model successfully find?*
- `Recall = TP / (TP + FN)`
- **When to optimize for Recall:** When False Negatives are dangerous/expensive. (e.g., Your medical imaging project detecting inferior alveolar nerves or tumors. Sending a healthy person for a secondary scan [False Positive] is mildly annoying, but telling a sick person they are healthy [False Negative] is fatal. You want high recall to catch *everything*.)

### F1-Score
The Harmonic Mean of Precision and Recall. It punishes extreme values. If Precision is 1.0 but Recall is 0.1, the mathematical average is 0.55, but the F1-Score plunges to ~0.18, proving the model is unbalanced.

---

## 4. The Data Eng & Scrape Pitch

> 💡 **"Tell me about your classical data skills."**

"LLMs are restricted by the data they ingest. In classical data science, I didn't rely on clean Kaggle datasets. I used tools like BeautifulSoup and Selenium to engineer automated scraping pipelines, clean the dirty HTML noise, structure it with Pandas and NumPy, and categorized software companies autonomously. 

Understanding feature engineering and statistical validation means I can guarantee that the data feeding into my modern Agentic AI workflows isn't garbage. An LLM cannot fix mathematically biased data."
