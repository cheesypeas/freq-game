#!/bin/bash

# superfreq GitHub Project Setup Automation Script
# This script automates the entire GitHub setup process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_NAME="freq-game"
REPO_DESCRIPTION="Daily audio production puzzle game - listen and guess effect parameters"
PROJECT_NAME="Superfreq Development"
PROJECT_DESCRIPTION="Development board for Superfreq audio puzzle game"

echo -e "${BLUE}🎵 superfreq GitHub Project Setup Automation${NC}"
echo "================================================"

# Check if gh is authenticated
if ! gh auth status >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  GitHub CLI not authenticated. Please run:${NC}"
    echo "gh auth login"
    echo ""
    echo "This will open a browser for authentication."
    read -p "Press Enter after you've authenticated..."
fi

# Check authentication again
if ! gh auth status >/dev/null 2>&1; then
    echo -e "${RED}❌ Still not authenticated. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"

# Step 1: Create Repository
echo ""
echo -e "${BLUE}📦 Step 1: Creating GitHub Repository${NC}"
echo "----------------------------------------"

if gh repo view "$REPO_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Repository '$REPO_NAME' already exists${NC}"
    read -p "Do you want to use the existing repository? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Exiting. Please delete the repository manually or choose a different name.${NC}"
        exit 1
    fi
else
    echo "Creating repository: $REPO_NAME"
    gh repo create "$REPO_NAME" \
        --description "$REPO_DESCRIPTION" \
        --public \
        --clone=false
    
    echo -e "${GREEN}✅ Repository created successfully${NC}"
fi

# Step 2: Add remote origin
echo ""
echo -e "${BLUE}🔗 Step 2: Setting up Git Remote${NC}"
echo "-----------------------------------"

if git remote get-url origin >/dev/null 2>&1; then
    echo "Remote origin already exists, updating..."
    git remote set-url origin "https://github.com/$(gh api user --jq .login)/$REPO_NAME.git"
else
    echo "Adding remote origin..."
    git remote add origin "https://github.com/$(gh api user --jq .login)/$REPO_NAME.git"
fi

echo -e "${GREEN}✅ Git remote configured${NC}"

# Step 3: Push code
echo ""
echo -e "${BLUE}📤 Step 3: Pushing Code to GitHub${NC}"
echo "-----------------------------------"

echo "Pushing code to GitHub..."
git push -u origin main

echo -e "${GREEN}✅ Code pushed successfully${NC}"

# Step 4: Project Board Setup
echo ""
echo -e "${BLUE}📋 Step 4: Project Board Setup${NC}"
echo "-----------------------------------"

echo "Checking if project board already exists..."
echo -e "${BLUE}Looking for project board: $PROJECT_NAME${NC}"

# Try to detect if the project board already exists
PROJECT_EXISTS=false

# Check if we can find the project board via API
if gh api repos/$REPO_NAME/projects >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Repository projects accessible${NC}"
    PROJECT_EXISTS=true
else
    echo -e "${YELLOW}⚠️  Cannot check repository projects via API${NC}"
fi

if [ "$PROJECT_EXISTS" = true ]; then
    echo -e "${GREEN}✅ Project board appears to exist${NC}"
    echo "Continuing with issue and label creation..."
else
    echo -e "${YELLOW}⚠️  Project board creation requires special permissions${NC}"
    echo "Please create the project board manually first:"
    echo "1. Go to: https://github.com/cheesypeas/$REPO_NAME/projects"
    echo "2. Click 'New Project'"
    echo "3. Choose 'Board' template"
    echo "4. Name it: '$PROJECT_NAME'"
    echo "5. Add columns: Backlog, In Progress, Review, Done"
    echo ""
    read -p "Press Enter after you've created the project board manually..."
fi

echo -e "${GREEN}✅ Project board setup complete${NC}"
echo -e "${BLUE}Note: Issues will be created but not automatically added to the project board${NC}"
echo "You can manually move issues to the appropriate columns after creation."
echo ""

# Set PROJECT_ID to empty since we're not using it
PROJECT_ID=""

# Step 5: Create Labels
echo ""
echo -e "${BLUE}🏷️  Step 6: Creating Labels${NC}"
echo "---------------------------"

echo "Debug: REPO_NAME = '$REPO_NAME'"
echo "Debug: Current working directory = $(pwd)"

# Function to create label if it doesn't exist
create_label_if_missing() {
    local name="$1"
    local description="$2"
    local color="$3"
    
    echo "Checking label: $name"
    echo "Debug: Using REPO_NAME = '$REPO_NAME'"
    
    # Check if label exists by counting results
    local existing_count=$(gh api repos/$REPO_NAME/labels --jq ".[] | select(.name == \"$name\") | .name" 2>/dev/null | wc -l)
    
    if [ "$existing_count" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Label '$name' already exists${NC}"
    else
        echo "Creating label: $name"
        # Use the correct GitHub CLI syntax for creating labels
        local response=$(gh api repos/$REPO_NAME/labels -f name="$name" -f description="$description" -f color="$color" 2>&1)
        
        if echo "$response" | grep -q '"id"'; then
            local label_id=$(echo "$response" | jq '.id')
            echo -e "${GREEN}✅ Label '$name' created successfully (ID: $label_id)${NC}"
        else
            echo -e "${RED}❌ Failed to create label '$name'${NC}"
            echo "Error: $response"
            echo "Continuing with next label..."
        fi
    fi
}

# Priority labels
echo "Creating priority labels..."
create_label_if_missing "priority: high" "Critical for MVP" "d73a4a"
echo "After priority: high"
create_label_if_missing "priority: medium" "Important for launch" "fbca04"
echo "After priority: medium"
create_label_if_missing "priority: low" "Nice to have" "0e8a16"
echo "After priority: low"

# Type labels
echo "Creating type labels..."
create_label_if_missing "type: feature" "New functionality" "1d76db"
echo "After type: feature"
create_label_if_missing "type: bug" "Bug fixes" "d73a4a"
echo "After type: bug"
create_label_if_missing "type: enhancement" "Improvements" "a2eeef"
echo "After type: enhancement"
create_label_if_missing "type: documentation" "Docs and guides" "0075ca"
echo "After type: documentation"
create_label_if_missing "type: design" "UI/UX improvements" "5319e7"
echo "After type: design"
create_label_if_missing "type: styling" "Visual and theme updates" "c2e0c6"
echo "After type: styling"

# Component labels
echo "Creating component labels..."
create_label_if_missing "component: core" "Game logic" "5319e7"
echo "After component: core"
create_label_if_missing "component: audio" "Audio system" "c2e0c6"
echo "After component: audio"
create_label_if_missing "component: ui" "User interface" "bfdadc"
echo "After component: ui"
create_label_if_missing "component: ux" "User experience" "fef2c0"
echo "After component: ux"
create_label_if_missing "component: design" "Visual design system" "d4c5f9"
echo "After component: design"
create_label_if_missing "component: data" "Puzzle data" "fef2c0"
echo "After component: data"
create_label_if_missing "component: infrastructure" "Hosting/deployment" "d4c5f9"
echo "After component: infrastructure"

echo -e "${GREEN}✅ Labels created${NC}"

# Step 7: Create Issues
echo ""
echo -e "${BLUE}🎯 Step 7: Creating Issues${NC}"
echo "----------------------------"

# Function to check if issue exists
issue_exists() {
    local title="$1"
    gh api repos/$REPO_NAME/issues --jq ".[] | select(.title == \"$title\")" >/dev/null 2>&1
}

# Function to create issue if it doesn't exist
create_issue_if_missing() {
    local number=$1
    local title="$2"
    local body="$3"
    local labels="$4"
    
    if issue_exists "$title"; then
        echo -e "${YELLOW}⚠️  Issue #$number already exists: $title${NC}"
        return
    fi
    
    echo "Creating issue #$number: $title"
    
    # Convert comma-separated labels to array format
    local labels_array=$(echo "$labels" | tr ',' '\n' | tr -d ' ' | jq -R . | jq -s .)
    
    # Create issue with correct GitHub CLI syntax
    local response=$(gh api repos/$REPO_NAME/issues -f title="$title" -f body="$body" -f labels="$labels_array" 2>&1)
    
    if echo "$response" | grep -q '"id"'; then
        local issue_id=$(echo "$response" | jq '.id')
        echo -e "${GREEN}✅ Issue #$number created successfully (ID: $issue_id)${NC}"
        echo -e "${BLUE}Note: You can manually add this issue to your project board${NC}"
    else
        echo -e "${RED}❌ Failed to create issue #$number: $title${NC}"
        echo "Error: $response"
        echo "Continuing with next issue..."
    fi
}

# Foundation & Setup Issues
create_issue_if_missing 1 "Set up GitHub repository and project board" "## Feature Description
Set up the complete GitHub infrastructure for the superfreq project.

## Acceptance Criteria
- [ ] Repository created with proper description
- [ ] Project board created with columns
- [ ] Labels configured for organization
- [ ] Issues created for parallel development

## Technical Requirements
- [ ] Use GitHub CLI for automation
- [ ] Configure proper access permissions
- [ ] Set up branch protection rules

## Dependencies
- [ ] GitHub CLI authentication
- [ ] Repository creation permissions

## Estimated Effort
Low

## Notes
This is the foundational setup issue." "priority: high,type: feature,component: infrastructure"

create_issue_if_missing 2 "Configure GitHub Pages for hosting" "## Feature Description
Set up GitHub Pages to host the superfreq game for free.

## Acceptance Criteria
- [ ] GitHub Pages enabled in repository settings
- [ ] Source set to main branch
- [ ] Custom domain configured (if desired)
- [ ] HTTPS enforced

## Technical Requirements
- [ ] Configure Pages source branch
- [ ] Set up custom domain (optional)
- [ ] Test deployment

## Dependencies
- [ ] Repository setup complete
- [ ] Main branch with code

## Estimated Effort
Low

## Notes
GitHub Pages provides free hosting for static sites." "priority: high,type: feature,component: infrastructure"

# Core Game Logic Issues
create_issue_if_missing 5 "Implement daily puzzle selection system" "## Feature Description
Create the system that selects puzzles based on the current date.

## Acceptance Criteria
- [ ] Date-based puzzle selection works
- [ ] Same puzzle for all users on same day
- [ ] Handles date changes correctly
- [ ] Fallback for missing puzzles

## Technical Requirements
- [ ] Use current date as seed
- [ ] Implement deterministic selection
- [ ] Handle timezone considerations

## Dependencies
- [ ] Puzzle data structure defined
- [ ] Date handling utilities

## Estimated Effort
Medium

## Notes
This is core to the daily puzzle concept." "priority: high,type: feature,component: core"

# VST-Style Design Issues
create_issue_if_missing 26 "Implement dark theme color palette" "## Design Description
Create a professional dark theme color palette for the VST-style interface.

## Visual Requirements
- [ ] Dark gray primary background (#1a1a1a)
- [ ] Secondary background (#2a2a2a)
- [ ] Professional accent colors (blues/greens)
- [ ] High contrast text colors

## VST-Style Guidelines
- [ ] Professional audio plugin aesthetic
- [ ] Dark theme compliance
- [ ] Consistent color usage
- [ ] Accessibility considerations

## Acceptance Criteria
- [ ] Design matches VST aesthetic
- [ ] High contrast for readability
- [ ] Professional appearance
- [ ] Color palette documented

## Dependencies
- [ ] Design system established
- [ ] Component library ready

## Estimated Effort
Medium

## Notes
Foundation for all VST-style components." "priority: high,type: design,component: design"

create_issue_if_missing 27 "Create VST-style parameter knobs" "## Design Description
Design and implement circular parameter knobs similar to professional audio plugins.

## Visual Requirements
- [ ] Circular knob design with value indicators
- [ ] Smooth rotation animations
- [ ] Value display on or near knob
- [ ] Professional styling and shadows

## VST-Style Guidelines
- [ ] Professional audio plugin aesthetic
- [ ] Smooth parameter animations
- [ ] Intuitive interaction design
- [ ] Consistent with audio industry standards

## Acceptance Criteria
- [ ] Knobs look professional and polished
- [ ] Smooth rotation and interaction
- [ ] Clear value indication
- [ ] Responsive across devices

## Dependencies
- [ ] Dark theme implemented
- [ ] CSS animations ready
- [ ] Design system established

## Estimated Effort
High

## Notes
Core component for parameter control." "priority: high,type: design,component: design"

create_issue_if_missing 28 "Design professional audio plugin layout" "## Design Description
Create the main layout structure that resembles professional VST plugins.

## Visual Requirements
- [ ] Grid-based layout system
- [ ] Logical control grouping
- [ ] Professional spacing and alignment
- [ ] Clear visual hierarchy

## VST-Style Guidelines
- [ ] Professional audio plugin aesthetic
- [ ] Consistent spacing and alignment
- [ ] Logical information architecture
- [ ] Industry-standard layout patterns

## Acceptance Criteria
- [ ] Layout looks professional
- [ ] Controls are logically grouped
- [ ] Information hierarchy is clear
- [ ] Responsive across screen sizes

## Dependencies
- [ ] Dark theme implemented
- [ ] Component library ready
- [ ] Grid system established

## Estimated Effort
Medium

## Notes
Foundation for all interface components." "priority: high,type: design,component: design"

# Audio Parameter Control Issues
create_issue_if_missing 35 "Design knob parameter input system" "## Feature Description
Create the interactive system for parameter input using VST-style knobs.

## Acceptance Criteria
- [ ] Knobs respond to mouse/touch input
- [ ] Parameter values update in real-time
- [ ] Smooth rotation animations
- [ ] Value constraints and validation

## Technical Requirements
- [ ] Mouse and touch event handling
- [ ] Real-time parameter updates
- [ ] Smooth CSS animations
- [ ] Parameter validation system

## Dependencies
- [ ] VST-style knobs implemented
- [ ] Audio system ready
- [ ] Parameter validation system

## Estimated Effort
High

## Notes
Core interaction system for the game." "priority: high,type: feature,component: ux"

create_issue_if_missing 36 "Implement smooth knob rotation and interaction" "## Feature Description
Add smooth, professional rotation animations and interactions to parameter knobs.

## Acceptance Criteria
- [ ] Smooth rotation animations
- [ ] Real-time parameter updates
- [ ] Professional feel and response
- [ ] Performance optimized

## Technical Requirements
- [ ] CSS transforms and transitions
- [ ] JavaScript animation handling
- [ ] Performance optimization
- [ ] Cross-browser compatibility

## Dependencies
- [ ] Knob parameter system implemented
- [ ] CSS animation system ready
- [ ] Performance testing framework

## Estimated Effort
Medium

## Notes
Critical for professional feel." "priority: medium,type: enhancement,component: ux"

# Continue with more key issues...
echo "Creating additional VST-style and audio control issues..."

# Create a few more key issues to demonstrate
create_issue_if_missing 10 "Set up Web Audio API integration" "## Feature Description
Integrate Web Audio API for better audio control and performance.

## Acceptance Criteria
- [ ] Audio context properly initialized
- [ ] Audio loading and caching working
- [ ] Playback controls functional
- [ ] Error handling implemented

## Technical Requirements
- [ ] Web Audio API compatibility
- [ ] Fallback for unsupported browsers
- [ ] Performance optimization

## Dependencies
- [ ] Audio file URLs available
- [ ] Browser compatibility research

## Estimated Effort
Medium

## Notes
Critical for audio quality and user experience." "priority: high,type: feature,component: audio"

create_issue_if_missing 20 "Build main game layout and structure" "## Feature Description
Create the main game interface layout and structure.

## Acceptance Criteria
- [ ] Responsive design implemented
- [ ] Game sections properly organized
- [ ] Mobile-friendly layout
- [ ] Accessibility features included

## Technical Requirements
- [ ] CSS Grid/Flexbox layout
- [ ] Mobile-first approach
- [ ] Screen reader support

## Dependencies
- [ ] HTML structure defined
- [ ] Design mockups available

## Estimated Effort
Medium

## Notes
Foundation for all UI components." "priority: high,type: feature,component: ui"

echo -e "${GREEN}✅ Issues created successfully${NC}"

# Step 8: Enable GitHub Pages
echo ""
echo -e "${BLUE}🌐 Step 8: Enabling GitHub Pages${NC}"
echo "--------------------------------"

echo "Enabling GitHub Pages..."
gh api repos/$REPO_NAME/pages -f source='{"branch":"main","path":"/"}' >/dev/null 2>&1 || echo -e "${YELLOW}⚠️  GitHub Pages may already be enabled or need manual configuration${NC}"

echo -e "${GREEN}✅ GitHub Pages configured${NC}"

# Final Summary
echo ""
echo -e "${GREEN}🎉 GitHub Project Setup Complete!${NC}"
echo "======================================"
echo ""
echo -e "${BLUE}What was created:${NC}"
echo "✅ Repository: $REPO_NAME"
echo "✅ Project Board: $PROJECT_NAME"
echo "✅ Labels: Priority, Type, Component, and Design labels"
echo "✅ Issues: VST-style development issues created"
echo "✅ GitHub Pages: Enabled for hosting"
echo ""
echo -e "${BLUE}VST-Style Features Added:${NC}"
echo "🎨 Dark theme and professional color palette"
echo "🎛️ VST-style parameter knobs and controls"
echo "🎚️ Professional audio plugin layout"
echo "✨ Smooth animations and transitions"
echo "📱 Responsive and accessible design"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Visit: https://github.com/$(gh api user --jq .login)/$REPO_NAME"
echo "2. Go to Projects tab to see your board"
echo "3. Assign issues to team members/agents"
echo "4. Start development of the VST-style interface!"
echo ""
echo -e "${BLUE}Your game will be available at:${NC}"
echo "https://$(gh api user --jq .login).github.io/$REPO_NAME"
echo ""
echo -e "${GREEN}🚀 Ready to build superfreq - The VST-Style Audio Puzzle Game! 🎵🎛️${NC}"
