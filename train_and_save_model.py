
import numpy as np
import pandas as pd
import pickle
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from tensorflow import keras
from tensorflow.keras import layers, Input
import joblib


def create_sample_data():
    np.random.seed(42)
    n_samples = 1000
    
   
    X = np.random.randn(n_samples, 10)
    y = (X[:, 0] + X[:, 1] * 2 > 0).astype(int)  
    
    return X, y

def train_and_save_models():
    X, y = create_sample_data()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    print("="*50)
    print("Training Random Forest model...")
    print("="*50)
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_model.fit(X_train_scaled, y_train)

    with open('random_forest_model.pkl', 'wb') as f:
        pickle.dump({
            'model': rf_model,
            'scaler': scaler,
            'feature_names': [f'feature_{i}' for i in range(X.shape[1])]
        }, f)
    print("✓ Random Forest model saved as 'random_forest_model.pkl'")

    print("\n" + "="*50)
    print("Training Neural Network model...")
    print("="*50)

    nn_model = keras.Sequential([
        Input(shape=(X.shape[1],)),  # Use Input layer
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(32, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(16, activation='relu'),
        layers.Dense(1, activation='sigmoid')
    ])

    nn_model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy']
    )

    print("\nModel Architecture:")
    print("-"*50)
    nn_model.summary()
    print("-"*50)

    print("\nTraining Neural Network...")
    history = nn_model.fit(
        X_train_scaled, y_train,
        epochs=50,
        batch_size=32,
        validation_split=0.2,
        verbose=1
    )

    nn_model.save('neural_network_model.keras')
    joblib.dump(scaler, 'nn_scaler.pkl')
    print("\n✓ Neural Network model saved as 'neural_network_model.keras'")
    print("✓ Scaler saved as 'nn_scaler.pkl'")

    print("\n" + "="*50)
    print("Model Evaluation Results")
    print("="*50)

    rf_accuracy = rf_model.score(X_test_scaled, y_test)
    print(f"Random Forest Test Accuracy: {rf_accuracy:.4f}")

    nn_loss, nn_accuracy = nn_model.evaluate(X_test_scaled, y_test, verbose=0)
    print(f"Neural Network Test Accuracy: {nn_accuracy:.4f}")
    print(f"Neural Network Test Loss: {nn_loss:.4f}")

    print(f"\nTraining History:")
    print(f"Final Training Accuracy: {history.history['accuracy'][-1]:.4f}")
    print(f"Final Validation Accuracy: {history.history['val_accuracy'][-1]:.4f}")
    
    return rf_model, nn_model, scaler

if __name__ == "__main__":
    train_and_save_models()