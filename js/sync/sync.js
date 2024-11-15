// sync with server
async function sync() {
    window.wisk.utils.showLoading("Syncing with server...");
    console.log("PAGE", window.wisk.editor.pageId);
    
    var pages = await window.wisk.db.getAllKeys();
    // upload all offline pages and update their IDs
    var offlinePages = [];
    for (var i = 0; i < pages.length; i++) {
        if (pages[i].startsWith("of-")) {
            var offlinePage = await window.wisk.db.getItem(pages[i]);
            offlinePages.push(offlinePage);
        }
    }

    console.log("Offline pages:", offlinePages);
}

let socket;
let firstMsg = true;

function initializeWebSocket() {
    return new Promise((resolve, reject) => {
        socket = new WebSocket('wss://cloud.wisk.cc/v1/live');
        
        socket.addEventListener('open', (event) => {
            console.log('Connected to WebSocket server');
            resolve();
        });

        socket.addEventListener('message', (event) => {
            handleIncomingMessage(event.data);
        });

        socket.addEventListener('error', (event) => {
            console.error('WebSocket error:', event);
            reject(event);
        });

        socket.addEventListener('close', (event) => {
            console.log('WebSocket connection closed:', event.code, event.reason);
        });
    });
}

function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
    } else {
        console.log('Connection is not open. ReadyState:', socket ? socket.readyState : 'socket not initialized');
    }
}

function startMessageLoop(interval = 5000) {
    return setInterval(() => {
        sendMessage('hello');
    }, interval);
}

function stopMessageLoop(intervalId) {
    clearInterval(intervalId);
}

async function sendAuth() {
    var user = await document.querySelector('auth-component').getUserInfo();
    sendMessage(JSON.stringify({
        id: window.wisk.editor.pageId,
        token: user.token
    }));
}

async function live() {
    console.log("PAGE LIVE", window.wisk.editor.pageId);
    try {
        await initializeWebSocket();
        await sendAuth();
    } catch (error) {
        console.error('Error:', error);
    }
}

function sendJustUpdates(changes, allElements, newDeletedElements) {
    sendMessage(JSON.stringify({
        changes: changes,
        allElements: allElements,
        newDeletedElements: newDeletedElements
    }));
}

function handleIncomingMessage(message) {
    var m = JSON.parse(message);
    console.log('Received:', m);

    if (firstMsg) {
        initEditor(m);
        firstMsg = false;
    }

    if (!('uuid' in m)) {
        window.wisk.editor.handleChanges(m);
    }
}

window.addEventListener('online', () => {
    console.log('User is online');
});

window.addEventListener('offline', () => {
    console.log('User is offline');
});
