let currentRole = 'citizen';
let isLoginMode = false;

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const authType = urlParams.get('type') || 'login';
const roleParam = urlParams.get('role') || 'citizen';

// Set initial mode based on URL
isLoginMode = authType === 'login';
currentRole = roleParam;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Auth page loaded');
    console.log('Mode:', isLoginMode ? 'login' : 'signup');
    console.log('Role:', currentRole);
    
    // Set initial role tab
    switchRole(currentRole);
    updateAuthMode();
});

function switchRole(role) {
    currentRole = role;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.role === role) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show/hide location field for admin
    const locationGroup = document.getElementById('locationGroup');
    if (role === 'admin') {
        locationGroup.style.display = 'block';
        document.getElementById('location').required = true;
    } else {
        locationGroup.style.display = 'none';
        document.getElementById('location').required = false;
    }
}

function toggleAuthMode(event) {
    if (event) {
        event.preventDefault();
    }
    isLoginMode = !isLoginMode;
    updateAuthMode();
}

function updateAuthMode() {
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const btnText = document.getElementById('btnText');
    const switchText = document.getElementById('switchText');
    const switchLink = document.getElementById('switchLink');
    const nameGroup = document.getElementById('nameGroup');
    const phoneGroup = document.getElementById('phoneGroup');
    const errorMessage = document.getElementById('error-message');
    
    // Hide error message
    errorMessage.style.display = 'none';
    
    if (isLoginMode) {
        title.textContent = 'Welcome Back';
        subtitle.textContent = `Login as ${currentRole === 'citizen' ? 'Citizen' : 'Admin'}`;
        btnText.textContent = 'Login';
        switchText.textContent = "Don't have an account?";
        switchLink.textContent = 'Sign Up';
        nameGroup.style.display = 'none';
        phoneGroup.style.display = 'none';
    } else {
        title.textContent = 'Create Account';
        subtitle.textContent = `Sign up as ${currentRole === 'citizen' ? 'Citizen' : 'Admin'}`;
        btnText.textContent = 'Sign Up';
        switchText.textContent = 'Already have an account?';
        switchLink.textContent = 'Login';
        nameGroup.style.display = 'block';
        phoneGroup.style.display = 'block';
    }
}

document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name')?.value || '';
    const phone = document.getElementById('phone')?.value || '';
    const location = document.getElementById('location')?.value || '';
    
    // Validate
    if (!email || !password) {
        showError('Please fill in all required fields');
        return;
    }
    
    if (currentRole === 'admin' && !location) {
        showError('Please select your location');
        return;
    }
    
    if (!isLoginMode && !name) {
        showError('Please enter your full name');
        return;
    }
    
    const endpoint = isLoginMode ? '/api/login' : '/api/signup';
    
    const data = {
        email,
        password,
        role: currentRole,
        name,
        phone,
        location
    };
    
    console.log('Sending request to:', endpoint);
    console.log('Data:', data);
    
    // Show loading state
    const authBtn = document.getElementById('authBtn');
    const originalText = authBtn.innerHTML;
    authBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    authBtn.disabled = true;
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        console.log('Response status:', response.status);
        
        const result = await response.json();
        console.log('Response data:', result);
        
        if (!response.ok) {
            throw new Error(result.detail || 'Authentication failed');
        }
        
        // Store user info
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('token', result.token);
        
        console.log('Login successful, redirecting...');
        
        // Redirect based on role
        if (currentRole === 'citizen') {
            window.location.href = '/citizen-dashboard';
        } else if (currentRole === 'admin') {
            window.location.href = '/admin-dashboard';
        }
        
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Authentication failed');
        authBtn.innerHTML = originalText;
        authBtn.disabled = false;
    }
});

function showError(message) {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}