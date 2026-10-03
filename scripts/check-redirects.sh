#!/usr/bin/env bash
# Check that every old help center address redirects to its new page.
#
#   bash scripts/check-redirects.sh [base-url]
#
# Run after the re-shelved site deploys. The base URL defaults to the live
# site. For each old address it prints the HTTP status, the Location header,
# and OK when the Location ends with the expected new address, or FAIL
# otherwise. Exits 1 when any address fails.
#
# Keep this list in step with the "redirects" array in docs.json.

base="${1:-https://docs.bettership.ai}"
base="${base%/}"

pairs='
/start-here /get-started/install-and-sign-in
/how-bettership-works /get-started/install-and-sign-in
/agents /get-started/the-four-agents
/bringing-things-in /learn/how-your-library-inbox-and-wiki-fit-together
/practicing-and-applying /practice/how-practice-works
/account /account/where-every-setting-lives
/troubleshooting /fix/install-update-and-permission-problems
/start-here/what-bettership-is /get-started/install-and-sign-in
/start-here/meet-the-agents /get-started/the-four-agents
/start-here/your-first-week /get-started/your-first-week
/how-bettership-works/focus-areas /focus/focus-areas
/how-bettership-works/library-and-inbox /learn/how-your-library-inbox-and-wiki-fit-together
/how-bettership-works/the-wiki /learn/how-your-library-inbox-and-wiki-fit-together
/how-bettership-works/the-practice-loop /practice/how-practice-works
/how-bettership-works/what-you-keep /apply/prompts-context-packs-and-skills
/agents/steward /focus/ask-steward
/agents/scout /learn/learn-with-scout
/agents/coach /practice/practice-with-coach
/agents/maker /apply/apply-with-maker
/bringing-things-in/add-a-resource /learn/add-a-resource
/bringing-things-in/capture-a-session /learn/capture-something-live
/bringing-things-in/what-happens-after /learn/read-a-resource
/bringing-things-in/collections /learn/organize-with-collections
/account/settings /account/where-every-setting-lives
/troubleshooting/install-and-permissions /get-started/install-and-sign-in
/troubleshooting/getting-help /fix/contact-support
/quickstart /get-started/install-and-sign-in
/get-started /get-started/install-and-sign-in
/learn /learn/how-your-library-inbox-and-wiki-fit-together
/practice /practice/how-practice-works
/apply /apply/prompts-context-packs-and-skills
/focus /focus/focus-areas
/fix /fix/install-update-and-permission-problems
'

failed=0
while read -r old new; do
  [ -z "$old" ] && continue
  headers=$(curl -sI "$base$old")
  status=$(printf '%s\n' "$headers" | awk 'toupper($1) ~ /^HTTP/ {print $2; exit}')
  location=$(printf '%s\n' "$headers" | awk 'tolower($1) == "location:" {print $2; exit}' | tr -d '\r')
  location_path="${location#"$base"}"
  location_path="${location_path%/}"
  case "$status" in
    301|302|307|308)
      if [ "$location_path" = "$new" ]; then result=OK; else result=FAIL; fi ;;
    *) result=FAIL ;;
  esac
  [ "$result" = FAIL ] && failed=1
  printf '%s %s %s -> %s (expected %s)\n' "$result" "${status:-none}" "$old" "${location:-none}" "$new"
done <<EOF
$pairs
EOF

exit "$failed"
