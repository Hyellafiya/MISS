// Global variables
let currentUser = null;
let currentChatId = null;
let chats = [];
let messageLimit = 10;
let isTyping = false;

// API Base URL
const API_BASE = '/api';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    checkAuth();
    initEventListeners();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme;
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.className;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.className = newTheme;
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeToggles = document.querySelectorAll('.theme-toggle i');
    themeToggles.forEach(toggle => {
        toggle.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    });
}

// Authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        updateUIForAuthenticatedUser();
        
        // Load chats if on chat page
        if (window.location.pathname.includes('chat.html')) {
            loadUserChats();
            loadUserInfo();
        }
    } else {
        // Redirect to login if trying to access protected pages
        if (window.location.pathname.includes('chat.html')) {
            window.location.href = 'login.html';
        }
    }
}

function updateUIForAuthenticatedUser() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userEmail = document.getElementById('userEmail');
    
    if (authButtons) authButtons.style.display = 'none';
    if (userMenu) {
        userMenu.style.display = 'flex';
        if (userEmail) userEmail.textContent = currentUser.email;
    }
}

// Login Form Handler
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;
        
        try {
            showLoading('loginBtn');
            
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            // Save auth data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            }
            
            showToast('Login successful! Redirecting...', 'success');
            
            // Redirect to chat
            setTimeout(() => {
                window.location.href = 'chat.html';
            }, 1500);
            
        } catch (error) {
            showToast(error.message, 'error');
            hideLoading('loginBtn', 'Log In');
        }
    });
}

// Register Form Handler
if (document.getElementById('registerForm')) {
    // Password strength checker
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }
    
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;
        
        // Validation
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        if (!terms) {
            showToast('Please accept the Terms of Service', 'error');
            return;
        }
        
        try {
            showLoading('registerBtn');
            
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, confirmPassword })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }
            
            // Save auth data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showToast('Registration successful! Redirecting...', 'success');
            
            // Redirect to chat
            setTimeout(() => {
                window.location.href = 'chat.html';
            }, 1500);
            
        } catch (error) {
            showToast(error.message, 'error');
            hideLoading('registerBtn', 'Create Account');
        }
    });
}

// Password strength checker
function checkPasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthBar = document.querySelector('.strength-bar');
    
    if (!strengthBar) return;
    
    let strength = 0;
    
    if (password.length >= 6) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[$@#&!]+/)) strength++;
    
    strengthBar.className = 'strength-bar';
    
    if (password.length === 0) {
        strengthBar.style.width = '0';
    } else if (strength <= 2) {
        strengthBar.classList.add('weak');
    } else if (strength <= 4) {
        strengthBar.classList.add('medium');
    } else {
        strengthBar.classList.add('strong');
    }
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Fill demo credentials
function fillDemoCredentials(type) {
    if (type === 'user') {
        document.getElementById('email').value = 'user@example.com';
        document.getElementById('password').value = 'user123';
    } else if (type === 'admin') {
        document.getElementById('email').value = 'admin@miss.ai';
        document.getElementById('password').value = 'Admin@123456';
    }
}

// Chat Functionality
async function sendMessage(message) {
    if (!message.trim()) return;
    
    const sendButton = document.getElementById('sendButton');
    const userInput = document.getElementById('userInput');
    
    try {
        // Disable input
        sendButton.disabled = true;
        userInput.disabled = true;
        
        // Add user message to UI
        addMessageToUI('user', message);
        
        // Clear input
        userInput.value = '';
        updateCharCount();
        
        // Show typing indicator
        showTypingIndicator();
        
        // Get token
        const token = localStorage.getItem('token');
        
        // Send to API
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: message,
                chatId: currentChatId
            })
        });
        
        const data = await response.json();
        
        // Hide typing indicator
        hideTypingIndicator();
        
        if (!response.ok) {
            if (response.status === 429) {
                // Rate limit reached
                showUpgradeModal();
                throw new Error(data.error || 'Daily message limit reached');
            }
            throw new Error(data.error || 'Failed to send message');
        }
        
        // Add assistant response to UI
        addMessageToUI('assistant', data.message);
        
        // Update chat ID if new chat
        if (!currentChatId && data.chatId) {
            currentChatId = data.chatId;
            loadUserChats();
        }
        
        // Update message limit display
        if (data.remainingMessages) {
            updateMessageLimit(data.remainingMessages);
        }
        
        // Auto-scroll
        scrollToBottom();
        
    } catch (error) {
        hideTypingIndicator();
        showToast(error.message, 'error');
    } finally {
        // Re-enable input
        sendButton.disabled = false;
        userInput.disabled = false;
        userInput.focus();
    }
}

// Add message to UI
function addMessageToUI(role, content, timestamp = new Date()) {
    const messagesContainer = document.getElementById('messagesContainer');
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    // Hide welcome message if it exists
    if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas ${role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
        </div>
        <div class="message-content">
            <div class="message-sender">${role === 'user' ? 'You' : 'MISS AI'}</div>
            <div class="message-text">${formatMessage(content)}</div>
            <div class="message-timestamp">
                <i class="far fa-clock"></i> ${timeString}
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Format message with markdown-like syntax
function formatMessage(content) {
    // Replace code blocks
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
        return `<pre><code class="language-${language || 'plaintext'}">${escapeHtml(code.trim())}</code></pre>`;
    });
    
    // Replace inline code
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Replace bold
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Replace italic
    content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Replace line breaks
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

// Escape HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Show typing indicator
function showTypingIndicator() {
    isTyping = true;
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'flex';
    }
}

// Hide typing indicator
function hideTypingIndicator() {
    isTyping = false;
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Load user chats
async function loadUserChats() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/chat/chats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            chats = data.chats;
            displayChatHistory();
        }
    } catch (error) {
        console.error('Failed to load chats:', error);
    }
}

// Display chat history
function displayChatHistory() {
    const chatList = document.getElementById('chatList');
    if (!chatList) return;
    
    if (chats.length === 0) {
        chatList.innerHTML = '<div class="no-chats">No chats yet</div>';
        return;
    }
    
    chatList.innerHTML = chats.map(chat => `
        <div class="chat-item ${chat._id === currentChatId ? 'active' : ''}" onclick="loadChat('${chat._id}')">
            <div class="chat-item-title">${escapeHtml(chat.title)}</div>
            <div class="chat-item-meta">
                <span><i class="far fa-clock"></i> ${new Date(chat.lastActivity).toLocaleDateString()}</span>
                <span>${chat.messageCount} messages</span>
            </div>
        </div>
    `).join('');
}

// Load specific chat
async function loadChat(chatId) {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/chat/chats/${chatId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentChatId = chatId;
            
            // Update UI
            const messagesContainer = document.getElementById('messagesContainer');
            messagesContainer.innerHTML = '';
            
            // Display messages
            data.chat.messages.forEach(msg => {
                if (msg.role !== 'system') {
                    addMessageToUI(msg.role, msg.content, new Date(msg.timestamp));
                }
            });
            
            // Update chat title
            document.getElementById('chatTitle').innerHTML = `<h3>${escapeHtml(data.chat.title)}</h3>`;
            
            // Highlight active chat
            displayChatHistory();
        }
    } catch (error) {
        showToast('Failed to load chat', 'error');
    }
}

// Create new chat
function newChat() {
    currentChatId = null;
    
    // Clear messages
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = `
        <div class="message welcome-message" id="welcomeMessage">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-sender">MISS AI</div>
                <div class="message-text">
                    👋 Hello! I'm MISS, your intelligent AI assistant. 
                    I can help you with coding, business questions, learning, and productivity tasks.
                    What would you like to explore today?
                </div>
                <div class="message-timestamp">
                    <i class="far fa-clock"></i> Just now
                </div>
            </div>
        </div>
    `;
    
    // Reset chat title
    document.getElementById('chatTitle').innerHTML = '<h3>New Conversation</h3>';
    
    // Remove active class from all chat items
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Clear current chat
function clearChat() {
    if (confirm('Are you sure you want to clear this chat?')) {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = `
            <div class="message welcome-message" id="welcomeMessage">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-sender">MISS AI</div>
                    <div class="message-text">
                        👋 Hello! I'm MISS. Chat cleared. How can I help you?
                    </div>
                    <div class="message-timestamp">
                        <i class="far fa-clock"></i> Just now
                    </div>
                </div>
            </div>
        `;
    }
}

// Clear all chats
async function clearAllChats() {
    if (!confirm('Are you sure you want to delete all chats? This action cannot be undone.')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/chat/chats`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            chats = [];
            displayChatHistory();
            newChat();
            showToast('All chats cleared', 'success');
        }
    } catch (error) {
        showToast('Failed to clear chats', 'error');
    }
}

// Load user info
async function loadUserInfo() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const user = data.user;
            
            // Update UI
            document.getElementById('sidebarUserEmail').textContent = user.email;
            document.getElementById('planBadge').textContent = 
                user.subscriptionType === 'pro' ? 'Pro Plan' : 'Free Plan';
            
            if (user.subscriptionType === 'free') {
                const limit = 10; // From env
                const remaining = limit - (user.messageCount || 0);
                document.getElementById('messageCount').textContent = 
                    `${user.messageCount || 0}/${limit}`;
                
                if (remaining <= 0) {
                    document.getElementById('messageCount').style.color = 'var(--danger-color)';
                }
            } else {
                document.getElementById('messageLimit').innerHTML = 
                    '<span>Messages:</span> <span>Unlimited</span>';
            }
        }
    } catch (error) {
        console.error('Failed to load user info:', error);
    }
}

// Update message limit display
function updateMessageLimit(remaining) {
    const messageLimitEl = document.getElementById('messageCount');
    if (messageLimitEl && typeof remaining === 'number') {
        messageLimitEl.textContent = `${remaining}/10`;
    }
}

// Show upgrade modal
function showUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('upgradeModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Handle upgrade
function handleUpgrade() {
    showToast('Stripe integration coming soon!', 'warning');
    closeModal();
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Event listeners
function initEventListeners() {
    // Theme toggle
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.addEventListener('click', toggleTheme);
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Chat form
    const chatForm = document.getElementById('chatForm');
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('userInput');
            sendMessage(input.value);
        });
    }
    
    // User input auto-resize
    const userInput = document.getElementById('userInput');
    if (userInput) {
        userInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            updateCharCount();
        });
        
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('chatForm').requestSubmit();
            }
        });
    }
    
    // New chat button
    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', newChat);
    }
    
    // Clear chat button
    const clearChatBtn = document.getElementById('clearChatBtn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', clearChat);
    }
    
    // Clear history button
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearAllChats);
    }
    
    // Menu toggle for mobile
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('chatSidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('show');
                }
            }
        });
    }
    
    // Modal close on outside click
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('upgradeModal');
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Update character counter
function updateCharCount() {
    const input = document.getElementById('userInput');
    const counter = document.getElementById('charCounter');
    
    if (input && counter) {
        const length = input.value.length;
        counter.textContent = `${length}/4000`;
        
        if (length > 3500) {
            counter.classList.add('near-limit');
        } else {
            counter.classList.remove('near-limit');
        }
        
        if (length >= 4000) {
            counter.classList.add('at-limit');
        } else {
            counter.classList.remove('at-limit');
        }
    }
}

// Scroll to bottom of messages
function scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

// Show loading state
function showLoading(buttonId) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        btn.disabled = true;
    }
}

// Hide loading state
function hideLoading(buttonId, text) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        btn.innerHTML = text || btn.dataset.originalText;
        btn.disabled = false;
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}