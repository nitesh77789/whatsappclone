const socket = io();

// Get DOM elements
const roomInput = document.getElementById('room-input');
const messageInput = document.getElementById('message-input');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const roomSelection = document.getElementById('room-selection');
const chatHeader = document.getElementById('chat-header');

// Prompt user for their name
const username = prompt('Enter your name:') || 'Anonymous';
let currentRoom = '';

function joinRoom() {
    const room = roomInput.value.trim();
    if (room) {
        currentRoom = room;
        socket.emit('joinRoom', { username, room });
        roomSelection.style.display = 'none';
        chatMessages.style.display = 'block';
        chatInput.style.display = 'flex';
        chatHeader.textContent = `Group: ${room}`;
        console.log(`Joined room: ${room}`);
    }
}

// Send message function
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chatMessage', { message });
        console.log(`Sent message: ${message}`);
        messageInput.value = '';
        socket.emit('stopTyping');
    }
}

// Format timestamp
function formatTimestamp(date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Display message in chat
function displayMessage(data) {
    const { username: sender, message, timestamp, messageId, status } = data;
    const type = sender === username ? 'sent' : 'received';

    console.log(`Displaying message from ${sender}: ${message} (Type: ${type})`);

    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    messageElement.dataset.messageId = messageId;

    // Add DP placeholder
    const dpElement = document.createElement('img');
    dpElement.classList.add('dp');
    dpElement.src = 'https://via.placeholder.com/40';
    messageElement.appendChild(dpElement);

    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');

    const usernameElement = document.createElement('div');
    usernameElement.classList.add('username');
    usernameElement.textContent = sender;
    contentElement.appendChild(usernameElement);

    const textElement = document.createElement('div');
    textElement.textContent = message;
    contentElement.appendChild(textElement);

    const timeElement = document.createElement('div');
    timeElement.classList.add('timestamp');
    timeElement.textContent = timestamp ? formatTimestamp(timestamp) : formatTimestamp(new Date());
    contentElement.appendChild(timeElement);

    // Add read receipt checkmarks
    const statusElement = document.createElement('div');
    statusElement.classList.add('status');
    updateMessageStatus(statusElement, status);
    contentElement.appendChild(statusElement);

    messageElement.appendChild(contentElement);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Mark message as read if it's not from the current user
    if (type === 'received') {
        console.log(`Marking message ${messageId} as read`);
        socket.emit('messageRead', messageId);
    }
}

// Update message status (read receipts)
function updateMessageStatus(statusElement, status) {
    statusElement.innerHTML = '';
    if (status === 'sent') {
        statusElement.innerHTML = '✔';
    } else if (status === 'delivered') {
        statusElement.innerHTML = '✔✔';
    } else if (status === 'read') {
        statusElement.innerHTML = '✔✔';
        statusElement.classList.add('read');
    }
}

// Show typing indicator
function showTypingIndicator(username) {
    let typingElement = document.getElementById('typing-indicator');
    if (!typingElement) {
        typingElement = document.createElement('div');
        typingElement.id = 'typing-indicator';
        typingElement.classList.add('message', 'received');
        chatMessages.appendChild(typingElement);
    }
    typingElement.textContent = `${username} is typing...`;
    console.log(`${username} is typing...`);
}

// Clear typing indicator
function clearTypingIndicator() {
    const typingElement = document.getElementById('typing-indicator');
    if (typingElement) {
        typingElement.remove();
    }
}

// Handle user joined/left notifications
function displayNotification(data) {
    const notificationElement = document.createElement('div');
    notificationElement.classList.add('notification');
    notificationElement.textContent = `${data.username} ${data.event === 'join' ? 'joined' : 'left'} the group`;
    chatMessages.appendChild(notificationElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    console.log(`Notification: ${notificationElement.textContent}`);
}

// Listen for incoming messages
socket.on('chatMessage', (data) => {
    console.log(`Received message: ${data.message} from ${data.username}`);
    displayMessage(data);
    clearTypingIndicator();
});

// Listen for message status updates
socket.on('messageStatus', (data) => {
    console.log(`Message status updated: ${data.messageId} -> ${data.status}`);
    const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (messageElement) {
        const statusElement = messageElement.querySelector('.status');
        updateMessageStatus(statusElement, data.status);
    }
});

// Listen for typing events
socket.on('typing', (data) => {
    showTypingIndicator(data.username);
});

socket.on('stopTyping', () => {
    clearTypingIndicator();
});

// Load previous messages
socket.on('loadMessages', (messages) => {
    console.log(`Loading ${messages.length} previous messages`);
    messages.forEach((data) => {
        displayMessage(data);
    });
});

// Handle user join/left
socket.on('userJoined', (data) => {
    displayNotification({ username: data.username, event: 'join' });
});

socket.on('userLeft', (data) => {
    displayNotification({ username: data.username, event: 'left' });
});

// Detect typing
messageInput.addEventListener('keypress', () => {
    socket.emit('typing');
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
        socket.emit('stopTyping');
    }, 2000);
});

messageInput.addEventListener('input', () => {
    if (messageInput.value.trim() === '') {
        socket.emit('stopTyping');
    }
});

// Send message on Enter key press
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});