# train_crime_model.py
import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib

# Load your dataset
print("Loading crime dataset...")
df = pd.read_csv('crime_dataset - crime_dataset.csv')

# Display dataset info
print(f"\nDataset Shape: {df.shape}")
print(f"\nColumns: {df.columns.tolist()}")
print(f"\nFirst few rows:")
print(df.head())

# Check for missing values
print(f"\nMissing values:\n{df.isnull().sum()}")

# Identify text and label columns
# Based on your dataset, adjust these column names
# Common structure: complaint_text and crime_category
if 'complaint' in df.columns:
    text_column = 'complaint'
elif 'Complaint' in df.columns:
    text_column = 'Complaint'
elif 'description' in df.columns:
    text_column = 'description'
else:
    # Use first text column
    text_column = df.select_dtypes(include=['object']).columns[0]

if 'crime' in df.columns:
    label_column = 'crime'
elif 'Crime' in df.columns:
    label_column = 'Crime'
elif 'category' in df.columns:
    label_column = 'category'
elif 'Category' in df.columns:
    label_column = 'Category'
else:
    # Use last column if it's the target
    label_column = df.columns[-1]

print(f"\nUsing '{text_column}' as text column and '{label_column}' as label column")

# Data Preprocessing
X = df[text_column].astype(str)
y = df[label_column]

# Check class distribution
print(f"\nCrime categories distribution:")
print(y.value_counts())

# Split the dataset
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\nTraining set size: {len(X_train)}")
print(f"Testing set size: {len(X_test)}")

# Create Pipeline with Naive Bayes
print("\nCreating Naive Bayes Pipeline...")
pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(
        max_features=5000,
        stop_words='english',
        ngram_range=(1, 2),
        lowercase=True
    )),
    ('classifier', MultinomialNB(alpha=0.1))
])

# Train the model
print("Training the model...")
pipeline.fit(X_train, y_train)

# Evaluate the model
print("\n" + "="*50)
print("Model Evaluation")
print("="*50)

# Training accuracy
train_pred = pipeline.predict(X_train)
train_accuracy = accuracy_score(y_train, train_pred)
print(f"\nTraining Accuracy: {train_accuracy:.4f}")

# Testing accuracy
test_pred = pipeline.predict(X_test)
test_accuracy = accuracy_score(y_test, test_pred)
print(f"Testing Accuracy: {test_accuracy:.4f}")

# Classification Report
print("\nClassification Report:")
print(classification_report(y_test, test_pred))

# Save the model
model_data = {
    'pipeline': pipeline,
    'text_column': text_column,
    'label_column': label_column,
    'classes': list(y.unique()),
    'accuracy': test_accuracy
}

with open('crime_model.pkl', 'wb') as f:
    pickle.dump(model_data, f)

print("\n✓ Model saved as 'crime_model.pkl'")

# Test with sample complaint
print("\n" + "="*50)
print("Testing with sample complaints")
print("="*50)

sample_complaints = [
    "There is a theft in my neighborhood",
    "Someone is causing violence in the street",
    "Illegal parking on the road",
    "Loud noise from neighbors at night"
]

for complaint in sample_complaints:
    prediction = pipeline.predict([complaint])[0]
    probability = pipeline.predict_proba([complaint])[0]
    confidence = max(probability)
    print(f"\nComplaint: '{complaint}'")
    print(f"Predicted Crime: {prediction}")
    print(f"Confidence: {confidence:.2%}")