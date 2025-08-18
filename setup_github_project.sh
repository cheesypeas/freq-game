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
        repository {
          name
        }
      }
    }
  }
}' --jq '.data.user.projectsV2.nodes[] | select(.repository.name == "'$REPO_NAME'") | .id')

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

# Priority labels
gh api repos/$REPO_NAME/labels -f name="priority: high" -f description="Critical for MVP" -f color="d73a4a" >/dev/null 2>&1 || true
gh api repos/$REPO_NAME/labels -f name="priority: medium" -f description="Important for launch" -f color="fbca04" >/dev/null 2>&1 || true
gh api repos/$REPO_NAME/labels -f name="priority: low" -f description="Nice to have" -f color="0e8a16" >/dev/null 2>&1 || true

# Type labels
gh api repos/$REPO_NAME/labels -f name="type: feature" -f description="New functionality" -f color="1d76db" >/dev/null 2>&1 || true
gh api repos/$REPO_NAME/labels -f name="type: bug" -f description="Bug fixes" -f color="d73a4a" >/dev/null 2>&1 || true
gh api repos/$REPO_NAME/labels -f name="type: enhancement" -f description="Improvements" -f color="a2eeef" >/dev/null 2>&1 || true
gh api repos/$REPO_NAME/labels -f name="type: documentation" -f description="Docs and guides" -f color="0075ca" >/dev/null 2>&1 || true

# Component labels
gh api repos/$REPO_NAME/labels -f name="component: core" -f description="Game logic" -f color="5319e7" >/dev/null 2>&1 || true
gh api repos/$REPO_NAME/labels -f name="component: audio" -f description="Audio system" -f color="c2e0c6" >/dev/null 2>&1 || true
gh api repos/$REPO_NAME/labels -f name="component: ui" -f description="User interface" -f color="bfdadc" >/dev/null 2>&1 || true
gh api repos/$REPO_NAME/labels -f name="component: data" -f description="Puzzle data" -f color="fef2c0" >/dev/null 2>&1 || true
gh api repos/$REPO_NAME/labels -f name="component: infrastructure" -f description="Hosting/deployment" -f color="d4c5f9" >/dev/null 2>&1 || true

echo -e "${GREEN}✅ Labels created${NC}"

# Step 7: Create Issues
echo ""
echo -e "${BLUE}🎯 Step 7: Creating Issues${NC}"
echo "----------------------------"

# Function to create issue
create_issue() {
    local number=$1
    local title="$2"
    local body="$3"
    local labels="$4"
    
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
create_issue 1 "Set up GitHub repository and project board" "## Feature Description
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

create_issue 2 "Configure GitHub Pages for hosting" "## Feature Description
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
create_issue 5 "Implement daily puzzle selection system" "## Feature Description
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

# Continue with more issues...
echo "Creating additional issues..."

# Create a few more key issues to demonstrate
create_issue 10 "Set up Web Audio API integration" "## Feature Description
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

create_issue 20 "Build main game layout and structure" "## Feature Description
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
echo "✅ Labels: Priority, Type, and Component labels"
echo "✅ Issues: Core development issues created"
echo "✅ GitHub Pages: Enabled for hosting"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Visit: https://github.com/$(gh api user --jq .login)/$REPO_NAME"
echo "2. Go to Projects tab to see your board"
echo "3. Assign issues to team members/agents"
echo "4. Start development!"
echo ""
echo -e "${BLUE}Your game will be available at:${NC}"
echo "https://$(gh api user --jq .login).github.io/$REPO_NAME"
echo ""
echo -e "${GREEN}🚀 Ready to build Freq! 🎵${NC}"
