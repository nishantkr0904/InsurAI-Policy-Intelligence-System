#!/usr/bin/env bash
set -euo pipefail

COMMITS_TO_SCAN="${1:-20}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: run this script inside a git repository."
  exit 2
fi

# High-confidence patterns for credential/token formats.
HIGH_CONFIDENCE_REGEX='(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z\-_]{35}|xox[baprs]-[A-Za-z0-9\-]{10,}|-----BEGIN (RSA|EC|OPENSSH|DSA) PRIVATE KEY-----|sk-[A-Za-z0-9]{24,}|sk-ant-[A-Za-z0-9\-_]{24,})'

# Generic assignment detector for secret-like variable names.
ASSIGNMENT_REGEX='((API[_-]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|CLIENT[_-]?SECRET)[A-Z0-9_\-]*)\s*[:=]\s*[^[:space:]]+'

# Ignore obvious placeholders and examples.
PLACEHOLDER_REGEX='(your_|example|changeme|replace_me|dummy|sample|placeholder|localhost|minioadmin|sk-\.\.\.|sk-ant-\.\.\.|<)'

scan_block() {
  local content="$1"
  local label="$2"

  local high_hits
  high_hits="$(printf "%s" "$content" | grep -Ein "$HIGH_CONFIDENCE_REGEX" || true)"

  local assign_hits
  assign_hits="$(printf "%s" "$content" | grep -Ein "$ASSIGNMENT_REGEX" || true)"

  if [[ -n "$assign_hits" ]]; then
    assign_hits="$(printf "%s" "$assign_hits" | grep -Eiv "$PLACEHOLDER_REGEX" || true)"
  fi

  if [[ -n "$high_hits" || -n "$assign_hits" ]]; then
    echo "[FAIL] Potential secrets detected in: $label"
    [[ -n "$high_hits" ]] && echo "$high_hits"
    [[ -n "$assign_hits" ]] && echo "$assign_hits"
    return 1
  fi

  echo "[OK] No likely secrets detected in: $label"
  return 0
}

extract_added_lines() {
  # Keep only added content lines from unified diff and skip diff metadata lines.
  awk '
    /^\+\+\+/ { next }
    /^\+/ { print substr($0, 2) }
  '
}

recent_diff="$(git --no-pager log -p -n "$COMMITS_TO_SCAN" --pretty=format:'COMMIT %h %s' | extract_added_lines)"
working_diff="$( (git --no-pager diff; git --no-pager diff --cached) | extract_added_lines )"

status=0
scan_block "$recent_diff" "last $COMMITS_TO_SCAN commits" || status=1
scan_block "$working_diff" "working tree + staged diff" || status=1

if [[ "$status" -ne 0 ]]; then
  echo "\nAction: remove or rotate exposed secrets before push."
  exit 1
fi

echo "\nSecret scan passed. Safe to proceed with push."
