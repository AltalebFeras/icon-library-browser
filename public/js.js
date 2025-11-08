// Global variables
let allIcons = [];
let currentIcon = "";
let currentGroup = null;
let iconGroups = [];
const DEFAULT_SIZE = 32;
let userHasChangedColor = false;

// Load icon groups configuration
async function loadIconGroups() {
  try {
    const response = await fetch("./config.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const config = await response.json();
    iconGroups = config.iconGroups;
    displayIconGroups();
  } catch (error) {
    console.error("Error loading icon groups:", error);
    showToast("Error loading icon libraries");
  }
}

// Display icon groups on main page
function displayIconGroups() {
  const groupsGrid = document.getElementById("groupsGrid");
  
  groupsGrid.innerHTML = iconGroups.map(group => `
    <div class="group-card">
      <div class="group-content" onclick="selectIconGroup('${group.id}')">
        <div class="group-icon">
          <i class="${group.prefix === 'bi' ? 'bi-star' : group.prefix === 'fa' ? 'fa-star' : 'icon-star'}"></i>
        </div>
        <h3>${group.name}</h3>
        <p>${group.description}</p>
        <div class="group-stats">
          <span class="icon-count">${group.count || 0} icons</span>
          <span class="status ${group.count > 0 ? 'available' : 'coming-soon'}">
            ${group.count > 0 ? 'Available' : 'Coming Soon'}
          </span>
        </div>
      </div>
      <div class="group-actions">
        <button class="download-btn" onclick="event.stopPropagation(); downloadLibrary('${group.id}')">
          📥 Download Library
        </button>
      </div>
    </div>
  `).join("");
}

// Select an icon group and load its icons
async function selectIconGroup(groupId) {
  currentGroup = iconGroups.find(group => group.id === groupId);
  
  if (!currentGroup) {
    showToast("Icon group not found");
    return;
  }

  if (currentGroup.count === 0) {
    showToast("This icon library is coming soon!");
    return;
  }

  // Load CSS for the selected group
  await loadGroupCSS(currentGroup.cssPath);
  
  // Show browser section and hide groups section
  document.getElementById("groupsSection").style.display = "none";
  document.getElementById("browserSection").style.display = "block";
  document.getElementById("currentLibraryName").textContent = currentGroup.name;
  
  // Load icons for the selected group
  await loadIconsFromGroup(currentGroup);
}

// Load CSS file for the icon group
function loadGroupCSS(cssPath) {
  return new Promise((resolve, reject) => {
    // Remove any existing icon library CSS
    const existingLinks = document.querySelectorAll('link[data-icon-library]');
    existingLinks.forEach(link => link.remove());
    
    // Add new CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssPath;
    link.setAttribute('data-icon-library', 'true');
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

// Load icons from a specific group
async function loadIconsFromGroup(group) {
  try {
    const response = await fetch(group.demoPath);
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
    const prefix = group.prefix;

    iconElements.forEach((glyph) => {
      // Look for the icon class in various possible locations
      const iconSpan = glyph.querySelector(".mls");
      if (iconSpan) {
        const iconClass = iconSpan.textContent.trim();
        if (iconClass && iconClass.startsWith(prefix)) {
          iconSet.add(iconClass);
        }
      }

      // Also check for aria-label attributes
      const iconDisplay = glyph.querySelector("[aria-hidden]");
      if (iconDisplay && iconDisplay.className) {
        const classes = iconDisplay.className.split(" ");
        classes.forEach((cls) => {
          if (cls.startsWith(prefix)) {
            iconSet.add(cls);
          }
        });
      }
    });

    allIcons = Array.from(iconSet).sort();

    // If no icons found, generate placeholder icons
    if (allIcons.length === 0) {
      allIcons = generatePlaceholderIcons(prefix);
    }

    displayIcons(allIcons);
  } catch (error) {
    console.error("Error loading icons:", error);
    allIcons = generatePlaceholderIcons(group.prefix);
    displayIcons(allIcons);
  }
}

// Generate placeholder icon names
function generatePlaceholderIcons(prefix = "icon") {
  const icons = [];
  for (let i = 0; i < 50; i++) {
    icons.push(`${prefix}-placeholder-${i}`);
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
                <div class="icon-card" onclick="openIconModal('${iconClass}')">
                    <div class="icon-to-display">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="icon-name">${iconClass}</div>
                </div>
            `
    ).join("");

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

// Open icon modal with customization options
function openIconModal(className) {
  currentIcon = className;
  userHasChangedColor = false;
  document.getElementById("iconModal").classList.add("active");
  
  // Update modal title with icon name
  document.getElementById("modalIconName").textContent = className;
  
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

  // Update class display
  document.getElementById("classDisplay").textContent = currentIcon;

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

// Toggle style customization controls
function toggleStyleControls() {
  const styleControlsSection = document.getElementById("styleControlsSection");
  const toggleBtn = document.querySelector(".btn-styled-toggle");
  
  if (styleControlsSection.style.display === "none") {
    styleControlsSection.style.display = "block";
    toggleBtn.textContent = "🎨 Hide Customization";
    toggleBtn.classList.add("active");
  } else {
    styleControlsSection.style.display = "none";
    toggleBtn.textContent = "🎨 Customize Style";
    toggleBtn.classList.remove("active");
  }
}

// Toggle style customization section (deprecated - keeping for compatibility)
function toggleStyleSection() {
  toggleStyleControls();
}

// Switch between code tabs
function switchTab(tabName) {
  // Remove active class from all tabs and buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.code-tab').forEach(tab => tab.classList.remove('active'));
  
  // Add active class to selected tab and button
  document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
  document.getElementById(tabName === 'basic' ? 'basicTab' : 'styledTab').classList.add('active');
}

// Setup event listeners
function setupEventListeners() {
  // Back button
  document.getElementById("backBtn").addEventListener("click", goBackToGroups);

  // Close modal
  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("iconModal").classList.remove("active");
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
  document.getElementById("iconModal").addEventListener("click", (e) => {
    if (e.target.id === "iconModal") {
      document.getElementById("iconModal").classList.remove("active");
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

// Go back to groups selection
function goBackToGroups() {
  document.getElementById("groupsSection").style.display = "block";
  document.getElementById("browserSection").style.display = "none";
  
  // Clear search
  document.getElementById("searchInput").value = "";
  
  // Remove current group CSS
  const existingLinks = document.querySelectorAll('link[data-icon-library]');
  existingLinks.forEach(link => link.remove());
  
  currentGroup = null;
  allIcons = [];
}

// Download library function
function downloadLibrary(groupId) {
  const group = iconGroups.find(g => g.id === groupId);
  
  if (!group || !group.downloadPath) {
    showToast("Download not available for this library");
    return;
  }

  // Check if file exists before downloading
  fetch(group.downloadPath, { method: 'HEAD' })
    .then(response => {
      if (response.ok) {
        // Create download link
        const link = document.createElement('a');
        link.href = group.downloadPath;
        link.download = `${group.name.toLowerCase().replace(/\s+/g, '-')}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Downloading ${group.name}...`);
      } else {
        throw new Error('File not found');
      }
    })
    .catch(error => {
      console.error('Download error:', error);
      showToast(`Download not available for ${group.name}`);
    });
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  loadIconGroups();
  setupEventListeners();
});
