#!/usr/bin/env bash

set -euf -o pipefail

readonly GITHUB_API_SERVER='https://api.github.com'
readonly GITHUB_API_VERSION='2022-11-28'

readonly K8S_PLUGINS_URL='https://krew.sigs.k8s.io/.netlify/functions/api/plugins'

readonly OUTPUT_MANIFEST_VERSION=1

SOURCE="${BASH_SOURCE[0]}"
while [[ -h "$SOURCE" ]]; do
    PROG_DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
    SOURCE="$(readlink "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="$PROG_DIR/$SOURCE"
done
PROG_DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
readonly REPO_ROOT_DIR="$( cd -P "${PROG_DIR}/.." >/dev/null 2>&1 && pwd )"
readonly PUBLIC_DIR="${REPO_ROOT_DIR}/public"
readonly PLUGINS_DIR="${PUBLIC_DIR}/plugins"

readonly tmpfile="$(mktemp)"
trap 'rm -f -- "$tmpfile"' EXIT

debug() {
  echo >&2 '[DEBUG]' "$@"
}

info() {
  echo >&2 '[INFO]' "$@"
}

warn() {
  echo >&2 '[WARN]' "$@"
}

error_and_exit() {
  echo >&2 '[ERROR]' "$@"
  exit 1
}

current_timestamp() {
  date +%s
}

list_plugins() {
  curl -fsSL "$K8S_PLUGINS_URL" | jq -r '.data.plugins[] | [.name, .github_repo] | @tsv'
}

trim() {
  local str="$1"
  echo "${str}" | xargs
}

lower_case() {
  local str="$1"
  echo -n "${str}" | tr '[:upper:]' '[:lower:]'
}

get_header_value_from_dump_file() {
  local header_name="$1"
  header_name="$(lower_case "${header_name}")"

  local dump_file="$2"

  while IFS=':' read -r key value; do
    key="$(trim "${key}")"
    key="$(lower_case "${key}")"
    value="${value%$'\r'}"
    value="$(trim "${value}")"
    if [[ "${key}" = "${header_name}" ]]; then
      echo -n "${value}"
    fi
  done < "${dump_file}"
}

github_rate_limited_until=0

curl_github_raw() {
  local flags_length="$(($#-1))"
  local flags=("${@:1:${flags_length}}")
  local path="${*:$#}"

  local authorization_header=()
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    authorization_header=(
      '-H'
      "Authorization: Bearer ${GITHUB_TOKEN}"
    )
  fi
  curl -fsSL \
    -H 'Accept: application/vnd.github+json' \
    -H "X-GitHub-Api-Version: ${GITHUB_API_VERSION}" \
    "${authorization_header[@]}" \
    "${flags[@]}" \
    "${GITHUB_API_SERVER}${path}"
}

curl_github() {
  local flags_length="$(($#-1))"
  local flags=("${@:1:${flags_length}}")
  local path="${*:$#}"

  debug "requesting github api ${path}"

  if [[ ${github_rate_limited_until} -eq 0 ]]; then
    github_rate_limited_until=

    curl_github_raw '/rate_limit' > "${tmpfile}"
    if [[ "$(jq -r '.resources.core.remaining' < "${tmpfile}")" = '0' ]]; then
      local initial_reset
      initial_reset="$(jq -r '.resources.core.reset' < "${tmpfile}")"
      info "rate limited until ${initial_reset}"
      github_rate_limited_until="${initial_reset}"
    fi
    : > "${tmpfile}"
  fi

  if [[ -n "${github_rate_limited_until}" ]]; then
    now="$(current_timestamp)"
    local sleep_secs=$(( github_rate_limited_until - now ))
    if [[ "${sleep_secs}" -gt 0 ]]; then
      info "sleep until ${github_rate_limited_until}"
      sleep "${github_rate_limited_until}"
    fi
    github_rate_limited_until=
  fi

  curl_github_raw \
    -D "${tmpfile}" \
    "${flags[@]}" \
    "${path}"

  local header_retry_after
  header_retry_after="$(get_header_value_from_dump_file 'retry-after' "${tmpfile}")"
  if [[ -n "${header_retry_after}" ]]; then
    now="$(current_timestamp)"
    github_rate_limited_until=$(( now + header_retry_after ))
  fi

  local header_ratelimit_remaining
  header_ratelimit_remaining="$(get_header_value_from_dump_file 'x-ratelimit-remaining' "${tmpfile}")"
  debug "[x-ratelimit-remaining] ${header_ratelimit_remaining}"
  if [[ ${header_ratelimit_remaining} -eq 0 ]]; then
    local header_ratelimit_reset
    header_ratelimit_reset="$(get_header_value_from_dump_file 'x-ratelimit-reset' "${tmpfile}")"
    debug "[x-ratelimit-reset] ${header_ratelimit_reset}"
    if [[ -n "${header_ratelimit_reset}" ]]; then
      github_rate_limited_until="${header_ratelimit_reset}"
    else
      now="$(current_timestamp)"
      github_rate_limited_until=$(( now + 60 ))
    fi
    warn "no remaining request quota. Will be reset at ${github_rate_limited_until}."
  fi

  : > "${tmpfile}"
}

get_download_count() {
  local github_org_slash_repo="$1"

  curl_github "/repos/${github_org_slash_repo}/releases" | jq -c '[.[].assets[].download_count] | add // 0'
}

main() {
  mkdir -p "${PLUGINS_DIR}"

  local plugins_json='{}'
  while read -r plugin_name github_org_slash_repo; do
    if [[ -z "${plugin_name}" ]]; then
      continue
    fi
    info "fetching download stat for ${plugin_name}"

    if [[ -z "${github_org_slash_repo}" ]]; then
      warn "not a Github-hosted plugin: ${plugin_name}"
      continue
    fi

    download_count="$(get_download_count "${github_org_slash_repo}")"
    info "${plugin_name} = ${download_count} downloads"

    local plugin_stats_json='{}'
    local plugin_stats_json_file="${PLUGINS_DIR}/${plugin_name}.json"
    if [[ -f "${plugin_stats_json_file}" ]]; then
      plugin_stats_json="$(cat "${plugin_stats_json_file}")"
    else
      plugin_stats_json='{}'
    fi
    plugin_stats_json=$(echo "${plugin_stats_json}" | jq -rc \
      --arg downloads "${download_count}" \
      --arg fetch_date "$(date +%F)" \
      --arg plugin_name "${plugin_name}" \
      '{ "pluginName": $plugin_name, "stats": (.stats + { ($fetch_date): { "downloads": $downloads | tonumber } }) }')

    echo -n "${plugin_stats_json}" > "${plugin_stats_json_file}"

    plugin_stats_json_url="plugins/${plugin_name}.json"
    plugins_json=$(echo "${plugins_json}" | jq -rc \
      --arg plugin_name "${plugin_name}" \
      --arg plugin_stats_json_url "${plugin_stats_json_url}" \
      '. + { ($plugin_name): { "downloads_url": $plugin_stats_json_url } }')
  done < <(list_plugins)

  echo -n "${plugins_json}" | jq -rc \
    --arg version "${OUTPUT_MANIFEST_VERSION}" \
    --arg timestamp "$(current_timestamp)" \
    '{ "version": $version | tonumber, "timestamp": $timestamp | tonumber, "plugins": . }' > "${PUBLIC_DIR}/plugins.json"
}

main "$@"
