const svg = document.querySelector("svg");
const nodeGroup = document.getElementById("nodes");
const edgeGroup = document.getElementById("edges");
const player = document.getElementById("current-player");
const gameover = document.getElementById("game-over");
const redscore = document.getElementById("red-score");
const bluescore = document.getElementById("blue-score");
const totaltime = document.getElementById("timer");
const plays = document.getElementById("player-timer");
const cx = 300, cy = 300;
const radii = [60, 120, 180];
const layers = [[], [], []];
let redScore = 0;
let blueScore = 0;
const edgeList = [];

function polarToCartesian(radius, angleDeg) {
  const angleRad = Math.PI / 180 * angleDeg;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad)
  };
}

function drawEdgeWithWeight(x1, y1, x2, y2, weight, idx1, idx2) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.dataset.nodes = `${idx1},${idx2}`;
  line.dataset.weight = weight;
  edgeGroup.appendChild(line);

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const offset = 10;
  const ox = -dy / length * offset;
  const oy = dx / length * offset;

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", mx + ox);
  text.setAttribute("y", my + oy);
  text.textContent = weight;
  edgeGroup.appendChild(text);

  edgeList.push({
    idx1, idx2, weight: parseInt(weight),
    scoredBy: null,
    line
  });
}

let nodeIndex = 0;
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 6; j++) {
    const angle = (60 * j) - 30;
    const { x, y } = polarToCartesian(radii[i], angle);
    layers[i].push({ x, y });

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 10);
    circle.dataset.index = nodeIndex++;
    nodeGroup.appendChild(circle);
  }
}

const innerWeights = [8, 8, 9, 8, 9, 8];
const middleWeights = [1, 6, 4, 5, 1, 5];
const outerWeights = [1, 1, 2, 2, 1, 1];

[layers[0], layers[1], layers[2]].forEach((layer, layerIdx) => {
  const weights = layerIdx === 0 ? innerWeights
                 : layerIdx === 1 ? middleWeights
                 : outerWeights;
  for (let i = 0; i < 6; i++) {
    const idx1 = layerIdx * 6 + i;
    const idx2 = layerIdx * 6 + ((i + 1) % 6);
    const p1 = layer[i];
    const p2 = layer[(i + 1) % 6];
    drawEdgeWithWeight(p1.x, p1.y, p2.x, p2.y, weights[i], idx1, idx2);
  }
});

function connectAlternate(layerA, layerB, startIndex, idxAOffset, idxBOffset) {
  for (let i = startIndex; i < 6; i += 2) {
    const p1 = layerA[i];
    const p2 = layerB[i];
    drawEdgeWithWeight(p1.x, p1.y, p2.x, p2.y, 1, idxAOffset + i, idxBOffset + i);
  }
}
connectAlternate(layers[0], layers[1], 0, 0, 6);
connectAlternate(layers[1], layers[2], 1, 6, 12);

const circles = document.querySelectorAll("circle");
const layersInOrder = [2, 1, 0];
let currentLayerIndex = 0;
redscore.classList.add('redtext');
bluescore.classList.add('bluetext');
function getCirclesInLayer(layerIndex) {
  return Array.from(circles).slice(layerIndex * 6, (layerIndex + 1) * 6);
}

function isLayerFilled(layerIndex) {
  return getCirclesInLayer(layerIndex).every(c =>
    c.classList.contains("red") || c.classList.contains("blue")
  );
}

function enableLayer(layerIndex) {
  circles.forEach(c => c.classList.add("disabled"));
  getCirclesInLayer(layerIndex).forEach(c => c.classList.remove("disabled"));
}

enableLayer(layersInOrder[currentLayerIndex]);

function areNodesConnected(idx1, idx2) {
  return Array.from(document.querySelectorAll("line")).some(line => {
    const [a, b] = line.dataset.nodes.split(',').map(Number);
    return (a === idx1 && b === idx2) || (a === idx2 && b === idx1);
  });
}

let isred = true;
let redCount = 0;
let blueCount = 0;
let selectedNode = null;

timertotal();
updatePlayerTurnText();

nodeGroup.addEventListener('click', (e) => {
  const clicked = e.target;
  if (!clicked || clicked.tagName !== 'circle') return;
  const idx = parseInt(clicked.dataset.index);
  const isRedTurn = isred;

  if (redCount + blueCount < 8) {
    if (
      !clicked.classList.contains("disabled") &&
      !clicked.classList.contains("red") &&
      !clicked.classList.contains("blue")
    ) {
      clicked.classList.add(isRedTurn ? 'red' : 'blue');
      if (isRedTurn) redCount++; else blueCount++;
      isred = !isred;
      updateScores();
      updatePlayerTurnText();
      if (isLayerFilled(layersInOrder[currentLayerIndex])) {
        getCirclesInLayer(layersInOrder[1]).forEach(c => c.classList.remove("disabled"));
        if (getCirclesInLayer(layersInOrder[1]).filter(c =>
          c.classList.contains("red") || c.classList.contains("blue")
        ).length >= 2) {
          getCirclesInLayer(layersInOrder[2]).forEach(c => c.classList.remove("disabled"));
        }
      }
      playertimer();
    }
    return;
  }

  const isRedNode = clicked.classList.contains('red');
  const isBlueNode = clicked.classList.contains('blue');
  const isEmpty = !isRedNode && !isBlueNode;

  if (selectedNode === null) {
    if ((isRedTurn && isRedNode) || (!isRedTurn && isBlueNode)) {
      selectedNode = clicked;
      clicked.setAttribute("stroke", "yellow");
      clicked.setAttribute("stroke-width", "4");
    }
  } else {
    const fromIdx = parseInt(selectedNode.dataset.index);

    if (isEmpty && areNodesConnected(fromIdx, idx)) {
      selectedNode.classList.remove(isRedTurn ? 'red' : 'blue');
      clicked.classList.add(isRedTurn ? 'red' : 'blue');
      selectedNode.removeAttribute("stroke");
      selectedNode.removeAttribute("stroke-width");
      selectedNode = null;

      isred = !isred;
      updateScores();
      updatePlayerTurnText();
      playertimer();
    } else {
      selectedNode.removeAttribute("stroke");
      selectedNode.removeAttribute("stroke-width");
      selectedNode = null;
    }
  }
});

function updateScores() {
  redScore = 0;
  blueScore = 0;

  edgeList.forEach(edge => {
    const c1 = circles[edge.idx1];
    const c2 = circles[edge.idx2];

    if (c1.classList.contains("red") && c2.classList.contains("red")) {
      edge.scoredBy = "red";
    } else if (c1.classList.contains("blue") && c2.classList.contains("blue")) {
      edge.scoredBy = "blue";
    } else {
      edge.scoredBy = null;
    }

    if (edge.scoredBy === "red") redScore += edge.weight;
    if (edge.scoredBy === "blue") blueScore += edge.weight;
  });

  redscore.textContent = "Red Score: " + redScore;
  bluescore.textContent = "Blue Score: " + blueScore;
}

function updatePlayerTurnText() {
  player.textContent = isred ? "Red" : "Blue";
  player.classList.toggle("redtext", isred);
  player.classList.toggle("bluetext", !isred);
}

function timertotal() {
  let duration = 900;

  const timer = setInterval(() => {
    let minutes = Math.floor(duration / 60);
    let seconds = duration % 60;
    totaltime.textContent = "Time Remaining: " + minutes + ":" + seconds.toString().padStart(2, "0");
    duration--;

    if (duration < 0 || isLayerFilled(layersInOrder[2])) {
      clearInterval(timer);
      totaltime.textContent = "GAME OVER";
      gameover.style.display = "flex";
      gameover.textContent = "GAME OVER! WHO WON LOOK LEFT";
      player.style.display="none";
      plays.style.display="none";
      if(redScore > blueScore){
        bluescore.style.display="none";
        redscore.textContent="RED IS THE WINNER";
      } else {
        redscore.style.display="none";
        bluescore.textContent="BLUE IS THE WINNER";
      }
    }
  }, 1000);
}

function playertimer() {
  clearInterval(plays.dataset.timer);
  plays.style.display = "flex";
  let seconds = 20;
  const playerInterval = setInterval(() => {
    plays.textContent = "Player Time Remaining: 00:" + seconds.toString().padStart(2, "0");
    seconds--;
    if (seconds < 0 || isLayerFilled(layersInOrder[2])) {
      clearInterval(playerInterval);
      plays.textContent = "Time's up!";
      if(seconds < 0){
        if(player.classList.contains('bluetext')){
          player.classList.remove('bluetext');
          player.textContent="Red Won By Default";
          totaltime.style.display="none";
          gameover.style.display = "flex";
          gameover.textContent = "GAME OVER! WHO WON LOOK ABOVE";
          player.classList.add('redtext');
          bluescore.style.display="none";
          redscore.style.display="none";
        } else {
          player.classList.remove('redtext');
          player.classList.add('bluetext');
          player.textContent="Blue Won By Default";
          totaltime.style.display="none";
          gameover.style.display = "flex";
          gameover.textContent = "GAME OVER! WHO WON LOOK ABOVE";
          bluescore.style.display="none";
          redscore.style.display="none";
        }
      }
    }
  }, 1000);
  plays.dataset.timer = playerInterval;
}
