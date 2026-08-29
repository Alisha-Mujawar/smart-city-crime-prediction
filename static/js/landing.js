function showRoleSelection() {
    const modal = document.getElementById('roleModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('animate__animated', 'animate__fadeIn');
    }
}

function closeRoleModal() {
    const modal = document.getElementById('roleModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function selectRole(role) {
    if (role === 'citizen') {
        window.location.href = '/auth?type=signup&role=citizen';
    } else if (role === 'admin') {
        window.location.href = '/auth?type=login&role=admin';
    }
}

function goToLogin() {
    window.location.href = '/auth?type=login';
}

function scrollToHowItWorks() {
    const section = document.getElementById('how-it-works');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

document.addEventListener('click', function(event) {
    const modal = document.getElementById('roleModal');
    if (event.target === modal) {
        closeRoleModal();
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeRoleModal();
    }
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

function toggleMobileMenu() {
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
        navLinks.classList.toggle('show');
    }
}

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        const navLinks = document.getElementById('navLinks');
        if (navLinks) {
            navLinks.classList.remove('show');
        }
    });
});