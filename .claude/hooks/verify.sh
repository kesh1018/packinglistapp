#!/usr/bin/env bash
# Stop hook: block "done" until the project compiles and its tests pass.
# Exit 0 = allow stop. Exit 2 = block; stderr is shown to Claude so it can fix the failure.
set -uo pipefail

input="$(cat)"
# Already re-running because this hook blocked the previous stop: let it end (no infinite loop).
active="$(printf '%s' "$input" | python3 -I -c 'import json,sys
try: print(str(json.load(sys.stdin).get("stop_hook_active", False)).lower())
except Exception: print("false")')"
[ "$active" = "true" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$root" || exit 0

# Skip when nothing changed since the last passing run (pure Q&A turns stay fast).
stamp=".claude/hooks/.last-pass"
state="$(git status --porcelain 2>/dev/null; git diff 2>/dev/null)"
hash="$(printf '%s' "$state" | shasum | cut -d' ' -f1)"
[ -f "$stamp" ] && [ "$(cat "$stamp")" = "$hash" ] && exit 0

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
log="$(mktemp -t packingpal-verify)"
trap 'rm -f "$log"' EXIT

{
  echo "== npm run typecheck" && npm run -s typecheck &&
  echo "== npm test" && npm test --silent &&
  echo "== gradle compileDebugJavaWithJavac testDebugUnitTest" &&
  (cd android && ./gradlew -q compileDebugJavaWithJavac testDebugUnitTest)
} >"$log" 2>&1
status=$?

if [ $status -ne 0 ]; then
  {
    echo "Verification failed (exit $status). Fix these before finishing:"
    tail -n 60 "$log"
  } >&2
  exit 2
fi

printf '%s' "$hash" > "$stamp"
exit 0
