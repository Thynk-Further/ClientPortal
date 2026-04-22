#!/bin/sh
set -eu

MINIO_ALIAS="${MINIO_ALIAS:-local}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"
S3_BUCKET="${S3_BUCKET:-clientportal-files}"

echo "Configuring MinIO alias..."
attempt=1
until mc alias set "$MINIO_ALIAS" "$MINIO_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"; do
  if [ "$attempt" -ge 20 ]; then
    echo "Failed to connect to MinIO after ${attempt} attempts."
    exit 1
  fi

  attempt=$((attempt + 1))
  sleep 2
done

echo "Creating bucket if missing: $S3_BUCKET"
mc mb --ignore-existing "${MINIO_ALIAS}/${S3_BUCKET}"

echo "MinIO bucket bootstrap completed."
