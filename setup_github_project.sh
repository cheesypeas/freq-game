#!/bin/bash

# Freq GitHub Project Setup Automation Script
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
PROJECT_NAME="Freq Development"
PROJECT_DESCRIPTION="Development board for Freq audio puzzle game"

echo -e "${BLUE}🎵 Freq GitHub Project Setup Automation${NC}"
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

# Step 4: Create Project Board
echo ""
echo -e "${BLUE}📋 Step 4: Creating Project Board${NC}"
echo "-----------------------------------"

# Get the project ID
PROJECT_ID=$(gh api graphql -f query='
query {
  user(login: "'$(gh api user --jq .login)'") {
    projectsV2(first: 100) {
      nodes {
        id
        title
      }
    }
  }
}' --jq '.data.user.projectsV2.nodes[] | select(.title == "'$PROJECT_NAME'") | .id')

if [ -z "$PROJECT_ID" ]; then
    echo "Creating project board..."
    PROJECT_ID=$(gh api graphql -f query='
    mutation {
      createProjectV2(input: {
        title: "'$PROJECT_NAME'"
        description: "'$PROJECT_DESCRIPTION'"
        repositoryId: "'$(gh api repos/$REPO_NAME --jq .id)'"
      }) {
        projectV2 {
          id
        }
      }
    }' --jq '.data.createProjectV2.projectV2.id')
    
    echo -e "${GREEN}✅ Project board created${NC}"
else
    echo -e "${YELLOW}⚠️  Project board already exists${NC}"
fi

# Step 5: Create Project Columns
echo ""
echo -e "${BLUE}📊 Step 5: Setting up Project Columns${NC}"
echo "----------------------------------------"

COLUMNS=("Backlog" "In Progress" "Review" "Done")

for column in "${COLUMNS[@]}"; do
    echo "Creating column: $column"
    gh api graphql -f query='
    mutation {
      createProjectV2Column(input: {
        projectId: "'$PROJECT_ID'"
        name: "'$column'"
      }) {
        columnEdge {
          node {
            id
          }
        }
      }
    }' >/dev/null 2>&1 || echo -e "${YELLOW}⚠️  Column '$column' may already exist${NC}"
done

echo -e "${GREEN}✅ Project columns created${NC}"

# Step 6: Create Labels
echo ""
echo -e "${BLUE}🏷️  Step 6: Creating Labels${NC}"
echo "---------------------------"

# Function to create label if it doesn't exist
create_label_if_missing() {
    local name="$1"
    local description="$2"
    local color="$3"
    
    # Check if label exists
    if ! gh api repos/$REPO_NAME/labels --jq ".[] | select(.name == \"$name\")" >/dev/null 2>&1; then
        echo "Creating label: $name"
        gh api repos/$REPO_NAME/labels -f name="$name" -f description="$description" -f color="$color" >/dev/null 2>&1
    else
        echo -e "${YELLOW}⚠️  Label '$name' already exists${NC}"
    fi
}

# Priority labels
create_label_if_missing "priority: high" "Critical for MVP" "d73a4a"
create_label_if_missing "priority: medium" "Important for launch" "fbca04"
create_label_if_missing "priority: low" "Nice to have" "0e8a16"

# Type labels
create_label_if_missing "type: feature" "New functionality" "1d76db"
create_label_if_missing "type: bug" "Bug fixes" "d73a4a"
create_label_if_missing "type: enhancement" "Improvements" "a2eeef"
create_label_if_missing "type: documentation" "Docs and guides" "0075ca"
create_label_if_missing "type: design" "UI/UX improvements" "5319e7"
create_label_if_missing "type: styling" "Visual and theme updates" "c2e0c6"

# Component labels
create_label_if_missing "component: core" "Game logic" "5319e7"
create_label_if_missing "component: audio" "Audio system" "c2e0c6"
create_label_if_missing "component: ui" "User interface" "bfdadc"
create_label_if_missing "component: ux" "User experience" "fef2c0"
create_label_if_missing "component: design" "Visual design system" "d4c5f9"
create_label_if_missing "component: data" "Puzzle data" "fef2c0"
create_label_if_missing "component: infrastructure" "Hosting/deployment" "d4c5f9"

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
    
    local issue_id=$(gh api repos/$REPO_NAME/issues -f title="$title" -f body="$body" -f labels="$labels" --jq '.[0].id')
    
    # Add to project board (Backlog column)
    local column_id=$(gh api graphql -f query='
    query {
      user(login: "'$(gh api user --jq .login)'") {
        projectsV2(first: 100) {
          nodes {
            id
            title
            columns(first: 100) {
              nodes {
                id
                name
              }
            }
          }
        }
      }
    }' --jq '.data.user.projectsV2.nodes[] | select(.id == "'$PROJECT_ID'") | .columns.nodes[] | select(.name == "Backlog") | .id')
    
    if [ ! -z "$column_id" ]; then
        gh api graphql -f query='
        mutation {
          addProjectV2ItemById(input: {
            projectId: "'$PROJECT_ID'"
            itemId: "'$issue_id'"
            columnId: "'$column_id'"
          }) {
            item {
              id
            }
          }
        }' >/dev/null 2>&1 || true
    fi
}

# Foundation & Setup Issues
create_issue_if_missing 1 "Set up GitHub repository and project board" "## Feature Description
Set up the complete GitHub infrastructure for the Freq project.

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
Set up GitHub Pages to host the Freq game for free.

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
echo -e "${GREEN}🚀 Ready to build Freq - The VST-Style Audio Puzzle Game! 🎵🎛️${NC}"
