#!/usr/bin/env bash

set -euf -o pipefail

readonly GITHUB_API_SERVER='https://api.github.com'
readonly GITHUB_API_VERSION='2022-11-28'

# The plugin list is read straight from the krew-index repository instead of
# the krew website's API (krew.sigs.k8s.io/.netlify/functions/api/plugins),
# which has been returning HTTP 502 since 2026-10-20.
readonly KREW_INDEX_GIT_URL='https://github.com/kubernetes-sigs/krew-index.git'

declare -ra K8S_PLUGIN_BLOCKLIST=(
  'crd-sample'
)

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
readonly krew_index_dir="$(mktemp -d)"
trap 'rm -rf -- "$tmpfile" "$krew_index_dir"' EXIT

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

element_in_array() {
    local target="$1"
    shift # Remove the target from the arguments list, leaving only the array

    local item
    for item in "$@"; do
        if [[ "$item" == "$target" ]]; then
            return 0 # Found
        fi
    done
    return 1 # Not found
}

# Prints the "org/repo" part of a GitHub repository URL, or nothing if the URL
# does not point to a GitHub repository.
github_repo_from_url() {
  local url="$1"
  if [[ "${url}" =~ ^https://github\.com/([^/?#]+)/([^/?#]+) ]]; then
    echo -n "${BASH_REMATCH[1]}/${BASH_REMATCH[2]%.git}"
  fi
}

# Prints the value of a top-level "spec" field (e.g. "  homepage: <value>") of a
# plugin manifest, without surrounding quotes.
get_manifest_spec_field() {
  local field="$1"
  local manifest="$2"
  sed -n -E "s/^  ${field}:[[:space:]]*['\"]?([^'\"]*)['\"]?[[:space:]]*\$/\1/p" "${manifest}" | head -n 1
}

# Prints one "<plugin name>\t<github org/repo>" line per plugin in krew-index.
# The repository is taken from the plugin's homepage if it is hosted on GitHub,
# otherwise from the first GitHub release download URI in the manifest. It is
# left empty if neither is found.
list_plugins() {
  git clone --quiet --depth 1 "${KREW_INDEX_GIT_URL}" "${krew_index_dir}" || return 1

  local manifest plugin_name github_org_slash_repo
  while read -r manifest; do
    plugin_name="$(basename "${manifest}" .yaml)"
    github_org_slash_repo="$(github_repo_from_url "$(get_manifest_spec_field 'homepage' "${manifest}")")"
    if [[ -z "${github_org_slash_repo}" ]]; then
      github_org_slash_repo="$(github_repo_from_url "$(grep -m 1 -o -E 'https://github\.com/[^/]+/[^/]+/releases/download/' "${manifest}" || true)")"
    fi
    printf '%s\t%s\n' "${plugin_name}" "${github_org_slash_repo}"
  done < <(find "${krew_index_dir}/plugins" -maxdepth 1 -name '*.yaml' | sort)
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
      sleep "${sleep_secs}"
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

# Exit status returned by get_download_count when the repository (or its
# releases) cannot be found on GitHub, i.e. the API responded with HTTP 404.
readonly EXIT_CODE_REPO_NOT_FOUND=44

# Writes the total number of release-asset downloads for the given GitHub repo
# to stdout.
#
# Returns:
#   0                          on success
#   EXIT_CODE_REPO_NOT_FOUND   when the repo is not found on GitHub (HTTP 404)
# Any other HTTP status is treated as an unexpected error and aborts the script.
get_download_count() {
  local github_org_slash_repo="$1"

  # Append the HTTP status code to the response body via -w so we can branch on
  # it. Even though -f makes curl exit non-zero on an error response, -w still
  # emits the status code, so we rely on it rather than on curl's exit status.
  local output=''
  output="$(curl_github -w $'\n%{http_code}' "/repos/${github_org_slash_repo}/releases")" || true

  # Split the trailing status code off the (possibly multi-line) body.
  local http_status="${output##*$'\n'}"
  # Stash the body in the shared temp file for jq to consume.
  printf '%s' "${output%$'\n'*}" > "${tmpfile}"

  case "${http_status}" in
    200)
      jq -c '[.[].assets[].download_count] | add // 0' < "${tmpfile}"
      ;;
    404)
      return "${EXIT_CODE_REPO_NOT_FOUND}"
      ;;
    *)
      error_and_exit "unexpected HTTP status ${http_status:-<none>} while fetching releases for ${github_org_slash_repo}"
      ;;
  esac
}

main() {
  mkdir -p "${PLUGINS_DIR}"

  # Fetch the plugin list up front: a failure inside a process substitution
  # (`< <(list_plugins)`) is not caught by `set -e`, which previously let an
  # upstream 502 silently produce an empty manifest.
  local plugin_list
  plugin_list="$(list_plugins)" || error_and_exit "failed to fetch the plugin list from ${KREW_INDEX_GIT_URL}"
  if [[ -z "${plugin_list}" ]]; then
    error_and_exit "the plugin list fetched from ${KREW_INDEX_GIT_URL} is empty"
  fi

  local plugins_json='{}'
  while read -r plugin_name github_org_slash_repo; do
    if [[ -z "${plugin_name}" ]]; then
      continue
    fi
    if element_in_array "${plugin_name}" "${K8S_PLUGIN_BLOCKLIST[@]}"; then
      continue
    fi

    info "fetching download stat for ${plugin_name}"

    if [[ -z "${github_org_slash_repo}" ]]; then
      warn "not a Github-hosted plugin: ${plugin_name}"
      continue
    fi

    local fetch_status=0
    download_count="$(get_download_count "${github_org_slash_repo}")" || fetch_status=$?
    if [[ "${fetch_status}" -eq "${EXIT_CODE_REPO_NOT_FOUND}" ]]; then
      warn "repository ${github_org_slash_repo} for plugin ${plugin_name} not found on GitHub (HTTP 404), skipping"
      continue
    elif [[ "${fetch_status}" -ne 0 ]]; then
      error_and_exit "failed to fetch download count for plugin ${plugin_name} (${github_org_slash_repo})"
    fi
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
  done <<< "${plugin_list}"

  if [[ "$(echo -n "${plugins_json}" | jq 'length')" -eq 0 ]]; then
    error_and_exit "no plugin stats were collected, refusing to overwrite ${PUBLIC_DIR}/plugins.json"
  fi

  echo -n "${plugins_json}" | jq -rc \
    --arg version "${OUTPUT_MANIFEST_VERSION}" \
    --arg timestamp "$(current_timestamp)" \
    '{ "version": $version | tonumber, "timestamp": $timestamp | tonumber, "plugins": . }' > "${PUBLIC_DIR}/plugins.json"
}

main "$@"
