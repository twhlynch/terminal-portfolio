const terminalElement = document.getElementById("terminal");
const trayElement = document.getElementById("tray");
const popupsElement = document.getElementById("popups");
const pastElement = document.getElementById("past");
const futureElement = document.getElementById("future");
const mobileElement = document.getElementById("mobile");
const keyboardElement = document.getElementById("keyboard");

let commandHistory = [];
let historyIndex = 0;
let activePopups = [];
let zIndex = 0;
let minimizedPopups = [];
let windowScale = 1;
let draggingElement = undefined;
let dragOffset = [0, 0];
let keyboardCreated = false;
let keyboardVisible = false;
let keyboardState = "normal";
let swipeStart = 0;
let swipeEnterStart = 0;

const popups = {
    "about": {
        type: "text",
        title: "Tom Lynch",
        text: "Hey, I'm Tom Lynch aka index. I'm a 19 y/o CS student and Web & Game Software developer. \nI am currently learning computer science at RMIT University, \nand working on <span command=\"grab\">GRAB</span> with SlinDev \n\nI have a broad interest in programming, ranging from designing and building websites, to VR Game development, and have a background in IT.",
    },
    "grab": {
        type: "text",
        title: "GRAB",
        text: "GRAB is a VR multiplayer parkour game developed by SlinDev. See <span url=\"https://grabvr.quest\">grabvr.quest</span> for GRAB, or <span url=\"https://grab-tools.live\">grab-tools.live</span> for GRAB Tools.",
    },
    "help": {
        type: "help",
        title: "Command Help",
        text: "",
    },
    "dvd": {
        type: "dvd",
        title: "DVD",
        text: "",
    },
    "contact": {
        type: "text",
        title: "Contact",
        text: "Feel free to contact me whenever, and i'll get back to you soon.\nEmail: <a target=\"_blank\" href=\"mailto:twhlynch.index@gmail.com\">twhlynch.index@gmail.com</a>\nGithub: <a target=\"_blank\" href=\"https://github.com/twhlynch\">@twhlynch</a>\nDiscord: <a target=\"_blank\" href=\"https://twhlynch.me/discord\">@.index</a>\nLinkedIn: <a target=\"_blank\" href=\"https://linkedin.com/in/twhlynch\">@twhlynch</a>\nYouTube: <a target=\"_blank\" href=\"https://youtube.com/@dotindex\">@dotindex</a>",
    },
    "languages": {
        type: "text",
        title: "Languages",
        text: "The languages I use most, are C++, JavaScript, and Python.\n\nI also have experience with: Java, PHP, Zig, HTML, CSS, TypeScript, React, Vue, THREE.JS, and others.\nThe main tools I use include Github & Git, VSCode, Blender, and AF Photo2.\nI am familiar with Linux, MacOS, and Windows.",
    },
    "setup": {
        type: "text",
        title: "My Setup",
        text: "I currently run an M2 MacBook Pro on MacOS15.\nI use VSCode as my IDE of choice, and Alacritty as my terminal.\nI use Arc as my browser, and Discord for community support.",
    }
};

const commands = {
    "help": () => {
        createPopup("help");
    },
    "about": () => {
        createPopup("about");
    },
    "contact": () => {
        createPopup("contact");
    },
    "grab": () => {
        createPopup("grab");
    },
    "languages": () => {
        createPopup("languages");
    },
    "setup": () => {
        createPopup("setup");
    },
    "clear": () => {
        for (let popup of activePopups) {
            popup.style.animationName = "pop-out";
            setTimeout(() => {popup.remove();}, 299);
        }
        activePopups = [];
    },
    "hide": () => {
        for (let popup of activePopups) {
            hidePopup(popup);
        }
    },
    "show": () => {
        for (let popup of minimizedPopups) {
            showPopup(popup);
        }
    },
    "tile": () => {
        let x = 5;
        let y = 5;

        for (let popup of activePopups) {
            let pw = popup.offsetWidth;
            let ph = popup.offsetHeight;

            if (y + ph > window.innerHeight) {
                y = 5;
                x += pw + 5;
            }

            if (x + pw > window.innerWidth) {
                x = 5;
                y = 5;
            }

            popup.style.left = x + "px";
            popup.style.top = y + "px";

            y += ph + 5;
        }
    },
    "+": () => {
        windowScale += 0.1;
        document.documentElement.style.setProperty("--window-scale", windowScale);
    },
    "-": () => {
        windowScale -= 0.1;
        document.documentElement.style.setProperty("--window-scale", windowScale);
    },
    "all": () => {
        runAll();
    },
    "forget": () => {
        commandHistory = [];
        historyIndex = 0;
        localStorage.removeItem("commandHistory");
        updateHistory();
    },
    "dvd": () => {
        createPopup("dvd");
    },
    "shuffle": () => {
        for (let popup of activePopups) {
            const [ randomX, randomY ] = getPopupPosition();
            popup.style.left = randomX + "px";
            popup.style.top = randomY + "px";
        }
        activePopups.sort(() => Math.random() - 0.5);
    },
    "sort": () => {
        activePopups.sort((a, b) => a.getAttribute("data-title").localeCompare(b.getAttribute("data-title")));
        execute("tile");
    },
    "spam": () => {
        let limit = 100;
        let loop = setInterval(() => {
            createPopup("help");
            limit--;
            if (limit <= 0) {
                clearInterval(loop);
            }
        }, 10);
    },
};

const aliases = {
    "clear": ["cls", "close", "exit", "quit", ":q"],
    "about": ["info", "tom", "index", "i", "me", "who"],
    "help": ["?", "h", "ls"],
    "grab": ["grabvr", "vr"],
    "hide": ["min", "tray"],
    "show": ["max"],
    "-": ["out"],
    "+": ["in"],
    "tile": ["grid"],
    "contact": ["socials", "talk"],
    "languages": ["skills", "code", "lang", "tools"],
    "setup": ["os", "config", "pc"]
};

window.addEventListener("keydown", (e) => {
    let key = e.key;
    input(key, e);
});

function input(key, e=undefined) {
    let currentText = terminalElement.textContent;

    if (key == "Enter")
    {
        if (currentText.trim().length > 0) {
            if (!commandHistory.includes(currentText.trim())) {
                commandHistory.push(currentText.trim());
            } else {
                commandHistory = commandHistory.filter(h => h != currentText.trim());
                commandHistory.push(currentText.trim());
            }
            localStorage.setItem("commandHistory", commandHistory.join(","));
        }
        execute(currentText);
        currentText = "";
        key = "";
    }

    if ([
        "Shift", "Control", "Meta", "Alt", "ArrowLeft", "ArrowRight", 
        "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", 
        "F11", "F12", "Tab", "Escape", "PageUp", "PageDown", "Home", 
        "End", "Insert", "Delete", "CapsLock", "NumLock", "ScrollLock", 
        "PrintScreen", "Pause"
    ].includes(key)) return;

    if (key == "ArrowUp") {
        key = "";
        if (historyIndex > 0) {
            historyIndex--;
            currentText = commandHistory[historyIndex];
        }
    } else if (key == "ArrowDown") {
        key = "";
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            currentText = commandHistory[historyIndex];
        } else if (historyIndex == commandHistory.length - 1) {
            historyIndex = commandHistory.length;
            currentText = "";
        }
    } else {
        historyIndex = commandHistory.length;
    }
    updateHistory();

    if (key === "Backspace") {
        if (e?.altKey || e?.ctrlKey || e?.metaKey || e?.shiftKey)
        {
            currentText = "";
        }
        currentText = currentText.slice(0, -1);
    } else {
        currentText += key;
    }

    if (currentText.length > 40)
    {
        currentText = currentText.slice(0, 40);
    }
    terminalElement.textContent = currentText;

    let valid = false;
    if (
        currentText.trim() in commands || 
        Object.values(aliases).some((v) => {return v.includes(currentText.trim())})
    ) valid = true;

    if (valid) {
        terminalElement.classList.add("valid");
    } else {
        terminalElement.classList.remove("valid");
    }
}

function generatePopup(popup) {
    const { type, title, text } = popup;

    const container = document.createElement("section");
    container.className = `popup popup-${type}`;
    container.setAttribute("data-title", title);

    const header = document.createElement("header");
    const content = document.createElement("div");

    const closeButton = document.createElement("button");
    closeButton.className = "close";
    closeButton.innerText = "×";
    header.appendChild(closeButton);

    const minimizeButton = document.createElement("button");
    minimizeButton.className = "minimize";
    minimizeButton.innerText = "−";
    header.appendChild(minimizeButton);

    container.appendChild(header);
    container.appendChild(content);

    const titleElement = document.createElement("h2");
    titleElement.textContent = title;

    header.appendChild(titleElement);

    const [ randomX, randomY ] = getPopupPosition();
    container.style.left = randomX + "px";
    container.style.top = randomY + "px";

    if (type == "text") {
        const textElement = document.createElement("p");
        textElement.innerHTML = text;

        content.appendChild(textElement);
    } else if (type == "help") {
        for (let command in commands) {
            const commandElement = document.createElement("div");
            const commandHeader = document.createElement("h3");
            commandHeader.textContent = command;
            commandElement.appendChild(commandHeader);
            const aliasesElement = document.createElement("div");
            commandElement.appendChild(aliasesElement);
            for (let alias of aliases[command] || []) {
                const aliasElement = document.createElement("span");
                aliasElement.textContent = alias;
                aliasesElement.appendChild(aliasElement);
            }
            content.appendChild(commandElement);
        }
    } else if (type == "dvd") {
        const textElement = document.createElement("p");
        textElement.textContent = text;

        content.appendChild(textElement);
        const direction = [
            Math.random() >= 0.5 ? 1 : -1,
            Math.random() >= 0.5 ? 1 : -1
        ];
        setInterval(() => {
            if (activePopups.includes(container)) {
                let newX = container.offsetLeft + direction[0];
                let newY = container.offsetTop + direction[1];
                container.style.left = newX + "px";
                container.style.top = newY + "px";
                if (newX > window.innerWidth - container.offsetWidth) direction[0] = -1;
                if (newX < 0) direction[0] = 1;
                if (newY > window.innerHeight - container.offsetHeight) direction[1] = -1;
                if (newY < 0) direction[1] = 1;
            }
        }, 1);
    } else if (type == "link") {
        const iframe = document.createElement("iframe");
        iframe.src = text;
        content.appendChild(iframe);
    }

    container.style.zIndex = zIndex;
    zIndex++;
    activePopups.push(container);

    closeButton.addEventListener("click", () => { closePopup(container); });
    minimizeButton.addEventListener("click", () => { hidePopup(container); });
    header.addEventListener("mousedown", (e) => {
        container.style.zIndex = zIndex;
        zIndex++;
        if (minimizedPopups.includes(container)) {
            showPopup(container);
        } else {
            draggingElement = container;
            dragOffset = [e.clientX - container.offsetLeft, e.clientY - container.offsetTop];
        }
    });
    header.addEventListener("touchstart", (e) => {
        container.style.zIndex = zIndex;
        zIndex++;
        if (minimizedPopups.includes(container)) {
            showPopup(container);
        } else {
            draggingElement = container;
            dragOffset = [e.touches[0].clientX - container.offsetLeft, e.touches[0].clientY - container.offsetTop];
        }
    });

    return container;
}

function closePopup(container) {
    container.style.animationName = "pop-out";
    setTimeout(() => {container.remove();}, 299);
    activePopups = activePopups.filter(p => p!== container);
}

function hidePopup(container) {
    container.style.animationName = "pop-out";
    setTimeout(() => {
        trayElement.appendChild(container);
    }, 299);
    activePopups = activePopups.filter(p => p !== container);
    minimizedPopups.push(container);
}

function showPopup(container) {
    minimizedPopups = minimizedPopups.filter(p => p !== container);
    activePopups.push(container);
    popupsElement.appendChild(container);
    container.style.animationName = "pop-in";
}

function createPopup(name) {
    const popup = popups[name];
    const element = generatePopup(popup);
    popupsElement.appendChild(element);
    return element;
}

function openSite(url) {
    let titleURL = url.replace("https://", "");
    if (titleURL.charAt(titleURL.length - 1) == '/') titleURL = titleURL.slice(0, titleURL.length - 1);
    const popup = {
        type: "link",
        title: titleURL,
        text: url
    };
    const element = generatePopup(popup);
    popupsElement.appendChild(element);
}

function updateHistory() {
    const pastHistory = commandHistory.slice(0, historyIndex);
    const futureHistory = commandHistory.slice(historyIndex + 1);

    for (let i = 0; i < 4; i++) {
        pastElement.children[i].innerText = "";
        futureElement.children[i].innerText = "";
    }

    for (let i = 0; i < Math.min(pastHistory.length, 4); i++) {
        const element = pastElement.children[i];
        element.textContent = pastHistory[pastHistory.length - 1 - i];
    }

    for (let i = 0; i < Math.min(futureHistory.length, 4); i++) {
        const element = futureElement.children[i];
        element.textContent = futureHistory[i];
    }
}

function runAll() {
    for(let popup in popups) {
        if (![
            "dvd"
        ].includes(popup)) execute(popup);
    }
}

function execute(command) {
    console.log(`Executing ${command}`);
    command = command.trim();

    if (command in commands) {
        commands[command]();
    }

    for (let alias in aliases) {
        if (aliases[alias].includes(command)) {
            execute(alias);
            break;
        }
    }
}

function getPopupPosition() {
    let max = 300 * windowScale;
    let randomX, randomY;
    if (Math.random() >= 0.5) {
        randomX = Math.random() >= 0.5 
            ? Math.random() * (window.innerWidth / 2 - max - 150) + 50
            : window.innerWidth / 2 + Math.random() * ((window.innerWidth / 2 - 2 * max - 150) + max + 50) + 100;
        randomY = Math.random() * (window.innerHeight - max);
    } else {
        randomY = Math.random() >= 0.5 
            ? Math.random() * (window.innerHeight / 2 - max - 50)
            : window.innerHeight / 2 + Math.random() * ((window.innerHeight / 2 - 2 * max - 150) + max + 50) + 50;
        randomX = Math.random() * (window.innerWidth - max);
    }
    return [ randomX, randomY ];
}

function setup() {
    const element = createPopup("help");
    trayElement.appendChild(element);
    activePopups = activePopups.filter(p => p !== element);
    minimizedPopups.push(element);

    let localHistory = localStorage.getItem("commandHistory");
    if (localHistory) {
        commandHistory = localHistory.split(",");
        historyIndex = commandHistory.length;
    }
    updateHistory();
}

function showKeyboardPopup() {
    mobileElement.style.opacity = "1";
    mobileElement.style.pointerEvents = "all";
}

function createKeyboard() {
    keyboardElement.innerHTML = "";
    const keys = [
        ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
        ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
        ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
        ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
        ["CapsLock", "Shift", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
    ];
    const shiftKeys = [
        ["~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+", "Backspace"],
        ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "{", "}", "|"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L", ":", "\"", "Enter"],
        ["Z", "X", "C", "V", "B", "N", "M", "<", ">", "?"],
        ["CapsLock", "Shift", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
    ];
    const charMap = {
        "Backspace": "⌫",
        "Tab": "→",
        " ": "␣",
        "Enter": "⏎",
        "CapsLock": "aA",
        "Shift": "⇧",
        "Control": "⌃",
        "Alt": "⌥",
        "Meta": "⌘",
        "ArrowUp": "▲",
        "ArrowDown": "▼",
        "ArrowLeft": "◄",
        "ArrowRight": "►"
    };
    const widths = {
        " ": 4,
        "Backspace": 2,
        "Shift": 2.5,
        "Enter": 3,
        "Tab": 2,
    };

    for (let row = 0; row < keys.length; row++) {
        const rowElement = document.createElement("div");
        for (let col = 0; col < keys[row].length; col++) {
            const keyElement = document.createElement("button");
            let key = keys[row][col];
            if (keyboardState == "shift" || keyboardState == "caps") {
                key = shiftKeys[row][col];
            }
            keyElement.setAttribute("data-key", key);
            if (key in widths) {
                keyElement.style.paddingInline = widths[key] / 2 + "em";
            }
            let keyVisual = key;
            if (key in charMap) {
                keyVisual = charMap[key];
            }
            keyElement.textContent = keyVisual;
            keyElement.addEventListener("touchstart", (e) => {
                e.preventDefault();

                if (key == "Shift") {
                    if (keyboardState == "normal") {
                        keyboardState = "shift";
                        createKeyboard();
                    } else if (keyboardState == "shift") {
                        keyboardState = "normal";
                        createKeyboard();
                    }
                } else if (key == "CapsLock") {
                    if (keyboardState == "normal") {
                        keyboardState = "caps";
                        createKeyboard();
                    } else if (keyboardState == "caps") {
                        keyboardState = "normal";
                        createKeyboard();
                    }
                } else {
                    if (keyboardState == "shift") {
                        keyboardState = "normal";
                        createKeyboard();
                    }
                    input(key);
                }
            });
            rowElement.appendChild(keyElement);
        }
        keyboardElement.appendChild(rowElement);
    }
    
    keyboardCreated = true;
}

document.addEventListener("mouseup", () => {
    draggingElement = undefined;
});
document.addEventListener("touchend", (e) => {
    draggingElement = undefined;

    if (e.target == document.body) {
        if (swipeStart - e.changedTouches[0].clientY < -100) {
            input("ArrowUp");
        } else if (swipeStart - e.changedTouches[0].clientY > 100) {
            input("ArrowDown");
        } else if (swipeEnterStart - e.changedTouches[0].clientX < -window.innerWidth / 3) {
            input("Enter");
        }
    }
});

document.addEventListener("mousemove", (e) => {
    if (draggingElement) {
        draggingElement.style.left = e.clientX - dragOffset[0] + "px";
        draggingElement.style.top = e.clientY - dragOffset[1] + "px";
    }
});
document.addEventListener("touchmove", (e) => {
    if (draggingElement) {
        draggingElement.style.left = e.touches[0].clientX - dragOffset[0] + "px";
        draggingElement.style.top = e.touches[0].clientY - dragOffset[1] + "px";
    }
});

document.addEventListener("click", (e) => {
    if (e.target.getAttribute("url")) {
        const url = e.target.getAttribute("url");
        openSite(url);
    } else if (e.target.getAttribute("command")) {
        const command = e.target.getAttribute("command");
        execute(command);
    }
});

document.addEventListener("touchstart", (e) => {
    showKeyboardPopup();

    if (e.target == document.body) {
        swipeStart = e.touches[0].clientY;
        swipeEnterStart = e.touches[0].clientX;
    }
});

mobileElement.addEventListener("touchstart", () => {
    if (!keyboardVisible) {
        keyboardElement.style.display = "flex";
        keyboardElement.style.animationName = "pop-in";
        keyboardVisible = true;
    
        if (!keyboardCreated) {
            createKeyboard();
        }
    } else {
        keyboardElement.style.animationName = "pop-out";
        keyboardVisible = false;
        setTimeout(() => {
            keyboardElement.style.display = "none";
        }, 299);
    }
});

setup();