#!/bin/sh
set -e
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

CMD="$1"
IMAGE_NAME="${IMAGE_NAME:-ver/v-platform-console-frontend}"
REMOTE="${REMOTE:-root@159.138.228.40}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/KeyPair-v2.pem}"
REMOTE_DIR="${REMOTE_DIR:-/root/gk/platform-console-web}"
TS=$(date +%Y%m%d-%H%M%S)
REMOTE_BASE="${REMOTE_DIR%/*}"

LOCAL_DEV_DIR="artifacts/dev"
LOCAL_PROD_DIR="artifacts/prod"

send_files() {
  OUT_FILE="$1"
  OUT_BASE="$(basename "$OUT_FILE")"
  ssh -i "$SSH_KEY" "$REMOTE" "mkdir -p '$REMOTE_DIR' '$REMOTE_BASE'"
  scp -i "$SSH_KEY" "$OUT_FILE" "$REMOTE:$REMOTE_BASE/"
  scp -i "$SSH_KEY" -r deploy/docker-compose.yml "$REMOTE:$REMOTE_DIR/docker-compose.yml"
}

remote() {
  ssh -i "$SSH_KEY" "$REMOTE" "$1"
}

local_image_id() {
  docker image inspect "$1" --format '{{.Id}}' 2>/dev/null || true
}

remove_local_image_if_unused() {
  image_id="$1"
  [ -z "$image_id" ] && return 0
  running_ref=$(docker ps -aq --filter "ancestor=$image_id" 2>/dev/null || true)
  [ -n "$running_ref" ] && return 0
  docker rmi "$image_id" >/dev/null 2>&1 || true
}

health_wait() {
  NAME="$1"
  LIM="$2"
  remote "for i in \$(seq 1 $LIM); do s=\$(docker inspect -f '{{.State.Health.Status}}' $NAME 2>/dev/null || echo none); [ \"\$s\" = \"healthy\" ] && echo HEALTHY && exit 0; sleep 2; done; echo HEALTH_CHECK_FAILED; exit 1"
}

prune_local_tars() {
  dir="$1"
  keep="$2"
  [ -d "$dir" ] || return 0
  count=$(ls -1t "$dir"/*platform-console*.tar.gz 2>/dev/null | wc -l | tr -d ' ')
  [ "$count" -le "$keep" ] && return 0
  ls -1t "$dir"/*.tar.gz 2>/dev/null | tail -n +$(expr $keep + 1) | xargs -r rm -f
}

prune_remote_tars() {
  remote_dir="$1"
  keep="$2"
  remote "mkdir -p $remote_dir"
  remote "set -e; cd $remote_dir; list=\$(ls -1t 2>/dev/null | wc -l); if [ \"\$list\" -gt $keep ]; then ls -1t | tail -n +$(expr $keep + 1) | xargs -r rm -f; fi"
}

prune_remote_prod_images() {
  keep="$1"
  remote "cur=\$(docker inspect -f '{{.Config.Image}}' v-platform-console-frontend 2>/dev/null || echo ''); \
  rep='${IMAGE_NAME}'; \
  tags=\$(docker images \"\$rep\" --format '{{.Tag}}' | grep '^prod-' | sort -r); \
  keep_list=\$(echo \"\$tags\" | tr ' ' '\n' | head -n $keep | tr '\n' ' '); \
  for t in \$tags; do \
    if echo \"\$keep_list\" | grep -q \"\<$t\>\"; then continue; fi; \
    if [ -n \"\$cur\" ] && echo \"\$cur\" | grep -q \"\:$t\"; then continue; fi; \
    docker rmi \"\$rep:\$t\" || true; \
  done"
}

case "$CMD" in
dev)
  DEV_TAG="${DEV_TAG:-dev}"
  IMG="$IMAGE_NAME:$DEV_TAG"
  OLD_LOCAL_IMAGE_ID=$(local_image_id "$IMG")
  mkdir -p "$LOCAL_DEV_DIR"
  OUT="$LOCAL_DEV_DIR/${IMAGE_NAME##*/}_dev_$TS.tar.gz"
  OUT_BASE="$(basename "$OUT")"
  REMOTE_OUT="$REMOTE_BASE/$OUT_BASE"

  if [ "${SKIP_NPM_CI:-0}" = "1" ]; then
    echo "Skipping npm ci because SKIP_NPM_CI=1"
  else
    npm ci
  fi
  npm run build

  docker buildx build --platform linux/amd64 -f deploy/Dockerfile.dev -t "$IMG" .
  NEW_LOCAL_IMAGE_ID=$(local_image_id "$IMG")
  if [ -n "$OLD_LOCAL_IMAGE_ID" ] && [ "$OLD_LOCAL_IMAGE_ID" != "$NEW_LOCAL_IMAGE_ID" ]; then
    remove_local_image_if_unused "$OLD_LOCAL_IMAGE_ID"
  fi
  docker save "$IMG" | gzip >"$OUT"
  send_files "$OUT"
  OLD_REMOTE_IMAGE_ID=$(remote "docker image inspect '$IMG' --format '{{.Id}}' 2>/dev/null || true")
  remote "docker load -i $REMOTE_OUT"
  remote "mkdir -p $REMOTE_BASE/backups/dev; mv -f $REMOTE_OUT $REMOTE_BASE/backups/dev/"
  prune_remote_tars "$REMOTE_BASE/backups/dev" 2
  prune_local_tars "$LOCAL_DEV_DIR" 2
  remote "cd $REMOTE_DIR; DEV_TAG=$DEV_TAG docker compose up -d dev-platform-console-web"
  health_wait "v-platform-console-frontend-dev" 10
  NEW_REMOTE_IMAGE_ID=$(remote "docker image inspect '$IMG' --format '{{.Id}}' 2>/dev/null || true")
  if [ -n "$OLD_REMOTE_IMAGE_ID" ] && [ "$OLD_REMOTE_IMAGE_ID" != "$NEW_REMOTE_IMAGE_ID" ]; then
    remote "cid=\$(docker ps -aq --filter ancestor=$OLD_REMOTE_IMAGE_ID 2>/dev/null || true); [ -n \"\$cid\" ] || docker rmi '$OLD_REMOTE_IMAGE_ID' >/dev/null 2>&1 || true"
  fi
  ;;
prod)
  PROD_TAG_IN="${PROD_TAG:-prod-$TS}"
  IMG="$IMAGE_NAME:$PROD_TAG_IN"
  mkdir -p "$LOCAL_PROD_DIR"
  OUT="$LOCAL_PROD_DIR/${IMAGE_NAME##*/}_prod_$TS.tar.gz"
  OUT_BASE="$(basename "$OUT")"
  REMOTE_OUT="$REMOTE_BASE/$OUT_BASE"

  docker buildx build --platform linux/amd64 -f deploy/Dockerfile -t "$IMG" .
  docker save "$IMG" | gzip >"$OUT"
  send_files "$OUT"
  remote "mkdir -p $REMOTE_BASE/backups"
  remote "cur=\$(docker inspect -f '{{.Config.Image}}' v-platform-console-frontend 2>/dev/null || echo ''); if [ -n \"\$cur\" ]; then tag=\$(echo \"\$cur\" | awk -F: '{print \$2}'); [ -n \"\$tag\" ] && docker save \"\$cur\" | gzip > $REMOTE_BASE/backups/${IMAGE_NAME##*/}_\$tag.tar.gz && echo \"\$tag\" > $REMOTE_DIR/.prod_prev; fi || true"

  remote "docker load -i $REMOTE_OUT"
  remote "mkdir -p $REMOTE_BASE/backups/prod; mv -f $REMOTE_OUT $REMOTE_BASE/backups/prod/"
  prune_remote_tars "$REMOTE_BASE/backups/prod" 3
  prune_local_tars "$LOCAL_PROD_DIR" 3
  remote "cd $REMOTE_DIR; PROD_TAG=$PROD_TAG_IN docker compose up -d prod-platform-console-web"
  health_wait "v-platform-console-frontend" 60
  prune_remote_prod_images 3
  ;;
promote)
  SRC_TAG="${SRC_TAG:-dev}"
  NEW_TAG="${PROD_TAG:-prod-$TS}"
  remote "img_id=\$(docker images -q '$IMAGE_NAME:$SRC_TAG'); [ -z \"\$img_id\" ] && echo MISSING_DEV_IMAGE && exit 1 || docker tag '$IMAGE_NAME:$SRC_TAG' '$IMAGE_NAME:$NEW_TAG'"
  remote "mkdir -p $REMOTE_BASE/backups"
  remote "cur=\$(docker inspect -f '{{.Config.Image}}' v-platform-console-frontend 2>/dev/null || echo ''); if [ -n \"\$cur\" ]; then tag=\$(echo \"\$cur\" | awk -F: '{print \$2}'); [ -n \"\$tag\" ] && docker save \"\$cur\" | gzip > $REMOTE_BASE/backups/${IMAGE_NAME##*/}_\$tag.tar.gz && echo \"\$tag\" > $REMOTE_DIR/.prod_prev; fi || true"
  remote "docker rm -f v-platform-console-frontend 2>/dev/null || true"
  remote "cd $REMOTE_DIR; PROD_TAG=$NEW_TAG docker compose up -d prod-platform-console-web"
  health_wait "v-platform-console-frontend" 60
  prune_remote_prod_images 3
  ;;
rollback)
  remote "cd $REMOTE_DIR; prev=\$(cat .prod_prev 2>/dev/null || echo 1.0.0); PROD_TAG=\$prev docker compose up -d prod-platform-console-web"
  health_wait "v-platform-console-frontend" 60
  ;;
*)
  echo "Usage: deploy/deploy.sh [dev|prod|promote|rollback]"
  echo "ENV: IMAGE_NAME, REMOTE, SSH_KEY, REMOTE_DIR, DEV_TAG, PROD_TAG, SRC_TAG"
  exit 1
  ;;
esac
