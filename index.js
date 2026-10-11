
var col = 16;
var row = 9;

var game = document.getElementById("game");

initGame(col, row);

function initGame(col, row) {
    for (let i = 0; i < row; i++) {
        let tr = document.createElement("tr");

        for (let j = 0; j < col; j++) {
            let td = document.createElement("td");

            td.id = "cell." + i + "." + j;
            td.classList.add("cell");

            tr.appendChild(td);
        }

        game.appendChild(tr);
    }
}
