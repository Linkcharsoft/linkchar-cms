#!/usr/bin/env bash
# Runs linkchar-cms build:report against the local Supabase the way Amplify's build does, and checks what it wrote.
set -euo pipefail
cd "$(dirname "$0")/../apps/playground"

eval "$(pnpm exec supabase status -o env)"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL" SUPABASE_SECRET_KEY="$SECRET_KEY"
export AWS_APP_ID=d1check AWS_BRANCH=main AWS_REGION=us-east-1 AWS_COMMIT_ID=abc123

sql() { psql "$DB_URL" -At -c "$1"; }
report() { pnpm exec linkchar-cms build:report "$@"; }
expect() {
  local got="$1" want="$2" what="$3"
  if [ "$got" != "$want" ]; then echo "✗ $what: got '$got', wanted '$want'"; exit 1; fi
  echo "✓ $what"
}
ids=()
cleanup() { [ "${#ids[@]}" -eq 0 ] || sql "delete from public.publish_log where id in ($(IFS=,; echo "${ids[*]}"))" >/dev/null; }
trap cleanup EXIT

# No open publish: a push build, nothing to report, never a failure.
sql "update public.publish_log set build_status = 'failed', error_code = 'build_cancelled', finished_at = now() where build_status in ('pending', 'building', 'built')" >/dev/null
output=$(AWS_JOB_ID=1 report --start)
expect "$?" 0 "--start without an open publish exits 0"
expect "$(sql "select count(*) from public.publish_log where job_id = '1'")" 0 "--start without an open publish writes nothing"
case "$output" in *"nothing to report"*) echo "✓ --start says there was nothing to report" ;; *) echo "✗ unexpected output: $output"; exit 1 ;; esac

# A publish waiting for its build: --start takes it, --ok leaves it built with the stamp of the build.
a=$(sql "with row as (insert into public.publish_log (documents_count, removed_count, items, build_status) values (1, 0, '[]', 'building') returning id) select id from row")
ids+=("$a")
AWS_JOB_ID=2 report --start
expect "$(sql "select build_status || ' ' || job_id || ' ' || app_id || ' ' || branch || ' ' || region || ' ' || commit from public.publish_log where id = $a")" "building 2 d1check main us-east-1 abc123" "--start names the job and where it runs"
AWS_JOB_ID=2 report --ok
expect "$(sql "select build_status || ' ' || build_stamp || ' ' || (built_at is not null)::text from public.publish_log where id = $a")" "built d1check.main.2 true" "--ok leaves the publish built with the build's stamp"
AWS_JOB_ID=2 report --ok
expect "$(sql "select build_status from public.publish_log where id = $a")" "built" "a second --ok changes nothing"

# A build no --start claimed (one that started before the publish existed) closes nothing.
c=$(sql "with row as (insert into public.publish_log (documents_count, removed_count, items, build_status) values (1, 0, '[]', 'building') returning id) select id from row")
ids+=("$c")
AWS_JOB_ID=9 report --ok
expect "$(sql "select build_status || ' ' || coalesce(job_id, '-') from public.publish_log where id = $c")" "building -" "--ok leaves a publish its --start did not claim alone"
sql "update public.publish_log set build_status = 'failed', error_code = 'build_cancelled', finished_at = now() where id = $c" >/dev/null

# Two sites on one Supabase: each build takes the publishes of its own branch; one without a branch goes to main.
p=$(sql "with row as (insert into public.publish_log (documents_count, removed_count, items, build_status, branch) values (1, 0, '[]', 'building', 'new-landing') returning id) select id from row")
ids+=("$p")
AWS_JOB_ID=11 report --start
expect "$(sql "select coalesce(job_id, '-') from public.publish_log where id = $p")" "-" "a build of main leaves a preview's publish alone"
AWS_BRANCH=new-landing AWS_JOB_ID=12 report --start
expect "$(sql "select job_id || ' ' || branch from public.publish_log where id = $p")" "12 new-landing" "a build of the preview takes the preview's publish"
sql "update public.publish_log set build_status = 'failed', error_code = 'build_cancelled', finished_at = now() where id = $p" >/dev/null
n=$(sql "with row as (insert into public.publish_log (documents_count, removed_count, items, build_status) values (1, 0, '[]', 'building') returning id) select id from row")
ids+=("$n")
AWS_BRANCH=new-landing AWS_JOB_ID=13 report --start
expect "$(sql "select coalesce(job_id, '-') from public.publish_log where id = $n")" "-" "a preview build leaves a publish without a branch alone"
AWS_JOB_ID=14 report --start
expect "$(sql "select job_id || ' ' || branch from public.publish_log where id = $n")" "14 main" "the main build takes a publish without a branch"
sql "update public.publish_log set build_status = 'failed', error_code = 'build_cancelled', finished_at = now() where id = $n" >/dev/null

# A build that fails closes its publish.
b=$(sql "with row as (insert into public.publish_log (documents_count, removed_count, items, build_status) values (1, 0, '[]', 'pending') returning id) select id from row")
ids+=("$b")
AWS_JOB_ID=3 report --start
AWS_JOB_ID=3 report --failed
expect "$(sql "select build_status || ' ' || error_code || ' ' || (finished_at is not null)::text from public.publish_log where id = $b")" "failed build_failed true" "--failed closes the publish as a failed build"

# Supabase out of reach: said, and the build goes on.
set +e
output=$(NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 AWS_JOB_ID=4 report --ok 2>&1)
code=$?
set -e
expect "$code" 0 "--ok exits 0 when the publish log is out of reach"
case "$output" in *"the build goes on"*) echo "✓ --ok says the build goes on" ;; *) echo "✗ unexpected output: $output"; exit 1 ;; esac

echo "build:report behaves as amplify.yml expects"
