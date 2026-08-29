const API_BASE_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    createFeatureInputs();
    loadHistory();
});

function createFeatureInputs() {
    const featuresContainer = document.getElementById('features-input');
    featuresContainer.innerHTML = '';
    
    for (let i = 0; i < 10; i++) {
        const featureDiv = document.createElement('div');
        featureDiv.className = 'feature-input';
        featureDiv.innerHTML = `
            <label for="feature-${i}">Feature ${i + 1}</label>
            <input type="number" id="feature-${i}" step="any" value="0" required>
        `;
        featuresContainer.appendChild(featureDiv);
    }
}

async function makePrediction() {
    const modelType = document.getElementById('model-type').value;
    const features = [];
    
    for (let i = 0; i < 10; i++) {
        const value = parseFloat(document.getElementById(`feature-${i}`).value);
        if (isNaN(value)) {
            alert(`Please enter a valid number for Feature ${i + 1}`);
            return;
        }
        features.push(value);
    }
    
    const predictBtn = document.getElementById('predict-btn');
    predictBtn.disabled = true;
    predictBtn.innerHTML = '<span class="loading"></span> Predicting...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model_type: modelType,
                features: features
            })
        });
        
        if (!response.ok) {
            throw new Error('Prediction failed');
        }
        
        const result = await response.json();
        displayPrediction(result);
        loadHistory(); 
        
    } catch (error) {
        alert('Error making prediction: ' + error.message);
    } finally {
        predictBtn.disabled = false;
        predictBtn.innerHTML = 'Predict';
    }
}

function displayPrediction(result) {
    const resultContainer = document.getElementById('prediction-result');
    const predictionClass = result.prediction === 1 ? 'prediction-positive' : 'prediction-negative';
    const predictionText = result.prediction === 1 ? 'Positive' : 'Negative';
    
    resultContainer.innerHTML = `
        <div class="prediction-card">
            <h3>Prediction Result</h3>
            <div class="prediction-value ${predictionClass}">${predictionText}</div>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${result.probability * 100}%">
                    ${(result.probability * 100).toFixed(2)}%
                </div>
            </div>
            <p><strong>Model Used:</strong> ${result.model_used}</p>
            <p><strong>Timestamp:</strong> ${new Date(result.timestamp).toLocaleString()}</p>
        </div>
    `;
}

async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/history?limit=10`);
        const history = await response.json();
        
        const historyBody = document.getElementById('history-body');
        historyBody.innerHTML = '';
        
        history.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(item.timestamp).toLocaleString()}</td>
                <td>${item.model_type}</td>
                <td>${item.prediction === '1' ? 'Positive' : 'Negative'}</td>
                <td>${(item.confidence * 100).toFixed(2)}%</td>
            `;
            historyBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

setInterval(loadHistory, 30000);