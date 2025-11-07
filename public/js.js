// Global variables
let allIcons = [];
let currentIcon = "";
const DEFAULT_SIZE = 32;
let userHasChangedColor = false;

// Load icons from demo.html
async function loadIcons() {
  try {
    const response = await fetch("./src/bootstrap-icons/demo.html");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();

    // Create a temporary DOM element to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extract icon classes from the demo.html
    const iconElements = doc.querySelectorAll(".glyph");
    const iconSet = new Set();

    iconElements.forEach((glyph) => {
      // Look for the icon class in various possible locations
      const iconSpan = glyph.querySelector(".mls");
      if (iconSpan) {
        const iconClass = iconSpan.textContent.trim();
        if (iconClass && iconClass.startsWith("icon-")) {
          iconSet.add(iconClass);
        }
      }

      // Also check for aria-label attributes
      const iconDisplay = glyph.querySelector("[aria-hidden]");
      if (iconDisplay && iconDisplay.className) {
        const classes = iconDisplay.className.split(" ");
        classes.forEach((cls) => {
          if (cls.startsWith("icon-")) {
            iconSet.add(cls);
          }
        });
      }
    });

    allIcons = Array.from(iconSet).sort();

    // If no icons found, generate placeholder icons
    if (allIcons.length === 0) {
      allIcons = generatePlaceholderIcons();
    }

    displayIcons(allIcons);
  } catch (error) {
    console.error("Error loading icons:", error);
    allIcons = generatePlaceholderIcons();
    displayIcons(allIcons);
  }
}

// Generate placeholder icon names
function generatePlaceholderIcons() {
  const icons = [];
  for (let i = 0; i < 50; i++) {
    icons.push(`icon-placeholder-${i}`);
  }
  return icons;
}

// Display icons in the grid
function displayIcons(icons) {
  const grid = document.getElementById("iconsGrid");

  if (icons.length === 0) {
    grid.innerHTML = '<div class="no-results">No icons found</div>';
    updateStats(0);
    return;
  }

  grid.innerHTML = icons
    .map(
      (iconClass) => `
                <div class="icon-card">
                    <div class="icon-to-display">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="icon-name">${iconClass}</div>
                    <div class="button-group">
                        <button class="btn btn-copy" onclick="copyClass('${iconClass}')">
                            📋 Copy Class
                        </button>
                        <button class="btn btn-generate" onclick="generateBasic('${iconClass}')">
                            🔧 Generate HTML
                        </button>
                        <button class="btn btn-styled" onclick="openStyleModal('${iconClass}')">
                            🎨 Generate Styled
                        </button>
                    </div>
                </div>
            `
    )
    .join("");

  updateStats(icons.length);
}

// Copy class name to clipboard
function copyClass(className) {
  navigator.clipboard
    .writeText(className)
    .then(() => {
      showToast(`Copied class: ${className}`);
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      showToast("Failed to copy class name");
    });
}

// Generate basic HTML
function generateBasic(className) {
  const html = `<i class="${className}"></i>`;
  navigator.clipboard
    .writeText(html)
    .then(() => {
      showToast("Basic HTML copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      showToast("Failed to copy HTML");
    });
}

// Open style modal
function openStyleModal(className) {
  currentIcon = className;
  userHasChangedColor = false;
  document.getElementById("styleModal").classList.add("active");
  resetModalControls();
  updatePreview();
}

// Reset modal controls to default values
function resetModalControls() {
  document.getElementById("fontSize").value = DEFAULT_SIZE;
  document.getElementById("fontSizeNumber").value = DEFAULT_SIZE;
  document.getElementById("iconColor").value = "#000000";
  document.getElementById("sizeDisplay").textContent = `${DEFAULT_SIZE}px`;
  document.getElementById("colorPreview").style.backgroundColor = "transparent";
  document.getElementById("colorPreview").style.border = "2px dashed #ddd";
  document.getElementById("colorPreview").textContent = "Default";
  userHasChangedColor = false;
}

// Update preview and code
function updatePreview() {
  const fontSize = document.getElementById("fontSize").value;
  const color = document.getElementById("iconColor").value;

  document.getElementById("sizeDisplay").textContent = `${fontSize}px`;

  // Update color preview
  if (userHasChangedColor) {
    document.getElementById("colorPreview").style.backgroundColor = color;
    document.getElementById("colorPreview").style.border = "2px solid #ddd";
    document.getElementById("colorPreview").textContent = "";
  } else {
    document.getElementById("colorPreview").style.backgroundColor =
      "transparent";
    document.getElementById("colorPreview").style.border = "2px dashed #ddd";
    document.getElementById("colorPreview").textContent = "Default";
  }

  // Preview icon - only apply color if user has changed it
  let previewStyle = `font-size: ${fontSize}px;`;
  if (userHasChangedColor) {
    previewStyle += ` color: ${color};`;
  }
  document.getElementById(
    "previewIcon"
  ).innerHTML = `<i class="${currentIcon}" style="${previewStyle}"></i>`;

  // Basic HTML code (no styles)
  const basicHtml = `<i class="${currentIcon}"></i>`;
  document.getElementById("htmlCode").value = basicHtml;

  // Styled HTML code - only include color if user has changed it
  let styledHtml = `<i class="${currentIcon}" style="font-size: ${fontSize}px;`;
  if (userHasChangedColor) {
    styledHtml += ` color: ${color};`;
  }
  styledHtml += `"></i>`;
  document.getElementById("styledCode").value = styledHtml;
}

// Setup event listeners
function setupEventListeners() {
  // Close modal
  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("styleModal").classList.remove("active");
  });

  // Reset size to default
  document.getElementById("resetSize").addEventListener("click", () => {
    document.getElementById("fontSize").value = DEFAULT_SIZE;
    document.getElementById("fontSizeNumber").value = DEFAULT_SIZE;
    updatePreview();
    showToast("Size reset to 32px");
  });

  // Reset color to default
  document.getElementById("resetColor").addEventListener("click", () => {
    document.getElementById("iconColor").value = "#000000";
    userHasChangedColor = false;
    updatePreview();
    showToast("Color reset to default");
  });

  // Event listeners for style controls
  document.getElementById("fontSize").addEventListener("input", (e) => {
    const value = e.target.value;
    document.getElementById("fontSizeNumber").value = value;
    updatePreview();
  });

  // Sync number input with range slider
  document.getElementById("fontSizeNumber").addEventListener("input", (e) => {
    let value = parseInt(e.target.value);

    // Enforce min/max bounds
    if (value < 10) value = 10;
    if (value > 500) value = 500;

    document.getElementById("fontSize").value = value;
    document.getElementById("fontSizeNumber").value = value;
    updatePreview();
  });

  document.getElementById("iconColor").addEventListener("input", () => {
    userHasChangedColor = true;
    updatePreview();
  });

  // Search functionality
  document.getElementById("searchInput").addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = allIcons.filter((icon) =>
      icon.toLowerCase().includes(searchTerm)
    );
    displayIcons(filtered);
  });

  // Clear search
  document.getElementById("clearBtn").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    displayIcons(allIcons);
  });

  // Close modal when clicking outside
  document.getElementById("styleModal").addEventListener("click", (e) => {
    if (e.target.id === "styleModal") {
      document.getElementById("styleModal").classList.remove("active");
    }
  });
}

// Copy code from textarea
function copyCode(textareaId) {
  const textarea = document.getElementById(textareaId);
  textarea.select();
  navigator.clipboard
    .writeText(textarea.value)
    .then(() => {
      showToast("Code copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      showToast("Failed to copy code");
    });
}

// Update stats
function updateStats(visibleCount) {
  document.getElementById("totalCount").textContent = allIcons.length;
  document.getElementById("visibleCount").textContent = visibleCount;
}

// Show toast notification
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  loadIcons();
  setupEventListeners();
});
