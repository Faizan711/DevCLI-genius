const outputElement = document.getElementById("output");
const cursorElement = document.querySelector(".cursor");
const typingSpeed = 50; // milliseconds

const lines = [
  "Initializing DevCLI Genius...",
  "Connection established.",
  " ",
  "Welcome to DevCLI Genius!",
  "The AI-powered tool that translates natural language to shell commands.",
  " ",
  "To use DevCLI Genius, run the following command in your terminal:",
  'npx devcli-genius "your query"', // Change this to your actual package name
  " ",
  "Example:",
  'npx devcli-genius "git command to see commit history"',
  " ",
];

let lineIndex = 0;
let charIndex = 0;

function type() {
  if (lineIndex < lines.length) {
    if (charIndex < lines[lineIndex].length) {
      outputElement.innerHTML += lines[lineIndex].charAt(charIndex);
      charIndex++;
      setTimeout(type, typingSpeed);
    } else {
      outputElement.innerHTML += "\n";
      lineIndex++;
      charIndex = 0;
      setTimeout(type, typingSpeed);
    }
  } else {
    cursorElement.style.display = "inline-block"; // Show cursor when done
  }
}

document.addEventListener("DOMContentLoaded", () => {
  cursorElement.style.display = "none"; // Hide cursor while typing
  type();
});
