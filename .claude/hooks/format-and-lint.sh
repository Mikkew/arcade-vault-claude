#!/usr/bin/env bash
# PostToolUse(Write|Edit|MultiEdit) hook: strip whitespace, then run ESLint --fix and Prettier on files touched in this project.
# Exit 2 sends remaining lint errors back to Claude; any other outcome is silent.

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_response.filePath // .tool_input.file_path // empty')
project="${CLAUDE_PROJECT_DIR:-$(pwd)}"

[ -n "$file" ] && [ -f "$file" ] || exit 0

# Only act on files inside this project, and skip generated/vendored dirs.
case "$file" in
  "$project"/node_modules/*|"$project"/.next/*|"$project"/.git/*|"$project"/.claude/*|"$project"/.agents/*) exit 0 ;;
  "$project"/*) ;;
  *) exit 0 ;;
esac

cd "$project" || exit 0
status=0
out=""

# Strip trailing whitespace and delete blank lines so only code remains.
# Limited to code files: blank lines are significant in Markdown and similar formats.
case "$file" in
  *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs|*.css|*.json|*.sh)
    sed -i -E '/^[[:space:]]*$/d; s/[[:space:]]+$//' "$file"
    ;;
esac

# ESLint only for JS/TS sources.
case "$file" in
  *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs)
    if ! e=$(npx --no-install eslint --fix "$file" 2>&1); then
      out+="ESLint found unfixable problems in $file:"$'\n'"$e"$'\n'
      status=2
    fi
    ;;
esac

# Prettier handles any file type it knows; --ignore-unknown skips the rest.
if ! p=$(npx --no-install prettier --write --ignore-unknown "$file" 2>&1); then
  out+="Prettier failed on $file:"$'\n'"$p"$'\n'
  status=2
fi

[ -n "$out" ] && printf '%s' "$out" >&2
exit $status
