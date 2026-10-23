var col = 16;
var row = 9;

var game = document.getElementById("game");
var homeScreen = document.getElementById("home-screen");
var levelScreen = document.getElementById("level-screen");
var scoreScreen = document.getElementById("score-screen");
var gameScreen = document.getElementById("game-screen");

var selectedLevel = 1;
var currentScore = 0;
var shuffleCount = 7;
var hintCount = 5;
var comboCount = 0;
var memoryReady = false;
var memoryActive = false;
var memoryCardInUse = false;
var memorySeconds = 15;
var gameTimeLimit = 480;
var gameTimeLeft = 480;
var bombSeconds = 15;
var bombTile = null;
var gameTimer = null;
var bombTimer = null;
var memoryTimer = null;
var countdownTimer = null;
var edgeTimer = null;
var mismatchTimer = null;
var gameRunning = false;
var inputLocked = false;

var tiles = [];
var selectedCells = [];
var levelReturnScreen = "home-screen";
var highScoreKey = "pikachuHighScore";
var colorIndex = 0;

var colors = [
    "#ff5252",
    "#ff9800",
    "#ffeb3b",
    "#4caf50",
    "#00bcd4",
    "#3f51b5",
    "#9c27b0",
    "#e91e63"
];

showScreen(homeScreen);
updateHighScore();

document.getElementById("start-button").addEventListener("click", function () {
    startGame(selectedLevel);
});

document.getElementById("choose-level-button").addEventListener("click", function () {
    levelReturnScreen = "home-screen";
    showSelectedLevelHelp();
    showScreen(levelScreen);
});

document.getElementById("high-score-button").addEventListener("click", function () {
    updateHighScore();
    levelReturnScreen = "home-screen";
    showScreen(scoreScreen);
});

document.getElementById("score-back-button").addEventListener("click", function () {
    showScreen(levelReturnScreen === "game-screen" ? gameScreen : homeScreen);
});

document.getElementById("close-level-button").addEventListener("click", returnFromLevelMenu);
document.getElementById("back-level-button").addEventListener("click", returnFromLevelMenu);

document.getElementById("play-level-button").addEventListener("click", function () {
    startGame(selectedLevel);
});

document.querySelectorAll(".level-button").forEach(function (button) {
    button.addEventListener("click", function () {
        selectedLevel = Number(button.dataset.level);

        document.querySelectorAll(".level-button").forEach(function (item) {
            item.classList.remove("selected");
            item.setAttribute("aria-pressed", "false");
        });

        button.classList.add("selected");
        button.setAttribute("aria-pressed", "true");
        showSelectedLevelHelp();
    });
});

document.getElementById("restart-button").addEventListener("click", function () {
    startGame(selectedLevel);
});

document.getElementById("change-level-button").addEventListener("click", function () {
    levelReturnScreen = "game-screen";
    showSelectedLevelHelp();
    showScreen(levelScreen);
});

document.getElementById("shuffle-button").addEventListener("click", shuffleTiles);
document.getElementById("hint-button").addEventListener("click", showHint);
document.getElementById("memory-button").addEventListener("click", useMemoryCard);

document.getElementById("return-home-button").addEventListener("click", function () {
    gameRunning = false;
    stopAllTimers();
    showScreen(homeScreen);
});

function showScreen(screen) {
    [homeScreen, levelScreen, scoreScreen, gameScreen].forEach(function (item) {
        item.hidden = true;
    });

    screen.hidden = false;
}

function showSelectedLevelHelp() {
    var button = document.querySelector(
        '.level-button[data-level="' + selectedLevel + '"]'
    );
    var content = document.getElementById("level-help-content");

    if (button && content) {
        content.textContent = button.dataset.help || "";
        content.hidden = !content.textContent;
    }
}

function returnFromLevelMenu() {
    if (levelReturnScreen === "game-screen" && tiles.length > 0) {
        gameRunning = true;

        if (selectedLevel === 2) {
            startBombTimer();
        }

        if (selectedLevel === 4 && !memoryActive) {
            startEdgeAnimation();
        }

        showScreen(gameScreen);
    } else {
        showScreen(homeScreen);
    }
}

function startGame(level) {
    selectedLevel = level || selectedLevel;
    currentScore = 0;
    shuffleCount = 7;
    hintCount = 5;
    comboCount = 0;
    memoryReady = false;
    memoryActive = false;
    memoryCardInUse = false;
    memorySeconds = 15;
    gameTimeLeft = gameTimeLimit;
    bombSeconds = 15;
    bombTile = null;
    selectedCells = [];
    inputLocked = false;
    colorIndex = 0;
    gameRunning = true;

    stopAllTimers();

    document.getElementById("game-title").textContent =
        "PIKACHU — LEVEL " + selectedLevel;

    document.getElementById("game-note").textContent = "";
    document.getElementById("memory-panel").hidden = selectedLevel !== 4;
    document.getElementById("preview-countdown").hidden = true;
    document.getElementById("memory-timer").hidden = true;
    document.getElementById("memory-timer").textContent = "15s";
    document.getElementById("memory-progress").style.transform = "scaleY(0)";

    createBoard();
    showScreen(gameScreen);
    updateCounters();
    updateGameTimerDisplay();
    startGameTimer();

    if (selectedLevel === 2) {
        placeBomb();
        startBombTimer();
    }

    if (selectedLevel === 4) {
        startLevelFourPreview();
    }
}

function createBoard() {
    game.innerHTML = "";
    tiles = [];

    var values = [];

    for (var type = 1; type <= 36; type++) {
        values.push(type, type, type, type);
    }

    shuffleArray(values);

    for (var y = 0; y < row; y++) {
        var tr = document.createElement("tr");

        for (var x = 0; x < col; x++) {
            var index = y * col + x;
            var td = document.createElement("td");

            td.id = "cell." + y + "." + x;
            td.className = "cell";

            var tile = {
                element: td,
                type: values[index],
                removed: false,
                revealed: selectedLevel === 1 || selectedLevel === 2,
                bombKind: null,
                bombUsed: false
            };

            td.addEventListener("click", onTileClick);
            tiles.push(tile);
            tr.appendChild(td);
        }

        game.appendChild(tr);
    }

    if (selectedLevel === 3) {
        setupLevelThree();
    }

    if (selectedLevel === 4) {
        tiles.forEach(function (tile) {
            tile.revealed = true;
        });
    }

    ensurePossibleMove();
    drawTiles();
}

function setupLevelThree() {
    var hiddenTiles = tiles.slice();
    shuffleArray(hiddenTiles);

    var hiddenCount = Math.floor(tiles.length / 3);

    hiddenTiles.forEach(function (tile, index) {
        tile.revealed = index >= hiddenCount;
    });

    hiddenTiles = hiddenTiles.slice(0, hiddenCount);
    shuffleArray(hiddenTiles);

    for (var i = 0; i < Math.min(4, hiddenTiles.length); i++) {
        hiddenTiles[i].bombKind = i % 2 === 0 ? "lucky" : "unlucky";
    }
}

function drawTiles() {
    tiles.forEach(function (tile) {
        var cell = tile.element;

        cell.classList.remove(
            "selected",
            "hint",
            "hidden-tile",
            "memory",
            "bomb-lucky",
            "bomb-unlucky",
            "bomb-countdown"
        );

        cell.style.removeProperty("--memory-color");
        cell.removeAttribute("data-seconds");

        if (tile.removed) {
            cell.innerHTML = "";
            cell.style.visibility = "hidden";
            return;
        }

        cell.style.visibility = "visible";

        if (!tile.revealed && !memoryActive) {
            cell.innerHTML = "";
            cell.textContent = "?";
            cell.classList.add("hidden-tile");
        } else {
            var picture = document.createElement("img");

            picture.src = "Image/type" + tile.type + ".png";
            picture.alt = "";
            picture.draggable = false;

            picture.onerror = function () {
                cell.innerHTML = "";
            };

            cell.innerHTML = "";
            cell.appendChild(picture);
        }

        if (tile === bombTile && selectedLevel === 2) {
            cell.classList.add("bomb-countdown");
            cell.dataset.seconds = bombSeconds + "s";
        }

        if (selectedLevel === 4 && memoryActive && !memoryCardInUse) {
            cell.classList.add("memory");
            cell.style.setProperty(
                "--memory-color",
                colors[tile.type % colors.length]
            );
        }
    });

    selectedCells.forEach(function (tile) {
        if (!tile.removed) {
            tile.element.classList.add("selected");
        }
    });
}

function onTileClick(event) {
    if (!gameRunning || inputLocked) {
        return;
    }

    var tile = tiles.find(function (item) {
        return item.element === event.currentTarget;
    });

    if (!tile || tile.removed) {
        return;
    }

    if (selectedLevel === 3 && !tile.revealed) {
        tile.revealed = true;
        drawTiles();

        if (tile.bombKind && !tile.bombUsed) {
            tile.bombUsed = true;
            selectedCells = [];

            if (tile.bombKind === "lucky") {
                triggerLuckyBomb(tile);
            } else {
                triggerUnluckyBomb(tile);
            }

            return;
        }
    }

    if (selectedLevel === 4 && !memoryActive && !tile.revealed) {
        tile.revealed = true;
        drawTiles();
    }

    if (selectedCells.indexOf(tile) !== -1) {
        return;
    }

    if (selectedCells.length === 0) {
        selectedCells.push(tile);
        drawTiles();
        return;
    }

    var first = selectedCells[0];

    if (first.type === tile.type && canConnect(first, tile)) {
        first.removed = true;
        tile.removed = true;
        selectedCells = [];
        currentScore += 10;

        if (selectedLevel === 4) {
            comboCount++;

            if (memoryCardInUse && comboCount >= 2) {
                comboCount = 0;
                memorySeconds = 15;
                document.getElementById("memory-timer").textContent = "15s";
                document.getElementById("memory-progress").style.transform = "scaleY(1)";
            } else if (!memoryCardInUse && comboCount >= 2) {
                comboCount = 2;
                memoryReady = true;
            }
        }

        if (first === bombTile || tile === bombTile) {
            bombTile = null;
            bombSeconds = 15;

            if (selectedLevel === 2) {
                placeBomb();
            }
        }

        updateCounters();
        saveHighScoreIfNeeded();
        drawTiles();

        if (tiles.every(function (item) {
            return item.removed;
        })) {
            finishGame();
            return;
        }

        if (!hasPossibleMove()) {
            ensurePossibleMove();
            drawTiles();
        }
    } else {
        if (selectedLevel === 4) {
            comboCount = 0;
            memoryReady = false;
            updateCounters();
        }

        selectedCells = [tile];
        drawTiles();

        if (selectedLevel === 3) {
            first.revealed = false;
            drawTiles();
        }

        inputLocked = true;

        mismatchTimer = window.setTimeout(function () {
            if (!memoryActive) {
                if (!first.removed) {
                    first.revealed = false;
                }

                if (!tile.removed) {
                    tile.revealed = false;
                }
            }

            selectedCells = [];
            inputLocked = false;
            mismatchTimer = null;
            drawTiles();
        }, 650);
    }
}

function canConnect(first, second) {
    var firstIndex = tiles.indexOf(first);
    var secondIndex = tiles.indexOf(second);

    var startX = firstIndex % col;
    var startY = Math.floor(firstIndex / col);
    var endX = secondIndex % col;
    var endY = Math.floor(secondIndex / col);

    var queue = [{
        x: startX,
        y: startY,
        direction: -1,
        turns: 0
    }];

    var visited = {};
    var directions = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
    ];

    while (queue.length > 0) {
        var current = queue.shift();

        if (current.x === endX && current.y === endY) {
            return true;
        }

        for (var d = 0; d < directions.length; d++) {
            var nx = current.x + directions[d][0];
            var ny = current.y + directions[d][1];
            var turns = current.turns;

            if (current.direction !== -1 && current.direction !== d) {
                turns++;
            }

            if (nx < -1 || nx > col || ny < -1 || ny > row || turns > 2) {
                continue;
            }

            if (nx >= 0 && nx < col && ny >= 0 && ny < row) {
                var nextTile = tiles[ny * col + nx];

                if (nextTile !== first && nextTile !== second && !nextTile.removed) {
                    continue;
                }
            }

            var key = nx + "," + ny + "," + d;

            if (visited[key] !== undefined && visited[key] <= turns) {
                continue;
            }

            visited[key] = turns;

            queue.push({
                x: nx,
                y: ny,
                direction: d,
                turns: turns
            });
        }
    }

    return false;
}

function shuffleTiles() {
    if (!gameRunning || shuffleCount <= 0) {
        return;
    }

    var active = tiles.filter(function (tile) {
        return !tile.removed;
    });

    var values = active.map(function (tile) {
        return tile.type;
    });

    shuffleArray(values);

    active.forEach(function (tile, index) {
        tile.type = values[index];
    });

    shuffleCount--;
    selectedCells = [];
    ensurePossibleMove();
    drawTiles();
    updateCounters();
}

function showHint() {
    if (!gameRunning || hintCount <= 0) {
        return;
    }

    var pair = findPossiblePair();

    if (!pair) {
        ensurePossibleMove();
        pair = findPossiblePair();
    }

    if (!pair) {
        return;
    }

    hintCount--;

    if (selectedLevel === 3 || selectedLevel === 4) {
        pair[0].revealed = true;
        pair[1].revealed = true;
    }

    drawTiles();
    pair[0].element.classList.add("hint");
    pair[1].element.classList.add("hint");
    updateCounters();

    window.setTimeout(drawTiles, 1200);
}

function findPossiblePair() {
    var active = tiles.filter(function (tile) {
        return !tile.removed;
    });

    for (var i = 0; i < active.length; i++) {
        for (var j = i + 1; j < active.length; j++) {
            if (selectedLevel === 3 &&
                ((active[i].bombKind && !active[i].bombUsed) ||
                    (active[j].bombKind && !active[j].bombUsed))) {
                continue;
            }

            if (active[i].type === active[j].type &&
                canConnect(active[i], active[j])) {
                return [active[i], active[j]];
            }
        }
    }

    return null;
}

function hasPossibleMove() {
    return findPossiblePair() !== null;
}

function ensurePossibleMove() {
    var active = tiles.filter(function (tile) {
        return !tile.removed;
    });

    if (active.length < 2 || hasPossibleMove()) {
        return;
    }

    var values = active.map(function (tile) {
        return tile.type;
    });

    for (var i = 0; i < 100; i++) {
        shuffleArray(values);

        active.forEach(function (tile, index) {
            tile.type = values[index];
        });

        if (hasPossibleMove()) {
            return;
        }
    }
}

function placeBomb() {
    var active = tiles.filter(function (tile) {
        return !tile.removed;
    });

    if (active.length === 0) {
        bombTile = null;
        return;
    }

    bombTile = active[Math.floor(Math.random() * active.length)];
    bombSeconds = 15;
    drawTiles();
}

function startBombTimer() {
    stopBombTimer();

    bombTimer = window.setInterval(function () {
        if (!gameRunning || selectedLevel !== 2 || !bombTile) {
            return;
        }

        bombSeconds--;

        if (bombSeconds <= 0) {
            explodeBomb();
        } else {
            drawTiles();
        }
    }, 1000);
}

function stopBombTimer() {
    if (bombTimer !== null) {
        window.clearInterval(bombTimer);
        bombTimer = null;
    }
}

function explodeBomb() {
    if (!bombTile || bombTile.removed) {
        placeBomb();
        return;
    }

    var index = tiles.indexOf(bombTile);
    var cx = index % col;
    var cy = Math.floor(index / col);
    var nearby = [];

    for (var y = Math.max(0, cy - 1); y <= Math.min(row - 1, cy + 1); y++) {
        for (var x = Math.max(0, cx - 1); x <= Math.min(col - 1, cx + 1); x++) {
            var tile = tiles[y * col + x];

            if (!tile.removed && tile !== bombTile) {
                nearby.push(tile);
            }
        }
    }

    var values = nearby.map(function (tile) {
        return tile.type;
    });

    shuffleArray(values);

    nearby.forEach(function (tile, i) {
        tile.type = values[i];
    });

    bombTile = null;
    selectedCells = [];
    ensurePossibleMove();
    drawTiles();
    placeBomb();
}

function triggerLuckyBomb(bomb) {
    if (inputLocked) {
        return;
    }

    inputLocked = true;

    var index = tiles.indexOf(bomb);
    var cx = index % col;
    var cy = Math.floor(index / col);
    var affected = [];
    var positions = [
        [cx, cy],
        [cx, cy - 1],
        [cx, cy + 1],
        [cx - 1, cy],
        [cx + 1, cy]
    ];

    positions.forEach(function (position) {
        var x = position[0];
        var y = position[1];

        if (x < 0 || x >= col || y < 0 || y >= row) {
            return;
        }

        var tile = tiles[y * col + x];

        if (!tile.removed && affected.indexOf(tile) === -1) {
            affected.push(tile);
        }
    });

    var types = [];

    affected.forEach(function (tile) {
        if (types.indexOf(tile.type) === -1) {
            types.push(tile.type);
        }
    });

    types.forEach(function (type) {
        var count = affected.filter(function (tile) {
            return tile.type === type;
        }).length;

        if (count % 2 !== 0) {
            var extra = tiles.find(function (tile) {
                return !tile.removed &&
                    tile.type === type &&
                    affected.indexOf(tile) === -1;
            });

            if (extra) {
                affected.push(extra);
            }
        }
    });

    window.setTimeout(function () {
        affected.forEach(function (tile) {
            tile.removed = true;
            currentScore += 5;
        });

        inputLocked = false;
        selectedCells = [];
        updateCounters();
        saveHighScoreIfNeeded();
        drawTiles();

        if (tiles.every(function (tile) {
            return tile.removed;
        })) {
            finishGame();
        } else {
            ensurePossibleMove();
        }
    }, 450);
}

function triggerUnluckyBomb(bomb) {
    inputLocked = true;

    var index = tiles.indexOf(bomb);
    var cx = index % col;
    var cy = Math.floor(index / col);
    var positions = [
        [cx, cy],
        [cx, cy - 1],
        [cx, cy + 1],
        [cx - 1, cy],
        [cx + 1, cy]
    ];

    positions.forEach(function (position) {
        var x = position[0];
        var y = position[1];

        if (x < 0 || x >= col || y < 0 || y >= row) {
            return;
        }

        var tile = tiles[y * col + x];

        if (!tile.removed) {
            tile.revealed = false;
        }
    });

    selectedCells = [];
    drawTiles();

    window.setTimeout(function () {
        inputLocked = false;
        drawTiles();
    }, 500);
}

function startLevelFourPreview() {
    var countdown = document.getElementById("preview-countdown");
    var seconds = 3;

    memoryActive = true;
    inputLocked = true;

    tiles.forEach(function (tile) {
        tile.revealed = true;
    });

    countdown.hidden = false;
    countdown.textContent = seconds;
    drawTiles();

    countdownTimer = window.setInterval(function () {
        seconds--;

        if (seconds > 0) {
            countdown.textContent = seconds;
        } else {
            window.clearInterval(countdownTimer);
            countdownTimer = null;
            countdown.hidden = true;
            memoryActive = false;
            inputLocked = false;

            tiles.forEach(function (tile) {
                if (!tile.removed) {
                    tile.revealed = false;
                }
            });

            drawTiles();
            updateCounters();
            startEdgeAnimation();
        }
    }, 1000);
}

function useMemoryCard() {
    if (!gameRunning || selectedLevel !== 4 || !memoryReady || memoryActive) {
        return;
    }

    memoryReady = false;
    comboCount = 0;
    memoryActive = true;
    memoryCardInUse = true;
    memorySeconds = 15;

    document.getElementById("memory-timer").hidden = false;
    document.getElementById("memory-timer").textContent = "15s";
    document.getElementById("memory-progress").style.transform = "scaleY(1)";

    if (edgeTimer !== null) {
        window.clearInterval(edgeTimer);
        edgeTimer = null;
    }

    drawTiles();
    updateCounters();

    if (memoryTimer !== null) {
        window.clearInterval(memoryTimer);
    }

    memoryTimer = window.setInterval(function () {
        memorySeconds--;

        document.getElementById("memory-timer").textContent =
            memorySeconds + "s";

        document.getElementById("memory-progress").style.transform =
            "scaleY(" + Math.max(0, memorySeconds / 15) + ")";

        if (memorySeconds <= 0) {
            window.clearInterval(memoryTimer);
            memoryTimer = null;
            memoryActive = false;
            memoryCardInUse = false;
            memorySeconds = 15;
            comboCount = 0;
            memoryReady = false;

            document.getElementById("memory-timer").hidden = true;
            document.getElementById("memory-progress").style.transform = "scaleY(0)";

            tiles.forEach(function (tile) {
                if (!tile.removed) {
                    tile.revealed = false;
                }
            });

            drawTiles();
            updateCounters();
            startEdgeAnimation();
        }
    }, 1000);
}

function startEdgeAnimation() {
    if (selectedLevel !== 4 || !gameRunning || memoryActive) {
        return;
    }

    if (edgeTimer !== null) {
        window.clearInterval(edgeTimer);
    }

    showNextEdgeGroup();

    edgeTimer = window.setInterval(function () {
        if (!gameRunning || selectedLevel !== 4 || memoryActive) {
            return;
        }

        showNextEdgeGroup();
    }, 1200);
}

function showNextEdgeGroup() {
    var active = tiles.filter(function (tile) {
        return !tile.removed;
    });

    active.forEach(function (tile) {
        tile.element.classList.remove("memory");
        tile.element.style.removeProperty("--memory-color");
    });

    var types = [];

    active.forEach(function (tile) {
        if (types.indexOf(tile.type) === -1) {
            types.push(tile.type);
        }
    });

    if (types.length === 0) {
        return;
    }

    var type = types[colorIndex % types.length];
    var color = colors[colorIndex % colors.length];

    active.forEach(function (tile) {
        if (tile.type === type) {
            tile.element.classList.add("memory");
            tile.element.style.setProperty("--memory-color", color);
        }
    });

    colorIndex++;
}

function startGameTimer() {
    stopGameTimer();

    gameTimer = window.setInterval(function () {
        if (!gameRunning) {
            return;
        }

        gameTimeLeft--;
        updateGameTimerDisplay();

        if (gameTimeLeft <= 0) {
            gameTimeLeft = 0;
            gameRunning = false;
            stopAllTimers();

            document.getElementById("game-note").textContent =
                "Bạn đạt " + currentScore + " điểm.";

            saveHighScoreIfNeeded();
            updateCounters();
            updateGameTimerDisplay();
        }
    }, 1000);
}

function stopGameTimer() {
    if (gameTimer !== null) {
        window.clearInterval(gameTimer);
        gameTimer = null;
    }
}

function updateGameTimerDisplay() {
    var timeText = document.getElementById("game-time-text");
    var timeBar = document.getElementById("game-time-bar");
    var remaining = Math.max(0, gameTimeLeft);
    var percent = Math.max(0, Math.min(100, remaining / gameTimeLimit * 100));

    timeText.textContent = remaining + "s";
    timeBar.style.width = percent + "%";
    timeBar.classList.toggle("warning", remaining <= 30);
}

function finishGame() {
    gameRunning = false;
    stopAllTimers();

    document.getElementById("game-note").textContent =
        "Chúc mừng! Bạn đã hoàn thành Level " +
        selectedLevel + " với " + currentScore + " điểm.";

    saveHighScoreIfNeeded();
    updateCounters();
}

function stopAllTimers() {
    stopGameTimer();
    stopBombTimer();

    if (memoryTimer !== null) {
        window.clearInterval(memoryTimer);
    }

    if (countdownTimer !== null) {
        window.clearInterval(countdownTimer);
    }

    if (edgeTimer !== null) {
        window.clearInterval(edgeTimer);
    }

    if (mismatchTimer !== null) {
        window.clearTimeout(mismatchTimer);
    }

    memoryTimer = null;
    countdownTimer = null;
    edgeTimer = null;
    mismatchTimer = null;
    inputLocked = false;

    var countdown = document.getElementById("preview-countdown");

    if (countdown) {
        countdown.hidden = true;
    }
}

function updateCounters() {
    document.getElementById("current-score").textContent = currentScore;
    document.getElementById("shuffle-count").textContent = shuffleCount;
    document.getElementById("hint-count").textContent = hintCount;

    document.getElementById("shuffle-button").textContent =
        "Đổi vị trí (" + shuffleCount + ")";

    document.getElementById("hint-button").textContent =
        "Gợi ý (" + hintCount + ")";

    var memoryButton = document.getElementById("memory-button");
    var comboLabel = document.getElementById("memory-combo");
    var memoryHint = document.getElementById("memory-hint");

    document.getElementById("memory-panel").hidden = selectedLevel !== 4;

    memoryButton.disabled = !memoryReady || memoryActive;
    memoryButton.classList.toggle("memory-ready", memoryReady);
    memoryButton.classList.toggle("memory-active", memoryCardInUse);

    comboLabel.textContent = comboCount + "/2 COMBO";
    memoryHint.textContent = "";

    updateHighScore();
}

function updateHighScore() {
    var savedScore = Number(localStorage.getItem(highScoreKey)) || 0;

    document.getElementById("high-score-value").textContent =
        savedScore + " điểm";

    document.getElementById("game-high-score").textContent = savedScore;
}

function saveHighScoreIfNeeded() {
    var savedScore = Number(localStorage.getItem(highScoreKey)) || 0;

    if (currentScore > savedScore) {
        localStorage.setItem(highScoreKey, currentScore);
        updateHighScore();
    }
}

function shuffleArray(items) {
    for (var i = items.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = items[i];
        items[i] = items[j];
        items[j] = temp;
    }
}