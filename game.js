
var col = 16;
var row = 9;

var game = document.getElementById("game");
var homeScreen = document.getElementById("home-screen");
var levelScreen = document.getElementById("level-screen");
var scoreScreen = document.getElementById("score-screen");
var gameScreen = document.getElementById("game-screen");

var currentScore = 0;
var shuffleCount = 7;
var hintCount = 5;
var gameRunning = false;

var tiles = [];
var selectedCells = [];
var levelReturnScreen = "home-screen";
var highScoreKey = "pikachuHighScore";

showScreen(homeScreen);
updateHighScore();

document.getElementById("start-button").addEventListener("click", function () {
    startGame();
});

document.getElementById("choose-level-button").addEventListener("click", function () {
    levelReturnScreen = "home-screen";
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
    startGame();
});

document.querySelectorAll(".level-button").forEach(function (button) {
    button.addEventListener("click", function () {
        if (Number(button.dataset.level) !== 1) {
            return;
        }

        document.querySelectorAll(".level-button").forEach(function (item) {
            item.classList.remove("selected");
            item.setAttribute("aria-pressed", "false");
        });

        button.classList.add("selected");
        button.setAttribute("aria-pressed", "true");
    });
});

document.getElementById("restart-button").addEventListener("click", function () {
    startGame();
});

document.getElementById("change-level-button").addEventListener("click", function () {
    levelReturnScreen = "game-screen";
    showScreen(levelScreen);
});

document.getElementById("shuffle-button").addEventListener("click", shuffleTiles);
document.getElementById("hint-button").addEventListener("click", showHint);

document.getElementById("return-home-button").addEventListener("click", function () {
    gameRunning = false;
    showScreen(homeScreen);
});

function showScreen(screen) {
    var screens = [
        homeScreen,
        levelScreen,
        scoreScreen,
        gameScreen
    ];

    screens.forEach(function (item) {
        item.hidden = true;
    });

    screen.hidden = false;
}

function returnFromLevelMenu() {
    if (levelReturnScreen === "game-screen" && tiles.length > 0) {
        showScreen(gameScreen);
    } else {
        showScreen(homeScreen);
    }
}

function startGame() {
    currentScore = 0;
    shuffleCount = 7;
    hintCount = 5;
    selectedCells = [];
    gameRunning = true;

    document.getElementById("game-title").textContent = "PIKACHU — LEVEL 1";

    document.getElementById("game-note").textContent =
        "Ghép hai hình giống nhau để ghi điểm.";

    createBoard();

    showScreen(gameScreen);
    updateCounters();
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
                removed: false
            };

            td.addEventListener("click", onTileClick);

            tiles.push(tile);
            tr.appendChild(td);
        }

        game.appendChild(tr);
    }

    ensurePossibleMove();
    drawTiles();
}

function drawTiles() {
    tiles.forEach(function (tile) {
        var cell = tile.element;

        cell.classList.remove("selected", "hint");

        if (tile.removed) {
            cell.innerHTML = "";
            cell.style.visibility = "hidden";
            return;
        }

        cell.style.visibility = "visible";

        var picture = document.createElement("img");

        picture.src = "Image/type" + tile.type + ".png";
        picture.alt = "Hình " + tile.type;
        picture.draggable = false;

        picture.onerror = function () {
            cell.textContent = "Ảnh " + tile.type;
        };

        cell.innerHTML = "";
        cell.appendChild(picture);
    });

    selectedCells.forEach(function (tile) {
        if (!tile.removed) {
            tile.element.classList.add("selected");
        }
    });
}

function onTileClick(event) {
    if (!gameRunning) {
        return;
    }

    var tile = tiles.find(function (item) {
        return item.element === event.currentTarget;
    });

    if (!tile || tile.removed) {
        return;
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

        document.getElementById("game-note").textContent =
            "Ghép đúng! +10 điểm.";

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
        selectedCells = [tile];

        document.getElementById("game-note").textContent =
            first.type === tile.type
                ? "Hai hình giống nhau nhưng đường nối chưa hợp lệ."
                : "Hai hình chưa giống nhau.";

        drawTiles();
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

            if (nx < -1 || nx > col ||
                ny < -1 || ny > row ||
                turns > 2) {
                continue;
            }

            if (nx >= 0 && nx < col && ny >= 0 && ny < row) {
                var nextTile = tiles[ny * col + nx];

                if (nextTile !== first &&
                    nextTile !== second &&
                    !nextTile.removed) {
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
    if (!gameRunning) {
        return;
    }

    if (shuffleCount <= 0) {
        document.getElementById("game-note").textContent =
            "Bạn đã hết lượt đổi vị trí.";
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

    document.getElementById("game-note").textContent =
        "Đã đổi vị trí. Còn " + shuffleCount + " lượt.";
}

function showHint() {
    if (!gameRunning) {
        return;
    }

    if (hintCount <= 0) {
        document.getElementById("game-note").textContent =
            "Bạn đã hết lượt gợi ý.";
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
    selectedCells = [];

    drawTiles();

    pair[0].element.classList.add("hint");
    pair[1].element.classList.add("hint");

    updateCounters();

    document.getElementById("game-note").textContent =
        "Hai ô được đánh dấu là một cặp có thể ghép.";

    window.setTimeout(drawTiles, 1400);
}

function findPossiblePair() {
    var active = tiles.filter(function (tile) {
        return !tile.removed;
    });

    for (var i = 0; i < active.length; i++) {
        for (var j = i + 1; j < active.length; j++) {
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

    for (var a = 0; a < active.length - 1; a++) {
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

                if (Math.abs(firstX - secondX) +
                    Math.abs(firstY - secondY) === 1) {
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

function finishGame() {
    gameRunning = false;

    document.getElementById("game-note").textContent =
        "Chúc mừng! Bạn đã hoàn thành Level 1 với " +
        currentScore + " điểm.";

    saveHighScoreIfNeeded();
    updateCounters();
}

function updateCounters() {
    document.getElementById("current-score").textContent = currentScore;
    document.getElementById("shuffle-count").textContent = shuffleCount;
    document.getElementById("hint-count").textContent = hintCount;

    document.getElementById("shuffle-button").textContent =
        "Đổi vị trí (" + shuffleCount + ")";

    document.getElementById("hint-button").textContent =
        "Gợi ý (" + hintCount + ")";

    updateHighScore();
}

function updateHighScore() {
    var savedScore =
        Number(localStorage.getItem(highScoreKey)) || 0;

    document.getElementById("high-score-value").textContent =
        savedScore + " điểm";

    document.getElementById("game-high-score").textContent =
        savedScore;
}

function saveHighScoreIfNeeded() {
    var savedScore =
        Number(localStorage.getItem(highScoreKey)) || 0;

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
