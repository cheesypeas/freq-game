#!/bin/bash

# GitHub Issue Management Script for Superfreq Project
# This script allows you to manage GitHub issues from your local machine
# Perfect for use with Cursor agent chats and local development workflow

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
REPO_NAME="cheesypeas/freq-game"
SCRIPT_NAME="manage_github_issues.sh"

# Default issue templates
BUG_TEMPLATE="🐛 Bug Report"
FEATURE_TEMPLATE="✨ Feature Request"
IMPROVEMENT_TEMPLATE="🔧 Improvement"
DOCS_TEMPLATE="📚 Documentation"
AUDIO_TEMPLATE="🎵 Audio Issue"
PUZZLE_TEMPLATE="🧩 Puzzle Issue"

# Function to print usage
print_usage() {
    echo -e "${BLUE}🎵 Superfreq GitHub Issue Manager${NC}"
    echo "======================================"
    echo ""
    echo -e "${CYAN}Usage:${NC}"
    echo "  $SCRIPT_NAME [COMMAND] [OPTIONS]"
    echo ""
    echo -e "${CYAN}Commands:${NC}"
    echo "  create     - Create a new issue"
    echo "  list       - List all issues"
    echo "  view       - View a specific issue"
    echo "  edit       - Edit an existing issue"
    echo "  close      - Close an issue"
    echo "  reopen     - Reopen a closed issue"
    echo "  assign     - Assign issue to a user"
    echo "  label      - Add/remove labels"
    echo "  comment    - Add a comment to an issue"
  echo "  search     - Search issues by text"
  echo "  status     - Show project status"
  echo "  help       - Show this help message"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  $SCRIPT_NAME create --title 'Fix audio playback bug' --body 'Audio stops after 30 seconds'"
    echo "  $SCRIPT_NAME list --state open"
    echo "  $SCRIPT_NAME view 123"
    echo "  $SCRIPT_NAME assign 123 --user username"
    echo "  $SCRIPT_NAME close 123"
    echo ""
    echo -e "${CYAN}Quick Commands (Agent-Friendly):${NC}"
echo "  $SCRIPT_NAME create-bug <title> <description> <steps> <expected> <actual>"
echo "  $SCRIPT_NAME create-feature <title> <description> <usecase> <benefits>"
echo "  $SCRIPT_NAME create-audio <title> <description> <audio_file> <expected> <current>"
echo "  $SCRIPT_NAME create-puzzle <title> <description> <difficulty> <solution> <behavior>"
echo ""
echo "  Examples:"
echo "    $SCRIPT_NAME create-bug 'Audio bug' 'Audio stops' 'Click play' 'Audio plays' 'Audio stops'"
echo "    $SCRIPT_NAME create-feature 'New effect' 'Add reverb' 'User wants reverb' 'More variety'"
echo ""
echo -e "${CYAN}Interactive Commands:${NC}"
echo "  $SCRIPT_NAME create-bug-interactive"
echo "  $SCRIPT_NAME create-feature-interactive"
echo "  $SCRIPT_NAME create-audio-interactive"
echo "  $SCRIPT_NAME create-puzzle-interactive"
echo ""
}

# Function to check GitHub CLI authentication
check_auth() {
    if ! gh auth status >/dev/null 2>&1; then
        echo -e "${RED}❌ GitHub CLI not authenticated${NC}"
        echo "Please run: gh auth login"
        exit 1
    fi
}

# Default values
DEFAULT_LABELS="bug,enhancement,documentation,component: audio,component: core"
DEFAULT_ASSIGNEE=""
DEFAULT_MILESTONE=""

# Function to create an issue
create_issue() {
    local title=""
    local body=""
    local labels=""
    local assignee=""
    local milestone=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --title)
                title="$2"
                shift 2
                ;;
            --body)
                body="$2"
                shift 2
                ;;
            --labels)
                labels="$2"
                shift 2
                ;;
            --assignee)
                assignee="$2"
                shift 2
                ;;
            --milestone)
                milestone="$2"
                shift 2
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                exit 1
                ;;
        esac
    done
    
    # Interactive input if not provided
    if [[ -z "$title" ]]; then
        read -p "Issue title: " title
    fi
    
    if [[ -z "$body" ]]; then
        echo "Issue description (press Enter twice to finish):"
        body=""
        while IFS= read -r line; do
            if [[ -z "$line" && -z "$body" ]]; then
                break
            fi
            body+="$line"$'\n'
        done
    fi
    
    if [[ -z "$labels" ]]; then
        labels="$DEFAULT_LABELS"
    fi
    
    if [[ -z "$assignee" ]]; then
        assignee="$DEFAULT_ASSIGNEE"
    fi
    
    # Create the issue
    local issue_cmd="gh issue create --repo $REPO_NAME --title '$title' --body '$body'"
    
    if [[ -n "$labels" ]]; then
        issue_cmd+=" --label '$labels'"
    fi
    
    if [[ -n "$assignee" ]]; then
        issue_cmd+=" --assignee '$assignee'"
    fi
    
    if [[ -n "$milestone" ]]; then
        issue_cmd+=" --milestone '$milestone'"
    fi
    
    echo -e "${BLUE}📝 Creating issue...${NC}"
    eval "$issue_cmd"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Issue created successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to create issue${NC}"
        exit 1
    fi
}

# Function to list issues
list_issues() {
    local state="all"
    local labels=""
    local assignee=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --state)
                state="$2"
                shift 2
                ;;
            --labels)
                labels="$2"
                shift 2
                ;;
            --assignee)
                assignee="$2"
                shift 2
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                exit 1
                ;;
        esac
    done
    
    echo -e "${BLUE}📋 Listing issues (state: $state)${NC}"
    echo "======================================"
    
    local list_cmd="gh issue list --repo $REPO_NAME --state $state"
    
    if [[ -n "$labels" ]]; then
        list_cmd+=" --label '$labels'"
    fi
    
    if [[ -n "$assignee" ]]; then
        list_cmd+=" --assignee '$assignee'"
    fi
    
    eval "$list_cmd"
}

# Function to view a specific issue
view_issue() {
    local issue_number="$1"
    
    if [[ -z "$issue_number" ]]; then
        echo -e "${RED}❌ Issue number required${NC}"
        echo "Usage: $SCRIPT_NAME view <issue_number>"
        exit 1
    fi
    
    echo -e "${BLUE}👁️  Viewing issue #$issue_number${NC}"
    echo "======================================"
    
    gh issue view "$issue_number" --repo "$REPO_NAME"
}

# Function to edit an issue
edit_issue() {
    local issue_number="$1"
    local title=""
    local body=""
    local labels=""
    local assignee=""
    
    if [[ -z "$issue_number" ]]; then
        echo -e "${RED}❌ Issue number required${NC}"
        echo "Usage: $SCRIPT_NAME edit <issue_number> [OPTIONS]"
        exit 1
    fi
    
    # Parse arguments
    while [[ $# -gt 1 ]]; do
        case $2 in
            --title)
                title="$3"
                shift 2
                ;;
            --body)
                body="$3"
                shift 2
                ;;
            --labels)
                labels="$3"
                shift 2
                ;;
            --assignee)
                assignee="$3"
                shift 2
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $2${NC}"
                exit 1
                ;;
        esac
    done
    
    echo -e "${BLUE}✏️  Editing issue #$issue_number${NC}"
    
    local edit_cmd="gh issue edit $issue_number --repo $REPO_NAME"
    
    if [[ -n "$title" ]]; then
        edit_cmd+=" --title '$title'"
    fi
    
    if [[ -n "$body" ]]; then
        edit_cmd+=" --body '$body'"
    fi
    
    if [[ -n "$labels" ]]; then
        edit_cmd+=" --label '$labels'"
    fi
    
    if [[ -n "$assignee" ]]; then
        edit_cmd+=" --assignee '$assignee'"
    fi
    
    eval "$edit_cmd"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Issue updated successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to update issue${NC}"
        exit 1
    fi
}

# Function to close an issue
close_issue() {
    local issue_number="$1"
    
    if [[ -z "$issue_number" ]]; then
        echo -e "${RED}❌ Issue number required${NC}"
        echo "Usage: $SCRIPT_NAME close <issue_number>"
        exit 1
    fi
    
    echo -e "${BLUE}🔒 Closing issue #$issue_number${NC}"
    
    gh issue close "$issue_number" --repo "$REPO_NAME"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Issue closed successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to close issue${NC}"
        exit 1
    fi
}

# Function to reopen an issue
reopen_issue() {
    local issue_number="$1"
    
    if [[ -z "$issue_number" ]]; then
        echo -e "${RED}❌ Issue number required${NC}"
        echo "Usage: $SCRIPT_NAME reopen <issue_number>"
        exit 1
    fi
    
    echo -e "${BLUE}🔓 Reopening issue #$issue_number${NC}"
    
    gh issue reopen "$issue_number" --repo "$REPO_NAME"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Issue reopened successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to reopen issue${NC}"
        exit 1
    fi
}

# Function to assign an issue
assign_issue() {
    local issue_number="$1"
    local user=""
    
    if [[ -z "$issue_number" ]]; then
        echo -e "${RED}❌ Issue number required${NC}"
        echo "Usage: $SCRIPT_NAME assign <issue_number> --user <username>"
        exit 1
    fi
    
    # Parse arguments
    while [[ $# -gt 1 ]]; do
        case $2 in
            --user)
                user="$3"
                shift 2
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $2${NC}"
                exit 1
                ;;
        esac
    done
    
    if [[ -z "$user" ]]; then
        echo -e "${RED}❌ Username required${NC}"
        echo "Usage: $SCRIPT_NAME assign <issue_number> --user <username>"
        exit 1
    fi
    
    echo -e "${BLUE}👤 Assigning issue #$issue_number to @$user${NC}"
    
    gh issue edit "$issue_number" --repo "$REPO_NAME" --assignee "$user"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Issue assigned successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to assign issue${NC}"
        exit 1
    fi
}

# Function to add/remove labels
manage_labels() {
    local issue_number="$1"
    local action=""
    local labels=""
    
    if [[ -z "$issue_number" ]]; then
        echo -e "${RED}❌ Issue number required${NC}"
        echo "Usage: $SCRIPT_NAME label <issue_number> --add/--remove <labels>"
        exit 1
    fi
    
    # Parse arguments
    while [[ $# -gt 1 ]]; do
        case $2 in
            --add)
                action="add"
                labels="$3"
                shift 2
                ;;
            --remove)
                action="remove"
                labels="$3"
                shift 2
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $2${NC}"
                exit 1
                ;;
        esac
    done
    
    if [[ -z "$action" || -z "$labels" ]]; then
        echo -e "${RED}❌ Action and labels required${NC}"
        echo "Usage: $SCRIPT_NAME label <issue_number> --add/--remove <labels>"
        exit 1
    fi
    
    echo -e "${BLUE}🏷️  ${action}ing labels to issue #$issue_number${NC}"
    
    if [[ "$action" == "add" ]]; then
        gh issue edit "$issue_number" --repo "$REPO_NAME" --add-label "$labels"
    else
        gh issue edit "$issue_number" --repo "$REPO_NAME" --remove-label "$labels"
    fi
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Labels ${action}ed successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to ${action} labels${NC}"
        exit 1
    fi
}

# Function to add a comment
add_comment() {
    local issue_number="$1"
    local comment=""
    
    if [[ -z "$issue_number" ]]; then
        echo -e "${RED}❌ Issue number required${NC}"
        echo "Usage: $SCRIPT_NAME comment <issue_number> --text <comment>"
        exit 1
    fi
    
    # Parse arguments
    while [[ $# -gt 1 ]]; do
        case $2 in
            --text)
                comment="$3"
                shift 2
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $2${NC}"
                exit 1
                ;;
        esac
    done
    
    if [[ -z "$comment" ]]; then
        echo "Comment text (press Enter twice to finish):"
        comment=""
        while IFS= read -r line; do
            if [[ -z "$line" && -z "$comment" ]]; then
                break
            fi
            comment+="$line"$'\n'
        done
    fi
    
    echo -e "${BLUE}💬 Adding comment to issue #$issue_number${NC}"
    
    gh issue comment "$issue_number" --repo "$REPO_NAME" --body "$comment"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Comment added successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to add comment${NC}"
        exit 1
    fi
}

# Function to search issues
search_issues() {
    local query="$1"
    
    if [[ -z "$query" ]]; then
        echo -e "${RED}❌ Search query required${NC}"
        echo "Usage: $SCRIPT_NAME search <query>"
        exit 1
    fi
    
    echo -e "${BLUE}🔍 Searching issues for: '$query'${NC}"
    echo "======================================"
    
    gh issue list --repo "$REPO_NAME" --search "$query"
}

# Function to show project status
show_status() {
    echo -e "${BLUE}📊 Project Status${NC}"
    echo "=================="
    
    echo -e "${CYAN}Open Issues:${NC}"
    gh issue list --repo "$REPO_NAME" --state open --limit 5
    
    echo -e "\n${CYAN}Recent Closed Issues:${NC}"
    gh issue list --repo "$REPO_NAME" --state closed --limit 5
    
    echo -e "\n${CYAN}Labels:${NC}"
    gh label list --repo "$REPO_NAME"
    
    echo -e "\n${CYAN}Milestones:${NC}"
    gh api repos/:owner/:repo/milestones --repo "$REPO_NAME" --jq '.[].title' 2>/dev/null || echo "No milestones"
}



# Quick creation functions
create_bug() {
    local title="$1"
    local description="$2"
    local steps="$3"
    local expected="$4"
    local actual="$5"
    
    # Check if all required arguments are provided
    if [[ -z "$title" || -z "$description" || -z "$steps" || -z "$expected" || -z "$actual" ]]; then
        echo -e "${RED}❌ All arguments required for non-interactive mode${NC}"
        echo "Usage: $SCRIPT_NAME create-bug <title> <description> <steps> <expected> <actual>"
        echo ""
        echo "Or run without arguments for interactive mode:"
        echo "$SCRIPT_NAME create-bug"
        exit 1
    fi
    
    body="## Bug Description
$description

## Steps to Reproduce
$steps

## Expected Behavior
$expected

## Actual Behavior
$actual

## Environment
- OS: $(uname -s)
- Browser: [Please specify]
- Version: [Please specify]"

    create_issue --title "$title" --body "$body" --labels "bug"
}

create_feature() {
    local title="$1"
    local description="$2"
    local usecase="$3"
    local benefits="$4"
    
    # Check if all required arguments are provided
    if [[ -z "$title" || -z "$description" || -z "$usecase" || -z "$benefits" ]]; then
        echo -e "${RED}❌ All arguments required for non-interactive mode${NC}"
        echo "Usage: $SCRIPT_NAME create-feature <title> <description> <usecase> <benefits>"
        echo ""
        echo "Or run without arguments for interactive mode:"
        echo "$SCRIPT_NAME create-feature"
        exit 1
    fi
    
    body="## Feature Description
$description

## Use Case
$usecase

## Benefits
$benefits

## Additional Context
[Any other relevant information]"

    create_issue --title "$title" --body "$body" --labels "enhancement"
}

create_audio() {
    local title="$1"
    local description="$2"
    local audio_file="$3"
    local expected="$4"
    local current="$5"
    
    # Check if all required arguments are provided
    if [[ -z "$title" || -z "$description" || -z "$audio_file" || -z "$expected" || -z "$current" ]]; then
        echo -e "${RED}❌ All arguments required for non-interactive mode${NC}"
        echo "Usage: $SCRIPT_NAME create-audio <title> <description> <audio_file> <expected> <current>"
        echo ""
        echo "Or run without arguments for interactive mode:"
        echo "$SCRIPT_NAME create-audio"
        exit 1
    fi
    
    body="## Audio Issue Description
$description

## Audio File Affected
$audio_file

## Expected Audio Behavior
$expected

## Current Audio Behavior
$current

## Audio Format
- Sample Rate: [Please specify]
- Bit Depth: [Please specify]
- Channels: [Please specify]"

    create_issue --title "$title" --body "$body" --labels "component: audio,type: bug"
}

create_puzzle() {
    local title="$1"
    local description="$2"
    local difficulty="$3"
    local solution="$4"
    local behavior="$5"
    
    # Check if all required arguments are provided
    if [[ -z "$title" || -z "$description" || -z "$difficulty" || -z "$solution" || -z "$behavior" ]]; then
        echo -e "${RED}❌ All arguments required for non-interactive mode${NC}"
        echo "Usage: $SCRIPT_NAME create-puzzle <title> <description> <difficulty> <solution> <behavior>"
        echo ""
        echo "Or run without arguments for interactive mode:"
        echo "$SCRIPT_NAME create-puzzle"
        exit 1
    fi
    
    body="## Puzzle Issue Description
$description

## Puzzle Difficulty
$difficulty

## Expected Solution
$solution

## Current Behavior
$behavior

## Puzzle Context
[Any additional context about the puzzle]"

    create_issue --title "$title" --body "$body" --labels "component: data,type: enhancement"
}

# Interactive versions of the quick creation functions
create_bug_interactive() {
    echo -e "${BLUE}🐛 Quick Bug Report (Interactive)${NC}"
    echo "====================================="
    
    read -p "Bug title: " title
    read -p "Bug description: " description
    read -p "Steps to reproduce: " steps
    read -p "Expected behavior: " expected
    read -p "Actual behavior: " actual
    
    body="## Bug Description
$description

## Steps to Reproduce
$steps

## Expected Behavior
$expected

## Actual Behavior
$actual

## Environment
- OS: $(uname -s)
- Browser: [Please specify]
- Version: [Please specify]"

    create_issue --title "$title" --body "$body" --labels "bug"
}

create_feature_interactive() {
    echo -e "${BLUE}✨ Quick Feature Request (Interactive)${NC}"
    echo "========================================="
    
    read -p "Feature title: " title
    read -p "Feature description: " description
    read -p "Use case: " usecase
    read -p "Benefits: " benefits
    
    body="## Feature Description
$description

## Use Case
$usecase

## Benefits
$benefits

## Additional Context
[Any other relevant information]"

    create_issue --title "$title" --body "$body" --labels "enhancement"
}

create_audio_interactive() {
    echo -e "${BLUE}🎵 Quick Audio Issue (Interactive)${NC}"
    echo "==================================="
    
    read -p "Audio issue title: " title
    read -p "Audio issue description: " description
    read -p "Audio file affected: " audio_file
    read -p "Expected audio behavior: " expected
    read -p "Current audio behavior: " current
    
    body="## Audio Issue Description
$description

## Audio File Affected
$audio_file

## Expected Audio Behavior
$expected

## Current Audio Behavior
$current

## Audio Format
- Sample Rate: [Please specify]
- Bit Depth: [Please specify]
- Channels: [Please specify]"

    create_issue --title "$title" --body "$body" --labels "component: audio,type: bug"
}

create_puzzle_interactive() {
    echo -e "${BLUE}🧩 Quick Puzzle Issue (Interactive)${NC}"
    echo "====================================="
    
    read -p "Puzzle issue title: " title
    read -p "Puzzle issue description: " description
    read -p "Puzzle difficulty: " difficulty
    read -p "Expected solution: " solution
    read -p "Current behavior: " behavior
    
    body="## Puzzle Issue Description
$description

## Puzzle Difficulty
$difficulty

## Expected Solution
$solution

## Current Behavior
$behavior

## Puzzle Context
[Any additional context about the puzzle]"

    create_issue --title "$title" --body "$body" --labels "component: data,type: enhancement"
}

# Main script logic
main() {
    # Check authentication first
    check_auth
    
    # Configuration is already loaded
    
    # Parse command
    case "${1:-help}" in
        create)
            create_issue "${@:2}"
            ;;
        list)
            list_issues "${@:2}"
            ;;
        view)
            view_issue "$2"
            ;;
        edit)
            edit_issue "${@:2}"
            ;;
        close)
            close_issue "${@:2}"
            ;;
        reopen)
            reopen_issue "$2"
            ;;
        assign)
            assign_issue "${@:2}"
            ;;
        label)
            manage_labels "${@:2}"
            ;;
        comment)
            add_comment "${@:2}"
            ;;
        search)
            search_issues "$2"
            ;;
        status)
            show_status
            ;;

        create-bug)
            create_bug "$2" "$3" "$4" "$5" "$6"
            ;;
        create-feature)
            create_feature "$2" "$3" "$4" "$5"
            ;;
        create-audio)
            create_audio "$2" "$3" "$4" "$5" "$6"
            ;;
        create-puzzle)
            create_puzzle "$2" "$3" "$4" "$5" "$6"
            ;;
        create-bug-interactive)
            create_bug_interactive
            ;;
        create-feature-interactive)
            create_feature_interactive
            ;;
        create-audio-interactive)
            create_audio_interactive
            ;;
        create-puzzle-interactive)
            create_puzzle_interactive
            ;;
        help|--help|-h)
            print_usage
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $1${NC}"
            echo ""
            print_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"W