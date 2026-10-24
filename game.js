var col = 16;
var row = 9;

var game = document.getElementById("game");
var homeScreen = document.getElementById("home-screen");
var levelScreen = document.getElementById("level-screen");
var gameScreen = document.getElementById("game-screen");

var selectedLevel = 1;
var currentScore = 0;
var shuffleCount = 7;
var hintCount = 5;
var comboCount = 0;
var memoryReady = false;
var memoryActive = false;
var memoryCardInUse = false;
var memorySeconds = 20;
var gameTimeLimit = 480;
var gameTimeLeft = 480;
var gameTimer = null;
var bombSeconds = 15;
var bombTile = null;
var bombTimer = null;
var memoryTimer = null;
var previewTimer = null;
var countdownTimer = null;
var edgeTimer = null;
var mismatchTimer = null;
var gameRunning = false;
var inputLocked = false;

var tiles = [];
var selectedCells = [];
var levelReturnScreen = "home-screen";
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

document.getElementById("start-button").addEventListener("click", function () {
    startGame(selectedLevel);
});

document.getElementById("choose-level-button").addEventListener("click", function () {
    levelReturnScreen = "home-screen";
    showSelectedLevelHelp();
    showScreen(levelScreen);
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

function showSelectedLevelHelp() {
    var selectedButton = document.querySelector(
        '.level-button[data-level="' + selectedLevel + '"]'
    );
    var content = document.getElementById("level-help-content");

    if (selectedButton && content) {
        content.textContent = selectedButton.dataset.help;
        content.hidden = false;
    }
}

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
    var screens = [
        homeScreen,
        levelScreen,
        gameScreen
    ];

    screens.forEach(function (item) {
        item.hidden = true;
    });

    screen.hidden = false;
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
    hintCount = selectedLevel === 4 ? 7 : 5;
    comboCount = 0;
    memoryReady = false;
    memoryActive = false;
    memoryCardInUse = false;
    memorySeconds = 20;
    gameTimeLimit = selectedLevel === 4 ? 600 : 480;
    gameTimeLeft = gameTimeLimit;
    bombSeconds = 15;
    bombTile = null;
    selectedCells = [];
    inputLocked = false;
    colorIndex = 0;
    gameRunning = true;

    stopAllTimers();

    document.getElementById("game-title").textContent =
        "LEVEL " + selectedLevel;

    document.getElementById("memory-panel").hidden = selectedLevel !== 4;
    document.getElementById("preview-countdown").hidden = true;
    document.getElementById("memory-timer").hidden = true;
    document.getElementById("memory-timer").textContent = "20s";
    document.getElementById("memory-progress").style.transform = "scaleY(0)";
    document.getElementById("game-note").textContent = "";

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
        values.push(type, type);
    }

    for (var extra = 1; extra <= 36; extra++) {
        values.push(extra, extra);
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
                openedByCurrentSelection: false,
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
    tiles.forEach(function (tile) {
        tile.revealed = true;
    });

    var covered = tiles.slice();
    shuffleArray(covered);

    var coveredCount = Math.floor(tiles.length / 3);

    covered.forEach(function (tile, index) {
        tile.revealed = index >= coveredCount;
    });

    var hiddenTiles = covered.slice(0, coveredCount);
    shuffleArray(hiddenTiles);

    var bombCount = Math.min(4, hiddenTiles.length);

    for (var i = 0; i < bombCount; i++) {
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

        var showFace = tile.revealed || memoryActive;

        if (!showFace) {
            cell.innerHTML = "";
            cell.textContent = "?";
            cell.classList.add("hidden-tile");
        } else {
            var picture = document.createElement("img");

            picture.src = "Image/type" + tile.type + ".png";
            picture.alt = "Hình " + tile.type;
            picture.draggable = false;

            picture.onerror = function () {
                cell.textContent = "Ảnh " + tile.type;
                cell.classList.add("hidden-tile");
            };

            cell.innerHTML = "";
            cell.appendChild(picture);
        }

        if (tile === bombTile && selectedLevel === 2) {
            cell.classList.add("bomb-countdown");
            cell.dataset.seconds = bombSeconds + "s";
        }

        if (
            memoryActive &&
            selectedLevel === 4 &&
            !memoryCardInUse &&
            document.getElementById("preview-countdown").hidden
        ) {
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
    var wasRevealedBeforeClick = tile.revealed;

    if (selectedLevel === 3 && !tile.revealed) {
        tile.revealed = true;
        tile.openedByCurrentSelection = true;
        drawTiles();

        if (tile.bombKind && !tile.bombUsed) {
            selectedCells = [];
            tile.bombUsed = true;

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
        tile.wasRevealedBeforeSelection = wasRevealedBeforeClick;
        if (selectedLevel === 3 && wasRevealedBeforeClick) {
            tile.openedByCurrentSelection = false;
        }
        selectedCells.push(tile);
        drawTiles();
        return;
    }

    tile.wasRevealedBeforeSelection = wasRevealedBeforeClick;
    if (selectedLevel === 3 && wasRevealedBeforeClick) {
        tile.openedByCurrentSelection = false;
    }
    var first = selectedCells[0];

    if (first.type === tile.type && canConnect(first, tile)) {
        first.removed = true;
        tile.removed = true;
        selectedCells = [];

        currentScore += 10;

        if (selectedLevel === 4) {
            comboCount++;

            if (memoryCardInUse) {
                if (comboCount >= 2) {
                    comboCount = 0;
                    memorySeconds = 20;
                    document.getElementById("memory-timer").textContent = "20s";
                    document.getElementById("memory-progress").style.transform =
                        "scaleY(1)";
                }
            } else if (comboCount >= 2) {
                comboCount = 2;
                memoryReady = true;
            }
        }

        if (tile === bombTile || first === bombTile) {
            bombTile = null;
            bombSeconds = 15;

            if (selectedLevel === 2) {
                placeBomb();
            }
        }

        updateCounters();
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
            updateCounters();

            selectedCells = [];
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

                inputLocked = false;
                mismatchTimer = null;
                drawTiles();
            }, 700);
        } else {
            if (selectedLevel === 3) {
                selectedCells = [first, tile];
                inputLocked = true;
                drawTiles();

                mismatchTimer = window.setTimeout(function () {
                    if (!first.removed && first.openedByCurrentSelection) {
                        first.revealed = false;
                    }

                    if (!tile.removed && tile.openedByCurrentSelection) {
                        tile.revealed = false;
                    }

                    first.openedByCurrentSelection = false;
                    tile.openedByCurrentSelection = false;
                    first.wasRevealedBeforeSelection = false;
                    tile.wasRevealedBeforeSelection = false;
                    selectedCells = [];
                    inputLocked = false;
                    mismatchTimer = null;
                    drawTiles();
                }, 700);
            } else {
                selectedCells = [tile];
                drawTiles();
            }
        }
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

            if (
                nx < -1 ||
                nx > col ||
                ny < -1 ||
                ny > row ||
                turns > 2
            ) {
                continue;
            }

            if (nx >= 0 && nx < col && ny >= 0 && ny < row) {
                var nextTile = tiles[ny * col + nx];

                if (
                    nextTile !== first &&
                    nextTile !== second &&
                    !nextTile.removed
                ) {
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

    window.setTimeout(drawTiles, 1400);
}

function findPossiblePair() {
    var active = tiles.filter(function (tile) {
        return !tile.removed;
    });

    for (var i = 0; i < active.length; i++) {
        for (var j = i + 1; j < active.length; j++) {
            if (
                selectedLevel === 3 &&
                (
                    (active[i].bombKind && !active[i].bombUsed) ||
                    (active[j].bombKind && !active[j].bombUsed)
                )
            ) {
                continue;
            }

            if (
                active[i].type === active[j].type &&
                canConnect(active[i], active[j])
            ) {
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

    for (var a = 0; a < active.length; a++) {
        for (var b = a + 1; b < active.length; b++) {
            if (active[a].type === active[b].type) {
                var first = active[a];
                var second = active[b];
                var firstIndex = tiles.indexOf(first);
                var secondIndex = tiles.indexOf(second);
                var firstX = firstIndex % col;
                var firstY = Math.floor(firstIndex / col);
                var secondX = secondIndex % col;
                var secondY = Math.floor(secondIndex / col);

                if (
                    Math.abs(firstX - secondX) +
                    Math.abs(firstY - secondY) === 1
                ) {
                    return;
                }

                var temp = first.type;
                first.type = second.type;
                second.type = temp;

                if (canConnect(first, second)) {
                    return;
                }
            }
        }
    }
}

function animateTileShuffle(movingTiles) {
    if (movingTiles.length < 2) {
        return;
    }

    var positions = movingTiles.map(function (tile) {
        return tile.element.getBoundingClientRect();
    });

    movingTiles.forEach(function (tile, index) {
        var cell = tile.element;
        var current = positions[index];
        var destination = positions[(index + 1) % positions.length];
        var dx = destination.left - current.left;
        var dy = destination.top - current.top;

        cell.style.transition = "none";
        cell.style.position = "relative";
        cell.style.zIndex = "5";
        cell.style.transform =
            "translate(" + dx + "px, " + dy + "px) rotate(" +
            (index % 2 === 0 ? 7 : -7) + "deg) scale(.96)";

        void cell.offsetWidth;
    });

    window.requestAnimationFrame(function () {
        movingTiles.forEach(function (tile) {
            var cell = tile.element;
            cell.style.transition =
                "transform .62s cubic-bezier(.2,.8,.25,1)";
            cell.style.transform = "translate(0, 0) rotate(0deg) scale(1)";
        });
    });

    window.setTimeout(function () {
        movingTiles.forEach(function (tile) {
            var cell = tile.element;
            cell.style.transition = "";
            cell.style.transform = "";
            cell.style.position = "";
            cell.style.zIndex = "";
        });
    }, 720);
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

    var center = tiles.indexOf(bombTile);
    var cx = center % col;
    var cy = Math.floor(center / col);
    var nearby = [];

    for (
        var y = Math.max(0, cy - 1);
        y <= Math.min(row - 1, cy + 1);
        y++
    ) {
        for (
            var x = Math.max(0, cx - 1);
            x <= Math.min(col - 1, cx + 1);
            x++
        ) {
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
    animateTileShuffle(nearby);

    nearby.forEach(function (tile, index) {
        tile.type = values[index];
    });

    bombTile = null;
    selectedCells = [];

    ensurePossibleMove();
    drawTiles();
    placeBomb();
    startBombTimer();
}

function triggerLuckyBomb(bomb) {
    if (inputLocked) {
        return;
    }

    inputLocked = true;

    var bombIndex = tiles.indexOf(bomb);
    var cx = bombIndex % col;
    var cy = Math.floor(bombIndex / col);
    var cross = [];

    var crossPositions = [
        [cx, cy],
        [cx, cy - 1],
        [cx, cy + 1],
        [cx - 1, cy],
        [cx + 1, cy]
    ];

    crossPositions.forEach(function (position) {
        var x = position[0];
        var y = position[1];

        if (x < 0 || x >= col || y < 0 || y >= row) {
            return;
        }

        var tile = tiles[y * col + x];

        if (!tile.removed && cross.indexOf(tile) === -1) {
            cross.push(tile);
        }
    });

    var removeList = cross.slice();
    var crossTypes = [];

    cross.forEach(function (tile) {
        if (crossTypes.indexOf(tile.type) === -1) {
            crossTypes.push(tile.type);
        }
    });

    crossTypes.forEach(function (type) {
        var countOfType = removeList.filter(function (tile) {
            return tile.type === type;
        }).length;

        if (countOfType % 2 !== 0) {
            var matchingTile = tiles.find(function (tile) {
                return !tile.removed &&
                    tile.type === type &&
                    removeList.indexOf(tile) === -1;
            });

            if (matchingTile) {
                removeList.push(matchingTile);
            }
        }
    });

    removeList.forEach(function (tile, index) {
        tile.element.classList.remove("tile-flip-out");
        tile.element.classList.add("tile-disappear");
        tile.element.style.animationDelay = (index * 55) + "ms";
    });

    window.setTimeout(function () {
        removeList.forEach(function (tile) {
            if (!tile.removed) {
                tile.removed = true;
                tile.revealed = true;
                tile.element.style.animationDelay = "";
                currentScore += 5;
            }
        });

        selectedCells = [];
        inputLocked = false;
        updateCounters();
        drawTiles();

        if (tiles.every(function (tile) {
            return tile.removed;
        })) {
            finishGame();
        } else if (!hasPossibleMove()) {
            ensurePossibleMove();
            drawTiles();
        }
    }, 850);
}

function triggerUnluckyBomb(bomb) {
    inputLocked = true;

    var index = tiles.indexOf(bomb);
    var cx = index % col;
    var cy = Math.floor(index / col);

    var crossPositions = [
        [cx, cy - 1],
        [cx, cy + 1],
        [cx - 1, cy],
        [cx + 1, cy]
    ];

    crossPositions.forEach(function (position, order) {
        var x = position[0];
        var y = position[1];

        if (x < 0 || x >= col || y < 0 || y >= row) {
            return;
        }

        var near = tiles[y * col + x];

        if (!near.removed) {
            near.element.classList.remove("tile-flip-out");
            near.element.classList.add("tile-flip-out");
            near.revealed = false;

            window.setTimeout(function (cell) {
                return function () {
                    cell.classList.remove("tile-flip-out");
                };
            }(near.element), 450 + order * 45);
        }
    });

    bomb.element.classList.remove("tile-flip-out");
    bomb.element.classList.add("tile-flip-out");
    bomb.revealed = false;
    selectedCells = [];
    drawTiles();

    window.setTimeout(function () {
        bomb.element.classList.remove("tile-flip-out");
    }, 500);

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
    if (
        !gameRunning ||
        selectedLevel !== 4 ||
        !memoryReady ||
        memoryActive
    ) {
        return;
    }

    memoryReady = false;
    comboCount = 0;
    memoryActive = true;
    memoryCardInUse = true;
    memorySeconds = 20;

    document.getElementById("memory-timer").hidden = false;
    document.getElementById("memory-timer").textContent = "20s";
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
            "scaleY(" + Math.max(0, memorySeconds / 20) + ")";

        if (memorySeconds <= 0) {
            window.clearInterval(memoryTimer);
            memoryTimer = null;
            memoryActive = false;
            memoryCardInUse = false;
            memorySeconds = 20;
            memoryReady = false;
            comboCount = 0;

            document.getElementById("memory-timer").hidden = true;
            document.getElementById("memory-progress").style.transform =
                "scaleY(0)";

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
        tile.element.style.removeProperty("--edge-delay");
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

    var matching = active.filter(function (tile) {
        return tile.type === type;
    });

    matching.forEach(function (tile) {
        tile.element.classList.add("memory");
        tile.element.style.setProperty("--memory-color", color);
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
                " Điểm của bạn: " + currentScore + ".";

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
    var percent = Math.max(
        0,
        Math.min(100, remaining / gameTimeLimit * 100)
    );

    timeText.textContent = remaining + "s";
    timeBar.style.width = percent + "%";
    timeBar.classList.toggle("warning", remaining <= 30);
}

function finishGame() {
    gameRunning = false;
    stopAllTimers();

    document.getElementById("game-note").textContent =
        "Chúc mừng bạn đã hoàn thành Level " +
        selectedLevel + " với " + currentScore + " điểm.";

    updateCounters();
}

function stopAllTimers() {
    stopGameTimer();
    stopBombTimer();

    if (memoryTimer !== null) {
        window.clearInterval(memoryTimer);
    }

    if (previewTimer !== null) {
        window.clearTimeout(previewTimer);
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
    previewTimer = null;
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

}

function shuffleArray(items) {
    for (var i = items.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));

        var temp = items[i];
        items[i] = items[j];
        items[j] = temp;
    }
}
