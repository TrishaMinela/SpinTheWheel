let items = [];
let lastSpin = null; // Store the last spin result
let spinHistory = []; // Local cache of spin history
let currentHistoryIndex = -1; // Track which history entry we're currently on

document.getElementById("addForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const input = document.getElementById("nameInput");
  const name = input.value.trim();
  if (name !== "") {
    items.push(name);
    input.value = "";
    createWheel();
  }
});

// Add event listener for the delete button
document.getElementById("delBtn").addEventListener("click", function() {
  if (items.length > 0) {
    items.pop(); 
    createWheel(); 
    if (items.length === 0) {
      // Clear the winner message if no items left
      document.getElementById("result").innerText = "";
    }
  } else {
    alert("No items to delete!");
  }
});

// Improve the rewind button functionality
document.getElementById("rewind")?.addEventListener("click", rewind);

function randomColor() {
  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);
  return { r, g, b };
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function easeOutSine(x) {
  return Math.sin((x * Math.PI) / 2);
}

function getPercent(input, min, max) {
  return ((input - min) * 100) / (max - min) / 100;
}

async function loadSpinHistory() {
  try {
    const res = await fetch("http://localhost:3000/history");
    if (!res.ok) throw new Error("Failed to load spin history");
    const data = await res.json();
    
    // Store the complete history locally
    spinHistory = data;
    
    // Get the most recent spin if available
    if (Array.isArray(data) && data.length > 0) {
      lastSpin = data[data.length - 1];
      currentHistoryIndex = data.length - 1;
    }
  } catch (error) {
    console.error("Failed to load spin history:", error);
  }
}

async function saveSpinResultWithItems(winner, itemList) {
  try {
    const res = await fetch("http://localhost:3000/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        winner,
        itemList
      }),
    });
    const saved = await res.json();
    
    // Add to local history cache
    spinHistory.push(saved);
    currentHistoryIndex = spinHistory.length - 1;
    lastSpin = saved;
    
    console.log("✅ Spin saved:", saved);
  } catch (error) {
    console.error("❌ Failed to save spin result:", error);
  }
}

const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;
const centerX = width / 2;
const centerY = height / 2;
const radius = width / 2;

let currentDeg = 0;
let colors = [];
let itemDegs = {};

function createWheel() {
  if (items.length === 0) {
    ctx.clearRect(0, 0, width, height);
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000";
    ctx.fillText("Add names to spin!", centerX, centerY);
    return;
  }

  colors = [];
  for (let i = 0; i < items.length; i++) {
    colors.push(randomColor());
  }

  draw();
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#212121";
  ctx.fill();

  const step = 360 / items.length;
  let startDeg = currentDeg % 360;
  itemDegs = {};

  for (let i = 0; i < items.length; i++, startDeg += step) {
    const endDeg = startDeg + step;
    const color = colors[i];
    const colorStyle = `rgb(${color.r},${color.g},${color.b})`;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius - 5, toRad(startDeg), toRad(endDeg));
    ctx.closePath();
    ctx.fillStyle = colorStyle;
    ctx.fill();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(toRad((startDeg + endDeg) / 2));
    ctx.fillStyle = (color.r + color.g + color.b) / 3 > 150 ? "#000" : "#fff";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(items[i], radius / 2, 8);
    ctx.restore();

    // Store the actual degrees for winner calculation
    const actualStartDeg = startDeg % 360;
    const actualEndDeg = endDeg % 360;
    
    itemDegs[items[i]] = {
      startDeg: actualStartDeg,
      endDeg: actualEndDeg,
    };
  }
  
  // Draw the indicator triangle at 270 degrees (bottom)
  ctx.beginPath();
  ctx.moveTo(centerX, centerY + radius);
  ctx.lineTo(centerX - 10, centerY + radius + 20);
  ctx.lineTo(centerX + 10, centerY + radius + 20);
  ctx.closePath();
  ctx.fillStyle = "#FF0000";
  ctx.fill();
}

let speed = 0;
let maxRotation = 0;
let pause = true;
let winner = null;

function animate() {
  if (pause) {
    if (winner !== null) {
      document.getElementById("result").innerText = `🎉 Winner: ${winner} 🎉`;
    }
    return;
  }

  const progress = getPercent(currentDeg, 0, maxRotation);
  speed = (1 - easeOutSine(progress)) * 20;
  
  if (speed < 0.1) {
    speed = 0;
    pause = true;

    const finalDeg = currentDeg % 360;
    winner = null;
    
    // The pointer is at 270 degrees (bottom of wheel)
    const pointerAt = 270;
    
    for (const name in itemDegs) {
      const seg = itemDegs[name];
      
      if (seg.startDeg < seg.endDeg) {
        // Normal segment
        if (pointerAt >= seg.startDeg && pointerAt < seg.endDeg) {
          winner = name;
          break;
        }
      } else {
        // Segment that wraps around 0/360
        if (pointerAt >= seg.startDeg || pointerAt < seg.endDeg) {
          winner = name;
          break;
        }
      }
    }
    
    if (!winner && items.length > 0) winner = items[0];
    document.getElementById("result").innerText = `🎉 Winner: ${winner} 🎉`;

    // Save the current items with the spin result
    const spinItems = [...items];
    saveSpinResultWithItems(winner, spinItems);
    
    return;
  }

  currentDeg += speed;
  draw();
  requestAnimationFrame(animate);
}

function spin() {
  if (!pause) return;

  if (items.length === 0) {
    alert("Add at least one name before spinning!");
    return;
  }

  pause = false;
  winner = null;
  document.getElementById("result").innerText = "Spinning...";
  speed = 20;
  maxRotation = randomRange(360 * 3, 360 * 6);
  
  // We're adding to currentDeg instead of resetting it
  // This allows the wheel to continue from its current position
  animate();
}

// Function to rewind to the previous spin result
function rewind() {
  // If there's no history at all
  if (spinHistory.length === 0) {
    alert("No previous spins to rewind to.");
    return;
  }
  
  // If this is the first rewind, start from most recent
  if (currentHistoryIndex === -1 || currentHistoryIndex === spinHistory.length - 1) {
    currentHistoryIndex = spinHistory.length - 1;
  }
  
  // Move backwards in history (if possible)
  if (currentHistoryIndex > 0) {
    currentHistoryIndex--;
  } else {
    alert("You've reached the oldest spin in history.");
    return;
  }
  
  // Get the target spin data
  const targetSpin = spinHistory[currentHistoryIndex];
  
  // Restore the wheel to the previous state
  if (targetSpin.itemList && Array.isArray(targetSpin.itemList)) {
    items = [...targetSpin.itemList];
  } else {
    items = [targetSpin.winner];
  }
  
  // Recreate the wheel with these items
  createWheel();
  
  // Highlight the winner from that spin
  if (targetSpin.winner) {
    winner = targetSpin.winner;
    
    // Position the wheel to show the winner at the bottom (270 degrees)
    const winnerIndex = items.indexOf(winner);
    if (winnerIndex >= 0) {
      const step = 360 / items.length;
      const middleOfSegment = step * winnerIndex + step / 2;
      currentDeg = (270 - middleOfSegment + 360) % 360;
      
      // Redraw the wheel
      draw();
    }
    
    // Update the UI to show what we rewound to
    const timestamp = targetSpin.timestamp 
      ? new Date(targetSpin.timestamp).toLocaleString() 
      : "unknown time";
    
    document.getElementById("result").innerText = `⏪ Rewound to previous spin: ${winner} (${timestamp})`;
    
    // Update lastSpin to point to this spin
    lastSpin = targetSpin;
  }
}

// Initialize everything
createWheel();
loadSpinHistory();

// Add a spin button event listener if not already in the HTML
document.getElementById("spin")?.addEventListener("click", spin);